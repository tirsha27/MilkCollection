
#api/endpoints/__init__.py
"""
API Endpoints Package
Exports all endpoint routers
"""
#api/endpoints/__init__.py
from api.endpoints.vendors import router as vendors_router
from api.endpoints.storage_hubs import router as storage_hubs_router
from api.endpoints.fleet import router as fleet_router
from api.endpoints.optimization import router as optimization_router
from api.endpoints.trips_schedule import router as trips_router
from api.endpoints.dashboard import router as dashboard_router

__all__ = [
    "vendors_router",
    "storage_hubs_router",
    "fleet_router",
    "optimization_router",
    "trips_router",
    "dashboard_router",
]
