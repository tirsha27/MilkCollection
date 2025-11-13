"""
Dashboard Endpoint
Provides fleet and system stats based on latest optimization results
"""

import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/")
def get_dashboard_stats():
    """
    Returns overall statistics for the dashboard, including:
    - vendor stats
    - hub utilization
    - fleet utilization (fully loaded / half loaded / unused)
    """

    # === Locate the latest optimization file ===
    history_dir = "optimization_history"
    latest_file = None

    if os.path.exists(history_dir):
        json_files = [
            os.path.join(history_dir, f)
            for f in os.listdir(history_dir)
            if f.startswith("optimization_") and f.endswith(".json")
        ]
        if json_files:
            latest_file = max(json_files, key=os.path.getmtime)

    # === Default values ===
    fully_loaded = 0
    half_loaded = 0
    used_vehicle_ids = set()
    total_vehicles_used = 0

    # === Read optimization results ===
    if latest_file:
        try:
            with open(latest_file, "r") as f:
                data = json.load(f)

            clusters = data.get("clusters", [])
            for cluster in clusters:
                for vehicle in cluster.get("vehicles", []):
                    util = vehicle.get("utilization", 0)
                    total_vehicles_used += 1
                    used_vehicle_ids.add(vehicle.get("id") or vehicle.get("type"))

                    if util >= 90:
                        fully_loaded += 1
                    elif 40 <= util < 90:
                        half_loaded += 1

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading optimization data: {e}")
    else:
        print("⚠️ No optimization file found in optimization_history/")

    # === Get total fleet count ===
    # (Ideally from DB, for now fallback to count from fleet file if available)
    configured_total = 0
    fleet_data_file = os.path.join("data", "fleet.json")
    if os.path.exists(fleet_data_file):
        try:
            with open(fleet_data_file, "r") as f:
                fleet_data = json.load(f)
            configured_total = len(fleet_data)
        except Exception:
            configured_total = 0

    # Fallback manual total if none found
    if configured_total == 0:
        configured_total = 20

    unassigned = max(configured_total - total_vehicles_used, 0)

    # === Dummy vendor and hub data (replace with DB calls if available) ===
    vendors = {"active_vendors": 12, "total_vendors": 20}
    hubs = {
        "active_hubs": 4,
        "total_hubs": 5,
        "total_capacity_liters": 20000,
        "current_load_liters": 15000,
    }

    # === Fleet summary ===
    fleet = {
        "total_vehicles": configured_total,
        "unassigned_vehicles": unassigned,
        "fully_loaded": fully_loaded,
        "half_loaded": half_loaded,
        "available_vehicles": configured_total - unassigned,
        "unavailable_vehicles": 0,
    }

    return {"vendors": vendors, "hubs": hubs, "fleet": fleet}
