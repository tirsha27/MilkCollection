#scripts/optimization_engine.py
"""
Milk Collection Route Optimization Engine
Class-based optimization logic for FastAPI backend integration
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
    """
    
    def __init__(self):
        """Initialize the optimization engine with empty data structures"""
        self.centroids = {}
        self.center_capacity = {}
        self.subareas = {}
        self.farmers_milk = {}
        self.api_key = API_KEY
    
    def set_data(self, centroids: Dict, center_capacity: Dict, subareas: Dict, farmers_milk: Dict):
        """
        Set optimization data from FastAPI service
        
        Args:
            centroids: Dictionary of chilling center coordinates {name: (lat, lon)}
            center_capacity: Dictionary of center capacities {name: capacity_liters}
            subareas: Dictionary of vendor coordinates {name: (lat, lon)}
            farmers_milk: Dictionary of milk quantities {name: quantity_liters}
        """
        self.centroids = centroids
        self.center_capacity = center_capacity
        self.subareas = subareas
        self.farmers_milk = farmers_milk
    
    def load_data_from_files(self):
        """
        Load data from JSON files (for standalone testing)
        """
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
        """
        Calculate total route time including travel and service time
        
        Args:
            travel_time_minutes: Travel time in minutes
            num_stops: Number of stops on the route
            service_time_per_stop: Service time per stop in minutes
        
        Returns:
            Tuple of (total_time, service_time)
        """
        service_time = num_stops * service_time_per_stop
        total_time = travel_time_minutes + service_time
        return total_time, service_time
    
    def check_deadline_constraint(self, total_time: float, deadline_minutes: int) -> Tuple[bool, float, str]:
        """
        Check if route violates time deadline
        
        Args:
            total_time: Total route time in minutes
            deadline_minutes: Maximum allowed time in minutes
        
        Returns:
            Tuple of (is_violated, time_difference, status_message)
        """
        if total_time > deadline_minutes:
            time_exceeded = total_time - deadline_minutes
            return True, time_exceeded, "DEADLINE EXCEEDED"
        else:
            time_remaining = deadline_minutes - total_time
            return False, time_remaining, "ON TIME"
    
    def check_distance_constraint(self, distance_km: float, max_distance_km: int) -> Tuple[bool, float, str]:
        """
        Check if route violates distance constraint
        
        Args:
            distance_km: Route distance in kilometers
            max_distance_km: Maximum allowed distance in kilometers
        
        Returns:
            Tuple of (is_violated, distance_difference, status_message)
        """
        if distance_km > max_distance_km:
            distance_exceeded = distance_km - max_distance_km
            return True, distance_exceeded, "DISTANCE EXCEEDED"
        else:
            distance_remaining = max_distance_km - distance_km
            return False, distance_remaining, "WITHIN DISTANCE"
    
    def assign_heterogeneous_fleet(self, farmer_list: List[str], cluster_name: str, 
                                   farmers_milk: Dict, fleet_types_dict: List[Dict]) -> List[Dict]:
        """
        Assign heterogeneous fleet to farmers based on milk quantities
        Maximizes vehicle utilization while respecting capacity constraints
        
        Args:
            farmer_list: List of farmer names in cluster
            cluster_name: Name of the cluster/chilling center
            farmers_milk: Dictionary of milk quantities
            fleet_types_dict: List of vehicle type specifications
        
        Returns:
            List of vehicle assignments with farmers and utilization
        """
        total_milk = sum(farmers_milk[f] for f in farmer_list)
        farmers_sorted = sorted(
            [(name, farmers_milk[name]) for name in farmer_list],
            key=lambda x: x[1],
            reverse=True
        )
        
        vehicle_assignments = []
        remaining_farmers = farmers_sorted.copy()
        fleet_availability = {v['name']: v['count'] for v in fleet_types_dict}
        sorted_vehicle_types = sorted(fleet_types_dict, key=lambda x: x['capacity'], reverse=True)
        
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
                    best_assignment = {
                        "vehicle_type": vehicle_spec['name'],
                        "vehicle_spec": vehicle_spec,
                        "farmers": current_vehicle_farmers,
                        "total_milk": current_load,
                        "utilization": utilization
                    }
            
            if best_assignment:
                vehicle_assignments.append(best_assignment)
                fleet_availability[best_assignment["vehicle_type"]] -= 1
                assigned_names = set(best_assignment["farmers"])
                remaining_farmers = [(f, m) for f, m in remaining_farmers if f not in assigned_names]
            else:
                break
        
        return vehicle_assignments
    
    def optimize_vehicle_route(self, chilling_center_name: str, chilling_center_coords: Tuple, 
                               farmer_list: List[str], vehicle_id: int, 
                               vehicle_capacity: int, farmers_milk: Dict) -> Tuple[List[str], Optional[Dict]]:
        """
        Optimize route for a single vehicle using OpenRouteService
        
        Args:
            chilling_center_name: Name of the chilling center
            chilling_center_coords: Coordinates of chilling center (lat, lon)
            farmer_list: List of farmer names to visit
            vehicle_id: Vehicle identifier
            vehicle_capacity: Vehicle capacity in liters
            farmers_milk: Dictionary of milk quantities
        
        Returns:
            Tuple of (optimized_route, api_response)
        """
        if not farmer_list:
            return [], None
        
        jobs = []
        for idx, farmer_name in enumerate(farmer_list):
            lat, lon = self.subareas[farmer_name]
            jobs.append({
                "id": idx,
                "location": [lon, lat],
                "delivery": [farmers_milk[farmer_name]]
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
    
    def get_route_metrics(self, ordered_names: List[str], chilling_center_coords: Tuple) -> Tuple[Optional[float], Optional[float]]:
        """
        Get distance and time metrics for a route using OpenRouteService
        
        Args:
            ordered_names: List of farmer names in route order
            chilling_center_coords: Coordinates of chilling center (lat, lon)
        
        Returns:
            Tuple of (distance_km, duration_minutes)
        """
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
                        vehicle_types_list: List[Dict]) -> Optional[Dict]:
        """
        Run complete optimization process
        
        Args:
            deadline_minutes: Maximum time allowed per route in minutes
            max_distance_km: Maximum distance allowed per route in kilometers
            vehicle_types_list: List of vehicle type specifications with capacity, count, costs
        
        Returns:
            Dictionary containing optimization results with clusters, vehicles, routes, violations, costs
        """
        try:
            # Create distance matrix
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
            
            # Assign vendors to nearest chilling centers
            cluster_assignments = {centroid: [] for centroid in self.centroids.keys()}
            subarea_names = list(self.subareas.keys())
            centroid_names = list(self.centroids.keys())
            
            for i, distances_to_centroids in enumerate(distance_matrix):
                nearest_centroid_index = distances_to_centroids.index(min(distances_to_centroids))
                nearest_centroid_name = centroid_names[nearest_centroid_index]
                cluster_assignments[nearest_centroid_name].append(subarea_names[i])
            
            # Initialize results structure
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
            
            # Process each cluster
            for centroid_name, subarea_list in cluster_assignments.items():
                chilling_center_coords = self.centroids[centroid_name]
                total_cluster_milk = sum(self.farmers_milk.get(farmer, 0) for farmer in subarea_list)
                
                # Assign heterogeneous fleet
                vehicle_assignments = self.assign_heterogeneous_fleet(
                    subarea_list, centroid_name, self.farmers_milk, vehicle_types_list
                )
                
                cluster_data = {
                    'name': centroid_name,
                    'total_milk': total_cluster_milk,
                    'capacity': self.center_capacity.get(centroid_name, 0),
                    'vehicles': [],
                    'cost': 0
                }
                
                # Optimize routes for each vehicle
                for vehicle_idx, vehicle_data in enumerate(vehicle_assignments):
                    vtype = vehicle_data["vehicle_type"]
                    vspec = vehicle_data["vehicle_spec"]
                    
                    # Optimize route
                    optimized_route, _ = self.optimize_vehicle_route(
                        centroid_name,
                        chilling_center_coords,
                        vehicle_data['farmers'],
                        vehicle_idx,
                        vspec['capacity'],
                        self.farmers_milk
                    )
                    
                    # Get route metrics
                    distance_km, travel_time_min = self.get_route_metrics(
                        optimized_route, chilling_center_coords
                    )
                    
                    vehicle_info = {
                        'id': vehicle_idx + 1,
                        'type': vtype,
                        'capacity': vspec['capacity'],
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
                        
                        # Calculate times
                        total_time, total_service_time = self.calculate_total_route_time(
                            travel_time_min, num_stops, service_time_per_stop
                        )
                        
                        # Calculate cost
                        route_cost = vspec["fixed_cost"] + (distance_km * vspec["cost_per_km"])
                        cluster_data['cost'] += route_cost
                        
                        # Check constraints
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
                        
                        # Record violations
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
            raise Exception(f"Error in optimization: {str(e)}")
    def save_optimization_result(self, results: Dict, output_dir: str = "optimization_history") -> str:
        """
        Save optimization results to JSON file with timestamp
        
        Args:
            results: Optimization results dictionary
            output_dir: Directory to save results (default: "optimization_history")
        
        Returns:
            Filename of saved results
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{output_dir}/optimization_{timestamp}.json"
        
        # Add timestamp to results
        results['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        results['timestamp_epoch'] = int(datetime.now().timestamp())
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        return filename