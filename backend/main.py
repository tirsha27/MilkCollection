"""
Milk Collection Backend - Main Application
FastAPI application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from database.session import init_db, close_db
from api import vendors_router, storage_hubs_router, fleet_router


# ============================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    Runs on startup and shutdown
    """
    # Startup
    print("\n" + "="*70)
    print("🚀 STARTING MILK COLLECTION BACKEND")
    print("="*70)
    
    # Initialize database
    print("\n📊 Initializing database...")
    await init_db()
    print("✅ Database initialized")
    
    print("\n🌐 API Documentation available at:")
    print(f"   - Swagger UI: http://localhost:8000/docs")
    print(f"   - ReDoc: http://localhost:8000/redoc")
    
    print("\n" + "="*70)
    print("✅ SERVER READY!")
    print("="*70 + "\n")
    
    yield  # Application runs here
    
    # Shutdown
    print("\n" + "="*70)
    print("🛑 SHUTTING DOWN MILK COLLECTION BACKEND")
    print("="*70)
    
    await close_db()
    print("✅ Database connections closed")
    print("👋 Goodbye!\n")


# ============================================================
# FASTAPI APP INITIALIZATION
# ============================================================

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="""
    🥛 **Milk Collection Optimization API**
    
    Complete backend system for dairy supply chain management with:
    - **Vendors Management** (Milk collection points)
    - **Storage Hubs** (Collection/chilling centers)
    - **Fleet Management** (Transport vehicles)
    - **Excel Bulk Upload** (Easy data import)
    - **Route Optimization** (Coming soon)
    
    ## Features
    
    ✅ Excel-based bulk data upload  
    ✅ Real-time statistics and analytics  
    ✅ RESTful APIs for all operations  
    ✅ Automatic code generation (V001, SH001, F001)  
    ✅ Auto-conversion (cans ↔ liters)  
    
    ## Units
    
    - **Vendors**: Milk quantity in CANS
    - **Fleet**: Capacity in CANS
    - **Storage Hubs**: Capacity in LITERS
    - **Conversion**: 1 can = 40 liters
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    debug=settings.DEBUG
)


# ============================================================
# CORS MIDDLEWARE
# ============================================================
origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5173",  # if frontend like React/Vite
    "http://127.0.0.1:5173",
    "*"  # during development, allows all origins
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

# Include all routers with API prefix

# ============================================================
# API ROUTERS (Correct + Clean)
# ============================================================

from api import (
    vendors_router,
    storage_hubs_router,
    fleet_router,
    dashboard_router
)

from api.endpoints.optimization import router as optimization_router
from api.endpoints.trips_schedule import router as trip_schedule_router


# Include routers with prefix
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(storage_hubs_router, prefix="/api/v1")
app.include_router(fleet_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(optimization_router, prefix="/api/v1")
app.include_router(trip_schedule_router, prefix="/api/v1")

# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API health check
    """
    return {
        "message": "🥛 Milk Collection Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "vendors": f"{settings.API_V1_PREFIX}/vendors",
            "storage_hubs": f"{settings.API_V1_PREFIX}/storage-hubs",
            "fleet": f"{settings.API_V1_PREFIX}/fleet"
        }
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "database": "connected",
        "api": "operational"
    }


# ============================================================
# RUN SERVER (for development)
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
