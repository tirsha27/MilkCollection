# services/evaluator.py
import math

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance (km) between two lat/lon points"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def evaluate_manual_assignment(manual_payload, vehicle_catalog=[]):
    """
    Roughly compute total cost, distance, and time for manual trip assignments.
    """
    total_cost = 0.0
    total_distance = 0.0
    total_time = 0.0

    clusters = manual_payload.get("clusters", [])
    for cluster in clusters:
        for v in cluster.get("vehicles", []):
            route = v.get("route_coords") or [(f.get("latitude"), f.get("longitude")) for f in v.get("farmers", [])]
            vehicle_distance = 0.0
            for i in range(len(route) - 1):
                p1, p2 = route[i], route[i + 1]
                if p1 and p2 and None not in p1 and None not in p2:
                    vehicle_distance += haversine(p1[0], p1[1], p2[0], p2[1])
            total_distance += vehicle_distance

            avg_speed_kmph = 30.0
            total_time += (vehicle_distance / avg_speed_kmph) * 60.0  # minutes

            cost_per_km = v.get("cost_per_km", 10)
            fixed_cost = v.get("fixed_cost", 100)
            total_cost += fixed_cost + (cost_per_km * vehicle_distance)

    return {
        "total_cost": round(total_cost, 2),
        "total_distance": round(total_distance, 2),
        "total_time": round(total_time, 2),
        "clusters": clusters,
    }
