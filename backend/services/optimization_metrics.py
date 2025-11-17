# services/optimization_metrics.py

from typing import Dict, Any

def safe_get(d: Dict[str, Any], *keys, default=None):
    """Safely get nested dictionary values"""
    for k in keys:
        if isinstance(d, dict) and k in d:
            d = d[k]
        else:
            return default
    return d


def compute_run_metrics(results: Dict[str, Any]) -> Dict[str, Any]:
    """
    ✅ FIXED: Compute metrics from optimization results WITHOUT haversine
    Uses distance/time values from ORS optimization results directly
    """
    # Extract top-level metrics if already present
    total_cost = safe_get(results, "total_cost", default=0)
    total_violations = safe_get(results, "total_violations", default=0)
    
    # Get clusters
    clusters = safe_get(results, "clusters", default=[])
    
    # Compute distance and time from vehicle data
    total_distance = 0.0
    total_time = 0.0
    
    if isinstance(clusters, list):
        for cluster in clusters:
            if not isinstance(cluster, dict):
                continue
            
            vehicles = cluster.get("vehicles", [])
            if not isinstance(vehicles, list):
                continue
            
            for vehicle in vehicles:
                if not isinstance(vehicle, dict):
                    continue
                
                # ✅ Use real distance from ORS optimization
                vehicle_distance = float(vehicle.get("distance", 0) or 0)
                total_distance += vehicle_distance
                
                # ✅ Use real travel_time from ORS optimization
                vehicle_time = float(vehicle.get("travel_time", 0) or 0)
                
                # If total_time exists, use it; otherwise use travel_time
                if "total_time" in vehicle:
                    vehicle_time = float(vehicle.get("total_time", 0) or 0)
                
                total_time += vehicle_time

    return {
        "total_cost": float(total_cost or 0),
        "total_distance": round(float(total_distance), 2),
        "total_time": round(float(total_time), 2),
        "total_violations": int(total_violations or 0),
        "total_clusters": len(clusters) if isinstance(clusters, list) else 0,
    }


def compare_runs(previous: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
    """
    ✅ FIXED: Compare optimization runs WITHOUT haversine
    Uses metrics computed from ORS data
    """
    prev = compute_run_metrics(previous)
    newr = compute_run_metrics(new)

    prev_cost, new_cost = prev["total_cost"], newr["total_cost"]
    prev_dist, new_dist = prev["total_distance"], newr["total_distance"]
    prev_time, new_time = prev["total_time"], newr["total_time"]

    cost_saved = prev_cost - new_cost
    distance_saved = prev_dist - new_dist
    time_saved = prev_time - new_time

    opt_percent = (cost_saved / prev_cost * 100) if prev_cost else 0
    eff_score = max(0, 100 - (newr["total_violations"] * 5))

    return {
        "previous_cost": round(prev_cost, 2),
        "new_cost": round(new_cost, 2),
        "cost_saved": round(cost_saved, 2),
        "optimization_percentage": round(opt_percent, 2),
        "previous_distance": round(prev_dist, 2),
        "new_distance": round(new_dist, 2),
        "distance_saved": round(distance_saved, 2),
        "previous_time": round(prev_time, 2),
        "new_time": round(new_time, 2),
        "time_saved": round(time_saved, 2),
        "efficiency_score": eff_score,
    }