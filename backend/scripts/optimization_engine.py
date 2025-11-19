#scripts/optimization_engine.py
"""
Milk Collection Route Optimization Engine
Class-based optimization logic for FastAPI backend integration
WITH TRACKING FOR UNASSIGNED FARMERS AND UNUSED VEHICLES

This patched version returns farmer objects (name, lat, lng, milk_liters)
so frontend can plot markers correctly.
"""

import json
import requests
import os
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

# ========== API CONFIGURATION ==========
API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIyNjFmZWMzYWRhNTRmMDE5YzVjZWZkYTQ2MzRjNzk2IiwiaCI6Im11cm11cjY0In0="

class OptimizationEngine:
    """
    Optimization engine for milk collection route planning.
    Handles fleet assignment, route optimization, and constraint validation.
    NOW INCLUDES: Unassigned farmer tracking and unused vehicle reporting
    """
    
    def __init__(self):
        """Initialize the optimization engine with empty data structures"""
        self.centroids = {}
        self.center_capacity = {}
        self.subareas = {}
        self.farmers_milk = {}
        self.api_key = API_KEY
        self.fleet_lookup = {}   # Added for safety
    
    def set_data(self, centroids: Dict, center_capacity: Dict, subareas: Dict, farmers_milk: Dict):
        self.centroids = centroids
        self.center_capacity = center_capacity
        self.subareas = subareas
        self.farmers_milk = farmers_milk
    
    def load_data_from_files(self):
        try:
            with open('chilling_centers.json', 'r') as f:
                self.centroids = json.load(f)
            
            with open('milk_collection_data.json', 'r') as f:
                milk_data = json.load(f)
                self.farmers_milk = milk_data['farmers_milk_quantities']
                self.center_capacity = milk_data["chilling_centers_capacity"]
            
            with open('subareas.json', 'r') as f:
                self.subareas = json.load(f)
        except FileNotFoundError as e:
            raise Exception(f"Required data file not found: {e}")
    
    def calculate_total_route_time(self, travel_time_minutes: float, num_stops: int, service_time_per_stop: int) -> Tuple[float, int]:
        service_time = num_stops * service_time_per_stop
        total_time = travel_time_minutes + service_time
        return total_time, service_time
    
    def check_deadline_constraint(self, total_time: float, deadline_minutes: int) -> Tuple[bool, float, str]:
        if total_time > deadline_minutes:
            time_exceeded = total_time - deadline_minutes
            return True, time_exceeded, "DEADLINE EXCEEDED"
        else:
            time_remaining = deadline_minutes - total_time
            return False, time_remaining, "ON TIME"
    
    def check_distance_constraint(self, distance_km: float, max_distance_km: int) -> Tuple[bool, float, str]:
        if distance_km > max_distance_km:
            distance_exceeded = distance_km - max_distance_km
            return True, distance_exceeded, "DISTANCE EXCEEDED"
        else:
            distance_remaining = max_distance_km - distance_km
            return False, distance_remaining, "WITHIN DISTANCE"

    # ---------------- NEW HELPER: return farmer object with lat/lng/milk ----------------
    def get_farmer_details(self, farmer_name: str) -> Dict[str, Any]:
        """Return farmer details including lat/lng and milk liters.

        Assumes self.subareas stores coordinates as [lat, lng] for a farmer key.
        """
        if farmer_name in self.subareas:
            try:
                lat, lng = self.subareas[farmer_name]
            except Exception:
                # If subareas value not in expected format - fallback to None
                lat, lng = None, None
        else:
            lat, lng = None, None

        milk = None
        if farmer_name in self.farmers_milk:
            try:
                milk = self.farmers_milk[farmer_name]
            except Exception:
                milk = None

        return {
            "name": farmer_name,
            "lat": lat,
            "lng": lng,
            "milk_liters": milk
        }

    def get_optimized_route(self, cluster_center: Tuple[float, float], 
                        route_coords: List[Tuple[float, float]], 
                        farmer_names: List[str]) -> Tuple[List[str], Optional[float], Optional[float]]:

        if not route_coords or len(route_coords) == 0:
            return farmer_names, None, None
        
        # full_route_coords expects items as (lat, lon)
        full_route_coords = [cluster_center] + route_coords + [cluster_center]
        # ORS expects coords as [lon, lat]
        coordinates = [[lon, lat] for lat, lon in full_route_coords]
        
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            'Authorization': self.api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'coordinates': coordinates,
            'radiuses': [-1] * len(coordinates),
            'instructions': False
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                route = data['routes'][0]
                summary = route['summary']
                
                distance_m = summary['distance']
                duration_s = summary['duration']
                
                distance_km = distance_m / 1000
                travel_time_min = duration_s / 60
                
                # way_points / waypoint_order handling
                waypoint_order = route.get('way_points', list(range(len(coordinates))))
                
                if len(waypoint_order) > 2:
                    farmer_indices = waypoint_order[1:-1]
                    optimized_farmer_order = [farmer_names[i - 1] for i in farmer_indices if 0 <= i - 1 < len(farmer_names)]
                else:
                    optimized_farmer_order = farmer_names
                
                return optimized_farmer_order, distance_km, travel_time_min
                
            else:
                return farmer_names, None, None
                
        except Exception:
            return farmer_names, None, None

    def assign_heterogeneous_fleet(self, farmer_list: List[str], cluster_name: str, 
                                   farmers_milk: Dict, fleet_types_dict: List[Dict],
                                   fleet_availability: Dict):

        total_milk = sum(farmers_milk.get(f, 0) for f in farmer_list)
        farmers_sorted = sorted(
            [(name, farmers_milk.get(name, 0)) for name in farmer_list],
            key=lambda x: x[1],
            reverse=True
        )
        
        vehicle_assignments = []
        remaining_farmers = farmers_sorted.copy()
        
        sorted_vehicle_types = sorted(fleet_types_dict, key=lambda x: x['capacity'], reverse=True)
        
        while remaining_farmers:
            best_assignment = None
            best_utilization = 0
            
            for vehicle_spec in sorted_vehicle_types:
                if fleet_availability.get(vehicle_spec['name'], 0) <= 0:
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

                    category_key = vehicle_spec['name']
                    vehicle_info = None
                    
                    if hasattr(self, 'fleet_lookup') and category_key in self.fleet_lookup:
                        used_count = sum(1 for v in vehicle_assignments if v['vehicle_type'] == category_key)
                        
                        if used_count < len(self.fleet_lookup[category_key]):
                            vehicle_info = self.fleet_lookup[category_key][used_count]
                        else:
                            vehicle_info = self.fleet_lookup[category_key][0] if self.fleet_lookup[category_key] else None
                    
                    best_assignment = {
                        "vehicle_type": vehicle_spec['name'],
                        "vehicle_spec": vehicle_spec,
                        "vehicle_info": vehicle_info,
                        "farmers": current_vehicle_farmers,
                        "total_milk": current_load,
                        "utilization": round(utilization, 2)
                    }
            
            if best_assignment:
                vehicle_assignments.append(best_assignment)
                fleet_availability[best_assignment["vehicle_type"]] = fleet_availability.get(best_assignment["vehicle_type"], 0) - 1
                assigned_names = set(best_assignment["farmers"])
                remaining_farmers = [(f, m) for f, m in remaining_farmers if f not in assigned_names]
            else:
                break
        
        unassigned_farmers = [
            {"name": name, "milk": milk} 
            for name, milk in remaining_farmers
        ]
        
        return vehicle_assignments, unassigned_farmers
    
    def optimize_vehicle_route(self, chilling_center_name: str, chilling_center_coords: Tuple, 
                               farmer_list: List[str], vehicle_id: int, 
                               vehicle_capacity: int, farmers_milk: Dict):

        if not farmer_list:
            return [], None
        
        jobs = []
        for idx, farmer_name in enumerate(farmer_list):
            # subareas stores [lat, lng]
            lat, lon = self.subareas[farmer_name]
            jobs.append({
                "id": idx,
                "location": [lon, lat],
                "delivery": [farmers_milk.get(farmer_name, 0)]
            })
        
        vehicle = {
            "id": vehicle_id,
            "start": [chilling_center_coords[1], chilling_center_coords[0]],
            "end": [chilling_center_coords[1], chilling_center_coords[0]],
            "profile": "driving-car",
            "capacity": [vehicle_capacity]
        }
        
        optimization_req_body = {"jobs": jobs, "vehicles": [vehicle]}
        headers = {'Authorization': self.api_key, 'Content-Type': 'application/json'}
        
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
            raise Exception(f"Error in route optimization: {str(e)}")
    
    def get_route_metrics(self, ordered_names: List[str], chilling_center_coords: Tuple):
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
        headers = {'Authorization': self.api_key, 'Content-Type': 'application/json'}
        
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
            raise Exception(f"Error getting route metrics: {str(e)}")
    
    def run_optimization(self, deadline_minutes: int, max_distance_km: int, 
                        vehicle_types_list: List[Dict]):

        try:
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
            headers = {'Authorization': self.api_key, 'Content-Type': 'application/json'}
            
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
                'unassigned_farmers': [],
                'total_cost': 0,
                'total_violations': 0,
                'configuration': {
                    'deadline_minutes': deadline_minutes,
                    'max_distance_km': max_distance_km,
                    'vehicle_types': vehicle_types_list
                }
            }
            
            global_fleet_availability = {v['name']: v['count'] for v in vehicle_types_list}
            
            for centroid_name, subarea_list in cluster_assignments.items():
                chilling_center_coords = self.centroids[centroid_name]
                total_cluster_milk = sum(self.farmers_milk.get(farmer, 0) for farmer in subarea_list)
                
                vehicle_assignments, unassigned_farmers = self.assign_heterogeneous_fleet(
                    subarea_list, centroid_name, self.farmers_milk, 
                    vehicle_types_list, global_fleet_availability
                )
                
                cluster_data = {
                    'name': centroid_name,
                    'total_milk': total_cluster_milk,
                    'capacity': self.center_capacity.get(centroid_name, 0),
                    'vehicles': [],
                    'cost': 0,
                    'unassigned_farmers': unassigned_farmers
                }
                
                for unassigned in unassigned_farmers:
                    results['unassigned_farmers'].append({
                        'cluster': centroid_name,
                        'farmer_name': unassigned['name'],
                        'milk': unassigned['milk']
                    })
                
                for vehicle_idx, vehicle_data in enumerate(vehicle_assignments):
                    vtype = vehicle_data["vehicle_type"]
                    vspec = vehicle_data["vehicle_spec"]
                    
                    optimized_route, _ = self.optimize_vehicle_route(
                        centroid_name,
                        chilling_center_coords,
                        vehicle_data['farmers'],
                        vehicle_idx,
                        vspec['capacity'],
                        self.farmers_milk
                    )
                    
                    distance_km, travel_time_min = self.get_route_metrics(
                        optimized_route, chilling_center_coords
                    )

                    print("8888888888888888888888888888888888888888888888888888")
                    print(vehicle_data)

                    v_info = vehicle_data.get('vehicle_info')
                    farmer_names = vehicle_data['farmers']
                    route_coords = [self.subareas[f] for f in farmer_names if f in self.subareas]
                    
                    # FIXED: cluster_center → chilling_center_coords
                    if route_coords and len(route_coords) > 0:
                        try:
                            optimized_route, distance_km, travel_time_min = self.get_optimized_route(
                                chilling_center_coords, route_coords, farmer_names
                            )
                        except Exception as e:
                            print(f"❌ Route optimization failed: {e}")
                            optimized_route = farmer_names
                            distance_km = None
                            travel_time_min = None
                    else:
                        optimized_route = farmer_names
                        distance_km = None
                        travel_time_min = None
                    
                    service_time = len(farmer_names) * vspec.get('service_time', 4)
                    total_time = (travel_time_min or 0) + service_time
                    
                    if distance_km:
                        cost = vspec['fixed_cost'] + (distance_km * vspec['cost_per_km'])
                    else:
                        cost = 0
                    
                    time_violation = total_time > deadline_minutes if distance_km else False
                    distance_violation = distance_km > max_distance_km if distance_km else False
                    is_violated = time_violation or distance_violation
                    
                    if not distance_km:
                        status = "NO DATA"
                    elif is_violated:
                        if time_violation and distance_violation:
                            status = "TIME & DISTANCE EXCEEDED"
                        elif time_violation:
                            status = "TIME EXCEEDED | WITHIN DISTANCE"
                        else:
                            status = "ON TIME | DISTANCE EXCEEDED"
                    else:
                        status = "ON TIME | WITHIN DISTANCE"
                    
                    # ----------------- CONVERT farmers to objects (name, lat, lng, milk) -----------------
                    farmer_details = [
                        self.get_farmer_details(name)
                        for name in farmer_names
                    ]

                    vehicle_info = {
                        'id': vehicle_idx + 1,
                        'type': vtype,
                        'capacity': vspec['capacity'],
                        'vehicle_number': v_info.get('vehicle_number') if v_info else None,
                        'vehicle_code': v_info.get('vehicle_code') if v_info else None,
                        'vehicle_name': v_info.get('vehicle_name') if v_info else None,
                        'total_milk': vehicle_data['total_milk'],
                        'farmers' : farmer_details,    # <-- now objects with lat/lng
                        'utilization': vehicle_data['utilization'],
                        'route': optimized_route,
                        'distance': distance_km,
                        'travel_time': travel_time_min,
                        'is_violated': is_violated,
                        'status': status,
                        'total_time': total_time,
                        'service_time': service_time,
                        'cost': round(cost, 2),
                        'time_violation': time_violation,
                        'distance_violation': distance_violation,
                        'time_diff': deadline_minutes - total_time if distance_km else 0,
                        'dist_diff': max_distance_km - distance_km if distance_km else 0,
                        'violation_type': 'Distance' if distance_violation and not time_violation else (
                            'Time' if time_violation and not distance_violation else (
                                'Both' if is_violated else ''
                            )
                        )
                    }
                    
                    cluster_data['cost'] += cost
                    
                    # KEEP ONLY ONE APPEND (FIXED)
                    cluster_data['vehicles'].append(vehicle_info)
                
                cluster_data['cost'] = round(cluster_data['cost'],2)
                results['total_cost'] += cluster_data['cost']
                results['clusters'].append(cluster_data)
            
            unused_vehicles = []
            for vehicle_type, count in global_fleet_availability.items():
                if count > 0:
                    vehicle_spec = next(v for v in vehicle_types_list if v['name'] == vehicle_type)
                    
                    unused_fleet_details = []
                    if hasattr(self, 'fleet_lookup') and vehicle_type in self.fleet_lookup:
                        used_count = vehicle_spec['count'] - count
                        
                        for idx in range(used_count, len(self.fleet_lookup[vehicle_type])):
                            if len(unused_fleet_details) < count:
                                vehicle_info = self.fleet_lookup[vehicle_type][idx]
                                unused_fleet_details.append({
                                    'vehicle_number': vehicle_info.get('vehicle_number'),
                                    'vehicle_code': vehicle_info.get('vehicle_code'),
                                    'vehicle_name': vehicle_info.get('vehicle_name'),
                                    'capacity_liters': vehicle_info.get('capacity_liters')
                                })
                    
                    unused_vehicles.append({
                        "type": vehicle_type,
                        "count": count,
                        "capacity": vehicle_spec['capacity'],
                        "vehicles": unused_fleet_details
                    })

            results['unused_vehicles'] = unused_vehicles
            results['total_unassigned_farmers'] = len(results['unassigned_farmers'])
            results['total_unassigned_milk'] = sum(f['milk'] for f in results['unassigned_farmers'])
            
            return results
        
        except Exception as e:
            raise Exception(f"Error in optimization: {str(e)}")
    
    def save_optimization_result(self, results: Dict, output_dir: str = "optimization_history"):
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/optimization_{timestamp}.json"
        
        results['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        results['timestamp_epoch'] = int(datetime.now().timestamp())
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        return filename
