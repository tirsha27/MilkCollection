#schemas/responses.py
"""
Common Response Schemas
Shared response models across all APIs
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class MessageResponse(BaseModel):
    """Simple success/error message response"""
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully"
            }
        }


class BulkUploadResponse(BaseModel):
    """Response for Excel bulk upload operations"""
    success: bool
    message: str
    batch_id: str
    inserted_count: int
    failed_count: int = 0
    validation_errors: Optional[List[Dict[str, Any]]] = []
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "10 vendors uploaded successfully",
                "batch_id": "abc-123-def-456",
                "inserted_count": 10,
                "failed_count": 0,
                "validation_errors": []
            }
        }


class PaginatedResponse(BaseModel):
    """Paginated list response"""
    data: List[Any]
    total: int
    skip: int
    limit: int
    page: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [],
                "total": 100,
                "skip": 0,
                "limit": 50,
                "page": 1
            }
        }
