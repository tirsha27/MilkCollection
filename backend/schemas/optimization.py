#schemas/optimization.py
"""
Optimization Schemas
Pydantic models for optimization request/response
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class OptimizationRequest(BaseModel):
    """Request model for route optimization"""
    deadline_minutes: int = Field(default=45, ge=10, le=480, description="Max route time in minutes")
    max_distance_km: float = Field(default=75.0, ge=5.0, le=500.0, description="Max route distance in km")
    
    class Config:
        json_schema_extra = {
            "example": {
                "deadline_minutes": 45,
                "max_distance_km": 75.0
            }
        }


class OptimizationResponse(BaseModel):
    """Response model for optimization status"""
    status: str
    message: str
    task_id: Optional[str] = None
    result: Optional[Dict] = None


class OptimizationStatus(BaseModel):
    """Model for optimization task status"""
    task_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: int  # 0-100
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
