
## **Unit Standards:**

✅ **Vendors** → Milk quantity in **CANS** (whole numbers: 1, 2, 3...)  
✅ **Fleet** → Capacity in **CANS** (whole numbers: 25, 35, 50...)  
✅ **Storage Hubs** → Capacity in **LITERS** (whole numbers: 2000, 1500, 2500...)

---
## **🗂️ Database Tables**

## **1. Vendors Table**

text

```text
vendors
├── vendor_code (V001, V002...)
├── vendor_name
├── village/area
├── latitude, longitude
├── contact (optional)
├── milk_quantity_cans (INPUT: 1, 2, 3 cans)
├── milk_quantity_liters (AUTO: cans × 40)
└── is_active
```

## **2. Storage Hubs Table**

```text
storage_hubs
├── hub_code (SH001, SH002...)
├── hub_name
├── location
├── latitude, longitude
├── contact (optional)
├── capacity_liters (INPUT: 2000, 1500 liters)
├── capacity_cans (AUTO: liters ÷ 40)
└── is_active
```

## **3. Fleet Table**

```text
fleet
├── vehicle_code (F001, F002...)
├── vehicle_name (Tata Ace, Mahindra Bolero)
├── vehicle_number
├── category (mini/small)
├── capacity_cans (INPUT: 25, 35, 50 cans)
├── capacity_liters (AUTO: cans × 40)
├── model, manufacturer, fuel_type
├── driver_name, driver_contact (optional)
└── is_available
```

---
## **📤 Excel Upload Templates**

## **1. Vendors Excel (Upload in CANS)**

|Vendor Name|Village/Area|Contact|Latitude|Longitude|Milk Quantity (Cans)|
|---|---|---|---|---|---|
|Arumugham|Periyar Nagar|9876543210|10.6098825|78.5434806|**1**|
|Kandasamy|Madirpatti|9876543211|10.6048854|78.5598019|**2**|
|Periyasamy|Kuruchy Patti||10.6154730|78.5600594|**1**|

**Backend Auto-Calculates:**

- 1 can → 40 liters
- 2 cans → 80 liters

---
## **2. Storage Hubs Excel (Upload in LITERS)**

| Hub Name            | Location            | Contact    | Latitude   | Longitude  | Capacity (Liters) |
| ------------------- | ------------------- | ---------- | ---------- | ---------- | ----------------- |
| Viralimalai Hub     | Viralimalai, Trichy | 9876543210 | 10.6134106 | 78.5508431 | **2000**          |
| Thuvarankurichi Hub | Thuvarankurichi     |            | 10.5543298 | 78.5134567 | **1500**          |
| Ponnamaravathi Hub  | Ponnamaravathi      |            | 10.4567890 | 78.4567890 | **1500**          |
| Melur Hub           | Melur               |            | 10.0382844 | 78.3429425 | **1800**          |
| Madurai Hub         | Madurai             | 9876543214 | 9.9252007  | 78.1197754 | **2500**          |

**Backend Auto-Calculates:**

- 2000 liters → 50 cans  
- 1500 liters → 37.5 cans
- 1800 liters → 45 cans

---
## **3. Fleet Excel (Upload in CANS)**

| Vehicle Name    | Vehicle Number | Category | Capacity (Cans) | Model         | Manufacturer  | Fuel Type | Driver Name | Driver Contact |
| --------------- | -------------- | -------- | --------------- | ------------- | ------------- | --------- | ----------- | -------------- |
| Tata Ace        | TN45AB1234     | mini     | **25**          | Tata Ace Gold | Tata Motors   | Diesel    | Raju        | 9876543210     |
| Mahindra Bolero | TN45CD5678     | small    | **35**          | Bolero Pickup | Mahindra      | Diesel    | Kumar       | 9876543211     |
| Piaggio Ape     | TN45EF9012     | mini     | **18**          | Ape Auto      | Piaggio       | Diesel    | Selvan      | 9876543212     |
| Ashok Leyland   | TN45GH3456     | small    | **50**          | Dost          | Ashok Leyland | Diesel    | Murugan     | 9876543213     |

**Backend Auto-Calculates:**

- 25 cans → 1000 liters
- 35 cans → 1400 liters
- 50 cans → 2000 liters

---
## **🔄 Auto-Conversion Logic**

## **For Vendors & Fleet (Input: CANS)**

```text
User uploads: 2 cans
Backend stores:
  - milk_quantity_cans = 2
  - milk_quantity_liters = 2 × 40 = 80

```
## **For Storage Hubs (Input: LITERS)**

```text
User uploads: 2000 liters
Backend stores:
  - capacity_liters = 2000
  - capacity_cans = 2000 ÷ 40 = 50
```

---
## **✅ Summary**

**Excel Upload Format:**

- **Vendors Excel:** Milk quantity in CANS (1, 2, 3...)
- **Fleet Excel:** Capacity in CANS (25, 35, 50...)
- **Storage Hubs Excel:** Capacity in LITERS (2000, 1500, 1800...)

**Backend Storage:**

- All tables store BOTH cans and liters
- Backend auto-converts based on: **1 can = 40 liters**

**APIs Return:**

- JSON with both values (frontend can display either)

---
## **🏗️ Updated Project Structure**

```text
milk-collection-backend/
├── models/
│   ├── vendor.py              # ✅ Changed from farmer.py
│   ├── storage_hub.py         # ✅ Changed from chilling_center.py
│   └── fleet.py
│
├── schemas/
│   ├── vendor.py              # ✅ Changed from farmer.py
│   ├── storage_hub.py         # ✅ Changed from chilling_center.py
│   └── fleet.py
│
├── services/
│   ├── vendor_service.py      # ✅ Changed from farmer_service.py
│   ├── storage_hub_service.py # ✅ Changed from chilling_center_service.py
│   └── fleet_service.py
│
└── api/endpoints/
    ├── vendors.py             # ✅ Changed from farmers.py
    ├── storage_hubs.py        # ✅ Changed from chilling_centers.py
    └── fleet.py
```

___
## **🔌 API Endpoints**

## **Vendors APIs**

```text
POST   /api/v1/vendors/upload
GET    /api/v1/vendors
GET    /api/v1/vendors/{id}
PUT    /api/v1/vendors/{id}
DELETE /api/v1/vendors/{id}
```

## **Storage Hubs APIs**

```text
POST   /api/v1/storage-hubs/upload
GET    /api/v1/storage-hubs
GET    /api/v1/storage-hubs/{id}
PUT    /api/v1/storage-hubs/{id}
DELETE /api/v1/storage-hubs/{id}
```

## **Fleet APIs**

```text
POST   /api/v1/fleet/upload
GET    /api/v1/fleet
GET    /api/v1/fleet/{id}
PUT    /api/v1/fleet/{id}
DELETE /api/v1/fleet/{id}
```

---

<hr style="border: 0; border-top: 5px solid #1E90FF;" />
<hr style="border: 0; border-top: 5px dashed #1E90FF;" />
<hr style="border: 0; border-top: 5px solid #1E90FF;" />



## **🗺️ Development Roadmap - Step by Step**

## **Phase 1: Foundation Setup** ⚙️

Before any coding, we set up the environment:

**Step 1.1** - Create project folder structure  
**Step 1.2** - Set up virtual environment  
**Step 1.3** - Install dependencies (`requirements.txt`)  
**Step 1.4** - Create `.env` file with database credentials  
**Step 1.5** - Set up PostgreSQL database (create database, enable PostGIS)

---

## **Phase 2: Core Configuration** 🔧

Build the foundation files that everything else depends on:

**Step 2.1** - `core/config.py` (Read .env variables)  
**Step 2.2** - `core/constants.py` (Define constants like CAN_TO_LITER_RATIO)  
**Step 2.3** - `utils/conversions.py` (Can ↔ Liter conversion functions)  
**Step 2.4** - `database/session.py` (PostgreSQL connection setup)

---

## **Phase 3: Database Models (SQLAlchemy)** 🗄️

Create the database table definitions:

**Step 3.1** - `models/vendor.py` (Vendors table ORM)  
**Step 3.2** - `models/storage_hub.py` (Storage Hubs table ORM)  
**Step 3.3** - `models/fleet.py` (Fleet table ORM)

---

## **Phase 4: Pydantic Schemas** 📋

Define request/response validation schemas:

**Step 4.1** - `schemas/vendor.py` (VendorCreate, VendorResponse, etc.)  
**Step 4.2** - `schemas/storage_hub.py`  
**Step 4.3** - `schemas/fleet.py`  
**Step 4.4** - `schemas/responses.py` (Common response models)

---

## **Phase 5: Excel Service** 📊

Build Excel parsing logic (the most critical part):

**Step 5.1** - `services/excel_service.py`

- Parse Vendors Excel
    
- Parse Storage Hubs Excel
    
- Parse Fleet Excel
    
- Validation logic for each
    

---

## **Phase 6: Business Logic Services** 💼

CRUD operations for each entity:

**Step 6.1** - `services/vendor_service.py`

- Bulk upload from Excel
    
- Get all vendors
    
- Get single vendor
    
- Update vendor
    
- Delete vendor
    

**Step 6.2** - `services/storage_hub_service.py` (Same operations)  
**Step 6.3** - `services/fleet_service.py` (Same operations)

---

## **Phase 7: API Endpoints** 🚀

FastAPI routes that connect everything:

**Step 7.1** - `api/deps.py` (Database dependency injection)  
**Step 7.2** - `api/endpoints/vendors.py`  
**Step 7.3** - `api/endpoints/storage_hubs.py`  
**Step 7.4** - `api/endpoints/fleet.py`

---

## **Phase 8: Main Application** 🎯

Tie everything together:

**Step 8.1** - `main.py` (FastAPI app initialization, CORS, startup/shutdown events)

---

## **Phase 9: Testing & Validation** ✅

Test the complete flow:

**Step 9.1** - Create sample Excel files  
**Step 9.2** - Test upload endpoints  
**Step 9.3** - Test CRUD endpoints  
**Step 9.4** - Verify auto-conversions

---
