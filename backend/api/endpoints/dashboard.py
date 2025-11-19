# domain/backend/api/endpoints/dashboard.py

import os
import json
from typing import Any, Dict, List, Set

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database.session import get_db
from models.fleet import Fleet
from models.vendor import Vendor

router = APIRouter(prefix="/dashboard")


def extract_clusters_from_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Try many common wrapper shapes (TripScheduler, optimizer adapters, etc.)
    Return list of cluster dicts or [].
    """
    # common direct places
    candidates = [
        payload.get("clusters"),
        payload.get("data", {}).get("clusters"),
        payload.get("results", {}).get("optimization_results", {}).get("clusters"),
        payload.get("optimization_results", {}).get("clusters"),
        payload.get("data", {}).get("results", {}).get("optimization_results", {}).get("clusters"),
        payload.get("data", {}).get("results", {}).get("clusters"),
    ]
    for c in candidates:
        if isinstance(c, list):
            return c
    # fallback: sometimes nested under data->data
    if isinstance(payload.get("data"), dict):
        nested = payload["data"].get("data", {})
        if isinstance(nested.get("clusters"), list):
            return nested.get("clusters")
    return []


def extract_unused_from_payload(payload: Dict[str, Any]) -> List[str]:
    """
    Return list of vehicle numbers that optimizer marks unused.
    Support multiple shapes:
      - top-level unused_vehicles: ["TN12..."]
      - stats.unusedVehicles under clusters (list)
      - cluster.stats.unusedVehicles (list)
      - cluster.stats.unusedVehicles may be list of dicts or simple strings
      - payload.results.optimization_results.unused_vehicles etc.
    """
    unused_set: Set[str] = set()

    # direct top-level unused lists
    direct = (
        payload.get("unused_vehicles")
        or payload.get("optimization_results", {}).get("unused_vehicles")
        or payload.get("results", {}).get("optimization_results", {}).get("unused_vehicles")
    )
    if isinstance(direct, list):
        for item in direct:
            if isinstance(item, str):
                unused_set.add(item)
            elif isinstance(item, dict) and "vehicle_number" in item:
                unused_set.add(item["vehicle_number"])

    # stats style under various wrappers
    stats_candidates = [
        payload.get("stats", {}).get("unusedVehicles"),
        payload.get("data", {}).get("results", {}).get("stats", {}).get("unusedVehicles"),
        payload.get("results", {}).get("stats", {}).get("unusedVehicles"),
    ]
    for cand in stats_candidates:
        if isinstance(cand, list):
            for v in cand:
                if isinstance(v, str):
                    unused_set.add(v)
                elif isinstance(v, dict) and "vehicle_number" in v:
                    unused_set.add(v["vehicle_number"])

    # cluster-level stats
    clusters = extract_clusters_from_payload(payload)
    for cluster in clusters:
        stats = cluster.get("stats", {}) or {}
        u = stats.get("unusedVehicles") or stats.get("unused_vehicles") or stats.get("unused")
        if isinstance(u, list):
            for item in u:
                if isinstance(item, str):
                    unused_set.add(item)
                elif isinstance(item, dict) and "vehicle_number" in item:
                    unused_set.add(item["vehicle_number"])
        # also check stats.lowUtilized / lowUtil for vehicle lists (sometimes present)
        low = stats.get("lowUtilized") or stats.get("low_utilized")
        if isinstance(low, list):
            for item in low:
                if isinstance(item, dict) and "vehicle_number" in item:
                    # lowUtilized isn't unused, skip - but keep for future
                    pass

    return list(unused_set)


@router.get("/")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Robust dashboard stats:
      - Reads latest JSON in optimization_history (any .json)
      - Extracts clusters & unused vehicles from many wrapper shapes
      - Merges optimizer assignment/utilization with DB
      - Recomputes fully / half loaded counts reliably
      - Returns hub, vendor, fleet summaries
    """

    history_dir = "optimization_history"
    latest_file = None

    if os.path.exists(history_dir):
        json_files = [
            os.path.join(history_dir, f)
            for f in os.listdir(history_dir)
            if f.endswith(".json")
        ]
        if json_files:
            latest_file = max(json_files, key=os.path.getmtime)

    optimizer_assigned: Set[str] = set()
    optimizer_unassigned: Set[str] = set()
    optimizer_utils: Dict[str, float] = {}
    optimizer_meta: Dict[str, Any] = {}

    total_cluster_capacity = 0.0
    total_cluster_used = 0.0
    hub_count = 0

    # Parse latest optimizer / tripscheduler JSON if present
    if latest_file:
        try:
            with open(latest_file, "r", encoding="utf-8") as fh:
                payload = json.load(fh)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file {latest_file}: {e}")

        # clusters (robust)
        clusters = extract_clusters_from_payload(payload)

        # if nothing found, also try payload.get("data", {}) if payload is wrapper with message->data->...
        if not clusters and isinstance(payload.get("data"), dict):
            clusters = extract_clusters_from_payload(payload.get("data", {}))

        # parse clusters
        for cluster in clusters:
            try:
                used = float(cluster.get("total_milk") or cluster.get("totalAssignedMilk") or 0)
            except Exception:
                used = 0.0
            try:
                cap = float(cluster.get("capacity") or cluster.get("capacity_liters") or 0)
            except Exception:
                cap = 0.0

            total_cluster_used += used
            total_cluster_capacity += cap
            hub_count += 1

            for v in cluster.get("vehicles", []) or []:
                num = v.get("vehicle_number") or v.get("vehicleNo") or v.get("number")
                # utilization may be numeric or string
                util_raw = v.get("utilization") if "utilization" in v else v.get("utilization_pct") or v.get("utilizationPct")
                try:
                    util = float(util_raw or 0)
                except Exception:
                    util = 0.0
                if num:
                    optimizer_assigned.add(num)
                    optimizer_utils[num] = util

        # parse unused vehicles
        unused_list = extract_unused_from_payload(payload)
        optimizer_unassigned.update(unused_list)

        # try to pick optimizer metadata if present
        # common places: payload["input_metadata"], payload["metadata"], payload["results"]["input_metadata"]
        if isinstance(payload, dict):
            optimizer_meta = (
                payload.get("input_metadata")
                or payload.get("metadata")
                or payload.get("results", {}).get("input_metadata")
                or payload.get("data", {}).get("input_metadata")
                or {}
            )
            if not optimizer_meta and isinstance(payload.get("data"), dict):
                optimizer_meta = (
                    payload["data"].get("input_metadata")
                    or payload["data"].get("metadata")
                    or optimizer_meta
                )

    # Fetch fleet rows from DB
    try:
        q = await db.execute(select(Fleet))
        fleet_rows = q.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB fetch error: {e}")

    all_vehicles: Set[str] = {v.vehicle_number for v in fleet_rows if getattr(v, "vehicle_number", None)}

    # DB assignment heuristics
    db_assigned: Set[str] = {v.vehicle_number for v in fleet_rows if getattr(v, "chilling_center_id", None)}
    db_unassigned: Set[str] = all_vehicles - db_assigned

    # Merge assignments: optimizer takes precedence if it provided any info
    if optimizer_assigned or optimizer_unassigned:
        final_assigned = set(optimizer_assigned)
        final_unassigned = set(optimizer_unassigned)

        # Any DB vehicles missing from both sets -> treat as unassigned (safe)
        missing = all_vehicles - (final_assigned | final_unassigned)
        final_unassigned.update(missing)
    else:
        final_assigned = db_assigned.copy()
        final_unassigned = db_unassigned.copy()

    # Build utilization map: DB -> override by optimizer
    final_utils: Dict[str, float] = {}

    for v in fleet_rows:
        number = getattr(v, "vehicle_number", None)
        if not number:
            continue

        # prefer explicit DB used/capacity if available
        util_val = None
        try:
            if hasattr(v, "used_capacity_liters") and hasattr(v, "capacity_liters"):
                cap = getattr(v, "capacity_liters", None)
                used = getattr(v, "used_capacity_liters", None)
                if cap:
                    util_val = (float(used or 0) / float(cap)) * 100
        except Exception:
            util_val = None

        # fallback to realistic_specs.utilization_pct
        if util_val is None:
            try:
                rs = getattr(v, "realistic_specs", None)
                if isinstance(rs, dict) and "utilization_pct" in rs:
                    util_val = float(rs.get("utilization_pct") or 0)
            except Exception:
                util_val = None

        # final default
        if util_val is None:
            util_val = 0.0

        final_utils[number] = float(util_val)

    # override with optimizer live utils (if any)
    for k, u in optimizer_utils.items():
        try:
            final_utils[k] = float(u or 0)
        except Exception:
            final_utils[k] = 0.0

    # Recompute fully / half loaded
    fully_loaded = 0
    half_loaded = 0
    for u in final_utils.values():
        try:
            val = float(u or 0)
        except Exception:
            val = 0.0
        if val >= 90:
            fully_loaded += 1
        elif val >= 40:
            half_loaded += 1

    # Optimization potential (mini/small/total capacity) from DB, with optimizer_meta override
    mini_count = 0
    small_count = 0
    total_capacity_liters = 0.0

    for v in fleet_rows:
        try:
            cat = (getattr(v, "category", "") or "").strip().lower()
            if cat == "mini":
                mini_count += 1
            elif cat == "small":
                small_count += 1

            if hasattr(v, "capacity_liters") and getattr(v, "capacity_liters", None) is not None:
                total_capacity_liters += float(getattr(v, "capacity_liters") or 0)
            elif hasattr(v, "capacity_cans") and getattr(v, "capacity_cans", None) is not None:
                # fallback conversion: 1 can ≈ 40L (if you rely on cans)
                total_capacity_liters += float(getattr(v, "capacity_cans") or 0) * 40.0
        except Exception:
            continue

    # override from optimizer_meta when present (safe conversions)
    try:
        if optimizer_meta:
            if "mini_vehicles" in optimizer_meta:
                mini_count = int(optimizer_meta.get("mini_vehicles") or mini_count)
            if "small_vehicles" in optimizer_meta:
                small_count = int(optimizer_meta.get("small_vehicles") or small_count)
            if "total_capacity_liters" in optimizer_meta:
                total_capacity_liters = float(optimizer_meta.get("total_capacity_liters") or total_capacity_liters)
            if "total_capacity" in optimizer_meta and not total_capacity_liters:
                total_capacity_liters = float(optimizer_meta.get("total_capacity") or total_capacity_liters)
    except Exception:
        # ignore malformed optimizer meta
        pass

    # Vendor counts
    try:
        total_vendors = (await db.execute(select(func.count()).select_from(Vendor))).scalar() or 0
        active_vendors = (
            await db.execute(select(func.count()).select_from(Vendor).where(Vendor.is_active == True))
        ).scalar() or 0
    except Exception:
        total_vendors = 0
        active_vendors = 0

    # Hub utilization %
    utilization_pct = (
        (total_cluster_used / total_cluster_capacity) * 100
        if total_cluster_capacity > 0 else 0.0
    )

    # Final response
    return {
        "status": "success",
        "vendors": {
            "total_vendors": total_vendors,
            "active_vendors": active_vendors,
        },
        "hubs": {
            "active_hubs": hub_count,
            "total_hubs": hub_count,
            "total_capacity_liters": total_cluster_capacity,
            "current_load_liters": total_cluster_used,
            "utilization_pct": round(utilization_pct, 2),
        },
        "fleet": {
            "total_vehicles": len(all_vehicles),
            "assigned_vehicles": len(final_assigned),
            "unassigned_vehicles": len(final_unassigned),
            "unassigned_vehicle_numbers": sorted(list(final_unassigned)),

            "fully_loaded": fully_loaded,
            "half_loaded": half_loaded,

            "mini_vehicles": mini_count,
            "small_vehicles": small_count,
            "total_capacity_liters": float(total_capacity_liters),

            "available_vehicles": len(final_unassigned),
        },
    }
