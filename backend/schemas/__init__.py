"""
Schemas Package
Export all Pydantic schemas
"""

from schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from schemas.storage_hub import StorageHubCreate, StorageHubUpdate, StorageHubResponse
from schemas.fleet import FleetCreate, FleetUpdate, FleetResponse, VehicleSpecs, DriverDetails
from schemas.responses import MessageResponse, BulkUploadResponse, PaginatedResponse

__all__ = [
    # Vendor schemas
    "VendorCreate",
    "VendorUpdate",
    "VendorResponse",
    
    # Storage Hub schemas
    "StorageHubCreate",
    "StorageHubUpdate",
    "StorageHubResponse",
    
    # Fleet schemas
    "FleetCreate",
    "FleetUpdate",
    "FleetResponse",
    "VehicleSpecs",
    "DriverDetails",
    
    # Common responses
    "MessageResponse",
    "BulkUploadResponse",
    "PaginatedResponse"
]
