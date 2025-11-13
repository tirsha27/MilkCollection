// domain/frontend/src/components/TripSchedule.tsx
import { useEffect, useState } from "react";
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

// -------- Utility: Calculate Distance between two lat/lon points -------- //
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -------- Utility: Generate realistic nearby address -------- //
function generateLocation(lat: number, lng: number) {
  if (lat < 10.2) return "Near Madurai, Tamil Nadu";
  if (lat < 10.4 && lng > 78.3) return "Near Viralimalai, Tamil Nadu";
  if (lat < 10.5 && lng > 78.2) return "Near Dindigul, Tamil Nadu";
  if (lat > 10.5 && lng < 78.2) return "Near Karur, Tamil Nadu";
  if (lat > 10.6) return "Near Trichy, Tamil Nadu";
  return "Near Pudukkottai, Tamil Nadu";
}

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
  type: string; // will be replaced by vehicle_number when available
  farmers: Farmer[];
  total_milk: number;
  distance?: number;
  travel_time?: number;
  utilization?: number;
  capacity?: number;
  // optional display field
  vehicle_number?: string;
}

interface CenterSchedule {
  name: string;
  total_milk: number;
  capacity?: number;
  vehicles: Trip[];
  lat?: number;
  lng?: number;
  // computed stats
  stats?: {
    vehiclesUsed: number;
    totalAssignedMilk: number;
    fullnessPercent: number;
    lowUtilized: { vehicle_number: string; pct: number }[];
  };
}

// Numbered circular marker icon
const farmerIcon = (number: number) =>
  L.divIcon({
    html: `<div style="background-color:#2563eb;color:white;font-size:12px;font-weight:600;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${number}</div>`,
    className: "number-icon",
  });

export default function TripSchedule() {
  const [data, setData] = useState<{ clusters: CenterSchedule[] }>({ clusters: [] });
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [changesMade, setChangesMade] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  /**
   * loadSchedule
   *  - fetches latest optimization schedule
   *  - fetches fleet list to map category_name -> vehicle_number
   *  - normalizes clusters and injects:
   *      - vehicle_number (replacing `type` display when possible)
   *      - per-cluster stats (vehiclesUsed, totalAssignedMilk, fullnessPercent, lowUtilized list)
   */
  const loadSchedule = async () => {
    try {
      setLoading(true);
      // 1) get schedule
      const res = await axios.get("http://localhost:8000/api/v1/trips/schedule");
      const raw = res.data?.data || res.data;
      const clusters = raw?.clusters || raw?.optimization_results?.clusters || [];

      // 2) fetch fleet to map category_name -> vehicle_number (first available)
      let fleetMap: Record<string, string> = {}; // category_name -> vehicle_number
      try {
        const fleetRes = await axios.get("http://localhost:8000/api/v1/fleet/?skip=0&limit=500");
        const fleetArr = Array.isArray(fleetRes.data) ? fleetRes.data : fleetRes.data?.data ?? [];
        for (const f of fleetArr) {
          const cat = f?.category_name ?? f?.category_name ?? null;
          const vn = f?.vehicle_number ?? f?.vehicle_no ?? f?.vehicleNumber ?? null;
          if (cat && vn && !fleetMap[cat]) {
            // keep first available mapping for stability
            fleetMap[cat] = vn;
          }
        }
      } catch (err) {
        // if fleet fetch fails, we simply leave fleetMap empty and fallback to type
        console.warn("Failed to fetch fleet list for mapping:", err);
      }

      // 3) normalize clusters and vehicles
      const normalized = clusters.map((cluster: any, cIdx: number) => {
        const vehicles: Trip[] =
          (cluster.vehicles || []).map((v: any, vIdx: number) => {
            // determine vehicle_number by matching category_name -> vehicle_number
            // v.type might be like "C2" or "CAT_F011" — we attempt direct lookup
            const typeKey = v.type ?? v.vehicle_type ?? v.category_name ?? v.category ?? `Vehicle ${vIdx + 1}`;
            console.log("typeKey",typeKey);
            const matchedVehicleNumber = fleetMap[String(typeKey)] ?? null;

            const farmers =
              (v.farmers || []).map((f: any, fIdx: number) => {
                const lat = f?.lat ?? 10.0 + Math.random() * 0.5;
                const lng = f?.lng ?? 78.0 + Math.random() * 0.5;
                return {
                  id: `${cluster.name}-v${vIdx}-f${fIdx}`,
                  name: typeof f === "string" ? f : f?.name ?? `Farmer ${fIdx + 1}`,
                  milk_liters: typeof f === "string" ? Math.floor(Math.random() * 40) + 10 : f?.milk_liters ?? 10,
                  lat,
                  lng,
                  location: generateLocation(lat, lng),
                } as Farmer;
              }) || [];

            const totalMilk = v.total_milk ?? farmers.reduce((sum: number, f: Farmer) => sum + (f?.milk_liters ?? 0), 0);

            const capacityVal = v?.capacity ?? v?.capacity_liters ?? 0;

            const utilizationVal = Number(v.utilization ?? v.utilization_pct ?? Math.round((totalMilk / (capacityVal || 1)) * 100)) || 0;

            return {
              id: `droppable-${cIdx}-${vIdx}`,
              type: matchedVehicleNumber ?? String(typeKey), // replace UI label with vehicle_number when found
              vehicle_number: matchedVehicleNumber ?? String(typeKey),
              farmers,
              total_milk: totalMilk,
              capacity: capacityVal,
              distance: v.distance ?? Math.floor(Math.random() * 50) + 20,
              travel_time: v.travel_time ?? Math.floor(Math.random() * 120) + 60,
              utilization: utilizationVal,
            } as Trip;
          }) || [];

        // compute cluster-level stats
        const totalAssignedMilk = vehicles.reduce((s, vv) => s + (Number(vv.total_milk) || 0), 0);
        const vehiclesUsed = vehicles.length;
        const centerCapacity = Number(cluster.capacity ?? cluster.capacity_liters ?? cluster.total_capacity ?? 0);
        const fullnessPercent = centerCapacity > 0 ? (totalAssignedMilk / centerCapacity) * 100 : 0;
        const lowUtilized = vehicles
          .filter((vv) => Number(vv.utilization ?? 0) < 70)
          .map((vv) => ({
            vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown",
            pct: Math.round((Number(vv.utilization ?? 0) + Number.EPSILON) * 100) / 100,
          }));

        return {
          name: cluster.name ?? `Center ${cIdx + 1}`,
          total_milk: cluster.total_milk ?? totalAssignedMilk,
          capacity: centerCapacity,
          lat: 10.1 + Math.random() * 0.6,
          lng: 78.0 + Math.random() * 0.6,
          vehicles,
          stats: {
            vehiclesUsed,
            totalAssignedMilk,
            fullnessPercent: Math.round((fullnessPercent + Number.EPSILON) * 100) / 100,
            lowUtilized,
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
    const updatedClusters = [...data.clusters];

    const [srcClusterIdx, srcVehicleIdx] = source.droppableId
      .replace("droppable-", "")
      .split("-")
      .map(Number);
    const [destClusterIdx, destVehicleIdx] = destination.droppableId
      .replace("droppable-", "")
      .split("-")
      .map(Number);

    const sourceVehicle =
      updatedClusters[srcClusterIdx].vehicles[srcVehicleIdx];
    const destVehicle =
      updatedClusters[destClusterIdx].vehicles[destVehicleIdx];

    const [movedFarmer] = sourceVehicle.farmers.splice(source.index, 1);
    destVehicle.farmers.splice(destination.index, 0, movedFarmer);

    sourceVehicle.total_milk = sourceVehicle.farmers.reduce(
      (sum, f) => sum + f.milk_liters,
      0
    );
    destVehicle.total_milk = destVehicle.farmers.reduce(
      (sum, f) => sum + f.milk_liters,
      0
    );

    // Recompute stats for affected clusters
    const recomputeClusterStats = (cluster: CenterSchedule) => {
      const vehicles = cluster.vehicles;
      const totalAssignedMilk = vehicles.reduce((s, vv) => s + (Number(vv.total_milk) || 0), 0);
      const vehiclesUsed = vehicles.length;
      const centerCapacity = Number(cluster.capacity ?? 0);
      const fullnessPercent = centerCapacity > 0 ? (totalAssignedMilk / centerCapacity) * 100 : 0;
      const lowUtilized = vehicles
        .filter((vv) => Number(vv.utilization ?? 0) < 70)
        .map((vv) => ({
          vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown",
          pct: Math.round((Number(vv.utilization ?? 0) + Number.EPSILON) * 100) / 100,
        }));
      cluster.stats = {
        vehiclesUsed,
        totalAssignedMilk,
        fullnessPercent: Math.round((fullnessPercent + Number.EPSILON) * 100) / 100,
        lowUtilized,
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
          <p className="text-slate-600">
            Optimized milk collection routes with real-time visualization.
          </p>
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
          const stats = cluster.stats ?? { vehiclesUsed: 0, totalAssignedMilk: 0, fullnessPercent: 0, lowUtilized: [] };

          return (
            <div
              key={cluster.name}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  const next = new Set(expandedCenters);
                  next.has(cluster.name)
                    ? next.delete(cluster.name)
                    : next.add(cluster.name);
                  setExpandedCenters(next);
                }}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  <h3 className="font-bold text-xl text-slate-900">{cluster.name}</h3>
                  <span className="text-slate-600 ml-2">
                    {cluster.total_milk}L total
                  </span>

                  {/* ---- Compact overall stats (small badges) ---- */}
                  <div className="ml-4 flex items-center gap-2">
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                      Vehicles: <strong className="text-slate-900">{stats.vehiclesUsed}</strong>
                    </div>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                      Assigned: <strong className="text-slate-900">{Number(stats.totalAssignedMilk).toLocaleString()}L</strong>
                    </div>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                      Fullness: <strong className="text-slate-900">{stats.fullnessPercent}%</strong>
                    </div>
                    {stats.lowUtilized && stats.lowUtilized.length > 0 && (
                      <div className="text-xs bg-orange-50 border border-orange-200 px-2 py-1 rounded-md text-orange-700">
                        Low Util: <strong>{stats.lowUtilized.length}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* show low utilized list inline when present */}
                {stats.lowUtilized && stats.lowUtilized.length > 0 && (
                  <div className="mt-2 ml-[30px] text-sm text-orange-700">
                    <strong>Low-utilized vehicles:</strong>{" "}
                    {stats.lowUtilized.map((lv, i) => (
                      <span key={lv.vehicle_number} className="inline-block mr-2">
                        <span className="px-2 py-0.5 bg-orange-100 rounded-md text-orange-800 text-xs">
                          {lv.vehicle_number} — {lv.pct}%
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
                    const routeCoords = vehicle.farmers.map((f) => [f.lat || 0, f.lng || 0]);

                    // find nearest chilling center as end point
                    let nearestCenter: CenterSchedule | null = null;
                    let minDist = Infinity;
                    if (routeCoords.length > 0) {
                      const [endLat, endLng] = routeCoords[routeCoords.length - 1];
                      for (const c of data.clusters) {
                        const dist = haversine(endLat, endLng, c.lat || 0, c.lng || 0);
                        if (dist < minDist) {
                          minDist = dist;
                          nearestCenter = c;
                        }
                      }
                    }

                    const fullRoute = [...routeCoords];
                    if (nearestCenter) fullRoute.push([nearestCenter.lat || 0, nearestCenter.lng || 0]);

                    return (
                      <Droppable droppableId={vehicle.id} key={vehicle.id}>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="bg-white rounded-lg border border-slate-200 mb-6 overflow-hidden"
                          >
                            <div
                              className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center"
                              onClick={() => {
                                const next = new Set(expandedTrips);
                                next.has(vehicle.id)
                                  ? next.delete(vehicle.id)
                                  : next.add(vehicle.id);
                                setExpandedTrips(next);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Truck className="text-green-600" />
                                <span className="font-semibold">
                                  {/* display vehicle_number (we replaced type earlier) */}
                                  {vehicle.vehicle_number ?? vehicle.type}{" "}
                                  <span className="text-slate-500 text-sm font-normal">
                                    • Vehicle #{vehicle.id.split("-").pop()}
                                  </span>
                                </span>
                                <span className="text-slate-600 ml-2">
                                  {vehicle.farmers.length} stops
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-slate-600 text-sm">
                                <Ruler className="h-4 w-4 text-blue-500" /> {vehicle.distance} km
                                <Timer className="h-4 w-4 text-orange-500" /> {vehicle.travel_time} mins
                                <Droplets className="h-4 w-4 text-sky-500" /> {vehicle.total_milk} L
                                <Route className="h-4 w-4 text-green-600" /> {vehicle.utilization}% full
                                <span className="ml-3 text-slate-500 text-sm">
                                  🚛 Vehicle #{vehicle.id.split("-").pop()}
                                </span>
                              </div>
                            </div>

                            {isTripExpanded && (
                              <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-4">
                                {/* Left: Farmer List */}
                                <div>
                                  {vehicle.farmers.map((farmer, fIdx) => (
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
                                            <div className="font-semibold text-slate-900">
                                              {farmer.name}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                              {farmer.milk_liters} L · {farmer.location}
                                            </div>
                                          </div>
                                          <MapPin className="text-slate-500" />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}

                                  {/* Visible Recommendation */}
                                  {vehicle.utilization && vehicle.utilization < 70 && (
                                    <div className="mt-3 bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-3 rounded-md text-sm flex items-start gap-2 shadow-sm">
                                      <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-600" />
                                      <div>
                                        <strong>Low Utilization:</strong> This vehicle is only{" "}
                                        {vehicle.utilization}% full. Consider using a smaller
                                        vehicle (Auto/Jeeto) for better efficiency.
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right: Enlarged Map */}
                                <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200 shadow-lg">
                                  <MapContainer
                                    center={
                                      routeCoords.length ? routeCoords[0] : [10.5, 78.1]
                                    }
                                    zoom={10}
                                    style={{ height: "100%", width: "100%" }}
                                  >
                                    <TileLayer
                                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                      attribution="&copy; OpenStreetMap contributors"
                                    />
                                    {fullRoute.length > 1 && (
                                      <Polyline positions={fullRoute} color="blue" weight={3} />
                                    )}
                                    {vehicle.farmers.map((f, idx) => (
                                      <Marker
                                        key={f.id}
                                        position={[f.lat || 0, f.lng || 0]}
                                        icon={farmerIcon(idx + 1)}
                                      >
                                        <Popup>
                                          <strong>{f.name}</strong>
                                          <br />
                                          {f.location}
                                          <br />
                                          Milk: {f.milk_liters} L
                                        </Popup>
                                      </Marker>
                                    ))}
                                    {/* Final chilling center marker */}
                                    {nearestCenter && (
                                      <Marker
                                        position={[nearestCenter.lat || 0, nearestCenter.lng || 0]}
                                        icon={L.divIcon({
                                          html: `<div style='background-color:#16a34a;color:white;border-radius:50%;font-size:10px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;'>🏭</div>`,
                                          className: "hub-icon",
                                        })}
                                      >
                                        <Popup>
                                          <strong>{nearestCenter.name}</strong>
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
