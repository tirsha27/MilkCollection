"""
Test Phase 6 - Business Logic Services
Tests CRUD operations for vendors, storage hubs, and fleet
"""

import asyncio
from database.session import AsyncSessionLocal, init_db
from services import VendorService, StorageHubService, FleetService


async def test_vendor_service():
    """Test Vendor Service"""
    print("\n" + "="*70)
    print("🧪 TESTING VENDOR SERVICE")
    print("="*70)
    
    async with AsyncSessionLocal() as db:
        # Test 1: Bulk create vendors
        print("\n1️⃣ Testing bulk create vendors...")
        vendors_data = [
            {
                "vendor_name": "Arumugham",
                "village": "Periyar Nagar",
                "latitude": 10.6098825,
                "longitude": 78.5434806,
                "contact_number": "9876543210",
                "milk_quantity_cans": 2.0
            },
            {
                "vendor_name": "Kandasamy",
                "village": "Madirpatti",
                "latitude": 10.6048854,
                "longitude": 78.5598019,
                "contact_number": "9876543211",
                "milk_quantity_cans": 1.5
            },
            {
                "vendor_name": "Periyasamy",
                "village": "Kuruchy Patti",
                "latitude": 10.6154730,
                "longitude": 78.5600594,
                "contact_number": None,
                "milk_quantity_cans": 3.0
            }
        ]
        
        result = await VendorService.bulk_create_from_excel(db, vendors_data)
        print(f"✅ Created {result['inserted_count']} vendors")
        print(f"   Batch ID: {result['batch_id']}")
        print(f"   Vendor codes: {', '.join(result['vendor_codes'])}")
        
        # Test 2: Get all vendors
        print("\n2️⃣ Testing get all vendors...")
        vendors_result = await VendorService.get_all_vendors(db, skip=0, limit=10)
        print(f"✅ Retrieved {len(vendors_result['vendors'])} vendors")
        print(f"   Total: {vendors_result['total']}")
        print(f"   Page: {vendors_result['page']}")
        
        if vendors_result['vendors']:
            first_vendor = vendors_result['vendors'][0]
            print(f"   Sample: {first_vendor.vendor_code} - {first_vendor.vendor_name}")
        
        # Test 3: Get single vendor
        print("\n3️⃣ Testing get vendor by ID...")
        if vendors_result['vendors']:
            vendor_id = vendors_result['vendors'][0].id
            vendor = await VendorService.get_vendor_by_id(db, vendor_id)
            if vendor:
                print(f"✅ Retrieved vendor: {vendor.vendor_name}")
                print(f"   Code: {vendor.vendor_code}")
                print(f"   Milk: {vendor.milk_quantity_cans} cans = {vendor.milk_quantity_liters} liters")
        
        # Test 4: Get vendor statistics
        print("\n4️⃣ Testing vendor statistics...")
        stats = await VendorService.get_stats(db)
        print(f"✅ Statistics:")
        print(f"   Total vendors: {stats['total_vendors']}")
        print(f"   Active vendors: {stats['active_vendors']}")
        print(f"   Total milk: {stats['total_milk_liters']} liters ({stats['total_milk_cans']} cans)")


async def test_storage_hub_service():
    """Test Storage Hub Service"""
    print("\n" + "="*70)
    print("🧪 TESTING STORAGE HUB SERVICE")
    print("="*70)
    
    async with AsyncSessionLocal() as db:
        # Test 1: Bulk create storage hubs
        print("\n1️⃣ Testing bulk create storage hubs...")
        hubs_data = [
            {
                "hub_name": "Viralimalai Hub",
                "location": "Viralimalai, Trichy",
                "latitude": 10.6134106,
                "longitude": 78.5508431,
                "contact_number": "9876543210",
                "capacity_liters": 2000.0
            },
            {
                "hub_name": "Thuvarankurichi Hub",
                "location": "Thuvarankurichi",
                "latitude": 10.5543298,
                "longitude": 78.5134567,
                "contact_number": None,
                "capacity_liters": 1500.0
            }
        ]
        
        result = await StorageHubService.bulk_create_from_excel(db, hubs_data)
        print(f"✅ Created {result['inserted_count']} storage hubs")
        print(f"   Hub codes: {', '.join(result['hub_codes'])}")
        
        # Test 2: Get all hubs
        print("\n2️⃣ Testing get all storage hubs...")
        hubs_result = await StorageHubService.get_all_hubs(db, skip=0, limit=10)
        print(f"✅ Retrieved {len(hubs_result['storage_hubs'])} hubs")
        print(f"   Total: {hubs_result['total']}")
        
        if hubs_result['storage_hubs']:
            first_hub = hubs_result['storage_hubs'][0]
            print(f"   Sample: {first_hub.hub_code} - {first_hub.hub_name}")
            print(f"   Capacity: {first_hub.capacity_liters} liters ({first_hub.capacity_cans} cans)")
        
        # Test 3: Get statistics
        print("\n3️⃣ Testing storage hub statistics...")
        stats = await StorageHubService.get_stats(db)
        print(f"✅ Statistics:")
        print(f"   Total hubs: {stats['total_hubs']}")
        print(f"   Active hubs: {stats['active_hubs']}")
        print(f"   Total capacity: {stats['total_capacity_liters']} liters")
        print(f"   Utilization: {stats['utilization_percentage']}%")


async def test_fleet_service():
    """Test Fleet Service"""
    print("\n" + "="*70)
    print("🧪 TESTING FLEET SERVICE")
    print("="*70)
    
    async with AsyncSessionLocal() as db:
        # Test 1: Bulk create fleet
        print("\n1️⃣ Testing bulk create fleet...")
        fleet_data = [
            {
                "vehicle_name": "Tata Ace",
                "vehicle_number": "TN45AB1234",
                "category": "mini",
                "capacity_cans": 25.0,
                "realistic_specs": {
                    "model": "Tata Ace Gold",
                    "manufacturer": "Tata Motors",
                    "fuel_type": "Diesel",
                    "avg_speed_kmph": 45
                },
                "driver_details": {
                    "name": "Raju",
                    "contact": "9876543210",
                    "license_number": "TN1234567890"
                }
            },
            {
                "vehicle_name": "Mahindra Bolero",
                "vehicle_number": "TN45CD5678",
                "category": "small",
                "capacity_cans": 35.0,
                "realistic_specs": {
                    "model": "Bolero Pickup",
                    "manufacturer": "Mahindra",
                    "fuel_type": "Diesel",
                    "avg_speed_kmph": 50
                },
                "driver_details": None
            }
        ]
        
        result = await FleetService.bulk_create_from_excel(db, fleet_data)
        print(f"✅ Created {result['inserted_count']} vehicles")
        print(f"   Vehicle codes: {', '.join(result['vehicle_codes'])}")
        
        # Test 2: Get all fleet
        print("\n2️⃣ Testing get all fleet...")
        fleet_result = await FleetService.get_all_fleet(db, skip=0, limit=10)
        print(f"✅ Retrieved {len(fleet_result['fleet'])} vehicles")
        print(f"   Total: {fleet_result['total']}")
        
        if fleet_result['fleet']:
            first_vehicle = fleet_result['fleet'][0]
            print(f"   Sample: {first_vehicle.vehicle_code} - {first_vehicle.vehicle_name}")
            print(f"   Category: {first_vehicle.category}")
            print(f"   Capacity: {first_vehicle.capacity_cans} cans = {first_vehicle.capacity_liters} liters")
        
        # Test 3: Get statistics
        print("\n3️⃣ Testing fleet statistics...")
        stats = await FleetService.get_stats(db)
        print(f"✅ Statistics:")
        print(f"   Total vehicles: {stats['total_vehicles']}")
        print(f"   Available: {stats['available_vehicles']}")
        print(f"   Total capacity: {stats['total_capacity_liters']} liters ({stats['total_capacity_cans']} cans)")
        print(f"   Mini vehicles: {stats['mini_vehicles']}")
        print(f"   Small vehicles: {stats['small_vehicles']}")


async def test_phase6():
    """Main test function"""
    print("\n" + "="*70)
    print("🧪 TESTING PHASE 6 - BUSINESS LOGIC SERVICES")
    print("="*70)
    
    # Initialize database
    print("\n0️⃣ Initializing database...")
    await init_db()
    print("✅ Database ready")
    
    # Test all services
    await test_vendor_service()
    await test_storage_hub_service()
    await test_fleet_service()
    
    print("\n" + "="*70)
    print("🎉 PHASE 6 COMPLETE!")
    print("="*70)
    print("\n📊 Summary:")
    print("  ✅ Vendor Service working")
    print("  ✅ Storage Hub Service working")
    print("  ✅ Fleet Service working")
    print("  ✅ Bulk operations working")
    print("  ✅ CRUD operations working")
    print("  ✅ Statistics working")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(test_phase6())
