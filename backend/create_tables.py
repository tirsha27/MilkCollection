import asyncio
from database.session import engine, Base
from models import optimization  # ensures models are imported

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Optimization tables created successfully!")

asyncio.run(create_tables())
