"""Quick test to verify Phase 2 setup"""

from core.config import settings
from core.constants import VEHICLE_CATEGORIES, VENDOR_CODE_PREFIX
from utils.conversions import cans_to_liters, liters_to_cans, generate_vendor_code

print("\n" + "="*60)
print("Testing Phase 2 Configuration")
print("="*60)

# Test 1: Config
print(f"\n✅ Config loaded:")
print(f"   Database: {settings.POSTGRES_DB}")
print(f"   Can to Liter: {settings.CAN_TO_LITER_RATIO}")

# Test 2: Constants
print(f"\n✅ Constants loaded:")
print(f"   Vehicle Categories: {VEHICLE_CATEGORIES}")
print(f"   Vendor Code Prefix: {VENDOR_CODE_PREFIX}")

# Test 3: Conversions
print(f"\n✅ Conversions working:")
print(f"   2 cans = {cans_to_liters(2)} liters")
print(f"   80 liters = {liters_to_cans(80)} cans")
print(f"   Next vendor code: {generate_vendor_code(0)}")

print("\n" + "="*60)
print("✅ Phase 2 Setup Complete!")
print("="*60 + "\n")
