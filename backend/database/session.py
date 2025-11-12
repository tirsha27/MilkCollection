"""
Database Session Management
Handles PostgreSQL connection using SQLAlchemy async
"""
#backend/database/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,    # Verify connections before using
    pool_size=10,          # Connection pool size
    max_overflow=20        # Max connections above pool_size
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Base class for all ORM models
Base = declarative_base()


# ============================================================
# DATABASE DEPENDENCY (For FastAPI)
# ============================================================

async def get_db():
    """
    FastAPI dependency for database session
    
    Usage in routes:
        @router.get("/")
        async def get_data(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ============================================================
# DATABASE LIFECYCLE MANAGEMENT
# ============================================================

async def init_db():
    """
    Initialize database - Create all tables
    Call this on application startup
    """
    async with engine.begin() as conn:
        # Create all tables defined in models
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables created successfully")


async def close_db():
    """
    Close database connections
    Call this on application shutdown
    """
    await engine.dispose()
    print("❌ Database connections closed")


# ============================================================
# HEALTH CHECK
# ============================================================

async def check_db_connection():
    """
    Check if database connection is healthy
    
    Returns:
        bool: True if connected, False otherwise
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
