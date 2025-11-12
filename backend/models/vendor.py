# backend/models/vendor.py
"""
Vendor Model - SQLAlchemy ORM
Database table for milk vendors/suppliers
"""
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from database.session import Base

class Vendor(Base):
    """
    Vendor/Milk Supplier Table
    Stores information about milk collection vendors
    """
    __tablename__ = "vendors"
    
    # Primary Key (Integer autoincrement to match existing DB schema)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Vendor Information
    vendor_code = Column(String(10), unique=True, nullable=False, index=True)  # V001, V002...
    vendor_name = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    
    # Location (separate columns - no PostGIS)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    
    # Contact Information
    contact_number = Column(String(10), nullable=True)
    
    # Milk Quantities
    # INPUT: User provides milk_quantity_cans
    # AUTO: Backend calculates milk_quantity_liters (cans × 40)
    milk_quantity_cans = Column(Float, nullable=False, default=0.0)
    milk_quantity_liters = Column(Float, nullable=False, default=0.0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    upload_batch_id = Column(String(36), nullable=True)  # UUID for Excel upload tracking
    
    # Timestamps (auto-managed by database)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<Vendor {self.vendor_code}: {self.vendor_name} ({self.village})>"
