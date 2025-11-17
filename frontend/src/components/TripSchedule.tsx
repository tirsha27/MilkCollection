import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import {
  Truck,
  MapPin,
  Droplets,
  ChevronDown,
  ChevronRight,
  Save,
  Route,
  Timer,
  Ruler,
  AlertTriangle,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** --------- Types --------- */
interface Farmer {
  id: string;
  name: string;
  milk_liters: number;
  lat?: number;
  lng?: number;
  location?: string;
}

interface Trip {
  id: string;
  type: string;
  farmers: Farmer[];
  total_milk: number;
  distance?: number;
  travel_time?: number;
  utilization?: number;
  capacity?: number;
  vehicle_number?: string;
}

interface CenterSchedule {
  name: string;
  total_milk: number;
  capacity?: number;
  vehicles: Trip[];
  lat?: number;
  lng?: number;
  stats?: {
    vehiclesUsed: number;
    totalAssignedMilk: number;
    fullnessPercent: number;
    lowUtilized: { vehicle_number: string; pct: number }[];
    unusedVehicles?: string[];
  };
}

/** --------- Utilities --------- */
function generateLocation(lat: number, lng: number) {
  if (lat < 10.2) return "Near Madurai, Tamil Nadu";
  if (lat < 10.4 && lng > 78.3) return "Near Viralimalai, Tamil Nadu";
  if (lat < 10.5 && lng > 78.2) return "Near Dindigul, Tamil Nadu";
  if (lat > 10.5 && lng < 78.2) return "Near Karur, Tamil Nadu";
  if (lat > 10.6) return "Near Trichy, Tamil Nadu";
  return "Near Pudukkottai, Tamil Nadu";
}

const farmerIcon = (number: number) =>
  L.divIcon({
    html: `<div style="background-color:#2563eb;color:white;font-size:12px;font-weight:600;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${number}</div>`,
    className: "number-icon",
  });

/**
 * Allocate milk to farmers - preserving known values, no random generation
 */
function allocateMilkToFarmers(
  rawFarmers: { id: string; name: string; milk_liters: number | null; lat: number; lng: number; location: string }[],
  declaredTotal: number
): Farmer[] {
  const knowns = rawFarmers.filter((r) => r.milk_liters != null).map((r) => ({ ...r, milk_liters: Number(r.milk_liters) }));
  const unknowns = rawFarmers.filter((r) => r.milk_liters == null);

  const knownSum = knowns.reduce((s, k) => s + (Number(k.milk_liters) || 0), 0);
  const unknownCount = unknowns.length;

  // If no declared total and no knowns -> return empty (no random values)
  if ((declaredTotal ?? 0) <= 0 && knownSum <= 0) {
    return rawFarmers.map((rf) => ({
      id: rf.id,
      name: rf.name,
      milk_liters: 0, // No random values
      lat: rf.lat,
      lng: rf.lng,
      location: rf.location,
    }));
  }

  // Declared total provided -> authoritative distribution
  if ((declaredTotal ?? 0) > 0) {
    const totalToDistribute = Math.max(declaredTotal, knownSum);
    let remaining = Math.max(0, totalToDistribute - knownSum);

    const allocations: Farmer[] = [];

    // Keep knowns
    for (const k of knowns) {
      allocations.push({
        id: k.id,
        name: k.name,
        milk_liters: Math.round(Number(k.milk_liters)),
        lat: k.lat,
        lng: k.lng,
        location: k.location,
      });
    }

    if (unknownCount > 0 && remaining > 0) {
      // Equal distribution for unknowns
      const perUnknown = Math.floor(remaining / unknownCount);
      let remainder = remaining - (perUnknown * unknownCount);

      unknowns.forEach((u, i) => {
        const amt = perUnknown + (i < remainder ? 1 : 0);
        allocations.push({
          id: u.id,
          name: u.name,
          milk_liters: amt > 0 ? amt : 0,
          lat: u.lat,
          lng: u.lng,
          location: u.location,
        });
      });
    }

    return allocations;
  }

  // No declared total but knownSum > 0: preserve knowns, unknowns get 0
  const allocations: Farmer[] = [];
  for (const rf of rawFarmers) {
    if (rf.milk_liters != null) {
      allocations.push({
        id: rf.id,
        name: rf.name,
        milk_liters: Math.round(Number(rf.milk_liters)),
        lat: rf.lat,
        lng: rf.lng,
        location: rf.location,
      });
    } else {
      allocations.push({
        id: rf.id,
        name: rf.name,
        milk_liters: 0,
        lat: rf.lat,
        lng: rf.lng,
        location: rf.location,
      });
    }
  }

  return allocations;
}

/** --------- Component --------- */
export default function TripSchedule() {
  const [data, setData] = useState<{ clusters: CenterSchedule[] }>({ clusters: [] });
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [changesMade, setChangesMade] = useState(false);
  const [saving, setSaving] = useState(false);

  const farmerIdCounter = useRef<number>(1);

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      // ✅ FIX: Fetch from optimization endpoint instead of trips/schedule
      const res = await axios.get("http://localhost:8000/api/v1/optimization/latest");
      
      // ✅ Parse the response structure
      const raw = res.data?.data?.results?.optimization_results || res.data?.data?.results || {};
      const clusters = raw?.clusters || [];

      const normalized = clusters.map((cluster: any, cIdx: number) => {
        const vehiclesRaw = cluster.vehicles || [];
        const vehicles: Trip[] = [];

        // Get hub coordinates from the cluster if available
        const hubLat = cluster.hub_lat || cluster.lat || 10.3;
        const hubLng = cluster.hub_lng || cluster.lng || 78.3;

        for (let origIdx = 0; origIdx < vehiclesRaw.length; origIdx++) {
          const v: any = vehiclesRaw[origIdx];

          const typeKey = v.type ?? v.vehicle_type ?? v.category_name ?? v.category ?? `Vehicle ${origIdx + 1}`;
          const vehicleNumber = String(v.vehicle_number ?? v.vehicleNumber ?? v.vehicle_no ?? String(typeKey));

          // ✅ Build farmers from the optimization result (with real coordinates)
          let rawFarmers: { id: string; name: string; milk_liters: number | null; lat: number; lng: number; location: string }[] = [];

          if (Array.isArray(v.farmers) && v.farmers.length > 0) {
            rawFarmers = v.farmers.map((f: any, fIdx: number) => {
              // ✅ Use real coordinates from optimization result
              const lat = f?.lat ?? f?.latitude ?? hubLat;
              const lng = f?.lng ?? f?.longitude ?? hubLng;
              const milk = typeof f === "object" && f?.milk_liters != null ? Number(f.milk_liters) : null;
              const id = `${cluster.name}-v${vehicles.length}-f${farmerIdCounter.current++}`;
              
              return { 
                id, 
                name: typeof f === "string" ? String(f) : f?.name ?? `Farmer ${fIdx + 1}`, 
                milk_liters: milk, 
                lat, 
                lng, 
                location: generateLocation(lat, lng) 
              };
            });
          } else if (Array.isArray(v.route) && v.route.length > 0) {
            rawFarmers = v.route.map((r: any, fIdx: number) => {
              const lat = hubLat;
              const lng = hubLng;
              const id = `${cluster.name}-v${vehicles.length}-f${farmerIdCounter.current++}`;
              return { id, name: String(r), milk_liters: null, lat, lng, location: generateLocation(lat, lng) };
            });
          }

          const declaredTotal = Number(v.total_milk ?? v.totalMilk ?? 0) || 0;
          const farmers = allocateMilkToFarmers(rawFarmers, declaredTotal);
          const totalMilk = declaredTotal > 0 ? declaredTotal : farmers.reduce((s, f) => s + (Number(f.milk_liters) || 0), 0);

          const capacityVal = Number(v?.capacity ?? v?.capacity_liters ?? 0);
          let utilizationVal = 0;
          if (capacityVal > 0) {
            utilizationVal = Math.round((Number(totalMilk || 0) / capacityVal) * 10000) / 100;
          } else {
            utilizationVal = totalMilk > 0 ? 100 : 0;
          }

          // ✅ Use real distance and travel_time from ORS optimization
          const distanceVal = Number(v.distance ?? 0);
          const travelTimeVal = Number(v.travel_time ?? 0);

          vehicles.push({
            id: `droppable-${cIdx}-${vehicles.length}`,
            type: String(typeKey),
            vehicle_number: vehicleNumber,
            farmers,
            total_milk: totalMilk,
            capacity: capacityVal,
            distance: distanceVal,
            travel_time: travelTimeVal,
            utilization: Math.round(utilizationVal * 100) / 100,
          } as Trip);
        }

        // Cluster stats
        const totalAssignedMilk = vehicles.reduce((s, vv) => s + (Number(vv.total_milk) || 0), 0);
        const vehiclesUsed = vehicles.length;
        const centerCapacity = Number(cluster.capacity ?? cluster.capacity_liters ?? cluster.total_capacity ?? 0);
        const fullnessPercent = centerCapacity > 0 ? (totalAssignedMilk / centerCapacity) * 100 : 0;

        const lowUtilized = vehicles
          .filter((vv) => {
            const stops = (vv.farmers ?? []).length;
            return stops > 0 && Number(vv.utilization ?? 0) < 70;
          })
          .map((vv) => ({
            vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown",
            pct: Math.round((Number(vv.utilization ?? 0) + Number.EPSILON) * 100) / 100,
          }));

        const unusedVehicles = vehicles.filter((vv) => (vv.farmers ?? []).length === 0).map((vv) => vv.vehicle_number ?? vv.type ?? "Unknown");

        return {
          name: cluster.name ?? `Center ${cIdx + 1}`,
          total_milk: cluster.total_milk ?? totalAssignedMilk,
          capacity: centerCapacity,
          lat: hubLat,
          lng: hubLng,
          vehicles,
          stats: {
            vehiclesUsed,
            totalAssignedMilk,
            fullnessPercent: Math.round((fullnessPercent + Number.EPSILON) * 100) / 100,
            lowUtilized,
            unusedVehicles,
          },
        } as CenterSchedule;
      });

      setData({ clusters: normalized });
    } catch (err) {
      console.error("Error loading trip schedule:", err);
      setData({ clusters: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const source = result.source;
    const destination = result.destination;

    const updatedClusters = JSON.parse(JSON.stringify(data.clusters)) as CenterSchedule[];

    const [srcClusterIdx, srcVehicleIdx] = source.droppableId
      .replace("droppable-", "")
      .split("-")
      .map(Number);

    const [destClusterIdx, destVehicleIdx] = destination.droppableId
      .replace("droppable-", "")
      .split("-")
      .map(Number);

    const sourceVehicle = updatedClusters[srcClusterIdx].vehicles[srcVehicleIdx];
    const destVehicle = updatedClusters[destClusterIdx].vehicles[destVehicleIdx];

    const prevSrcStops = (sourceVehicle.farmers ?? []).length;
    const prevDestStops = (destVehicle.farmers ?? []).length;
    const prevSrcTravel = sourceVehicle.travel_time ?? 0;
    const prevDestTravel = destVehicle.travel_time ?? 0;
    const prevSrcDistance = sourceVehicle.distance ?? 0;
    const prevDestDistance = destVehicle.distance ?? 0;

    // Perform move
    const [movedFarmer] = sourceVehicle.farmers.splice(source.index, 1);
    destVehicle.farmers.splice(destination.index, 0, movedFarmer);

    const recomputeForVehicle = (veh: Trip, prevStops: number, prevTravel: number, prevDistance: number) => {
      veh.total_milk = (veh.farmers ?? []).reduce((s, f) => s + (Number(f.milk_liters) || 0), 0);

      const newStops = (veh.farmers ?? []).length;

      if (newStops === 0) {
        veh.total_milk = 0;
        veh.utilization = 0;
        veh.travel_time = 0;
        veh.distance = 0;
        return;
      }

      const cap = Number(veh.capacity ?? 0);
      if (cap > 0) {
        veh.utilization = Math.round((Number(veh.total_milk || 0) / cap) * 10000) / 100;
      } else {
        veh.utilization = veh.total_milk > 0 ? 100 : 0;
      }

      // Proportional estimation for distance and time
      if (prevStops > 0 && prevTravel > 0) {
        veh.travel_time = Math.max(1, Math.round((prevTravel * newStops) / prevStops));
      } else {
        const perStop = 10;
        veh.travel_time = Math.round(10 + newStops * perStop);
      }

      if (prevStops > 0 && prevDistance > 0) {
        veh.distance = Math.max(0, Math.round(((prevDistance * newStops) / prevStops) * 100) / 100);
      } else {
        const perStopKm = 6;
        veh.distance = Math.round(newStops * perStopKm * 100) / 100;
      }

      veh.utilization = Math.round((veh.utilization ?? 0) * 100) / 100;
    };

    recomputeForVehicle(sourceVehicle, prevSrcStops, prevSrcTravel, prevSrcDistance);
    recomputeForVehicle(destVehicle, prevDestStops, prevDestTravel, prevDestDistance);

    const recomputeClusterStats = (cluster: CenterSchedule) => {
      const vehicles = cluster.vehicles;
      const totalAssignedMilk = vehicles.reduce((s, vv) => s + (Number(vv.total_milk) || 0), 0);
      const vehiclesUsed = vehicles.length;
      const centerCapacity = Number(cluster.capacity ?? 0);
      const fullnessPercent = centerCapacity > 0 ? (totalAssignedMilk / centerCapacity) * 100 : 0;

      const lowUtilized = vehicles
        .filter((vv) => {
          const stops = (vv.farmers ?? []).length;
          return stops > 0 && Number(vv.utilization ?? 0) < 70;
        })
        .map((vv) => ({
          vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown",
          pct: Math.round((Number(vv.utilization ?? 0) + Number.EPSILON) * 100) / 100,
        }));

      const unusedVehicles = vehicles
        .filter((vv) => (vv.farmers ?? []).length === 0)
        .map((vv) => vv.vehicle_number ?? vv.type ?? "Unknown");

      cluster.stats = {
        vehiclesUsed,
        totalAssignedMilk,
        fullnessPercent: Math.round((fullnessPercent + Number.EPSILON) * 100) / 100,
        lowUtilized,
        unusedVehicles,
      };
    };

    recomputeClusterStats(updatedClusters[srcClusterIdx]);
    recomputeClusterStats(updatedClusters[destClusterIdx]);

    setData({ clusters: updatedClusters });
    setChangesMade(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await axios.put("http://localhost:8000/api/v1/trips/schedule/update", data);
      alert("✅ Schedule saved successfully!");
      setChangesMade(false);
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("❌ Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">Loading trip schedule...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Trip Scheduler</h2>
          <p className="text-slate-600">Optimized milk collection routes with real-time visualization.</p>
        </div>
        {changesMade && (
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {data.clusters.map((cluster, cIdx) => {
          const isExpanded = expandedCenters.has(cluster.name);
          const stats = cluster.stats ?? { vehiclesUsed: 0, totalAssignedMilk: 0, fullnessPercent: 0, lowUtilized: [], unusedVehicles: [] };

          return (
            <div key={cluster.name} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  const next = new Set(expandedCenters);
                  next.has(cluster.name) ? next.delete(cluster.name) : next.add(cluster.name);
                  setExpandedCenters(next);
                }}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  <h3 className="font-bold text-xl text-slate-900">{cluster.name}</h3>
                  <span className="text-slate-600 ml-2">Chilling Centre :{cluster.capacity}L total</span>
                  <div className="ml-4 flex items-center gap-2">
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                      Vehicles: <strong className="text-slate-900">{stats.vehiclesUsed}</strong>
                    </div>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                      Assigned To Vehicle: <strong className="text-slate-900">{Number(stats.totalAssignedMilk).toLocaleString()}L</strong>
                    </div>
                    {stats.lowUtilized && stats.lowUtilized.length > 0 && (
                      <div className="text-xs bg-orange-50 border border-orange-200 px-2 py-1 rounded-md text-orange-700">
                        Low Util: <strong>{stats.lowUtilized.length}</strong>
                      </div>
                    )}
                    {stats.unusedVehicles && stats.unusedVehicles.length > 0 && (
                      <div className="text-xs bg-green-50 border border-green-200 px-2 py-1 rounded-md text-green-800">
                        Unused: <strong>{stats.unusedVehicles.join(", ")}</strong>
                      </div>
                    )}
                  </div>
                </div>
                {stats.lowUtilized && stats.lowUtilized.length > 0 && (
                  <div className="mt-2 ml-[30px] text-sm text-orange-700">
                    <strong>Low-utilized vehicles:</strong>{" "}
                    {stats.lowUtilized.map((lv) => (
                      <span key={lv.vehicle_number} className="inline-block mr-2">
                        <span className="px-2 py-0.5 bg-orange-100 rounded-md text-orange-800 text-xs">
                          {lv.vehicle_number} --- {lv.pct}%
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {cluster.vehicles.map((vehicle) => {
                    const isTripExpanded = expandedTrips.has(vehicle.id);
                    const routeCoords = (vehicle.farmers ?? []).map((f: any) => [f.lat || 0, f.lng || 0]);

                    // Use cluster coordinates as hub
                    const fullRoute = [...routeCoords];
                    if (cluster.lat && cluster.lng) {
                      fullRoute.push([cluster.lat, cluster.lng]);
                    }

                    const stopsCount = (vehicle.farmers ?? []).length;
                    const isUnused = stopsCount === 0;

                    return (
                      <Droppable droppableId={String(vehicle.id)} key={String(vehicle.id)}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`bg-white rounded-lg border border-slate-200 mb-6 overflow-hidden ${isUnused ? "bg-green-50 border-green-200" : ""}`}
                          >
                            <div
                              className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-start"
                              onClick={() => {
                                const next = new Set(expandedTrips);
                                next.has(vehicle.id) ? next.delete(vehicle.id) : next.add(vehicle.id);
                                setExpandedTrips(next);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <Truck className="text-green-600" />
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900">{vehicle.vehicle_number ?? vehicle.type}</span>
                                    <span className="text-slate-600 text-sm ml-3">{stopsCount} stops</span>
                                    {typeof vehicle.capacity !== "undefined" && vehicle.capacity !== null && (
                                      <span className="text-sm text-slate-500 ml-2">Total Vehicle Capacity {Number(vehicle.capacity).toLocaleString()} L</span>
                                    )}
                                  </div>
                                  {typeof vehicle.utilization === "number" && vehicle.utilization < 70 && stopsCount > 0 && (
                                    <div className="mt-2 flex items-start gap-2 max-w-[56ch]">
                                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                                      <div className="text-xs text-orange-800 leading-snug">
                                        <strong className="text-sm">Low Utilization:</strong> This vehicle is only <strong>{vehicle.utilization}%</strong> full.
                                        Consider using a smaller vehicle (Auto/Jeeto) for better efficiency.
                                      </div>
                                    </div>
                                  )}
                                  {isUnused && (
                                    <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-3 py-1 rounded-md text-sm">
                                      <span aria-hidden>✅</span>
                                      <div>
                                        <strong>Unused:</strong> This vehicle currently has no assigned stops - all farmers were reassigned.
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-slate-600 text-sm">
                                <Ruler className="h-4 w-4 text-blue-500" /> Distance to complete : {isUnused ? 0 : Number(vehicle.distance).toFixed(2)} km
                                <Timer className="h-4 w-4 text-orange-500" /> Time Taken to complete : {isUnused ? 0 : Number(vehicle.travel_time).toFixed(2)} mins
                                <Droplets className="h-4 w-4 text-sky-500" /> Total Collected from farmers: {isUnused ? 0 : vehicle.total_milk} L
                                <Route className="h-4 w-4 text-green-600" /> Capacity {isUnused ? 0 : vehicle.utilization}% full
                              </div>
                            </div>

                            {isTripExpanded && (
                              <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-4">
                                <div>
                                  {(vehicle.farmers ?? []).map((farmer: any, fIdx: number) => (
                                    <Draggable key={farmer.id} draggableId={farmer.id} index={fIdx}>
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className="bg-white p-3 mb-2 rounded-lg border flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold">
                                            {fIdx + 1}
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-semibold text-slate-900">{farmer.name}</div>
                                            <div className="text-sm text-slate-600">{farmer.milk_liters} L · {farmer.location}</div>
                                          </div>
                                          <MapPin className="text-slate-500" />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                                <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200 shadow-lg">
                                  <MapContainer center={routeCoords.length ? routeCoords[0] : [10.5, 78.1]} zoom={10} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                    {fullRoute.length > 1 && <Polyline positions={fullRoute} color="blue" weight={3} />}
                                    {(vehicle.farmers ?? []).map((f: any, idx: number) => (
                                      <Marker key={f.id} position={[f.lat || 0, f.lng || 0]} icon={farmerIcon(idx + 1)}>
                                        <Popup>
                                          <strong>{f.name}</strong>
                                          <br />
                                          {f.location}
                                          <br />
                                          Milk: {f.milk_liters} L
                                        </Popup>
                                      </Marker>
                                    ))}
                                    {cluster.lat && cluster.lng && (
                                      <Marker position={[cluster.lat, cluster.lng]} icon={L.divIcon({
                                        html: `<div style='background-color:#16a34a;color:white;border-radius:50%;font-size:10px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;'>🏭</div>`,
                                        className: "hub-icon",
                                      })}>
                                        <Popup>
                                          <strong>{cluster.name}</strong>
                                          <br />
                                          Final chilling centre
                                        </Popup>
                                      </Marker>
                                    )}
                                  </MapContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}