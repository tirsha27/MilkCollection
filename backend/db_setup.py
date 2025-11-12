"""
Database Setup Script (Without PostGIS)
Run this file to create database
Usage: python db_setup.py
"""

import asyncio
import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "258110")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "milk_collection_db")


async def setup_database():
    """Setup PostgreSQL database"""
    
    try:
        # Connect to default 'postgres' database
        print("🔌 Connecting to PostgreSQL...")
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database='postgres'
        )
        
        # Check if database exists
        db_exists = await conn.fetchval(
            f"SELECT 1 FROM pg_database WHERE datname = '{POSTGRES_DB}'"
        )
        
        if db_exists:
            print(f"✅ Database '{POSTGRES_DB}' already exists")
        else:
            # Create database
            print(f"📊 Creating database '{POSTGRES_DB}'...")
            await conn.execute(f'CREATE DATABASE {POSTGRES_DB}')
            print(f"✅ Database '{POSTGRES_DB}' created successfully")
        
        await conn.close()
        
        # Connect to the new database
        print(f"🔌 Connecting to '{POSTGRES_DB}' database...")
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database=POSTGRES_DB
        )
        
        # Test connection
        result = await conn.fetchval('SELECT 1')
        if result == 1:
            print("✅ Database connection successful!")
        
        await conn.close()
        
        print("\n" + "="*60)
        print("🎉 Database setup completed successfully!")
        print("="*60)
        print(f"\nDatabase Details:")
        print(f"  - Database Name: {POSTGRES_DB}")
        print(f"  - Host: {POSTGRES_HOST}")
        print(f"  - Port: {POSTGRES_PORT}")
        print(f"  - User: {POSTGRES_USER}")
        print(f"\nConnection URL:")
        print(f"  postgresql://{POSTGRES_USER}:****@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")
        print("\n✅ You can now proceed to Phase 2!")
        print("⚠️  Note: PostGIS not enabled (coordinates stored as simple numbers)")
        
    except asyncpg.exceptions.InvalidPasswordError:
        print("❌ Error: Invalid database password")
        print("   Please check POSTGRES_PASSWORD in .env file")
    except asyncpg.exceptions.InvalidCatalogNameError:
        print("❌ Error: PostgreSQL server not found")
        print("   Please make sure PostgreSQL is running")
    except Exception as e:
        print(f"❌ Error during database setup: {str(e)}")
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


async def drop_database():
    """Drop the database (use with caution!)"""
    
    confirm = input(f"⚠️  Are you sure you want to DROP database '{POSTGRES_DB}'? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Operation cancelled")
        return
    
    try:
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database='postgres'
        )
        
        # Terminate all connections
        await conn.execute(f'''
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{POSTGRES_DB}'
            AND pid <> pg_backend_pid()
        ''')
        
        # Drop database
        await conn.execute(f'DROP DATABASE IF EXISTS {POSTGRES_DB}')
        print(f"✅ Database '{POSTGRES_DB}' dropped successfully")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error dropping database: {str(e)}")
        raise


def main():
    """Main menu"""
    
    print("\n" + "="*60)
    print("🗄️  Database Setup Tool (No PostGIS)")
    print("="*60)
    print("\nOptions:")
    print("  1. Setup Database")
    print("  2. Check Connection")
    print("  3. Drop Database (⚠️  Danger)")
    print("  4. Exit")
    
    choice = input("\nEnter your choice (1-4): ")
    
    if choice == "1":
        asyncio.run(setup_database())
    elif choice == "2":
        asyncio.run(check_connection())
    elif choice == "3":
        asyncio.run(drop_database())
    elif choice == "4":
        print("👋 Goodbye!")
        return
    else:
        print("❌ Invalid choice")


if __name__ == "__main__":
    main()
