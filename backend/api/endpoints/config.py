# backend/api/endpoints/config.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from database.session import get_db
from schemas.responses import MessageResponse

router = APIRouter(prefix="/config", tags=["Configuration"])

@router.get("/")
async def get_config_items(db: AsyncSession = Depends(get_db)):
    # Replace with actual DB fetch
    return [{"config_key": "max_distance_km", "config_value": 250}]

@router.put("/{config_key}", response_model=MessageResponse)
async def update_config_item(config_key: str, payload: dict, db: AsyncSession = Depends(get_db)):
    # Replace with DB update logic
    return MessageResponse(message=f"{config_key} updated successfully")
