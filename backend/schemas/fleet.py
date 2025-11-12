"""
Fleet Pydantic Schemas
Request/Response validation for Fleet APIs
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime


class VehicleSpecs(BaseModel):
    """Vehicle technical specifications"""
    model: str = Field(..., min_length=2, description="Vehicle model name")
    manufacturer: str = Field(..., min_length=2, description="Manufacturer name")
    fuel_type: str = Field(..., description="Fuel type: Diesel, Petrol, CNG, Electric")
    avg_speed_kmph: float = Field(default=40, gt=0, le=120, description="Average speed in km/h")
    
    @validator('fuel_type')
    def validate_fuel_type(cls, v):
        """Validate fuel type"""
        allowed = ["Diesel", "Petrol", "CNG", "Electric"]
        if v not in allowed:
            raise ValueError(f"Fuel type must be one of {allowed}")
        return v


class DriverDetails(BaseModel):
    """Driver information"""
    name: str = Field(..., min_length=2, description="Driver name")
    contact: str = Field(..., pattern=r"^\d{10}$", description="10-digit phone number")
    license_number: Optional[str] = Field(None, description="Driving license number")


class FleetBase(BaseModel):
    vehicle_code: str
    vehicle_name: str
    vehicle_number: str
    category: str
    capacity_cans: float
    capacity_liters: float
    realistic_specs: dict
    driver_details: Optional[dict] = None
    is_available: Optional[bool] = True
    fixed_cost: Optional[float] = 300.0
    cost_per_km: Optional[float] = 5.0
    service_time: Optional[int] = 15
    category_name: Optional[str] = None
    vehicle_count: Optional[int] = 1
    @validator('category')
    def validate_category(cls, v):
        """Validate category"""
        v = v.lower().strip()
        if v not in ['mini', 'small']:
            raise ValueError("Category must be 'mini' or 'small'")
        return v
    
    @validator('capacity_cans')
    def validate_capacity(cls, v):
        """Ensure capacity is positive and rounded"""
        if v <= 0:
            raise ValueError("Capacity must be positive")
        return round(v, 2)
    
    @validator('vehicle_name', 'vehicle_number')
    def validate_not_empty(cls, v):
        """Ensure strings are not just whitespace"""
        if not v or v.strip() == "":
            raise ValueError("Field cannot be empty")
        return v.strip()



class FleetCreate(FleetBase):
    """Schema for creating fleet (Excel upload or manual)"""
    pass

class FleetCreate(BaseModel):
    vehicle_name: str
    vehicle_number: str
    category: str
    capacity_cans: float = Field(..., gt=0)
    model: str
    manufacturer: str
    fuel_type: str
    driver_name: str
    driver_contact: str

class FleetResponse(BaseModel):
    id: int
    vehicle_code: str
    vehicle_number: str
    capacity_cans: float
    capacity_liters: float
    chilling_center_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    is_available: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        
class FleetUpdate(BaseModel):
    vehicle_name: Optional[str]
    vehicle_number: Optional[str]
    category: Optional[str]
    capacity_cans: Optional[float]
    capacity_liters: Optional[float]
    realistic_specs: Optional[dict]
    driver_details: Optional[dict]
    is_available: Optional[bool]

class FleetResponse(FleetBase):
    """Schema for API response"""
    id: int
    vehicle_code: str
    capacity_liters: float
    is_available: bool
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    maintenance_due: Optional[datetime]
    upload_batch_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    
    class Config:
        from_attributes = True
