"""
Clear Database Script
Run this file to clear all tables in the database
Usage: python clear_db.py
"""

import asyncio
import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "milk_collection_db")


async def clear_tables():
    """Clear all tables in the PostgreSQL database"""

    confirm = input(f"⚠️  Are you sure you want to clear all tables in '{POSTGRES_DB}'? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Operation cancelled")
        return

    try:
        # Connect to the database
        print(f"🔌 Connecting to '{POSTGRES_DB}' database...")
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database=POSTGRES_DB
        )

        # Get list of all tables
        tables = await conn.fetch('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'')
        
        if not tables:
            print("❌ No tables found in the database.")
            return
        
        # Drop all tables
        print("🧹 Clearing all tables...")
        for table in tables:
            table_name = table['tablename']
            print(f"   - Dropping table '{table_name}'...")
            await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        
        print("✅ All tables cleared successfully")

        await conn.close()

    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ Error: Invalid database password")
        print("   Please check POSTGRES_PASSWORD in .env file")
    except asyncpg.exceptions.InvalidCatalogNameError:
        print("❌ Error: PostgreSQL server not found")
        print("   Please make sure PostgreSQL is running")
    except Exception as e:
        print(f"❌ Error during database clearing: {str(e)}")
        print("\nTroubleshooting:")
        print("  1. Make sure PostgreSQL is installed and running")
        print("  2. Check your .env file credentials")
        print("  3. Ensure you have permission to drop tables")
        raise


async def check_connection():
    """Check if database connection is working"""

    try:
        print("🔌 Testing database connection...")
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database=POSTGRES_DB
        )

        # Test query
        result = await conn.fetchval('SELECT 1')

        if result == 1:
            print("✅ Database connection successful!")

        await conn.close()

    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        raise


def main():
    """Main menu"""

    print("\n" + "="*60)
    print("🗄️  Clear Database Tool")
    print("="*60)
    print("\nOptions:")
    print("  1. Clear All Tables")
    print("  2. Check Connection")
    print("  3. Exit")

    choice = input("\nEnter your choice (1-3): ")

    if choice == "1":
        asyncio.run(clear_tables())
    elif choice == "2":
        asyncio.run(check_connection())
    elif choice == "3":
        print("👋 Goodbye!")
        return
    else:
        print("❌ Invalid choice")


if __name__ == "__main__":
    main()
