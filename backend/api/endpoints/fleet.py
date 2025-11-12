"""
Fleet API Endpoints
REST APIs for fleet operations
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from api.deps import get_db
from services import FleetService, ExcelService
from schemas.fleet import FleetResponse, FleetCreate, FleetUpdate
from schemas.responses import BulkUploadResponse, MessageResponse


router = APIRouter(prefix="/fleet", tags=["Fleet"])


@router.post("/upload", response_model=BulkUploadResponse)
async def upload_fleet_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload fleet Excel file
    
    Excel Format:
    - Vehicle Name, Vehicle Number, Category, Capacity (Cans), 
      Model, Manufacturer, Fuel Type, Driver Name, Driver Contact
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are allowed")
    
    valid_records, error_records = await ExcelService.parse_fleet_excel(file)
    
    if not valid_records:
        return BulkUploadResponse(
            success=False,
            message="No valid records found in Excel",
            batch_id="",
            inserted_count=0,
            failed_count=len(error_records),
            validation_errors=error_records
        )
    
    result = await FleetService.bulk_create_from_excel(db, valid_records)
    
    return BulkUploadResponse(
        success=True,
        message=f"Successfully uploaded {result['inserted_count']} vehicles",
        batch_id=result['batch_id'],
        inserted_count=result['inserted_count'],
        failed_count=len(error_records),
        validation_errors=error_records if error_records else []
    )


@router.post("/", response_model=FleetResponse)
async def create_fleet(
    fleet_data: FleetCreate,
    db: AsyncSession = Depends(get_db)
):
    created = await FleetService.create_fleet(db, fleet_data)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create fleet")
    return created

@router.get("/", response_model=List[FleetResponse])
async def get_all_fleet(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    is_available: Optional[bool] = None,
    category: Optional[str] = Query(None, regex="^(mini|small)$"),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all fleet with pagination
    
    - **category**: Filter by vehicle category (mini/small)
    - **is_available**: Filter by availability status
    """
    result = await FleetService.get_all_fleet(
        db, skip=skip, limit=limit, 
        is_available=is_available, 
        category=category, 
        search=search
    )
    return result['fleet']


@router.get("/stats")
async def get_fleet_stats(db: AsyncSession = Depends(get_db)):
    return await FleetService.get_stats(db)


@router.get("/{fleet_id}", response_model=FleetResponse)
async def get_fleet(
    fleet_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single fleet by ID"""
    fleet = await FleetService.get_fleet_by_id(db, fleet_id)
    if not fleet:
        raise HTTPException(404, "Fleet not found")
    return fleet


@router.put("/{fleet_id}", response_model=FleetResponse)
async def update_fleet(
    fleet_id: int,
    fleet_update: FleetUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update fleet details"""
    fleet = await FleetService.update_fleet(db, fleet_id, fleet_update)
    if not fleet:
        raise HTTPException(404, "Fleet not found")
    return fleet


@router.delete("/{fleet_id}", response_model=MessageResponse)
async def delete_fleet(
    fleet_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Mark fleet as unavailable"""
    result = await FleetService.delete_fleet(db, fleet_id)
    if not result:
        raise HTTPException(404, "Fleet not found")
    return MessageResponse(**result)

from fastapi.responses import StreamingResponse
from io import BytesIO
import pandas as pd


@router.get("/template", summary="Download Fleet Template")
async def download_fleet_template():
    """
    Returns a valid Excel (.xlsx) template for fleet data upload.
    """
    columns = [
        "Vehicle Name",
        "Vehicle Number",
        "Category",
        "Capacity (Cans)",
        "Model",
        "Manufacturer",
        "Fuel Type",
        "Driver Name",
        "Driver Contact"
    ]

    df = pd.DataFrame(columns=columns)

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="FleetTemplate")

    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="fleet_template.xlsx"'
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
