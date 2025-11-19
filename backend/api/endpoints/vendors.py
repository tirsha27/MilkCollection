#api/endpoints/vendors.py
"""
Vendor API Endpoints
REST APIs for vendor operations
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from api.deps import get_db
from services import VendorService, ExcelService
from schemas.vendor import VendorResponse, VendorCreate, VendorUpdate
from schemas.responses import BulkUploadResponse, MessageResponse

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.post("/upload", response_model=BulkUploadResponse)
async def upload_vendors_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload vendors Excel file"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are allowed")

    valid_records, error_records = await ExcelService.parse_vendors_excel(file)

    if not valid_records:
        return BulkUploadResponse(
            success=False,
            message="No valid records found in Excel",
            batch_id="",
            inserted_count=0,
            failed_count=len(error_records),
            validation_errors=error_records
        )

    result = await VendorService.bulk_create_from_excel(db, valid_records)

    return BulkUploadResponse(
        success=True,
        message=f"Successfully uploaded {result['inserted_count']} vendors",
        batch_id=result['batch_id'],
        inserted_count=result['inserted_count'],
        failed_count=len(error_records),
        validation_errors=error_records if error_records else []
    )

@router.get("/", response_model=List[VendorResponse])
async def get_all_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    result = await VendorService.get_all_vendors(
        db, skip=skip, limit=limit, is_active=is_active, search=search
    )
    return result["vendors"]

@router.post("/", response_model=VendorResponse)
async def create_vendor(
    vendor_create: VendorCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new vendor"""
    vendor = await VendorService.create_vendor(db, vendor_create)
    return vendor

@router.get("/stats")
async def get_vendor_stats(db: AsyncSession = Depends(get_db)):
    return await VendorService.get_stats(db)

@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,  # Changed from int to str
    db: AsyncSession = Depends(get_db)
):
    vendor = await VendorService.get_vendor_by_id(db, vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    return vendor

@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,  # Changed from int to str
    vendor_update: VendorUpdate,
    db: AsyncSession = Depends(get_db)
):
    vendor = await VendorService.update_vendor(db, vendor_id, vendor_update)
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    return vendor

@router.delete("/{vendor_id}", response_model=MessageResponse)
async def delete_vendor(
    vendor_id: str,  # Changed from int to str
    db: AsyncSession = Depends(get_db)
):
    result = await VendorService.delete_vendor(db, vendor_id)
    if not result:
        raise HTTPException(404, "Vendor not found")
    return MessageResponse(**result)

@router.get("/stats", response_model=dict)
async def get_vendor_stats(
    db: AsyncSession = Depends(get_db)
):
    stats = await VendorService.get_stats(db)
    return stats

from fastapi.responses import StreamingResponse
from io import BytesIO
import pandas as pd


@router.get("/template", summary="Download Vendors Template")
async def download_vendors_template():
    """
    Returns a valid Excel (.xlsx) template for vendor (farmer) data upload.
    """
    columns = [
        "Vendor Name",
        "Village/Area",
        "Contact",
        "Latitude",
        "Longitude",
        "Milk Quantity (Cans)"
    ]

    df = pd.DataFrame(columns=columns)

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="VendorsTemplate")

    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="vendors_template.xlsx"'
    }

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
