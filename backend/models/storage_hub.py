"""
Storage Hub Model - SQLAlchemy ORM
Database table for storage hubs/collection centers
"""

from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from database.session import Base


class StorageHub(Base):
    """
    Storage Hub/Collection Center Table
    Stores information about milk storage and collection centers
    """
    __tablename__ = "storage_hubs"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Hub Information
    hub_code = Column(String(10), unique=True, nullable=False, index=True)  # SH001, SH002...
    hub_name = Column(String(100), unique=True, nullable=False)
    location = Column(String(200), nullable=False)
    
    # Location Coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Contact Information
    contact_number = Column(String(10), nullable=True)
    
    # Capacity
    # INPUT: User provides capacity_liters
    # AUTO: Backend calculates capacity_cans (liters ÷ 40)
    capacity_liters = Column(Float, nullable=False)
    capacity_cans = Column(Float, nullable=False)
    
    # Current Load (real-time tracking)
    current_load_liters = Column(Float, default=0.0)
    current_load_cans = Column(Float, default=0.0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    upload_batch_id = Column(String(36), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<StorageHub {self.hub_code}: {self.hub_name}>"
