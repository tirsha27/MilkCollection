"""
Storage Hub Service
Business logic for storage hub operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import List, Optional, Dict
import uuid

from models.storage_hub import StorageHub
from schemas.storage_hub import StorageHubCreate, StorageHubUpdate
from utils.conversions import liters_to_cans, generate_storage_hub_code, extract_code_number


class StorageHubService:
    """Service class for storage hub operations"""
    
    @staticmethod
    async def bulk_create_from_excel(
        db: AsyncSession,
        hubs_data: List[Dict]
    ) -> Dict:
        """Bulk insert storage hubs from Excel"""
        batch_id = str(uuid.uuid4())
        
        # Get last hub code
        result = await db.execute(
            select(StorageHub)
            .order_by(desc(StorageHub.hub_code))
            .limit(1)
        )
        last_hub = result.scalar_one_or_none()
        
        last_num = 0
        if last_hub and last_hub.hub_code:
            last_num = extract_code_number(last_hub.hub_code)
        
        hubs_to_insert = []
        for idx, hub_dict in enumerate(hubs_data):
            hub_code = generate_storage_hub_code(last_num + idx)
            
            hub = StorageHub(
                hub_code=hub_code,
                hub_name=hub_dict["hub_name"],
                location=hub_dict["location"],
                latitude=hub_dict["latitude"],
                longitude=hub_dict["longitude"],
                contact_number=hub_dict.get("contact_number"),
                capacity_liters=hub_dict["capacity_liters"],
                capacity_cans=liters_to_cans(hub_dict["capacity_liters"]),
                current_load_liters=0.0,
                current_load_cans=0.0,
                is_active=True,
                upload_batch_id=batch_id
            )
            hubs_to_insert.append(hub)
        
        db.add_all(hubs_to_insert)
        await db.commit()
        
        return {
            "batch_id": batch_id,
            "inserted_count": len(hubs_to_insert),
            "hub_codes": [h.hub_code for h in hubs_to_insert]
        }
    
    @staticmethod
    async def get_all_hubs(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> Dict:
        """Get all storage hubs with pagination"""
        query = select(StorageHub)
        
        if is_active is not None:
            query = query.where(StorageHub.is_active == is_active)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    StorageHub.hub_name.ilike(search_term),
                    StorageHub.location.ilike(search_term),
                    StorageHub.hub_code.ilike(search_term)
                )
            )
        
        # Count total
        count_query = select(func.count()).select_from(StorageHub)
        if is_active is not None:
            count_query = count_query.where(StorageHub.is_active == is_active)
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    StorageHub.hub_name.ilike(search_term),
                    StorageHub.location.ilike(search_term),
                    StorageHub.hub_code.ilike(search_term)
                )
            )
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        query = query.offset(skip).limit(limit).order_by(StorageHub.created_at.desc())
        result = await db.execute(query)
        hubs = result.scalars().all()
        
        return {
            "storage_hubs": hubs,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1 if limit > 0 else 1
        }
    
    @staticmethod
    async def get_hub_by_id(db: AsyncSession, hub_id: int) -> Optional[StorageHub]:
        """Get single storage hub by ID"""
        result = await db.execute(
            select(StorageHub).where(StorageHub.id == hub_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_hub(
        db: AsyncSession,
        hub_id: int,
        hub_update: StorageHubUpdate
    ) -> Optional[StorageHub]:
        """Update storage hub"""
        hub = await StorageHubService.get_hub_by_id(db, hub_id)
        if not hub:
            return None
        
        update_data = hub_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "capacity_liters" and value is not None:
                hub.capacity_liters = value
                hub.capacity_cans = liters_to_cans(value)
            elif field == "current_load_liters" and value is not None:
                hub.current_load_liters = value
                hub.current_load_cans = liters_to_cans(value)
            else:
                setattr(hub, field, value)
        
        await db.commit()
        await db.refresh(hub)
        return hub
    
    @staticmethod
    async def delete_hub(db: AsyncSession, hub_id: int) -> Optional[Dict]:
        """Soft delete storage hub"""
        hub = await StorageHubService.get_hub_by_id(db, hub_id)
        if not hub:
            return None
        
        hub.is_active = False
        await db.commit()
        
        return {"message": f"Storage Hub {hub.hub_code} deactivated successfully"}
    
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:
        """Get storage hub statistics"""
        total_result = await db.execute(select(func.count()).select_from(StorageHub))
        total = total_result.scalar()
        
        active_result = await db.execute(
            select(func.count()).select_from(StorageHub).where(StorageHub.is_active == True)
        )
        active = active_result.scalar()
        
        # Total capacity
        capacity_result = await db.execute(
            select(func.sum(StorageHub.capacity_liters)).where(StorageHub.is_active == True)
        )
        total_capacity = capacity_result.scalar() or 0
        
        # Current load
        load_result = await db.execute(
            select(func.sum(StorageHub.current_load_liters)).where(StorageHub.is_active == True)
        )
        current_load = load_result.scalar() or 0
        
        return {
            "total_hubs": total,
            "active_hubs": active,
            "inactive_hubs": total - active,
            "total_capacity_liters": round(total_capacity, 2),
            "current_load_liters": round(current_load, 2),
            "available_capacity_liters": round(total_capacity - current_load, 2),
            "utilization_percentage": round((current_load / total_capacity * 100) if total_capacity > 0 else 0, 2)
        }
