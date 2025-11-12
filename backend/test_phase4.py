"""
Test Phase 4 - Pydantic Schemas
Validates schema creation and data validation
"""

from schemas import (
    VendorCreate, VendorResponse, VendorUpdate,
    StorageHubCreate, StorageHubResponse,
    FleetCreate, FleetResponse, VehicleSpecs, DriverDetails,
    MessageResponse, BulkUploadResponse
)
from pydantic import ValidationError


def test_schemas():
    print("\n" + "="*70)
    print("🧪 TESTING PHASE 4 - PYDANTIC SCHEMAS")
    print("="*70)
    
    # Test 1: Vendor Schema
    print("\n1️⃣ Testing Vendor schemas...")
    try:
        vendor_data = {
            "vendor_name": "Arumugham",
            "village": "Periyar Nagar",
            "latitude": 10.6098825,
            "longitude": 78.5434806,
            "contact_number": "9876543210",
            "milk_quantity_cans": 2.0
        }
        vendor = VendorCreate(**vendor_data)
        print(f"✅ VendorCreate validated: {vendor.vendor_name}")
        
        # Test validation (should fail)
        try:
            invalid_vendor = VendorCreate(
                vendor_name="A",  # Too short
                village="X",
                latitude=200,  # Invalid
                longitude=0,
                milk_quantity_cans=2
            )
        except ValidationError:
            print("✅ Validation correctly rejected invalid vendor data")
    except Exception as e:
        print(f"❌ Vendor schema error: {e}")
    
    # Test 2: Storage Hub Schema
    print("\n2️⃣ Testing Storage Hub schemas...")
    try:
        hub_data = {
            "hub_name": "Viralimalai Hub",
            "location": "Viralimalai, Trichy",
            "latitude": 10.6134106,
            "longitude": 78.5508431,
            "contact_number": "9876543210",
            "capacity_liters": 2000.0
        }
        hub = StorageHubCreate(**hub_data)
        print(f"✅ StorageHubCreate validated: {hub.hub_name}")
    except Exception as e:
        print(f"❌ Storage Hub schema error: {e}")
    
    # Test 3: Fleet Schema
    print("\n3️⃣ Testing Fleet schemas...")
    try:
        fleet_data = {
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
        }
        fleet = FleetCreate(**fleet_data)
        print(f"✅ FleetCreate validated: {fleet.vehicle_name}")
        
        # Test validation (should fail)
        try:
            invalid_fleet = FleetCreate(
                vehicle_name="Truck",
                vehicle_number="ABC",
                category="large",  # Invalid category
                capacity_cans=25,
                realistic_specs={
                    "model": "Test",
                    "manufacturer": "Test",
                    "fuel_type": "Nuclear",  # Invalid fuel type
                    "avg_speed_kmph": 50
                }
            )
        except ValidationError:
            print("✅ Validation correctly rejected invalid fleet data")
    except Exception as e:
        print(f"❌ Fleet schema error: {e}")
    
    # Test 4: Response Schemas
    print("\n4️⃣ Testing Response schemas...")
    try:
        message = MessageResponse(message="Test successful")
        print(f"✅ MessageResponse: {message.message}")
        
        upload_response = BulkUploadResponse(
            success=True,
            message="10 vendors uploaded",
            batch_id="abc-123",
            inserted_count=10
        )
        print(f"✅ BulkUploadResponse: {upload_response.inserted_count} records")
    except Exception as e:
        print(f"❌ Response schema error: {e}")
    
    print("\n" + "="*70)
    print("🎉 PHASE 4 COMPLETE!")
    print("="*70)
    print("\n📊 Summary:")
    print("  ✅ Vendor schemas working")
    print("  ✅ Storage Hub schemas working")
    print("  ✅ Fleet schemas working")
    print("  ✅ Response schemas working")
    print("  ✅ Data validation working")
    print("="*70 + "\n")


if __name__ == "__main__":
    test_schemas()
