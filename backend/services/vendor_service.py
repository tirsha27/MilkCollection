"""
Vendor Service
Business logic for vendor operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import List, Optional, Dict
import uuid

from models.vendor import Vendor
from schemas.vendor import VendorCreate, VendorUpdate
from utils.conversions import cans_to_liters, generate_vendor_code, extract_code_number


class VendorService:
    """Service class for vendor operations"""
    
    @staticmethod
    async def bulk_create_from_excel(
        db: AsyncSession,
        vendors_data: List[Dict]
    ) -> Dict:
        """
        Bulk insert vendors from Excel upload
        
        Args:
            db: Database session
            vendors_data: List of vendor dictionaries from Excel
            
        Returns:
            Dictionary with batch_id and inserted count
        """
        batch_id = str(uuid.uuid4())
        
        # Get last vendor code number
        result = await db.execute(
            select(Vendor)
            .order_by(desc(Vendor.vendor_code))
            .limit(1)
        )
        last_vendor = result.scalar_one_or_none()
        
        # Extract last number from code (V001 -> 1)
        last_num = 0
        if last_vendor and last_vendor.vendor_code:
            last_num = extract_code_number(last_vendor.vendor_code)
        
        # Prepare vendors for insertion
        vendors_to_insert = []
        for idx, vendor_dict in enumerate(vendors_data):
            vendor_code = generate_vendor_code(last_num + idx)
            
            vendor = Vendor(
                vendor_code=vendor_code,
                vendor_name=vendor_dict["vendor_name"],
                village=vendor_dict["village"],
                latitude=vendor_dict["latitude"],
                longitude=vendor_dict["longitude"],
                contact_number=vendor_dict.get("contact_number"),
                milk_quantity_cans=vendor_dict["milk_quantity_cans"],
                milk_quantity_liters=cans_to_liters(vendor_dict["milk_quantity_cans"]),
                is_active=True,
                upload_batch_id=batch_id
            )
            vendors_to_insert.append(vendor)
        
        # Bulk insert
        db.add_all(vendors_to_insert)
        await db.commit()
        
        return {
            "batch_id": batch_id,
            "inserted_count": len(vendors_to_insert),
            "vendor_codes": [v.vendor_code for v in vendors_to_insert]
        }
    
    @staticmethod
    async def get_all_vendors(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> Dict:
        """
        Get all vendors with pagination and filtering
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum records to return
            is_active: Filter by active status
            search: Search in vendor_name or village
            
        Returns:
            Dictionary with vendors list and metadata
        """
        # Build query
        query = select(Vendor)
        
        # Apply filters
        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Vendor.vendor_name.ilike(search_term),
                    Vendor.village.ilike(search_term),
                    Vendor.vendor_code.ilike(search_term)
                )
            )
        
        # Count total
        count_query = select(func.count()).select_from(Vendor)
        if is_active is not None:
            count_query = count_query.where(Vendor.is_active == is_active)
        if search:
            search_term = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Vendor.vendor_name.ilike(search_term),
                    Vendor.village.ilike(search_term),
                    Vendor.vendor_code.ilike(search_term)
                )
            )
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Get paginated results
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
        """
        Get single vendor by ID
        
        Args:
            db: Database session
            vendor_id: Vendor ID
            
        Returns:
            Vendor object or None
        """
        result = await db.execute(
            select(Vendor).where(Vendor.id == vendor_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_vendor_by_code(db: AsyncSession, vendor_code: str) -> Optional[Vendor]:
        """
        Get vendor by vendor code
        
        Args:
            db: Database session
            vendor_code: Vendor code (e.g., V001)
            
        Returns:
            Vendor object or None
        """
        result = await db.execute(
            select(Vendor).where(Vendor.vendor_code == vendor_code)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_vendor(
        db: AsyncSession,
        vendor_id: int,
        vendor_update: VendorUpdate
    ) -> Optional[Vendor]:
        """
        Update vendor details
        
        Args:
            db: Database session
            vendor_id: Vendor ID
            vendor_update: Updated vendor data
            
        Returns:
            Updated vendor or None if not found
        """
        vendor = await VendorService.get_vendor_by_id(db, vendor_id)
        if not vendor:
            return None
        
        # Update fields
        update_data = vendor_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "milk_quantity_cans" and value is not None:
                # Update both cans and liters
                vendor.milk_quantity_cans = value
                vendor.milk_quantity_liters = cans_to_liters(value)
            else:
                setattr(vendor, field, value)
        
        await db.commit()
        await db.refresh(vendor)
        return vendor
    
    @staticmethod
    async def delete_vendor(db: AsyncSession, vendor_id: int) -> Optional[Dict]:
        """
        Soft delete vendor (mark as inactive)
        
        Args:
            db: Database session
            vendor_id: Vendor ID
            
        Returns:
            Success message or None if not found
        """
        vendor = await VendorService.get_vendor_by_id(db, vendor_id)
        if not vendor:
            return None
        
        vendor.is_active = False
        await db.commit()
        
        return {"message": f"Vendor {vendor.vendor_code} deactivated successfully"}
    
    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict:
        """
        Get vendor statistics
        
        Returns:
            Dictionary with stats
        """
        # Total vendors
        total_result = await db.execute(select(func.count()).select_from(Vendor))
        total = total_result.scalar()
        
        # Active vendors
        active_result = await db.execute(
            select(func.count()).select_from(Vendor).where(Vendor.is_active == True)
        )
        active = active_result.scalar()
        
        # Total milk quantity
        milk_result = await db.execute(
            select(func.sum(Vendor.milk_quantity_liters)).where(Vendor.is_active == True)
        )
        total_milk_liters = milk_result.scalar() or 0
        
        return {
            "total_vendors": total,
            "active_vendors": active,
            "inactive_vendors": total - active,
            "total_milk_liters": round(total_milk_liters, 2),
            "total_milk_cans": round(total_milk_liters / 40, 2)
        }
