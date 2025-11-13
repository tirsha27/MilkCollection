# backend/services/optimization_service.py
import os
import uuid
import math
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

# Adjust these imports to match your project layout
from backend.database.session import get_async_session  # dependency that yields AsyncSession
from backend.models.optimization import OptimizationRun  # SQLAlchemy model (has JSON columns input_config, result)

logger = logging.getLogger("optimization_service")
router = APIRouter(prefix="/api/v1/optimization", tags=["optimization"])


# -----------------
# Pydantic schemas
# -----------------
class FarmerInput(BaseModel):
    id: Optional[str]
    lat: float
    lng: float
    milk_liters: float = Field(..., ge=0)


class VehicleInput(BaseModel):
    vehicle_number: Optional[str]
    capacity_liters: float = Field(..., gt=0)
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None


class OptimizationInput(BaseModel):
    trigger_type: Optional[str] = "manual"
    deadline_minutes: Optional[int] = Field(480, ge=60, le=1440)
    max_distance_km: Optional[float] = Field(100.0, ge=10.0, le=500.0)
    vehicles: List[VehicleInput] = Field(..., min_items=1)
    farmers: List[FarmerInput] = Field(..., min_items=1)


class AssignedStop(BaseModel):
    farmer_id: Optional[str]
    lat: float
    lng: float
    milk_liters: float


class VehicleAssignment(BaseModel):
    vehicle_number: str
    assigned_stops: List[AssignedStop]
    total_milk: float
    distance_km: float
    travel_time_minutes: float
    utilization_percent: float


class OptimizationResult(BaseModel):
    run_id: str
    created_at: datetime
    clusters: List[Dict[str, Any]] = []
    vehicles: List[VehicleAssignment] = []
    summary: Dict[str, Any] = {}


# -----------------
# Utilities
# -----------------
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Calculate distance in kilometers between two lat/lon pairs
    R = 6371.0
    to_rad = math.pi / 180.0
    dlat = (lat2 - lat1) * to_rad
    dlon = (lon2 - lon1) * to_rad
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1 * to_rad) * math.cos(lat2 * to_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def clamp_utilization(percent: float) -> float:
    # Ensure utilization not above 100 and not negative
    return max(0.0, min(100.0, percent))


# Simple greedy assigner:
def greedy_assign(vehicles: List[VehicleInput], farmers: List[FarmerInput]) -> List[VehicleAssignment]:
    # Create working structures
    remaining = [
        {
            "farmer_id": f.id or f"farmer-{i}",
            "lat": f.lat,
            "lng": f.lng,
            "milk_liters": f.milk_liters,
            "assigned": False,
        }
        for i, f in enumerate(farmers)
    ]

    vehicle_assignments: List[VehicleAssignment] = []
    for vidx, v in enumerate(vehicles):
        vehicle_number = v.vehicle_number or f"VH-{vidx+1}"
        capacity = v.capacity_liters
        start_lat = v.start_lat if v.start_lat is not None else (remaining[0]["lat"] if remaining else 0.0)
        start_lng = v.start_lng if v.start_lng is not None else (remaining[0]["lng"] if remaining else 0.0)

        assigned_stops: List[AssignedStop] = []
        used_capacity = 0.0
        cur_lat, cur_lng = start_lat, start_lng
        # Greedily pick nearest farmer that fits
        while True:
            best_idx = None
            best_dist = float("inf")
            for idx, r in enumerate(remaining):
                if r["assigned"]:
                    continue
                if used_capacity + r["milk_liters"] > capacity:
                    continue
                d = haversine_km(cur_lat, cur_lng, r["lat"], r["lng"])
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            if best_idx is None:
                break
            r = remaining[best_idx]
            r["assigned"] = True
            assigned_stops.append(
                AssignedStop(
                    farmer_id=r["farmer_id"],
                    lat=r["lat"],
                    lng=r["lng"],
                    milk_liters=r["milk_liters"],
                )
            )
            used_capacity += r["milk_liters"]
            cur_lat, cur_lng = r["lat"], r["lng"]

        # Compute simple distance/time estimate: start -> each stop in order -> back to start
        total_dist = 0.0
        total_time = 0.0
        if assigned_stops:
            last_lat, last_lng = start_lat, start_lng
            for s in assigned_stops:
                d = haversine_km(last_lat, last_lng, s.lat, s.lng)
                total_dist += d
                # estimate time: assume 30 km/h avg speed (including stops)
                total_time += (d / 30.0) * 60.0
                last_lat, last_lng = s.lat, s.lng
            # back to start (optional)
            total_dist += haversine_km(last_lat, last_lng, start_lat, start_lng)

        utilization = clamp_utilization((used_capacity / capacity) * 100.0) if capacity > 0 else 0.0
        # Round as requested: vehicle-level round to 2 decimals in UI; here store with three decimals
        utilization = round(utilization, 3)

        vehicle_assignments.append(
            VehicleAssignment(
                vehicle_number=vehicle_number,
                assigned_stops=assigned_stops,
                total_milk=round(used_capacity, 3),
                distance_km=round(total_dist, 3),
                travel_time_minutes=round(total_time, 1),
                utilization_percent=utilization,
            )
        )

    # If any farmers remain unassigned, create a 'unassigned' summary
    # (This is important in packing problems)
    return vehicle_assignments


# -----------------
# Endpoints
# -----------------
@router.post("/run", response_model=OptimizationResult, status_code=status.HTTP_201_CREATED)
async def run_optimization(
    payload: OptimizationInput,
    session: AsyncSession = Depends(get_async_session),
    save_result: bool = Query(True, description="Save optimization result to DB"),
):
    """
    Run a basic optimization (greedy pack) and optionally persist result.
    """

    try:
        # Basic validation
        if not payload.vehicles or not payload.farmers:
            raise HTTPException(status_code=400, detail="vehicles and farmers must be provided")

        # Run greedy assigner (replace with ORS or more advanced solver later)
        assignments = greedy_assign(payload.vehicles, payload.farmers)

        run_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Compose result dict (consistent with front-end expectations)
        result = {
            "run_id": run_id,
            "created_at": now.isoformat() + "Z",
            "vehicles": [a.dict() for a in assignments],
            "summary": {
                "total_vehicles": len(assignments),
                "total_farmers": len(payload.farmers),
                "total_milk_collected_liters": round(sum(a.total_milk for a in assignments), 3),
            },
        }

        # Persist to DB if requested
        if save_result:
            db_obj = OptimizationRun(
                id=uuid.UUID(run_id),
                trigger_type=payload.trigger_type or "manual",
                input_config=payload.dict(),
                result=result,
                created_at=now,
            )
            session.add(db_obj)
            await session.commit()
            # refresh to get server defaults if any
            await session.refresh(db_obj)

        # Return result in consistent shape
        return OptimizationResult(
            run_id=run_id,
            created_at=now,
            clusters=[],
            vehicles=result["vehicles"],
            summary=result["summary"],
        )

    except SQLAlchemyError as e:
        logger.exception("Database error while running optimization")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Database error while saving optimization run")
    except Exception as e:
        logger.exception("Unexpected error in optimization")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", summary="List optimization runs")
async def list_runs(session: AsyncSession = Depends(get_async_session), limit: int = 50, offset: int = 0):
    try:
        q = select(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(limit).offset(offset)
        res = await session.execute(q)
        rows = res.scalars().all()
        out = []
        for r in rows:
            out.append(
                {
                    "id": str(r.id),
                    "trigger_type": r.trigger_type,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "summary": (r.result.get("summary") if isinstance(r.result, dict) else None),
                }
            )
        return {"data": out}
    except Exception:
        logger.exception("Failed to list runs")
        raise HTTPException(status_code=500, detail="Failed to list optimization runs")


@router.get("/{run_id}", summary="Get optimization run by id")
async def get_run(run_id: str, session: AsyncSession = Depends(get_async_session)):
    try:
        uid = uuid.UUID(run_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid run_id")

    try:
        q = select(OptimizationRun).where(OptimizationRun.id == uid)
        res = await session.execute(q)
        run = res.scalar_one_or_none()
        if not run:
            raise HTTPException(status_code=404, detail="Optimization run not found")
        return {"id": str(run.id), "trigger_type": run.trigger_type, "created_at": run.created_at, "input_config": run.input_config, "result": run.result}
    except Exception:
        logger.exception("Failed to fetch run")
        raise HTTPException(status_code=500, detail="Failed to fetch optimization run")
