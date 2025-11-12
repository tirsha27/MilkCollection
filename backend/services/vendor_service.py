# backend/services/vendor_service.py
"""
Vendor Service
Business logic for vendor operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, insert
from typing import List, Optional, Dict
import uuid

from models.vendor import Vendor
from schemas.vendor import VendorCreate, VendorUpdate
from utils.conversions import cans_to_liters, generate_vendor_code, extract_code_number

class VendorService:
    """Service class for vendor operations"""

    @staticmethod
    async def create_vendor(db: AsyncSession, vendor_create: VendorCreate) -> Vendor:
        """
        Create a new vendor manually (returns SQLAlchemy Vendor instance)
        """
        # Get last vendor code
        result = await db.execute(
            select(Vendor)
            .order_by(desc(Vendor.vendor_code))
            .limit(1)
        )
        last_vendor = result.scalar_one_or_none()

        last_num = 0
        if last_vendor and last_vendor.vendor_code:
            last_num = extract_code_number(last_vendor.vendor_code)

        new_vendor_code = generate_vendor_code(last_num + 1)

        liters = cans_to_liters(vendor_create.milk_quantity_cans) if vendor_create.milk_quantity_cans else 0.0

        vendor = Vendor(
            vendor_code=new_vendor_code,
            vendor_name=vendor_create.vendor_name,
            village=vendor_create.village or "",
            latitude=vendor_create.latitude or 0.0,
            longitude=vendor_create.longitude or 0.0,
            contact_number=vendor_create.contact_number,
            milk_quantity_cans=vendor_create.milk_quantity_cans or 0,
            milk_quantity_liters=liters,
            is_active=True
        )

        db.add(vendor)
        await db.commit()
        await db.refresh(vendor)

        return vendor

    @staticmethod
    async def bulk_create_from_excel(db: AsyncSession, vendors_data: List[Dict]) -> Dict:
        batch_id = str(uuid.uuid4())

        result = await db.execute(
            select(Vendor).order_by(desc(Vendor.vendor_code)).limit(1)
        )
        last_vendor = result.scalar_one_or_none()

        last_num = 0
        if last_vendor and last_vendor.vendor_code:
            last_num = extract_code_number(last_vendor.vendor_code)

        vendors_to_insert = []
        for idx, vendor_dict in enumerate(vendors_data):
            vendor_code = generate_vendor_code(last_num + idx + 1)
            vendor = Vendor(
                vendor_code=vendor_code,
                vendor_name=vendor_dict["vendor_name"],
                village=vendor_dict.get("village", ""),
                latitude=vendor_dict.get("latitude", 0.0),
                longitude=vendor_dict.get("longitude", 0.0),
                contact_number=vendor_dict.get("contact_number"),
                milk_quantity_cans=vendor_dict.get("milk_quantity_cans", 0.0),
                milk_quantity_liters=cans_to_liters(vendor_dict.get("milk_quantity_cans", 0.0)),
                is_active=True,
                upload_batch_id=batch_id
            )
            vendors_to_insert.append(vendor)

        db.add_all(vendors_to_insert)
        await db.commit()

        return {
            "batch_id": batch_id,
            "inserted_count": len(vendors_to_insert),
            "vendor_codes": [v.vendor_code for v in vendors_to_insert]
        }

    @staticmethod
    async def get_all_vendors(db: AsyncSession, skip: int = 0, limit: int = 50, is_active: Optional[bool] = None, search: Optional[str] = None) -> Dict:
        query = select(Vendor)

        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Vendor.vendor_name.ilike(search_term),
                    Vendor.village.ilike(search_term),
                    Vendor.vendor_code.ilike(search_term),
                )
            )

        count_query = select(func.count()).select_from(Vendor)
        if is_active is not None:
            count_query = count_query.where(Vendor.is_active == is_active)
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Vendor.vendor_name.ilike(search_term),
                    Vendor.village.ilike(search_term),
                    Vendor.vendor_code.ilike(search_term),
                )
            )

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        query = query.offset(skip).limit(limit).order_by(Vendor.created_at.desc())
        result = await db.execute(query)
        vendors = result.scalars().all()

        return {
            "vendors": vendors,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1 if limit > 0 else 1
        }

    @staticmethod
    async def get_vendor_by_id(db: AsyncSession, vendor_id: int) -> Optional[Vendor]:
        result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_vendor_by_code(db: AsyncSession, vendor_code: str) -> Optional[Vendor]:
        result = await db.execute(select(Vendor).where(Vendor.vendor_code == vendor_code))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_vendor(db: AsyncSession, vendor_id: int, vendor_update: VendorUpdate) -> Optional[Vendor]:
        vendor = await VendorService.get_vendor_by_id(db, vendor_id)
        if not vendor:
            return None

        update_data = vendor_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "milk_quantity_cans" and value is not None:
                vendor.milk_quantity_cans = value
                vendor.milk_quantity_liters = cans_to_liters(value)
            else:
                setattr(vendor, field, value)

        await db.commit()
        await db.refresh(vendor)
        return vendor

    @staticmethod
    async def delete_vendor(db: AsyncSession, vendor_id: int) -> Optional[Dict]:
        vendor = await VendorService.get_vendor_by_id(db, vendor_id)
        if not vendor:
            return None
        vendor.is_active = False
        await db.commit()
        return {"message": f"Vendor {vendor.vendor_code} deactivated successfully"}

    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:
        total_result = await db.execute(select(func.count()).select_from(Vendor))
        total = total_result.scalar()

        active_result = await db.execute(select(func.count()).select_from(Vendor).where(Vendor.is_active == True))
        active = active_result.scalar()

        milk_result = await db.execute(select(func.sum(Vendor.milk_quantity_liters)).where(Vendor.is_active == True))
        total_milk_liters = milk_result.scalar() or 0

        return {
            "total_vendors": total,
            "active_vendors": active,
            "inactive_vendors": total - active,
            "total_milk_liters": round(total_milk_liters, 2),
            "total_milk_cans": round(total_milk_liters / 40, 2)
        }
