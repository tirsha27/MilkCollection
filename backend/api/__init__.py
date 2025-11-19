#api/__init__.py
from api.endpoints import (
    vendors_router,
    storage_hubs_router,
    fleet_router,
    dashboard_router
)

__all__ = [
    "vendors_router",
    "storage_hubs_router",
    "fleet_router",
    "dashboard_router",
]
