"""
Fleet Service
Business logic for fleet operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import List, Optional, Dict
import uuid
import logging

from models.fleet import Fleet
from schemas.fleet import FleetCreate, FleetUpdate
from utils.conversions import cans_to_liters, generate_fleet_code, extract_code_number

logger = logging.getLogger(__name__)


class FleetService:
    """Service class for fleet operations"""
    
    @staticmethod  # ✅ CRITICAL FIX!
    async def bulk_create_from_excel(
        db: AsyncSession,
        fleet_data: List[Dict]
    ) -> Dict:
        """Bulk insert fleet from Excel"""
        logger.info(f"📥 Starting bulk insert for {len(fleet_data)} vehicles")
        
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
        
        logger.info(f"📊 Last vehicle code number: {last_num}")
        
        fleet_to_insert = []
        for idx, vehicle_dict in enumerate(fleet_data):
            vehicle_code = generate_fleet_code(last_num + idx + 1)
            logger.info(f"🚚 Creating vehicle: {vehicle_code}")
            
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
        
        logger.info(f"➕ Adding {len(fleet_to_insert)} vehicles to session")
        db.add_all(fleet_to_insert)
        
        logger.info("💾 Committing to database...")
        await db.commit()
        logger.info("✅ Commit successful!")
        
        # Verify insertion
        verify_result = await db.execute(select(func.count()).select_from(Fleet))
        total_count = verify_result.scalar()
        logger.info(f"📊 Total vehicles in database: {total_count}")
        
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
        """Get all fleet with pagination"""
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
        
        # Count total
        count_query = select(func.count()).select_from(Fleet)
        if is_available is not None:
            count_query = count_query.where(Fleet.is_available == is_available)
        if category:
            count_query = count_query.where(Fleet.category == category.lower())
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Fleet.vehicle_name.ilike(search_term),
                    Fleet.vehicle_number.ilike(search_term),
                    Fleet.vehicle_code.ilike(search_term)
                )
            )
        
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
            "page": (skip // limit) + 1 if limit > 0 else 1
        }
    
    @staticmethod
    async def get_fleet_by_id(db: AsyncSession, fleet_id: int) -> Optional[Fleet]:
        """Get single fleet by ID"""
        result = await db.execute(
            select(Fleet).where(Fleet.id == fleet_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_fleet(
        db: AsyncSession,
        fleet_id: int,
        fleet_update: FleetUpdate
    ) -> Optional[Fleet]:
        """Update fleet"""
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
    async def delete_fleet(db: AsyncSession, fleet_id: int) -> Optional[Dict]:
        """Mark fleet as unavailable (soft delete)"""
        vehicle = await FleetService.get_fleet_by_id(db, fleet_id)
        if not vehicle:
            return None
        
        vehicle.is_available = False
        await db.commit()
        
        return {"message": f"Fleet {vehicle.vehicle_code} marked as unavailable"}
    
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:
        """Get fleet statistics"""
        total_result = await db.execute(select(func.count()).select_from(Fleet))
        total = total_result.scalar()
        
        available_result = await db.execute(
            select(func.count()).select_from(Fleet).where(Fleet.is_available == True)
        )
        available = available_result.scalar()
        
        # Total capacity
        capacity_result = await db.execute(
            select(func.sum(Fleet.capacity_liters)).where(Fleet.is_available == True)
        )
        total_capacity = capacity_result.scalar() or 0
        
        # By category
        mini_result = await db.execute(
            select(func.count()).select_from(Fleet).where(
                Fleet.category == 'mini',
                Fleet.is_available == True
            )
        )
        mini_count = mini_result.scalar()
        
        small_result = await db.execute(
            select(func.count()).select_from(Fleet).where(
                Fleet.category == 'small',
                Fleet.is_available == True
            )
        )
        small_count = small_result.scalar()
        
        return {
            "total_vehicles": total,
            "available_vehicles": available,
            "unavailable_vehicles": total - available,
            "total_capacity_liters": round(total_capacity, 2),
            "total_capacity_cans": round(total_capacity / 40, 2),
            "mini_vehicles": mini_count,
            "small_vehicles": small_count
        }
