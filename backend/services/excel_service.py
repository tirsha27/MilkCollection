#services/excel_service.py
"""
Excel Service
Handles Excel file parsing and validation for bulk uploads
"""

from fastapi import UploadFile, HTTPException
import pandas as pd
from io import BytesIO
from typing import List, Dict, Tuple
import uuid


class ExcelService:
    """Service for parsing and validating Excel uploads"""
    
    @staticmethod
    async def parse_vendors_excel(file: UploadFile) -> Tuple[List[Dict], List[Dict]]:
        """
        Parse vendors Excel file
        
        Args:
            file: Uploaded Excel file
            
        Returns:
            Tuple of (valid_records, error_records)
        """
        try:
            # Read Excel file
            content = await file.read()
            df = pd.read_excel(BytesIO(content))
            
            # Required columns
            required_cols = [
                "Vendor Name",
                "Village/Area",
                "Latitude",
                "Longitude",
                "Milk Quantity (Cans)"
            ]
            
            # Check for missing columns
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns: {', '.join(missing_cols)}"
                )
            
            valid_records = []
            error_records = []
            
            # Process each row
            for idx, row in df.iterrows():
                try:
                    # Extract and validate data
                    vendor_data = {
                        "vendor_name": str(row["Vendor Name"]).strip(),
                        "village": str(row["Village/Area"]).strip(),
                        "latitude": float(row["Latitude"]),
                        "longitude": float(row["Longitude"]),
                        "milk_quantity_cans": float(row["Milk Quantity (Cans)"])
                    }
                    
                    # Optional contact number
                    if pd.notna(row.get("Contact")):
                        contact = str(row["Contact"]).strip()
                        # Remove any non-digit characters
                        contact = ''.join(filter(str.isdigit, contact))
                        if len(contact) == 10:
                            vendor_data["contact_number"] = contact
                        else:
                            vendor_data["contact_number"] = None
                    else:
                        vendor_data["contact_number"] = None
                    
                    # Validate data
                    if len(vendor_data["vendor_name"]) < 2:
                        raise ValueError("Vendor name too short (min 2 characters)")
                    
                    if len(vendor_data["village"]) < 2:
                        raise ValueError("Village name too short (min 2 characters)")
                    
                    if not (-90 <= vendor_data["latitude"] <= 90):
                        raise ValueError("Invalid latitude (must be between -90 and 90)")
                    
                    if not (-180 <= vendor_data["longitude"] <= 180):
                        raise ValueError("Invalid longitude (must be between -180 and 180)")
                    
                    if vendor_data["milk_quantity_cans"] <= 0 or vendor_data["milk_quantity_cans"] > 100:
                        raise ValueError("Milk quantity must be between 0 and 100 cans")
                    
                    valid_records.append(vendor_data)
                    
                except Exception as e:
                    error_records.append({
                        "row": idx + 2,  # Excel row number (1-indexed + header)
                        "data": row.to_dict(),
                        "error": str(e)
                    })
            
            return valid_records, error_records
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Excel parsing error: {str(e)}"
            )
    
    @staticmethod
    async def parse_storage_hubs_excel(file: UploadFile) -> Tuple[List[Dict], List[Dict]]:
        """
        Parse storage hubs Excel file
        
        Args:
            file: Uploaded Excel file
            
        Returns:
            Tuple of (valid_records, error_records)
        """
        try:
            content = await file.read()
            df = pd.read_excel(BytesIO(content))
            
            # Required columns
            required_cols = [
                "Hub Name",
                "Location",
                "Latitude",
                "Longitude",
                "Capacity (Liters)"
            ]
            
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns: {', '.join(missing_cols)}"
                )
            
            valid_records = []
            error_records = []
            
            for idx, row in df.iterrows():
                try:
                    hub_data = {
                        "hub_name": str(row["Hub Name"]).strip(),
                        "location": str(row["Location"]).strip(),
                        "latitude": float(row["Latitude"]),
                        "longitude": float(row["Longitude"]),
                        "capacity_liters": float(row["Capacity (Liters)"])
                    }
                    
                    # Optional contact
                    if pd.notna(row.get("Contact")):
                        contact = str(row["Contact"]).strip()
                        contact = ''.join(filter(str.isdigit, contact))
                        if len(contact) == 10:
                            hub_data["contact_number"] = contact
                        else:
                            hub_data["contact_number"] = None
                    else:
                        hub_data["contact_number"] = None
                    
                    # Validate
                    if len(hub_data["hub_name"]) < 2:
                        raise ValueError("Hub name too short (min 2 characters)")
                    
                    if len(hub_data["location"]) < 2:
                        raise ValueError("Location too short (min 2 characters)")
                    
                    if not (-90 <= hub_data["latitude"] <= 90):
                        raise ValueError("Invalid latitude")
                    
                    if not (-180 <= hub_data["longitude"] <= 180):
                        raise ValueError("Invalid longitude")
                    
                    if hub_data["capacity_liters"] <= 0:
                        raise ValueError("Capacity must be positive")
                    
                    valid_records.append(hub_data)
                    
                except Exception as e:
                    error_records.append({
                        "row": idx + 2,
                        "data": row.to_dict(),
                        "error": str(e)
                    })
            
            return valid_records, error_records
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Excel parsing error: {str(e)}"
            )
    
    @staticmethod
    async def parse_fleet_excel(file: UploadFile) -> Tuple[List[Dict], List[Dict]]:
        """
        Parse fleet Excel file
        
        Args:
            file: Uploaded Excel file
            
        Returns:
            Tuple of (valid_records, error_records)
        """
        try:
            content = await file.read()
            df = pd.read_excel(BytesIO(content))
            
            # Required columns
            required_cols = [
                "Vehicle Name",
                "Vehicle Number",
                "Category",
                "Capacity (Cans)",
                "Model",
                "Manufacturer",
                "Fuel Type"
            ]
            
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns: {', '.join(missing_cols)}"
                )
            
            valid_records = []
            error_records = []
            
            for idx, row in df.iterrows():
                try:
                    # Parse driver details if available
                    driver_details = None
                    if pd.notna(row.get("Driver Name")) and pd.notna(row.get("Driver Contact")):
                        driver_contact = str(row["Driver Contact"]).strip()
                        driver_contact = ''.join(filter(str.isdigit, driver_contact))
                        
                        if len(driver_contact) == 10:
                            driver_details = {
                                "name": str(row["Driver Name"]).strip(),
                                "contact": driver_contact,
                                "license_number": str(row.get("License Number", "")).strip() or None
                            }
                    
                    fleet_data = {
                        "vehicle_name": str(row["Vehicle Name"]).strip(),
                        "vehicle_number": str(row["Vehicle Number"]).strip().upper(),
                        "category": str(row["Category"]).strip().lower(),
                        "capacity_cans": float(row["Capacity (Cans)"]),
                        "realistic_specs": {
                            "model": str(row["Model"]).strip(),
                            "manufacturer": str(row["Manufacturer"]).strip(),
                            "fuel_type": str(row["Fuel Type"]).strip(),
                            "avg_speed_kmph": float(row.get("Avg Speed (kmph)", 40))
                        },
                        "driver_details": driver_details
                    }
                    
                    # Validate
                    if len(fleet_data["vehicle_name"]) < 2:
                        raise ValueError("Vehicle name too short")
                    
                    if len(fleet_data["vehicle_number"]) < 4:
                        raise ValueError("Invalid vehicle number")
                    
                    if fleet_data["category"] not in ["mini", "small"]:
                        raise ValueError("Category must be 'mini' or 'small'")
                    
                    if fleet_data["capacity_cans"] <= 0 or fleet_data["capacity_cans"] > 200:
                        raise ValueError("Capacity must be between 0 and 200 cans")
                    
                    if fleet_data["realistic_specs"]["fuel_type"] not in ["Diesel", "Petrol", "CNG", "Electric"]:
                        raise ValueError("Invalid fuel type (must be Diesel, Petrol, CNG, or Electric)")
                    
                    if fleet_data["realistic_specs"]["avg_speed_kmph"] <= 0 or fleet_data["realistic_specs"]["avg_speed_kmph"] > 120:
                        raise ValueError("Avg speed must be between 0 and 120 kmph")
                    
                    valid_records.append(fleet_data)
                    
                except Exception as e:
                    error_records.append({
                        "row": idx + 2,
                        "data": row.to_dict(),
                        "error": str(e)
                    })
            
            return valid_records, error_records
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Excel parsing error: {str(e)}"
            )
