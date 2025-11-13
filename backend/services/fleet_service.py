"""
Fleet Service
Business logic for fleet operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import List, Optional, Dict
import uuid

from models.fleet import Fleet
from schemas.fleet import FleetCreate, FleetUpdate
from utils.conversions import cans_to_liters, generate_fleet_code, extract_code_number


class FleetService:
    """Service class for fleet operations"""

    # --------------------------------------------------------
    # ✅ CREATE FLEET (Single Create)
    # --------------------------------------------------------
    @staticmethod
    async def create_fleet(db: AsyncSession, fleet_create: FleetCreate) -> Fleet:
        """
        Create a new fleet/vehicle manually
        """

        # Get last generated fleet code
        result = await db.execute(
            select(Fleet)
            .order_by(desc(Fleet.vehicle_code))
            .limit(1)
        )
        last_fleet = result.scalar_one_or_none()

        last_num = 0
        if last_fleet and last_fleet.vehicle_code:
            last_num = extract_code_number(last_fleet.vehicle_code)

        # Generate new fleet code (F001...)
        vehicle_code = generate_fleet_code(last_num + 1)

        # Convert cans → liters
        capacity_liters = cans_to_liters(fleet_create.capacity_cans)

        new_fleet = Fleet(
            vehicle_code=vehicle_code,
            vehicle_name=fleet_create.vehicle_name,
            vehicle_number=fleet_create.vehicle_number,
            category=fleet_create.category,
            capacity_cans=fleet_create.capacity_cans,
            capacity_liters=capacity_liters,
            realistic_specs=fleet_create.realistic_specs.dict(),
            driver_details=(
                fleet_create.driver_details.dict()
                if fleet_create.driver_details
                else None
            ),
            current_latitude=getattr(fleet_create, "current_latitude", None),
            current_longitude=getattr(fleet_create, "current_longitude", None),
            is_available=True,
        )

        db.add(new_fleet)
        await db.commit()
        await db.refresh(new_fleet)
        return new_fleet

    # --------------------------------------------------------
    # ✅ BULK UPLOAD
    # --------------------------------------------------------
    @staticmethod
    async def bulk_create_from_excel(
        db: AsyncSession,
        fleet_data: List[Dict]
    ) -> Dict:
        """Bulk insert fleet data from Excel"""
        batch_id = str(uuid.uuid4())

        # Get last fleet code
        result = await db.execute(
            select(Fleet)
            .order_by(desc(Fleet.vehicle_code))
            .limit(1)
        )
        last_fleet = result.scalar_one_or_none()

        last_num = 0
        if last_fleet and last_fleet.vehicle_code:
            last_num = extract_code_number(last_fleet.vehicle_code)

        fleet_to_insert = []
        for idx, vehicle_dict in enumerate(fleet_data):
            vehicle_code = generate_fleet_code(last_num + idx)

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
            "vehicle_codes": [f.vehicle_code for f in fleet_to_insert],
        }

    # --------------------------------------------------------
    # ✅ SINGLE FLEET CREATION (non-Excel)
    # --------------------------------------------------------
    @staticmethod
    async def create_single_fleet(db: AsyncSession, fleet_data: FleetCreate) -> Fleet:
        """Create a single fleet record manually (non-Excel)"""
        # Find last fleet code
        result = await db.execute(
            select(Fleet).order_by(desc(Fleet.vehicle_code)).limit(1)
        )
        last_fleet = result.scalar_one_or_none()
        last_num = extract_code_number(last_fleet.vehicle_code) if last_fleet else 0

        new_code = generate_fleet_code(last_num + 1)

        new_fleet = Fleet(
            vehicle_code=new_code,
            vehicle_name=fleet_data.vehicle_name,
            vehicle_number=fleet_data.vehicle_number,
            category=fleet_data.category,
            capacity_cans=fleet_data.capacity_cans,
            capacity_liters=fleet_data.capacity_cans * 40,
            model=fleet_data.model,
            manufacturer=fleet_data.manufacturer,
            fuel_type=fleet_data.fuel_type,
            driver_name=fleet_data.driver_name,
            driver_contact=fleet_data.driver_contact,
            is_available=True,
        )

        db.add(new_fleet)
        await db.commit()
        await db.refresh(new_fleet)
        return new_fleet

    # --------------------------------------------------------
    # ✅ GET ALL FLEET
    # --------------------------------------------------------
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
                    Fleet.vehicle_code.ilike(search_term),
                )
            )

        # Count total
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
            "page": (skip // limit) + 1 if limit > 0 else 1,
        }

    # --------------------------------------------------------
    # ✅ GET FLEET BY ID
    # --------------------------------------------------------
    @staticmethod
    async def get_fleet_by_id(db: AsyncSession, fleet_id: int) -> Optional[Fleet]:
        result = await db.execute(select(Fleet).where(Fleet.id == fleet_id))
        return result.scalar_one_or_none()

    # --------------------------------------------------------
    # ✅ UPDATE
    # --------------------------------------------------------
    @staticmethod
    async def update_fleet(
        db: AsyncSession,
        fleet_id: int,
        fleet_update: FleetUpdate
    ) -> Optional[Fleet]:
        print("fleet_update1")
        vehicle = await FleetService.get_fleet_by_id(db, fleet_id)
        if not vehicle:
            return None
        print("fleet_update")
        print(fleet_update)
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

    # --------------------------------------------------------
    # ✅ DELETE → mark unavailable
    # --------------------------------------------------------
    @staticmethod
    async def delete_fleet(db: AsyncSession, fleet_id: int) -> Optional[Dict]:
        vehicle = await FleetService.get_fleet_by_id(db, fleet_id)
        if not vehicle:
            return None

        vehicle.is_available = False
        await db.commit()

        return {"message": f"Fleet {vehicle.vehicle_code} marked unavailable"}

    # --------------------------------------------------------
    # ✅ STATS
    # --------------------------------------------------------
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:

        total_result = await db.execute(select(func.count()).select_from(Fleet))
        total = total_result.scalar()

        available_result = await db.execute(
            select(func.count()).select_from(Fleet).where(Fleet.is_available == True)
        )
        available = available_result.scalar()

        capacity_result = await db.execute(
            select(func.sum(Fleet.capacity_liters)).where(Fleet.is_available == True)
        )
        total_capacity = capacity_result.scalar() or 0

        mini_result = await db.execute(
            select(func.count()).select_from(Fleet).where(Fleet.category == "mini")
        )
        mini_count = mini_result.scalar()

        small_result = await db.execute(
            select(func.count()).select_from(Fleet).where(Fleet.category == "small")
        )
        small_count = small_result.scalar()

        return {
            "total_vehicles": total,
            "available_vehicles": available,
            "unavailable_vehicles": total - available,
            "total_capacity_liters": round(total_capacity, 2),
            "total_capacity_cans": round(total_capacity / 40, 2),
            "mini_vehicles": mini_count,
            "small_vehicles": small_count,
        }

    # --------------------------------------------------------
    # ✅ CREATE VEHICLE (FROM FRONTEND FORM)
    # --------------------------------------------------------
    @staticmethod
    async def create_vehicle(db: AsyncSession, data: FleetCreate):
        """Create vehicle from frontend form"""
        from utils.conversions import liters_to_cans

        result = await db.execute(
            select(Fleet).order_by(desc(Fleet.vehicle_code)).limit(1)
        )
        last = result.scalar_one_or_none()
        last_num = extract_code_number(last.vehicle_code) if last else 0
        new_code = generate_fleet_code(last_num + 1)

        new_vehicle = Fleet(
            vehicle_code=new_code,
            vehicle_name=f"Vehicle {data.vehicle_number}",
            vehicle_number=data.vehicle_number,
            category="small",  # default or could be decided based on capacity
            capacity_cans=liters_to_cans(data.capacity_liters),
            capacity_liters=data.capacity_liters,
            chilling_center_id=data.chilling_center_id,
            realistic_specs={"model": "N/A", "manufacturer": "N/A", "fuel_type": "Diesel"},
            driver_details={
                "name": data.driver_name,
                "contact": data.driver_contact,
            }
            if data.driver_name or data.driver_contact
            else None,
            is_available=True,
        )

        db.add(new_vehicle)
        await db.commit()
        await db.refresh(new_vehicle)
        return new_vehicle
