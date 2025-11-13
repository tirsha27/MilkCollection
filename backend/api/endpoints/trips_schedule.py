# api/endpoints/trips_schedule.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from database.session import get_db
from models.optimization import OptimizationRun
from datetime import datetime, timezone
from services.optimization_metrics import compute_run_metrics, compare_runs
from services.evaluator import evaluate_manual_assignment
import json, os, glob, logging
from typing import Any, Dict

router = APIRouter(prefix="/trips", tags=["Trip Schedule"])
logger = logging.getLogger(__name__)


@router.get("/schedule")
async def get_trip_schedule():
    """Load latest optimization result JSON and return trip data"""
    try:
        folder = "optimization_history"
        if not os.path.exists(folder):
            return {"message": "No optimization results found", "data": []}
        # Sorted so latest file is last
        files = sorted(glob.glob(os.path.join(folder, "optimization_*.json")))
        if not files:
            return {"message": "No optimization results found", "data": []}
        latest_file = files[-1]
        with open(latest_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        # if top-level has optimization_results, return that for backward compat
        if isinstance(data, dict) and data.get("optimization_results"):
            return {"message": "Schedule loaded", "data": data["optimization_results"]}
        # otherwise return whole file
        return {"message": "Schedule loaded", "data": data}
    except Exception as e:
        logger.exception("❌ Failed to load schedule")
        return {"message": f"Error: {str(e)}", "data": []}


@router.put("/schedule/update")
async def update_trip_schedule(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """
    Save manual (drag/drop) optimization and compare with latest machine run.

    Expects `payload` coming from frontend Trip Scheduler. To evaluate and compare
    properly, we normalize it into a structure similar to machine-generated output:
    {
      "optimization_results": {
         "clusters": [ ... ],
         "timestamp": "...",
         ...
      }
    }
    """
    try:
        if not os.path.exists("optimization_history"):
            os.makedirs("optimization_history", exist_ok=True)

        # Normalize payload into expected shape for evaluation functions.
        # If frontend already sent an optimization_results root, accept it.
        if payload.get("optimization_results"):
            normalized = payload
        else:
            # Accept shape { clusters: [...] } or { data: { clusters: [...] } }
            clusters = None
            if isinstance(payload.get("clusters"), list):
                clusters = payload.get("clusters")
            elif isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("clusters"), list):
                clusters = payload["data"]["clusters"]
            else:
                # try top-level lists inside payload
                if isinstance(payload, dict) and "clusters" in payload:
                    clusters = payload["clusters"]
                else:
                    # as a fallback, try to interpret payload as already a machine run
                    clusters = payload.get("optimization_results", {}).get("clusters", [])

            normalized = {
                "optimization_results": {
                    "clusters": clusters or [],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            }

        # Save manual file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = f"optimization_history/manual_update_{timestamp}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(normalized, f, indent=2, default=str)

        # Fetch the latest machine run for comparison
        q = (
            select(OptimizationRun)
            .where(OptimizationRun.trigger_type == "machine_generated_optimization")
            .order_by(OptimizationRun.started_at.desc())
            .limit(1)
        )
        res = await db.execute(q)
        latest_machine = res.scalars().first()
        previous_result = latest_machine.result if latest_machine else {}

        # Evaluate the manual assignment.
        # evaluate_manual_assignment expects a run-like structure; we pass normalized
        try:
            manual_eval = evaluate_manual_assignment(normalized, vehicle_catalog=[])
        except Exception as ee:
            logger.exception("Failed to evaluate manual assignment")
            manual_eval = normalized  # fallback - at least store it

        # Compute metrics for the manual run (safe)
        try:
            manual_metrics = compute_run_metrics(manual_eval) or {}
        except Exception:
            logger.exception("compute_run_metrics failed for manual run")
            manual_metrics = {}

        # Compare with previous machine run (if exists)
        try:
            comparison = compare_runs(previous_result or {}, manual_eval or {}) or {}
        except Exception:
            logger.exception("compare_runs failed")
            comparison = {}

        results_summary = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "file_saved": file_path,
            **manual_metrics,
            **comparison,
        }

        # Persist the manual update as an OptimizationRun row
        stmt = insert(OptimizationRun).values(
            trigger_type="manual_update_optimization",
            trigger_details={"source": "Trip Scheduler Drag-Drop"},
            status="completed",
            results_summary=results_summary,
            manual_changes=normalized,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )

        await db.execute(stmt)
        await db.commit()
        logger.info("✅ Manual optimization saved successfully")
        return {
            "status": "success",
            "message": "Manual optimization logged",
            "results_summary": results_summary,
            "file_saved": file_path,
        }

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("❌ Manual optimization insert failed")
        raise HTTPException(status_code=500, detail=str(e))
