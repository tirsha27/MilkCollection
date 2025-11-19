"""
Fleet Service
Business logic for fleet operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_
from typing import List, Optional, Dict
import uuid
import logging

from models.fleet import Fleet
from schemas.fleet import FleetCreate, FleetUpdate
from utils.conversions import cans_to_liters, generate_fleet_code, extract_code_number

logger = logging.getLogger(__name__)


class FleetService:
    """Service class for fleet operations"""
    
    @staticmethod
    async def bulk_create_from_excel(db: AsyncSession, fleet_data: List[Dict]) -> Dict:
        logger.info(f"📥 Starting bulk insert for {len(fleet_data)} vehicles")

        batch_id = str(uuid.uuid4())

        result = await db.execute(
            select(Fleet).order_by(desc(Fleet.vehicle_code)).limit(1)
        )
        last_fleet = result.scalar_one_or_none()
        last_num = extract_code_number(last_fleet.vehicle_code) if last_fleet else 0

        fleet_to_insert = []
        for idx, vehicle_dict in enumerate(fleet_data):
            vehicle_code = generate_fleet_code(last_num + idx + 1)

            vehicle = Fleet(
                vehicle_code=vehicle_code,
                vehicle_name=vehicle_dict["vehicle_name"],
                vehicle_number=vehicle_dict["vehicle_number"],
                category=vehicle_dict["category"],
                capacity_cans=vehicle_dict["capacity_cans"],
                capacity_liters=cans_to_liters(vehicle_dict["capacity_cans"]),
                realistic_specs=vehicle_dict["realistic_specs"],
                driver_details=vehicle_dict.get("driver_details"),
                is_available=True,
                upload_batch_id=batch_id
            )
            fleet_to_insert.append(vehicle)

        db.add_all(fleet_to_insert)
        await db.commit()

        return {
            "batch_id": batch_id,
            "inserted_count": len(fleet_to_insert),
            "vehicle_codes": [f.vehicle_code for f in fleet_to_insert]
        }

    @staticmethod
    async def get_all_fleet(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        is_available: Optional[bool] = None,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict:

        query = select(Fleet)

        if is_available is not None:
            query = query.where(Fleet.is_available == is_available)

        if category:
            query = query.where(Fleet.category == category.lower())

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Fleet.vehicle_name.ilike(search_term),
                    Fleet.vehicle_number.ilike(search_term),
                    Fleet.vehicle_code.ilike(search_term)
                )
            )

        count_query = select(func.count()).select_from(Fleet)
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        query = query.offset(skip).limit(limit).order_by(Fleet.created_at.desc())
        result = await db.execute(query)
        fleet = result.scalars().all()

        return {
            "fleet": fleet,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1
        }

    @staticmethod
    async def get_fleet_by_id(db: AsyncSession, fleet_id: int):
        result = await db.execute(
            select(Fleet).where(Fleet.id == fleet_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_fleet(db: AsyncSession, fleet_id: int, fleet_update: FleetUpdate):
        vehicle = await FleetService.get_fleet_by_id(db, fleet_id)
        if not vehicle:
            return None

        update_data = fleet_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "capacity_cans" and value is not None:
                vehicle.capacity_cans = value
                vehicle.capacity_liters = cans_to_liters(value)
            else:
                setattr(vehicle, field, value)

        await db.commit()
        await db.refresh(vehicle)
        return vehicle

    @staticmethod
    async def delete_fleet(db: AsyncSession, fleet_id: int):
        vehicle = await FleetService.get_fleet_by_id(db, fleet_id)
        if not vehicle:
            return None

        vehicle.is_available = False
        await db.commit()

        return {"message": f"Fleet {vehicle.vehicle_code} marked as unavailable"}

    # -------------------------------------------------------------------
    # ✅ FIXED get_stats() — FULL & CLEAN
    # -------------------------------------------------------------------
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:
        """Return complete fleet statistics for dashboard"""

        # 1. Total vehicles
        total = (await db.execute(select(func.count()).select_from(Fleet))).scalar() or 0

        # 2. Available vehicles
        available = (
            await db.execute(
                select(func.count()).select_from(Fleet).where(Fleet.is_available == True)
            )
        ).scalar() or 0

        # 3. REAL FIX FOR UNASSIGNED VEHICLES
        unassigned_query = await db.execute(
            select(Fleet.vehicle_number).where(
                or_(
                    Fleet.chilling_center_id.is_(None),
                    Fleet.chilling_center_id == "",
                    Fleet.chilling_center_id == " ",
                    Fleet.chilling_center_id == "  ",
                    Fleet.chilling_center_id.ilike("null"),
                    Fleet.chilling_center_id.ilike("none")
                )
            )
        )
        unassigned_list = [row[0] for row in unassigned_query.all()]
        unassigned_count = len(unassigned_list)

        # 4. Assigned = total - unassigned
        assigned_count = total - unassigned_count

        # 5. Category split
        mini_count = (
            await db.execute(select(func.count()).select_from(Fleet).where(Fleet.category == "mini"))
        ).scalar() or 0

        small_count = (
            await db.execute(select(func.count()).select_from(Fleet).where(Fleet.category == "small"))
        ).scalar() or 0

        # 6. FULLY LOADED + HALF LOADED
        fully_loaded = 0
        half_loaded = 0

        vehicles = (await db.execute(select(Fleet))).scalars().all()
        for v in vehicles:
            util = None
            if v.realistic_specs and isinstance(v.realistic_specs, dict):
                util = v.realistic_specs.get("utilization_pct", None)

            if util is None:
                continue
            
            if util >= 70:
                fully_loaded += 1
            elif 50 <= util < 70:
                half_loaded += 1

        # 7. Total capacity
        total_capacity = (
            await db.execute(select(func.sum(Fleet.capacity_liters)))
        ).scalar() or 0

        # 8. FINAL CLEAN RESPONSE
        return {
            "total_vehicles": total,
            "assigned_vehicles": assigned_count,
            "unassigned_vehicles": unassigned_count,
            "unassigned_vehicle_numbers": unassigned_list,
            "fully_loaded": fully_loaded,
            "half_loaded": half_loaded,
            "available_vehicles": available,
            "unavailable_vehicles": total - available,
            "total_capacity_liters": float(total_capacity),
            "mini_vehicles": mini_count,
            "small_vehicles": small_count
        }
