#services/fleet_categorizer.py
"""
Fleet Categorizer Service
Auto-generate fleet categories and cost parameters based on capacity
"""

from typing import List, Dict, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.fleet import Fleet
import logging

logger = logging.getLogger(__name__)

class FleetCategorizer:
    """Service to auto-categorize fleet vehicles"""
    
    BASE_FIXED_COST = 300  # ₹
    BASE_COST_PER_KM = 5   # ₹/km
    BASE_SERVICE_TIME = 4  # minutes per stop
    
    @staticmethod
    async def categorize_fleet(db: AsyncSession) -> Dict:
        """
        Categorize all fleet vehicles by capacity
        Sort by capacity: min(cap) = C1, max(cap) = Cn
        """
        try:
            result = await db.execute(
                select(Fleet)
                .where(Fleet.is_available == True)
                .order_by(Fleet.capacity_cans)
            )
            vehicles = result.scalars().all()
            
            if not vehicles:
                return {
                    'total_vehicles': 0,
                    'categories': [],
                    'mapping': {},
                    'status': 'NO_VEHICLES'
                }
            
            capacities = sorted([v.capacity_cans for v in vehicles])
            capacity_to_category = {}
            category_list = []
            
            for idx, capacity in enumerate(set(sorted(capacities))):
                category_name = f"C{idx + 1}"
                capacity_to_category[capacity] = category_name
                cost_multiplier = 1 + (idx * 0.3)
                
                category_list.append({
                    'category': category_name,
                    'capacity_cans': capacity,
                    'capacity_liters': capacity * 40,
                    'fixed_cost': round(FleetCategorizer.BASE_FIXED_COST * cost_multiplier, 2),
                    'cost_per_km': round(FleetCategorizer.BASE_COST_PER_KM * cost_multiplier, 2),
                    'service_time': FleetCategorizer.BASE_SERVICE_TIME,
                })
            
            category_mapping = {}
            updated_count = 0
            
            for vehicle in vehicles:
                category = capacity_to_category[vehicle.capacity_cans]
                cat_details = next((c for c in category_list if c['category'] == category), None)
                
                if cat_details:
                    await db.execute(
                        update(Fleet)
                        .where(Fleet.id == vehicle.id)
                        .values(
                            category_name=category,
                            fixed_cost=cat_details['fixed_cost'],
                            cost_per_km=cat_details['cost_per_km'],
                            service_time=cat_details['service_time'],
                            vehicle_count=1
                        )
                    )
                    updated_count += 1
                    
                    if category not in category_mapping:
                        category_mapping[category] = []
                    
                    category_mapping[category].append({
                        'id': vehicle.id,
                        'vehicle_code': vehicle.vehicle_code,
                        'vehicle_name': vehicle.vehicle_name,
                        'vehicle_number':vehicle.vehicle_number,
                        'capacity_cans': vehicle.capacity_cans,
                        'capacity_liters': vehicle.capacity_liters
                    })
            
            await db.commit()
            logger.info(f"✅ Categorized {updated_count} vehicles into {len(category_list)} categories")
            
            return {
                'status': 'SUCCESS',
                'total_vehicles': updated_count,
                'total_categories': len(category_list),
                'categories': category_list,
                'mapping': category_mapping
            }
            
        except Exception as e:
            logger.error(f"❌ Error categorizing fleet: {str(e)}")
            await db.rollback()
            raise Exception(f"Fleet categorization failed: {str(e)}")
