"""
API Dependencies
Common dependencies for all API endpoints
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from database.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Database session dependency
    
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
