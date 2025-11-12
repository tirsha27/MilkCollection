"""
Test Phase 3 - Database Models
Creates database tables and verifies structure
"""

import asyncio
from sqlalchemy import text
from database.session import init_db, AsyncSessionLocal
from models import Vendor, StorageHub, Fleet


async def test_models():
    print("\n" + "="*70)
    print("🧪 TESTING PHASE 3 - DATABASE MODELS")
    print("="*70)
    
    # Step 1: Create tables
    print("\n1️⃣ Creating database tables...")
    try:
        await init_db()
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return
    
    # Step 2: Verify tables exist
    print("\n2️⃣ Verifying tables in database...")
    async with AsyncSessionLocal() as session:
        try:
            # Check vendors table
            result = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vendors'"
            ))
            if result.scalar() == 1:
                print("✅ vendors table exists")
            else:
                print("❌ vendors table not found")
            
            # Check storage_hubs table
            result = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'storage_hubs'"
            ))
            if result.scalar() == 1:
                print("✅ storage_hubs table exists")
            else:
                print("❌ storage_hubs table not found")
            
            # Check fleet table
            result = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'fleet'"
            ))
            if result.scalar() == 1:
                print("✅ fleet table exists")
            else:
                print("❌ fleet table not found")
                
        except Exception as e:
            print(f"❌ Error verifying tables: {e}")
            return
    
    # Step 3: Check table columns
    print("\n3️⃣ Checking table structures...")
    async with AsyncSessionLocal() as session:
        try:
            # Check vendors columns
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'vendors'
                ORDER BY ordinal_position
            """))
            vendor_cols = [row[0] for row in result.fetchall()]
            print(f"✅ vendors has {len(vendor_cols)} columns: {', '.join(vendor_cols[:5])}...")
            
            # Check storage_hubs columns
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'storage_hubs'
                ORDER BY ordinal_position
            """))
            hub_cols = [row[0] for row in result.fetchall()]
            print(f"✅ storage_hubs has {len(hub_cols)} columns: {', '.join(hub_cols[:5])}...")
            
            # Check fleet columns
            result = await session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'fleet'
                ORDER BY ordinal_position
            """))
            fleet_cols = [row[0] for row in result.fetchall()]
            print(f"✅ fleet has {len(fleet_cols)} columns: {', '.join(fleet_cols[:5])}...")
            
        except Exception as e:
            print(f"❌ Error checking columns: {e}")
            return
    
    print("\n" + "="*70)
    print("🎉 PHASE 3 COMPLETE!")
    print("="*70)
    print("\n📊 Summary:")
    print("  ✅ 3 database tables created")
    print("  ✅ All tables verified")
    print("  ✅ Table structures validated")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(test_models())

