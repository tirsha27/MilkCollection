#api/endpoints/storage_hubs.py
"""
Storage Hub API Endpoints
REST APIs for storage hub operations
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from api.deps import get_db
from services import StorageHubService, ExcelService
from schemas.storage_hub import StorageHubResponse, StorageHubCreate, StorageHubUpdate
from schemas.responses import BulkUploadResponse, MessageResponse


router = APIRouter(prefix="/storage-hubs", tags=["Storage Hubs"])
@router.get("/list")
async def list_storage_hubs(db: AsyncSession = Depends(get_db)):
    """Return minimal hub list for dropdown"""
    result = await StorageHubService.get_all_hubs(db)
    hubs = result["storage_hubs"]
    return [
        {"id": str(hub.id), "name": hub.hub_name}
        for hub in hubs
        if getattr(hub, "is_active", True)
    ]

@router.post("/upload", response_model=BulkUploadResponse)
async def upload_storage_hubs_excel(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload storage hubs Excel file
    
    Excel Format:
    - Hub Name, Location, Contact, Latitude, Longitude, Capacity (Liters)
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are allowed")
    
    valid_records, error_records = await ExcelService.parse_storage_hubs_excel(file)
    
    if not valid_records:
        return BulkUploadResponse(
            success=False,
            message="No valid records found in Excel",
            batch_id="",
            inserted_count=0,
            failed_count=len(error_records),
            validation_errors=error_records
        )
    
    result = await StorageHubService.bulk_create_from_excel(db, valid_records)
    
    return BulkUploadResponse(
        success=True,
        message=f"Successfully uploaded {result['inserted_count']} storage hubs",
        batch_id=result['batch_id'],
        inserted_count=result['inserted_count'],
        failed_count=len(error_records),
        validation_errors=error_records if error_records else []
    )


@router.get("/", response_model=List[StorageHubResponse])
async def get_all_storage_hubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all storage hubs with pagination"""
    result = await StorageHubService.get_all_hubs(
        db, skip=skip, limit=limit, is_active=is_active, search=search
    )
    return result['storage_hubs']


@router.get("/stats")
async def get_storage_hub_stats(db: AsyncSession = Depends(get_db)):
    return await StorageHubService.get_stats(db)


@router.get("/{hub_id}", response_model=StorageHubResponse)
async def get_storage_hub(
    hub_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single storage hub by ID"""
    hub = await StorageHubService.get_hub_by_id(db, hub_id)
    if not hub:
        raise HTTPException(404, "Storage hub not found")
    return hub


@router.put("/{hub_id}", response_model=StorageHubResponse)
async def update_storage_hub(
    hub_id: int,
    hub_update: StorageHubUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update storage hub details"""
    hub = await StorageHubService.update_hub(db, hub_id, hub_update)
    if not hub:
        raise HTTPException(404, "Storage hub not found")
    return hub


@router.delete("/{hub_id}", response_model=MessageResponse)
async def delete_storage_hub(
    hub_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Soft delete storage hub"""
    result = await StorageHubService.delete_hub(db, hub_id)
    if not result:
        raise HTTPException(404, "Storage hub not found")
    return MessageResponse(**result)

@router.post("/", response_model=StorageHubResponse)
async def create_storage_hub(hub: StorageHubCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a single storage hub (used by frontend create form).
    """
    created = await StorageHubService.create_hub(db, hub)
    if not created:
        raise HTTPException(500, "Failed to create storage hub")
    return created

from fastapi.responses import Response
from io import BytesIO
import pandas as pd

@router.get("/template", response_description="Download Chilling Center Excel Template")
async def download_storage_hubs_template():
    """
    Returns a valid Excel (.xlsx) template for storage hubs data upload.
    """
    columns = [
        "Hub Name",
        "Location",
        "Contact",
        "Latitude",
        "Longitude",
        "Capacity (Liters)"
    ]

    df = pd.DataFrame(columns=columns)

    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="StorageHubsTemplate")

    output.seek(0)

    return Response(
        content=output.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="storage_hubs_template.xlsx"'
        },
    )
