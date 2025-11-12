"""
Data Transformer Service
Convert PostgreSQL data to core optimization engine format
"""

from typing import Dict, List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.vendor import Vendor
from models.storage_hub import StorageHub
from models.fleet import Fleet
from core.constants import CAN_TO_LITER_RATIO
from utils.conversions import cans_to_liters
import logging

logger = logging.getLogger(__name__)


class DataTransformer:
    """Transform database data to optimization engine format"""
    
    @staticmethod
    async def fetch_active_data(db: AsyncSession) -> Dict:
        """Fetch all active data from database"""
        try:
            vendors_result = await db.execute(
                select(Vendor).where(Vendor.is_active == True)
            )
            vendors = vendors_result.scalars().all()
            
            hubs_result = await db.execute(
                select(StorageHub).where(StorageHub.is_active == True)
            )
            hubs = hubs_result.scalars().all()
            
            fleet_result = await db.execute(
                select(Fleet).where(Fleet.is_available == True)
            )
            fleet = fleet_result.scalars().all()
            
            logger.info(f"Fetched: {len(vendors)} vendors, {len(hubs)} hubs, {len(fleet)} vehicles")
            
            return {'vendors': vendors, 'hubs': hubs, 'fleet': fleet}
        except Exception as e:
            logger.error(f"❌ Error fetching data: {str(e)}")
            raise
    
    @staticmethod
    def transform_to_optimization_format(data: Dict) -> Dict:
        """Transform database records to optimization engine input format"""
        try:
            subareas = {}
            farmers_milk = {}
            
            # ✅ Transform vendors - Convert milk from CANS to LITERS
            for vendor in data['vendors']:
                subareas[vendor.vendor_name] = (
                    float(vendor.latitude),
                    float(vendor.longitude)
                )
                # ✅ FI XED: Use correct field name 'milk_quantity_cans'
                milk_in_cans = float(vendor.milk_quantity_cans)
                farmers_milk[vendor.vendor_name] = cans_to_liters(milk_in_cans)
            
            centroids = {}
            center_capacity = {}
            
            # ✅ Transform storage hubs - Already in LITERS
            for hub in data['hubs']:
                centroids[hub.hub_name] = (
                    float(hub.latitude),
                    float(hub.longitude)
                )
                center_capacity[hub.hub_name] = float(hub.capacity_liters)
            
            vehicle_types = {}
            
            # ✅ Transform fleet - Convert capacity from CANS to LITERS
            for vehicle in data['fleet']:
                category = vehicle.category_name or f"CAT_{vehicle.vehicle_code}"
                
                if category not in vehicle_types:
                    # ✅ FIXED: Convert vehicle capacity from CANS to LITERS
                    capacity_in_cans = int(vehicle.capacity_cans)
                    capacity_in_liters = cans_to_liters(capacity_in_cans)
                    
                    vehicle_types[category] = {
                        'name': category,
                        'capacity': capacity_in_liters,
                        'count': 1,
                        'service_time': vehicle.service_time or 10,
                        'cost_per_km': float(vehicle.cost_per_km or 10.0),
                        'fixed_cost': float(vehicle.fixed_cost or 500.0),
                    }
                else:
                    vehicle_types[category]['count'] += 1
            
            vehicle_types_list = list(vehicle_types.values())
            
            logger.info(f"✅ Transformed data successfully:")
            logger.info(f"   - Vendors: {len(subareas)}")
            logger.info(f"   - Hubs: {len(centroids)}")
            logger.info(f"   - Vehicle categories: {len(vehicle_types_list)}")
            logger.info(f"   - Total vehicles: {sum(v['count'] for v in vehicle_types_list)}")
            logger.info(f"   - Total milk: {sum(farmers_milk.values()):.2f} liters")
            
            return {
                'centroids': centroids,
                'center_capacity': center_capacity,
                'subareas': subareas,
                'farmers_milk': farmers_milk,
                'vehicle_types': vehicle_types_list,
                'metadata': {
                    'vendors_count': len(subareas),
                    'hubs_count': len(centroids),
                    'vehicle_categories': len(vehicle_types_list),
                    'total_vehicles': sum(v['count'] for v in vehicle_types_list),
                    'total_milk_liters': sum(farmers_milk.values()),
                    'total_capacity_liters': sum(center_capacity.values())
                }
            }
        except Exception as e:
            logger.error(f"❌ Error transforming data: {str(e)}")
            raise
    
    @staticmethod
    async def transform_db_to_engine_input(db: AsyncSession) -> Dict:
        """Single method to fetch and transform data in one call"""
        data = await DataTransformer.fetch_active_data(db)
        
        if not data['vendors']:
            raise ValueError("❌ No vendors found in database")
        if not data['hubs']:
            raise ValueError("❌ No storage hubs found in database")
        if not data['fleet']:
            raise ValueError("❌ No fleet vehicles found in database")
        
        return DataTransformer.transform_to_optimization_format(data)
