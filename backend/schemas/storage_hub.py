"""
Storage Hub Pydantic Schemas
Request/Response validation for Storage Hub APIs
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class StorageHubBase(BaseModel):
    """Base Storage Hub schema"""
    hub_name: str = Field(..., min_length=2, max_length=100, description="Name of storage hub")
    location: str = Field(..., min_length=2, max_length=200, description="Location/address")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    contact_number: Optional[str] = Field(None, pattern=r"^\d{10}$", description="10-digit phone number")
    capacity_liters: float = Field(..., gt=0, description="Storage capacity in liters")
    
    @validator('capacity_liters')
    def validate_capacity(cls, v):
        """Ensure capacity is positive and rounded"""
        if v <= 0:
            raise ValueError("Capacity must be positive")
        return round(v, 2)
    
    @validator('hub_name', 'location')
    def validate_not_empty(cls, v):
        """Ensure strings are not just whitespace"""
        if not v or v.strip() == "":
            raise ValueError("Field cannot be empty")
        return v.strip()


class StorageHubCreate(StorageHubBase):
    """Schema for creating storage hub (Excel upload or manual)"""
    pass


class StorageHubUpdate(BaseModel):
    """Schema for updating storage hub"""
    hub_name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = Field(None, min_length=2, max_length=200)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    contact_number: Optional[str] = Field(None, pattern=r"^\d{10}$")
    capacity_liters: Optional[float] = Field(None, gt=0)
    current_load_liters: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class StorageHubResponse(StorageHubBase):
    """Schema for API response"""
    id: int
    hub_code: str
    capacity_cans: float
    current_load_liters: float
    current_load_cans: float
    is_active: bool
    upload_batch_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
