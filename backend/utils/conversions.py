"""
Conversion Utilities
Handle conversions between cans and liters
"""

from core.config import settings


def cans_to_liters(cans: float) -> float:
    """
    Convert cans to liters
    
    Args:
        cans: Number of cans
        
    Returns:
        Equivalent liters (rounded to 2 decimal places)
    """
    if cans is None:
        return 0.0
    return round(cans * settings.CAN_TO_LITER_RATIO, 2)


def liters_to_cans(liters: float) -> float:
    """
    Convert liters to cans
    
    Args:
        liters: Number of liters
        
    Returns:
        Equivalent cans (rounded to 2 decimal places)
    """
    if liters is None:
        return 0.0
    return round(liters / settings.CAN_TO_LITER_RATIO, 2)


def generate_vendor_code(last_number: int) -> str:
    """
    Generate vendor code (V001, V002, V003...)
    
    Args:
        last_number: Last vendor number in database
        
    Returns:
        New vendor code
    """
    from core.constants import VENDOR_CODE_PREFIX
    return f"{VENDOR_CODE_PREFIX}{str(last_number + 1).zfill(3)}"


def generate_storage_hub_code(last_number: int) -> str:
    """
    Generate storage hub code (SH001, SH002, SH003...)
    
    Args:
        last_number: Last storage hub number in database
        
    Returns:
        New storage hub code
    """
    from core.constants import STORAGE_HUB_CODE_PREFIX
    return f"{STORAGE_HUB_CODE_PREFIX}{str(last_number + 1).zfill(3)}"


def generate_fleet_code(last_number: int) -> str:
    """
    Generate fleet code (F001, F002, F003...)
    
    Args:
        last_number: Last fleet number in database
        
    Returns:
        New fleet code
    """
    from core.constants import FLEET_CODE_PREFIX
    return f"{FLEET_CODE_PREFIX}{str(last_number + 1).zfill(3)}"


def extract_code_number(code: str) -> int:
    """
    Extract number from code (V001 -> 1, SH010 -> 10)
    
    Args:
        code: Code string (e.g., "V001", "SH010", "F005")
        
    Returns:
        Extracted number
    """
    try:
        # Remove all non-digit characters and convert to int
        number_str = ''.join(filter(str.isdigit, code))
        return int(number_str) if number_str else 0
    except ValueError:
        return 0


# ============================================================
# VALIDATION HELPERS
# ============================================================

def validate_coordinate(value: float, coord_type: str = "latitude") -> bool:
    """
    Validate latitude or longitude
    
    Args:
        value: Coordinate value
        coord_type: "latitude" or "longitude"
        
    Returns:
        True if valid, False otherwise
    """
    if coord_type == "latitude":
        return -90 <= value <= 90
    elif coord_type == "longitude":
        return -180 <= value <= 180
    return False


def validate_phone_number(phone: str) -> bool:
    """
    Validate 10-digit phone number
    
    Args:
        phone: Phone number string
        
    Returns:
        True if valid, False otherwise
    """
    if not phone:
        return True  # Optional field
    
    # Remove any non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    return len(digits) == 10
