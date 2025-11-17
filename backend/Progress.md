### Excel Upload API

Tested the Excel upload API which adds **vendor**, **hub**, and **fleet** data into the database after uploading the Excel file.

📅 Date: 28th October 2025

***
# Phase 2: Alembic Setup + Optimization API ✅
**Date:** 6th-7th November 2025

### Alembic Database Migration

**Commands Used:**
1. Initialize Alembic
alembic init alembic

2. Configure alembic.ini with PostgreSQL credentials
sqlalchemy.url = postgresql://postgres:123456@localhost:5432/milk_collection_db
3. Update alembic/env.py with model imports
from models.fleet import Base
target_metadata = Base.metadata
4. Generate migration (auto-detect model changes)
alembic revision --autogenerate -m "Add optimization columns to fleet"

5. Apply migration to database
alembic upgrade head

6. Check current version
alembic current

**Result:** Added 5 optimization columns to Fleet table:
- `service_time`, `fixed_cost`, `cost_per_km`, `vehicle_count`, `category_name`

---

### Optimization API Endpoints

**Created 4 endpoints at** `/api/v1/optimization`:

1. `GET /health` - Service health check
2. `POST /categorize-fleet` - Auto-categorize vehicles
3. `GET /preview-transformation` - Preview data mapping
4. `POST /run` - Run optimization with constraints

**Files Created:**
- `services/fleet_categorizer.py`
- `services/data_transformer.py`
- `services/core_optimization_adapter.py`
- `api/endpoints/optimization.py`

**Router Registered in `main.py`:**

**Configuration Updates:**
- Added `CAN_TO_LITER_RATIO = 40.0` to `core/constants.py`
- Fixed imports in `core/conversion.py`

---

## Status

✅ **Completed:** Alembic + Optimization API Setup  
🔄 **Next:** Testing optimization endpoints

---

## Test Commands

curl -X GET "http://localhost:8000/api/v1/optimization/health"
curl -X POST "http://localhost:8000/api/v1/optimization/categorize-fleet"
curl -X GET "http://localhost:8000/api/v1/optimization/preview-transformation"
curl -X POST "http://localhost:8000/api/v1/optimization/run?deadline_minutes=480&max_distance_km=100"