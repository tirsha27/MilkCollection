"""
Complete Setup Verification Script
Run this to ensure everything is working before development starts
"""

import asyncio
import sys
import os
from pathlib import Path

def test_file_structure():
    """Test if all required folders and files exist"""
    print("🔍 Testing project structure...")
    
    required_folders = [
        'core', 'database', 'models', 'schemas', 'services', 
        'api', 'api/endpoints', 'utils', 'templates', 'uploads'
    ]
    
    required_files = [
        '.env', 'requirements.txt', 'db_setup.py'
    ]
    
    missing_folders = []
    missing_files = []
    
    # Check folders
    for folder in required_folders:
        if not os.path.exists(folder):
            missing_folders.append(folder)
    
    # Check files
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_folders or missing_files:
        print("❌ Missing components:")
        if missing_folders:
            print(f"   Folders: {', '.join(missing_folders)}")
        if missing_files:
            print(f"   Files: {', '.join(missing_files)}")
        return False
    else:
        print("✅ Project structure complete!")
        return True

def test_imports():
    """Test Python imports"""
    print("\n🔍 Testing Python imports...")
    
    try:
        from core.config import settings
        print("✅ core.config imported successfully")
        
        from core.constants import VEHICLE_CATEGORIES
        print("✅ core.constants imported successfully")
        
        from database.session import AsyncSessionLocal
        print("✅ database.session imported successfully")
        
        from utils.conversions import cans_to_liters
        print("✅ utils.conversions imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

async def test_database():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    
    try:
        from database.session import AsyncSessionLocal
        from sqlalchemy import text  # ✅ SQLAlchemy 2.0 compatible
        
        async with AsyncSessionLocal() as session:
            # Use text() wrapper for raw SQL
            result = await session.execute(text("SELECT 1 as test"))
            value = result.scalar()
            if value == 1:
                print("✅ Database connection successful!")
                
                # Test PostgreSQL version
                result = await session.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"   PostgreSQL: {version.split()[0]} {version.split()[1]}")
                
                # Test database name
                result = await session.execute(text("SELECT current_database()"))
                db_name = result.scalar()
                print(f"   Database: {db_name}")
                
                return True
            else:
                print("❌ Database query failed")
                return False
    except Exception as e:
        print(f"❌ Database error: {e}")
        print(f"   Make sure PostgreSQL is running on localhost:5432")
        return False

def test_environment():
    """Test environment configuration"""
    print("\n🔍 Testing environment...")
    
    try:
        from core.config import settings
        print("✅ .env file loaded successfully")
        
        required_vars = [
            "DATABASE_URL", "POSTGRES_DB", "CAN_TO_LITER_RATIO"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not hasattr(settings, var):
                missing_vars.append(var)
        
        if missing_vars:
            print("❌ Missing environment variables:")
            for var in missing_vars:
                print(f"   - {var}")
            return False
        else:
            print(f"✅ All {len(required_vars)} required variables present")
            print(f"   Database: {settings.POSTGRES_DB}")
            print(f"   Can Ratio: {settings.CAN_TO_LITER_RATIO}")
            print(f"   Debug Mode: {settings.DEBUG}")
            return True
            
    except Exception as e:
        print(f"❌ Environment error: {e}")
        return False

def test_conversions():
    """Test conversion functions"""
    print("\n🔍 Testing conversion functions...")
    
    try:
        from utils.conversions import cans_to_liters, liters_to_cans
        
        # Test 1: Cans to liters
        result1 = cans_to_liters(2)
        if result1 == 80.0:
            print("✅ cans_to_liters: 2 cans = 80 liters ✓")
        else:
            print(f"❌ cans_to_liters: Expected 80, got {result1}")
            return False
        
        # Test 2: Liters to cans
        result2 = liters_to_cans(80)
        if result2 == 2.0:
            print("✅ liters_to_cans: 80 liters = 2 cans ✓")
        else:
            print(f"❌ liters_to_cans: Expected 2, got {result2}")
            return False
        
        # Test 3: Code generation
        from utils.conversions import generate_vendor_code, generate_storage_hub_code, generate_fleet_code
        
        vendor_code = generate_vendor_code(0)
        hub_code = generate_storage_hub_code(0)
        fleet_code = generate_fleet_code(0)
        
        if vendor_code == "V001" and hub_code == "SH001" and fleet_code == "F001":
            print("✅ Code generation: V001, SH001, F001 ✓")
        else:
            print(f"❌ Code generation failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Conversion test error: {e}")
        return False

async def main():
    """Main verification function"""
    
    print("\n" + "="*70)
    print("🧪 COMPLETE SETUP VERIFICATION")
    print("="*70)
    
    # Test file structure
    print("\n1. PROJECT STRUCTURE:")
    structure_ok = test_file_structure()
    
    # Test imports
    print("\n2. PYTHON IMPORTS:")
    imports_ok = test_imports()
    
    # Test database
    print("\n3. DATABASE CONNECTION:")
    db_ok = await test_database()
    
    # Test environment
    print("\n4. ENVIRONMENT CONFIG:")
    env_ok = test_environment()
    
    # Test conversions
    print("\n5. UTILITY FUNCTIONS:")
    utils_ok = test_conversions()
    
    # Summary
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)
    
    tests = [
        ("Project Structure", structure_ok),
        ("Python Imports", imports_ok),
        ("Database Connection", db_ok),
        ("Environment Config", env_ok),
        ("Utility Functions", utils_ok)
    ]
    
    passed = sum(1 for _, ok in tests if ok)
    total = len(tests)
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    print("-" * 70)
    
    for test_name, ok in tests:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {test_name:25} {status}")
    
    print("-" * 70)
    
    if passed == total:
        print(f"\n🎉 PERFECT! All tests passed!")
        print(f"✅ Initial setup is 100% complete!")
        print(f"✅ Interns can start development immediately!")
        print(f"\n📚 Next Steps:")
        print(f"   1. Phase 3: Create database models (models/vendor.py, etc.)")
        print(f"   2. Phase 4: Create Pydantic schemas")
        print(f"   3. Phase 5: Build Excel service")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed!")
        print(f"   Fix issues above before proceeding.")
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
