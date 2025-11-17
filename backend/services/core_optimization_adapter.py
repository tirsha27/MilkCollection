from scripts.optimization_engine import OptimizationEngine
"""
Core Optimization Adapter
Bridge between FastAPI and the core optimization engine
"""

import logging
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from scripts.optimization_engine import OptimizationEngine
except ImportError:
    logger.warning("⚠️ Could not import OptimizationEngine from scripts")
    OptimizationEngine = None


class CoreOptimizationAdapter:
    """Adapter to call core optimization engine"""
    
    @staticmethod
    async def run_optimization(
        db: AsyncSession,
        deadline_minutes: int = 480,
        max_distance_km: float = 100.0,
        use_categorized_fleet: bool = True
    ) -> Dict:
        """Run optimization using core script with database data"""
        try:
            if OptimizationEngine is None:
                raise Exception("OptimizationEngine not available. Check script path.")
            
            logger.info("🚀 Starting optimization engine...")
            
            from services.data_transformer import DataTransformer
            
            logger.info("📊 Transforming database to engine format...")
            engine_input = await DataTransformer.transform_db_to_engine_input(db)

            print("=== DataTransformer Output ===")
            print(f"vehicle_types: {engine_input.get('vehicle_types')}")
            print(f"Does it have fleetlookup? {bool(engine_input.get('fleet_lookup'))}")
            
            engine = OptimizationEngine()
            engine.set_data(
                centroids=engine_input['centroids'],
                center_capacity=engine_input['center_capacity'],
                subareas=engine_input['subareas'],
                farmers_milk=engine_input['farmers_milk']
            )
            
            engine.fleet_lookup = engine_input.get('fleet_lookup', {})
            engine.vehicle_types = engine_input.get('vehicle_types', [])

            logger.info(f"✅ Engine initialized with {engine_input['metadata']['vendors_count']} vendors")
            
            optimization_results = engine.run_optimization(
                deadline_minutes=deadline_minutes,
                max_distance_km=max_distance_km,
                vehicle_types_list=engine_input['vehicle_types']
            )
            
            if not optimization_results:
                raise Exception("Optimization engine returned no results")
            
            results = {
                'status': 'SUCCESS',
                'timestamp': datetime.now().isoformat(),
                'optimization_results': optimization_results,
                'input_metadata': engine_input['metadata'],
                'constraints': {
                    'deadline_minutes': deadline_minutes,
                    'max_distance_km': max_distance_km
                }
            }
            
            result_file = engine.save_optimization_result(optimization_results)
            results['saved_file'] = result_file
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Optimization failed: {str(e)}")
            return {
                'status': 'ERROR',
                'error_type': 'OPTIMIZATION_ERROR',
                'message': str(e)
            }
    
    @staticmethod
    async def get_transformation_preview(db: AsyncSession) -> Dict:
        """Preview how data will be transformed"""
        try:
            from services.data_transformer import DataTransformer
            engine_input = await DataTransformer.transform_db_to_engine_input(db)


            return {
                'status': 'SUCCESS',
                'preview': {
                    'sample_vendors': list(engine_input['subareas'].items())[:3],
                    'sample_hubs': list(engine_input['centroids'].items())[:3],
                    'vehicle_categories': engine_input['vehicle_types'],
                    'metadata': engine_input['metadata']
                }
            }
        except Exception as e:
            return {'status': 'ERROR', 'message': str(e)}


