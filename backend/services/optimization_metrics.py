# services/optimization_metrics.py
from typing import Dict, Any
import math

def safe_get(d: Dict[str, Any], *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and k in d:
            d = d[k]
        else:
            return default
    return d

def compute_run_metrics(results: Dict[str, Any]) -> Dict[str, Any]:
    total_cost = safe_get(results, "total_cost", default=0)
    total_distance = safe_get(results, "total_distance", default=0)
    total_time = safe_get(results, "total_time", default=0)
    total_violations = safe_get(results, "total_violations", default=0)
    clusters = safe_get(results, "clusters", default=[])

    return {
        "total_cost": float(total_cost or 0),
        "total_distance": float(total_distance or 0),
        "total_time": float(total_time or 0),
        "total_violations": int(total_violations or 0),
        "total_clusters": len(clusters),
    }

def compare_runs(previous: Dict[str, Any], new: Dict[str, Any]) -> Dict[str, Any]:
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
