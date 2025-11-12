# 🥛 Milk Collection Backend - FastAPI + PostgreSQL

## 🎯 Project Overview
Dairy supply chain optimization system with Excel upload for:
- Vendors (milk collection points)
- Storage Hubs (collection centers)
- Fleet (transport vehicles)

## 📋 Current Status
- ✅ Phase 1: Environment & Database Setup (Complete)
- ✅ Phase 2: Core Configuration (Complete)
- ⏳ Phase 3-9: Models, APIs, Services (To be implemented)

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ installed
- PostgreSQL 13+ installed and running
- Git (optional)

### 2. Setup Environment

```
# Clone or download project
# cd milk-collection-backend
```

#### Create and activate virtual environment
```
python -m venv venv
```
#### Windows:
```
venv\Scripts\activate
```

#### Install dependencies
```
pip install -r requirements.txt
```

#### Setup database
```
python db_setup.py
# Choose option 1: Setup Database
```

### 3. Verify Setup

```
# Test Phase 2 configuration
python test_phase2.py
```

**Expected Output:**
```
============================================================
Testing Phase 2 Configuration
============================================================

✅ Config loaded:
   Database: milk_collection_db
   Can to Liter: 40.0

✅ Constants loaded:
   Vehicle Categories: ['mini', 'small']
   Vendor Code Prefix: V

✅ Conversions working:
   2 cans = 80.0 liters
   80 liters = 2.0 cans
   Next vendor code: V001

============================================================
✅ Phase 2 Setup Complete!
============================================================
```

### 4. Project Structure Explanation

```
📁 core/          # Configuration & constants
📁 database/      # Database connection
📁 utils/         # Utility functions
📁 models/        # SQLAlchemy ORM models (Phase 3)
📁 schemas/       # Pydantic schemas (Phase 4)
📁 services/      # Business logic (Phase 5-6)
📁 api/           # FastAPI endpoints (Phase 7)
📁 templates/     # Excel templates
📁 uploads/       # Uploaded files
```

### 5. Key Files

- `.env` - Database credentials (DO NOT COMMIT TO GIT!)
- `core/config.py` - Environment variable management
- `database/session.py` - Database connection pool
- `utils/conversions.py` - Can ↔ Liter conversions
- `db_setup.py` - Database creation script

### 6. Database Configuration

Database: `milk_collection_db`
Host: `localhost:5432`
User: `postgres` (default)
Password: Update in `.env`

### 7. Next Steps for Development

1. **Phase 3:** Create SQLAlchemy models (`models/vendor.py`, etc.)
2. **Phase 4:** Create Pydantic schemas (`schemas/vendor.py`, etc.)
3. **Phase 5:** Excel parsing service (`services/excel_service.py`)
4. **Phase 6:** Business logic services
5. **Phase 7:** API endpoints
6. **Phase 8:** Main FastAPI app

## 🛠️ Development Commands

### Test Current Setup
```
python test_phase2.py
```

### Database Health Check
```
python db_setup.py
# Choose option 2: Check Connection
```

### Reset Database (DANGER!)
```
python db_setup.py
# Choose option 3: Drop Database
```

## 🤝 Support

For questions:
- Contact: **Roshan Kumar B**

---

Happy coding! 🥛🚛


***
