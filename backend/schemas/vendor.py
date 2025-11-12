# backend/schemas/vendor.py
"""
Vendor Pydantic Schemas
Request/Response validation for Vendor APIs
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class VendorBase(BaseModel):
    vendor_name: str
    village: str
    latitude: float
    longitude: float
    contact_number: Optional[str] = None
    milk_quantity_cans: float

    @validator('milk_quantity_cans')
    def validate_cans(cls, v):
        """Ensure milk quantity is positive and rounded"""
        if v is not None and v <= 0:
            raise ValueError("Milk quantity must be positive")
        return round(v, 2) if v else None

    @validator('vendor_name', 'village')
    def validate_not_empty(cls, v):
        """Ensure strings are not just whitespace"""
        if v and v.strip() == "":
            raise ValueError("Field cannot be empty")
        return v.strip() if v else v

class VendorCreate(VendorBase):
    """Schema for creating vendor (Excel upload or manual creation)"""
    # vendor_name required by VendorBase (keeps behavior)
    pass

class VendorUpdate(BaseModel):
    """Schema for updating vendor (all fields optional)"""
    vendor_name: Optional[str] = Field(None, min_length=2, max_length=100)
    village: Optional[str] = Field(None, min_length=2, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    contact_number: Optional[str] = Field(None, pattern=r"^\d{10}$")
    milk_quantity_cans: Optional[float] = Field(None, gt=0, le=100)
    is_active: Optional[bool] = None

from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VendorResponse(VendorBase):
    id: UUID  # ✅ keep it as UUID here
    vendor_code: str
    milk_quantity_liters: float
    is_active: bool
    upload_batch_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {UUID: lambda v: str(v)}  # ✅ converts UUID → string in JSON