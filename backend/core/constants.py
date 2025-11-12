"""
Application Constants
Define all constant values used across the application
"""
# ============================================================
# CONVERSION RATIOS
# ============================================================
CAN_TO_LITER_RATIO = 40.0  # 1 can = 40 liters

# ============================================================
# VEHICLE CATEGORIES
# ============================================================
VEHICLE_CATEGORIES = ["mini", "small","Medium","Large","Heavy","Trailer","Tanker"]


# ============================================================
# FUEL TYPES
# ============================================================
FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric"]

# ============================================================
# ROUTE STATUS
# ============================================================
ROUTE_STATUS_PLANNED = "planned"
ROUTE_STATUS_IN_PROGRESS = "in_progress"
ROUTE_STATUS_COMPLETED = "completed"
ROUTE_STATUS_CANCELLED = "cancelled"

ROUTE_STATUSES = [
    ROUTE_STATUS_PLANNED,
    ROUTE_STATUS_IN_PROGRESS,
    ROUTE_STATUS_COMPLETED,
    ROUTE_STATUS_CANCELLED
]

# ============================================================
# COLLECTION STATUS
# ============================================================
COLLECTION_STATUS_PENDING = "pending"
COLLECTION_STATUS_COMPLETED = "completed"
COLLECTION_STATUS_PARTIAL = "partial"
COLLECTION_STATUS_FAILED = "failed"

COLLECTION_STATUSES = [
    COLLECTION_STATUS_PENDING,
    COLLECTION_STATUS_COMPLETED,
    COLLECTION_STATUS_PARTIAL,
    COLLECTION_STATUS_FAILED
]

# ============================================================
# CODE PREFIXES
# ============================================================
VENDOR_CODE_PREFIX = "V"
STORAGE_HUB_CODE_PREFIX = "SH"
FLEET_CODE_PREFIX = "F"
ROUTE_CODE_PREFIX = "R"

# ============================================================
# PAGINATION
# ============================================================
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500

# ============================================================
# EXCEL COLUMN NAMES
# ============================================================
EXCEL_VENDOR_COLUMNS = [
    "Vendor Name",
    "Village/Area",
    "Contact",
    "Latitude",
    "Longitude",
    "Milk Quantity (Cans)"
]

EXCEL_STORAGE_HUB_COLUMNS = [
    "Hub Name",
    "Location",
    "Contact",
    "Latitude",
    "Longitude",
    "Capacity (Liters)"
]

EXCEL_FLEET_COLUMNS = [
    "Vehicle Name",
    "Vehicle Number",
    "Category",
    "Capacity (Cans)",
    "Model",
    "Manufacturer",
    "Fuel Type",
    "Driver Name",
    "Driver Contact"
]
