# domain/backend/api/endpoints/optimization.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from database.session import get_db
from models.optimization import OptimizationRun
from services.core_optimization_adapter import CoreOptimizationAdapter
from services.optimization_metrics import compute_run_metrics
from datetime import datetime, timezone
import logging
from typing import Any, Dict

router = APIRouter(prefix="/optimization", tags=["Optimization"])
logger = logging.getLogger(__name__)


@router.post("/run")
async def run_optimization(
    deadline_minutes: int = Query(480, ge=60, le=1440),
    max_distance_km: float = Query(100.0, ge=10.0, le=500.0),
    db: AsyncSession = Depends(get_db)
):
    """
    Run optimization → store machine-generated result
    """
    try:
        # Run the optimization engine
        results = await CoreOptimizationAdapter.run_optimization(
            db=db,
            deadline_minutes=deadline_minutes,
            max_distance_km=max_distance_km
        )

        if results is None:
            raise HTTPException(status_code=500, detail="Optimization engine returned no result")

        # If engine reports error
        if isinstance(results, dict) and results.get("status") == "ERROR":
            raise HTTPException(status_code=400, detail=results.get("message") or "Optimization error")

        # Some adapters wrap engine output; normalize
        optimization_results = (
            results.get("optimization_results") if isinstance(results, dict) and results.get("optimization_results")
            else (results if isinstance(results, dict) else {})
        )

        # Compute metrics safely
        try:
            metrics = compute_run_metrics(optimization_results) if callable(compute_run_metrics) else {}
        except Exception:
            metrics = {}

        total_clusters = len(optimization_results.get("clusters", [])) if isinstance(optimization_results, dict) else 0
        total_cost = optimization_results.get("total_cost", 0.0) if isinstance(optimization_results, dict) else 0.0
        total_violations = optimization_results.get("total_violations", 0) if isinstance(optimization_results, dict) else 0
        total_distance = 0.0

        if isinstance(optimization_results, dict):
            for cluster in optimization_results.get("clusters", []):
                for vehicle in cluster.get("vehicles", []):
                    total_distance += float(vehicle.get("distance", 0.0) or 0.0)

        results_summary = {
            "total_cost": round(float(total_cost or 0), 2),
            "total_clusters": total_clusters,
            "total_violations": int(total_violations or 0),
            "total_distance": round(float(total_distance or 0), 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Persist run in DB
        stmt = insert(OptimizationRun).values(
            trigger_type="machine_generated_optimization",
            trigger_details={
                "source": "Core Optimization Engine",
                "params": {
                    "deadline_minutes": deadline_minutes,
                    "max_distance_km": max_distance_km,
                },
            },
            status="completed",
            results_summary=results_summary,
            input_config={
                "deadline_minutes": deadline_minutes,
                "max_distance_km": max_distance_km,
            },
            result=results,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )

        await db.execute(stmt)
        await db.commit()

        logger.info("✅ Optimization completed and saved successfully.")
        return {"status": "success", "data": results}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("❌ Optimization run failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categorize-fleet", summary="Categorize fleet by capacity")
async def categorize_fleet(db: AsyncSession = Depends(get_db)):
    try:
        from services.fleet_categorizer import FleetCategorizer
        result = await FleetCategorizer.categorize(db)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.exception("Failed to categorize fleet")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest", summary="Get latest optimization run (machine-generated)")
async def get_latest_optimization(db: AsyncSession = Depends(get_db)):
    """
    Returns normalized hub + vehicle data for frontend.
    """
    try:
        stmt = select(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(1)
        res = await db.execute(stmt)
        run = res.scalars().first()

        if not run:
            return {
                "status": "success",
                "data": {
                    "id": None,
                    "created_at": None,
                    "results": None,
                    "summary": {},
                    "hubs": {},
                    "vehicles": {},
                },
            }

        raw = run.result or {}
        summary = run.results_summary or {}

        hubs: Dict[str, Dict[str, Any]] = {}
        vehicles: Dict[str, Dict[str, Any]] = {}

        opt_root = (
            raw.get("optimization_results")
            if isinstance(raw, dict) and raw.get("optimization_results")
            else raw if isinstance(raw, dict)
            else {}
        )

        clusters = opt_root.get("clusters", []) if isinstance(opt_root, dict) else []

        for cluster in clusters:
            hub_id_raw = (
                cluster.get("storage_hub_id")
                or cluster.get("hub_id")
                or cluster.get("cluster_id")
                or cluster.get("name")
            )
            hub_id = str(hub_id_raw) if hub_id_raw else f"hub_{len(hubs) + 1}"

            hub_capacity = float(
                cluster.get("hub_capacity_liters")
                or cluster.get("capacity")
                or cluster.get("cap_liters")
                or 0.0
            )

            hub_used = 0.0
            hub_name = cluster.get("hub_name") or cluster.get("name") or hub_id

            for v in cluster.get("vehicles", []) or []:

                # ⭐ FIX: Extract real vehicle_number
                vehicle_number = (
                    v.get("vehicle_number")
                    or v.get("vehicle_code")
                    or v.get("vehicle_id")
                    or v.get("id")
                    or f"veh_{len(vehicles) + 1}"
                )

                vid = str(vehicle_number)

                used_l = float(
                    v.get("collected_liters")
                    or v.get("used_liters")
                    or v.get("load_liters")
                    or v.get("total_milk")
                    or v.get("total_milk_liters")
                    or 0.0
                )

                cap_l = float(
                    v.get("capacity_liters")
                    or v.get("capacity")
                    or v.get("cap_liters")
                    or 0.0
                )

                utilization_pct = 0.0
                if cap_l:
                    utilization_pct = (used_l / cap_l) * 100.0
                utilization_pct = round(utilization_pct, 2)

                vehicles[vid] = {
                    "vehicle_number": vehicle_number,    # ⭐ FIXED
                    "used_liters": round(used_l, 2),
                    "capacity_liters": round(cap_l, 2),
                    "utilization_pct": utilization_pct,
                    "assigned_hub_id": hub_id,
                    "nearest_hub_name": hub_name,
                }

                hub_used += used_l

            hub_util = round((hub_used / hub_capacity) * 100.0, 2) if hub_capacity else 0.0

            hubs[hub_id] = {
                "name": hub_name,
                "used_liters": round(hub_used, 2),
                "capacity_liters": round(hub_capacity, 2),
                "utilization_pct": hub_util,
            }

        return {
            "status": "success",
            "data": {
                "id": str(run.id),
                "created_at": (
                    run.created_at.isoformat() if getattr(run, "created_at", None) else None
                ),
                "results": raw,
                "summary": summary,
                "hubs": hubs,
                "vehicles": vehicles,
            },
        }

    except Exception as e:
        logger.exception("Failed to fetch latest optimization")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs")
async def get_machine_runs(db: AsyncSession = Depends(get_db)):
    """Fetch all machine-generated optimization runs"""
    try:
        q = (
            select(OptimizationRun)
            .where(OptimizationRun.trigger_type == "machine_generated_optimization")
            .order_by(OptimizationRun.started_at.desc())
        )
        res = await db.execute(q)
        runs = res.scalars().all()

        data = []
        for r in runs:
            run_data = {
                "id": str(r.id),
                "trigger_type": r.trigger_type,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "results_summary": r.results_summary or {},
            }

            if hasattr(r, "created_at") and r.created_at:
                run_data["created_at"] = r.created_at.isoformat()
            if hasattr(r, "updated_at") and r.updated_at:
                run_data["updated_at"] = r.updated_at.isoformat()

            data.append(run_data)

        return {"status": "success", "data": data}

    except Exception as e:
        logger.exception("❌ Failed to fetch machine runs")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manual")
async def get_manual_runs(db: AsyncSession = Depends(get_db)):
    """Fetch all manually updated optimization runs"""
    try:
        q = (
            select(OptimizationRun)
            .where(OptimizationRun.trigger_type == "manual_update_optimization")
            .order_by(OptimizationRun.started_at.desc())
        )
        res = await db.execute(q)
        runs = res.scalars().all()

        data = []
        for r in runs:
            run_data = {
                "id": str(r.id),
                "trigger_type": r.trigger_type,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "results_summary": r.results_summary or {},
            }

            if hasattr(r, "created_at") and r.created_at:
                run_data["created_at"] = r.created_at.isoformat()
            if hasattr(r, "updated_at") and r.updated_at:
                run_data["updated_at"] = r.updated_at.isoformat()

            data.append(run_data)

        return {"status": "success", "data": data}

    except Exception as e:
        logger.exception("❌ Failed to fetch manual runs")
        raise HTTPException(status_code=500, detail=str(e))
