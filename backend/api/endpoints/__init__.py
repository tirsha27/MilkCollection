"""
API Endpoints Package
Exports all endpoint routers
"""
from api.endpoints.vendors import router as vendors_router
from api.endpoints.storage_hubs import router as storage_hubs_router
from api.endpoints.fleet import router as fleet_router
# ✅ Correct import

__all__ = [
    "vendors_router",
    "storage_hubs_router",
    "fleet_router",
    "vehicles_router",
]
