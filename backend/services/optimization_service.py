"""
Optimization Service
Route optimization business logic with OpenRouteService integration
"""


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Optional, Tuple
import requests
import json
import os
from datetime import datetime
from models.vendor import Vendor
from models.storage_hub import StorageHub
from models.fleet import Fleet


API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIyNjFmZWMzYWRhNTRmMDE5YzVjZWZkYTQ2MzRjNzk2IiwiaCI6Im11cm11cjY0In0="



class OptimizationService:
    """Service for route optimization operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.centroids = {}
        self.center_capacity = {}
        self.subareas = {}
        self.farmers_milk = {}
    
    async def load_data_from_database(self):
        """Load active data from PostgreSQL database"""
        hubs_result = await self.db.execute(
            select(StorageHub).where(StorageHub.is_active == True)
        )
        hubs = hubs_result.scalars().all()
        
        for hub in hubs:
            self.centroids[hub.hub_code] = (hub.latitude, hub.longitude)
            self.center_capacity[hub.hub_code] = hub.capacity_liters
        
        vendors_result = await self.db.execute(
            select(Vendor).where(Vendor.is_active == True)
        )
        vendors = vendors_result.scalars().all()
        
        for vendor in vendors:
            self.subareas[vendor.vendor_code] = (vendor.latitude, vendor.longitude)
            self.farmers_milk[vendor.vendor_code] = vendor.milk_quantity_liters
    
    async def get_vehicle_types_from_db(self) -> Tuple[List[Dict], Dict]:
        """Get available vehicles from database and group by category"""
        vehicles_result = await self.db.execute(
            select(Fleet).where(Fleet.is_available == True)
        )
        vehicles = vehicles_result.scalars().all()

        print("=== STEP 1: Raw Fleet Data ===")

        for vehicle in vehicles:
            print(f"Vehicle: {vehicle.vehiclenumber}, Category: {vehicle.category}, Capacity: {vehicle.capacityliters}, Available: {vehicle.isavailable}")

        
        vehicle_categories = {}
        fleet_lookup = {}
        
        for vehicle in vehicles:
            if not vehicle.vehicle_number:
                continue


            category = vehicle.category
            
            if category not in vehicle_categories:
                specs = vehicle.realistic_specs or {}
                
                vehicle_categories[category] = {
                    'id': len(vehicle_categories) + 1,
                    'name': f"{category.upper()}_Van",
                    'capacity': vehicle.capacity_liters,
                    'count': 0,
                    'service_time': specs.get('service_time', 10),
                    'cost_per_km': specs.get('cost_per_km', 8),
                    'fixed_cost': specs.get('fixed_cost', 500)
                }
                fleet_lookup[category] = []
            
            vehicle_categories[category]['count'] += 1
            fleet_lookup[category].append({
                'vehicle_number': vehicle.vehicle_number,
                'vehicle_code': vehicle.vehicle_code,
                'vehicle_name': vehicle.vehicle_name
            })


            print("=== STEP 2: Fleet Lookup Built ===")

            for category, vehicles_list in fleet_lookup.items():
                print(f"Category {category}: {len(vehicles_list)} vehicles")
                for i, v_info in enumerate(vehicles_list[:3]):  # Show first 3
                    print(f"  - {v_info['vehiclenumber']}, Code: {v_info['vehiclecode']}, Name: {v_info['vehiclename']}")


        return list(vehicle_categories.values()), fleet_lookup
    
    def calculate_total_route_time(self, travel_time_minutes: float, 
                                   num_stops: int, service_time_per_stop: int) -> Tuple[float, int]:
        """Calculate total route time including service time"""
        service_time = num_stops * service_time_per_stop
        total_time = travel_time_minutes + service_time
        return total_time, service_time
    
    def check_deadline_constraint(self, total_time: float, 
                                  deadline_minutes: int) -> Tuple[bool, float, str]:
        """Check if route violates time deadline"""
        if total_time > deadline_minutes:
            time_exceeded = total_time - deadline_minutes
            return True, time_exceeded, "DEADLINE EXCEEDED"
        else:
            time_remaining = deadline_minutes - total_time
            return False, time_remaining, "ON TIME"
    
    def check_distance_constraint(self, distance_km: float, 
                                  max_distance_km: float) -> Tuple[bool, float, str]:
        """Check if route violates distance constraint"""
        if distance_km > max_distance_km:
            distance_exceeded = distance_km - max_distance_km
            return True, distance_exceeded, "DISTANCE EXCEEDED"
        else:
            distance_remaining = max_distance_km - distance_km
            return False, distance_remaining, "WITHIN DISTANCE"
    
    def assign_heterogeneous_fleet(self, farmer_list: List[str], 
                                   cluster_name: str, 
                                   fleet_types_dict: List[Dict],
                                   fleet_lookup: Dict) -> List[Dict]:
        """Assign farmers to vehicles using heterogeneous fleet optimization"""
        total_milk = sum(self.farmers_milk[f] for f in farmer_list)
        farmers_sorted = sorted(
            [(name, self.farmers_milk[name]) for name in farmer_list],
            key=lambda x: x[1],
            reverse=True
        )
        
        vehicle_assignments = []
        remaining_farmers = farmers_sorted.copy()
        fleet_availability = {v['name']: v['count'] for v in fleet_types_dict}
        fleet_usage_counter = {v['name']: 0 for v in fleet_types_dict}
        sorted_vehicle_types = sorted(
            fleet_types_dict,
            key=lambda x: x['capacity'],
            reverse=True
        )
        
        while remaining_farmers:
            best_assignment = None
            best_utilization = 0
            
            for vehicle_spec in sorted_vehicle_types:
                if fleet_availability[vehicle_spec['name']] <= 0:
                    continue
                    
                current_vehicle_farmers = []
                current_load = 0
                capacity = vehicle_spec['capacity']
                
                for farmer, milk in remaining_farmers:
                    if current_load + milk <= capacity:
                        current_vehicle_farmers.append(farmer)
                        current_load += milk
                
                if not current_vehicle_farmers:
                    continue
                
                utilization = (current_load / capacity) * 100
                if utilization > best_utilization:
                    best_utilization = utilization
                    
                    category_key = vehicle_spec['name'].replace('_Van', '')
                    
                    vehicle_info = None

                    print("==============", fleet_lookup)
                    
                    if category_key in fleet_lookup:
                        idx = fleet_usage_counter[vehicle_spec['name']]
                        if idx < len(fleet_lookup[category_key]):
                            vehicle_info = fleet_lookup[category_key][idx]

                    print("=== STEP 3: Vehicle Assignment ===")
                    print(f"Category: {category_key}, Index: {idx}, Selected vehicleinfo: {vehicle_info}")
                    if vehicle_info:
                        print(f"  Fleet Number: {vehicle_info['vehiclenumber']}")
                    else:
                        print("  PROBLEM: vehicleinfo is None - index out of range or empty lookup")
                    
                    best_assignment = {
                        "vehicle_type": vehicle_spec['name'],
                        "vehicle_spec": vehicle_spec,
                        "vehicle_info": vehicle_info,
                        "farmers": current_vehicle_farmers,
                        "total_milk": current_load,
                        "utilization": utilization
                    }

                    
                    print(f"Best assignment vehicletype: {best_assignment['vehicletype']}, Has vehicleinfo: {bool(best_assignment['vehicleinfo'])}")

            if best_assignment:
                vehicle_assignments.append(best_assignment)
                fleet_availability[best_assignment["vehicle_type"]] -= 1
                fleet_usage_counter[best_assignment["vehicle_type"]] += 1
                assigned_names = set(best_assignment["farmers"])
                remaining_farmers = [
                    (f, m) for f, m in remaining_farmers
                    if f not in assigned_names
                ]
            else:
                break
        
        return vehicle_assignments
    
    def optimize_vehicle_route(self, chilling_center_name: str, 
                              chilling_center_coords: Tuple[float, float],
                              farmer_list: List[str], vehicle_id: int, 
                              vehicle_capacity: int) -> Tuple[List[str], Optional[Dict]]:
        """Optimize route for a single vehicle using OpenRouteService"""
        if not farmer_list:
            return [], None
            
        jobs = []
        for idx, farmer_name in enumerate(farmer_list):
            lat, lon = self.subareas[farmer_name]
            jobs.append({
                "id": idx,
                "location": [lon, lat],
                "delivery": [self.farmers_milk[farmer_name]]
            })
            
        vehicle = {
            "id": vehicle_id,
            "start": [chilling_center_coords[1], chilling_center_coords[0]],
            "end": [chilling_center_coords[1], chilling_center_coords[0]],
            "profile": "driving-car",
            "capacity": [vehicle_capacity]
        }
        
        optimization_req_body = {
            "jobs": jobs,
            "vehicles": [vehicle]
        }
        
        headers = {'Authorization': API_KEY, 'Content-Type': 'application/json'}
        
        try:
            response = requests.post(
                "https://api.openrouteservice.org/optimization",
                json=optimization_req_body,
                headers=headers,
                timeout=30
            )
            optimized_data = response.json()
            
            if "routes" in optimized_data and optimized_data["routes"]:
                steps = optimized_data["routes"][0]["steps"]
                route = [farmer_list[step["id"]] for step in steps if step["type"] == "job"]
                return route, optimized_data
            else:
                return [], optimized_data
        except Exception as e:
            print(f"Error in route optimization: {str(e)}")
            return [], None
    
    def get_route_metrics(self, ordered_names: List[str], 
                         chilling_center_coords: Tuple[float, float]) -> Tuple[Optional[float], Optional[float]]:
        """Get distance and time metrics for a route"""
        coordinates = [[chilling_center_coords[1], chilling_center_coords[0]]]
        
        for name in ordered_names:
            lat, lon = self.subareas[name]
            coordinates.append([lon, lat])
        coordinates.append([chilling_center_coords[1], chilling_center_coords[0]])
        
        unique_coords = set(tuple(c) for c in coordinates)
        if len(unique_coords) < 2:
            return None, None
            
        url = 'https://api.openrouteservice.org/v2/directions/driving-car'
        body = {"coordinates": coordinates, "format": "json"}
        headers = {'Authorization': API_KEY, 'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json=body, headers=headers, timeout=30)
            data = response.json()
            
            if 'error' in data:
                return None, None
                
            summary = data['routes'][0]['summary']
            distance_km = summary['distance'] / 1000
            duration_min = summary['duration'] / 60
            return round(distance_km, 2), round(duration_min, 2)
        except Exception as e:
            print(f"Error getting route metrics: {str(e)}")
            return None, None
    
    async def run_optimization(self, deadline_minutes: int, 
                              max_distance_km: float, 
                              vehicle_types_list: List[Dict]) -> Optional[Dict]:
        """Main optimization function"""
        try:
            vehicle_types_list, fleet_lookup = await self.get_vehicle_types_from_db()
            
            origins = [[lon, lat] for lat, lon in self.subareas.values()]
            destinations = [[lon, lat] for lat, lon in self.centroids.values()]
            all_locations = origins + destinations
            sources = list(range(len(origins)))
            dest_idx_start = len(origins)
            destinations_indices = list(range(dest_idx_start, dest_idx_start + len(destinations)))
            
            matrix_req_body = {
                "locations": all_locations,
                "sources": sources,
                "destinations": destinations_indices,
                "metrics": ["distance"],
                "units": "km"
            }
            
            headers = {'Authorization': API_KEY, 'Content-Type': 'application/json'}
            response = requests.post(
                'https://api.openrouteservice.org/v2/matrix/driving-car',
                json=matrix_req_body,
                headers=headers,
                timeout=30
            )
            data_response = response.json()
            distance_matrix = data_response['distances']
            
            cluster_assignments = {centroid: [] for centroid in self.centroids.keys()}
            subarea_names = list(self.subareas.keys())
            centroid_names = list(self.centroids.keys())
            
            for i, distances_to_centroids in enumerate(distance_matrix):
                nearest_centroid_index = distances_to_centroids.index(min(distances_to_centroids))
                nearest_centroid_name = centroid_names[nearest_centroid_index]
                cluster_assignments[nearest_centroid_name].append(subarea_names[i])
            
            results = {
                'clusters': [],
                'violations': [],
                'total_cost': 0,
                'total_violations': 0,
                'configuration': {
                    'deadline_minutes': deadline_minutes,
                    'max_distance_km': max_distance_km,
                    'vehicle_types': vehicle_types_list
                }
            }
            
            for centroid_name, subarea_list in cluster_assignments.items():
                chilling_center_coords = self.centroids[centroid_name]
                total_cluster_milk = sum(self.farmers_milk.get(farmer, 0) for farmer in subarea_list)
                
                vehicle_assignments = self.assign_heterogeneous_fleet(
                    subarea_list, centroid_name, vehicle_types_list, fleet_lookup
                )
                
                cluster_data = {
                    'name': centroid_name,
                    'total_milk': total_cluster_milk,
                    'capacity': self.center_capacity.get(centroid_name, 0),
                    'vehicles': [],
                    'cost': 0
                }
                
                for vehicle_idx, vehicle_data in enumerate(vehicle_assignments):
                    vtype = vehicle_data["vehicle_type"]
                    vspec = vehicle_data["vehicle_spec"]
                    vinfo = vehicle_data.get("vehicle_info")
                    
                    optimized_route, _ = self.optimize_vehicle_route(
                        centroid_name,
                        chilling_center_coords,
                        vehicle_data['farmers'],
                        vehicle_idx,
                        vspec['capacity']
                    )
                    
                    distance_km, travel_time_min = self.get_route_metrics(
                        optimized_route, chilling_center_coords
                    )
                    
                    vehicle_info = {
                        'id': vehicle_idx + 1,
                        'type': vtype,
                        'capacity': vspec['capacity'],
                        'vehicle_number': vinfo['vehicle_number'] if vinfo else None,
                        'vehicle_code': vinfo['vehicle_code'] if vinfo else None,
                        'vehicle_name': vinfo['vehicle_name'] if vinfo else None,
                        'farmers': vehicle_data['farmers'],
                        'total_milk': vehicle_data['total_milk'],
                        'utilization': vehicle_data['utilization'],
                        'route': optimized_route,
                        'distance': distance_km,
                        'travel_time': travel_time_min,
                        'is_violated': False,
                        'status': 'NO DATA'
                    }
                    
                    if distance_km:
                        num_stops = len(optimized_route)
                        service_time_per_stop = vspec['service_time']
                        total_time, total_service_time = self.calculate_total_route_time(
                            travel_time_min,
                            num_stops,
                            service_time_per_stop
                        )
                        
                        route_cost = vspec["fixed_cost"] + (distance_km * vspec["cost_per_km"])
                        cluster_data['cost'] += route_cost
                        
                        is_time_violated, time_diff, status = self.check_deadline_constraint(
                            total_time, deadline_minutes
                        )
                        is_dist_violated, dist_diff, dist_status = self.check_distance_constraint(
                            distance_km, max_distance_km
                        )
                        
                        is_any_violation = is_time_violated or is_dist_violated
                        violation_type = ""
                        if is_time_violated and is_dist_violated:
                            violation_type = "Time+Distance"
                        elif is_time_violated:
                            violation_type = "Time"
                        elif is_dist_violated:
                            violation_type = "Distance"
                        
                        vehicle_info.update({
                            'total_time': round(total_time, 1),
                            'service_time': total_service_time,
                            'cost': round(route_cost, 2),
                            'is_violated': is_any_violation,
                            'time_violation': is_time_violated,
                            'distance_violation': is_dist_violated,
                            'time_diff': round(time_diff, 1),
                            'dist_diff': round(dist_diff, 1),
                            'status': f"{status} | {dist_status}",
                            'violation_type': violation_type
                        })
                        
                        if is_any_violation:
                            results['total_violations'] += 1
                            results['violations'].append({
                                'cluster': centroid_name,
                                'vehicle': f"Vehicle {vehicle_idx + 1} ({vtype})",
                                'violation_type': violation_type,
                                'total_time': round(total_time, 1),
                                'exceeded_by_time': round(time_diff, 1) if is_time_violated else None,
                                'distance': distance_km,
                                'exceeded_by_dist': round(dist_diff, 1) if is_dist_violated else None,
                                'farmers': len(optimized_route)
                            })
                    
                    cluster_data['vehicles'].append(vehicle_info)
                
                results['total_cost'] += cluster_data['cost']
                results['clusters'].append(cluster_data)
            
            return results
            
        except Exception as e:
            print(f"Error in optimization: {str(e)}")
            raise
