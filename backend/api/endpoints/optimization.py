# backend/api/endpoints/optimization.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.session import get_db
from models.optimization import OptimizationRun

router = APIRouter(prefix="/optimization", tags=["Optimization"])

# ✅ Get all machine-generated optimization runs
@router.get("/runs")
async def get_machine_optimizations(db: AsyncSession = Depends(get_db)):
    try:
        q = select(OptimizationRun).where(
            OptimizationRun.trigger_type == "machine_generated_optimization"
        ).order_by(OptimizationRun.created_at.desc())
        res = await db.execute(q)
        runs = res.scalars().all()

        return {
            "status": "success",
            "data": [
                {
                    "id": str(r.id),
                    "trigger_type": r.trigger_type,
                    "status": r.status,
                    "results_summary": r.results_summary,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                }
                for r in runs
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ Get all manual (drag-drop) optimizations
@router.get("/manual")
async def get_manual_optimizations(db: AsyncSession = Depends(get_db)):
    try:
        q = select(OptimizationRun).where(
            OptimizationRun.trigger_type == "manual_update_optimization"
        ).order_by(OptimizationRun.created_at.desc())
        res = await db.execute(q)
        runs = res.scalars().all()

        return {
            "status": "success",
            "data": [
                {
                    "id": str(r.id),
                    "trigger_type": r.trigger_type,
                    "status": r.status,
                    "results_summary": r.results_summary,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                }
                for r in runs
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
