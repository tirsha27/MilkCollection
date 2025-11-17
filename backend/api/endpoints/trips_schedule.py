# api/endpoints/trips_schedule.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from database.session import get_db
from models.optimization import OptimizationRun
from datetime import datetime, timezone
from services.optimization_metrics import compute_run_metrics, compare_runs
import json, os, glob, logging
from typing import Any, Dict

router = APIRouter(prefix="/trips", tags=["Trip Schedule"])
logger = logging.getLogger(__name__)

@router.get("/schedule")
async def get_trip_schedule(db: AsyncSession = Depends(get_db)):
    """
    ✅ FIXED: Fetch latest optimization from database instead of JSON files
    Returns the latest optimization result with proper structure
    """
    try:
        # Fetch the latest optimization run from database
        stmt = select(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(1)
        res = await db.execute(stmt)
        run = res.scalars().first()

        if not run:
            return {"message": "No optimization results found", "data": {"clusters": []}}

        # Extract optimization results
        raw = run.result or {}
        opt_root = (
            raw.get("optimization_results")
            if isinstance(raw, dict) and raw.get("optimization_results")
            else raw if isinstance(raw, dict)
            else {}
        )

        clusters = opt_root.get("clusters", []) if isinstance(opt_root, dict) else []

        return {
            "message": "Schedule loaded from latest optimization",
            "data": {
                "clusters": clusters,
                "timestamp": run.created_at.isoformat() if run.created_at else None,
                "run_id": str(run.id)
            }
        }

    except Exception as e:
        logger.exception("❌ Failed to load schedule")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/schedule/update")
async def update_trip_schedule(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """
    ✅ FIXED: Save manual updates without using evaluator.py
    Computes metrics directly from the payload structure
    """
    try:
        if not os.path.exists("optimization_history"):
            os.makedirs("optimization_history", exist_ok=True)

        # Normalize payload
        if payload.get("optimization_results"):
            normalized = payload
        else:
            clusters = None
            if isinstance(payload.get("clusters"), list):
                clusters = payload.get("clusters")
            elif isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("clusters"), list):
                clusters = payload["data"]["clusters"]
            else:
                if isinstance(payload, dict) and "clusters" in payload:
                    clusters = payload["clusters"]
                else:
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

        # ✅ Compute metrics directly from normalized structure (no evaluator)
        try:
            manual_metrics = compute_run_metrics(normalized.get("optimization_results", {})) or {}
        except Exception:
            logger.exception("compute_run_metrics failed for manual run")
            manual_metrics = {}

        # Compare with previous machine run (if exists)
        try:
            prev_opt = previous_result.get("optimization_results", {}) if isinstance(previous_result, dict) else {}
            comparison = compare_runs(prev_opt, normalized.get("optimization_results", {})) or {}
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
            result=normalized,  # Store the full normalized result
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