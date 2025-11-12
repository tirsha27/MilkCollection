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
  type: string;
  farmers: Farmer[];
  total_milk: number;
  distance?: number;
  travel_time?: number;
  utilization?: number;
}

interface CenterSchedule {
  name: string;
  total_milk: number;
  vehicles: Trip[];
  lat?: number;
  lng?: number;
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

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8000/api/v1/trips/schedule");
      const raw = res.data?.data || res.data;
      const clusters = raw?.clusters || raw?.optimization_results?.clusters || [];

      const normalized = clusters.map((cluster: any, cIdx: number) => ({
        name: cluster.name,
        total_milk: cluster.total_milk || 0,
        lat: 10.1 + Math.random() * 0.6,
        lng: 78.0 + Math.random() * 0.6,
        vehicles: cluster.vehicles.map((v: any, vIdx: number) => {
          const farmers =
            (v.farmers || []).map((f: any, fIdx: number) => {
              const lat = f.lat || 10.0 + Math.random() * 0.5;
              const lng = f.lng || 78.0 + Math.random() * 0.5;
              return {
                id: `${cluster.name}-v${vIdx}-f${fIdx}`,
                name: typeof f === "string" ? f : f.name || `Farmer ${fIdx + 1}`,
                milk_liters:
                  typeof f === "string"
                    ? Math.floor(Math.random() * 40) + 10
                    : f.milk_liters || 10,
                lat,
                lng,
                location: generateLocation(lat, lng),
              };
            }) || [];

          return {
            id: `droppable-${cIdx}-${vIdx}`,
            type: v.type || v.vehicle_type || `Vehicle ${vIdx + 1}`,
            farmers,
            total_milk:
              v.total_milk || farmers.reduce((sum, f) => sum + f.milk_liters, 0),
            distance: v.distance || Math.floor(Math.random() * 50) + 20,
            travel_time: v.travel_time || Math.floor(Math.random() * 120) + 60,
            utilization: v.utilization || Math.floor(Math.random() * 100),
          };
        }),
      }));

      setData({ clusters: normalized });
    } catch (err) {
      console.error("Error loading trip schedule:", err);
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
                </div>
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
                                <span className="font-semibold">{vehicle.type}</span>
                                <span className="text-slate-600 ml-2">
                                  {vehicle.farmers.length} stops
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-slate-600 text-sm">
                                <Ruler className="h-4 w-4 text-blue-500" /> {vehicle.distance} km
                                <Timer className="h-4 w-4 text-orange-500" /> {vehicle.travel_time} mins
                                <Droplets className="h-4 w-4 text-sky-500" /> {vehicle.total_milk} L
                                <Route className="h-4 w-4 text-green-600" /> {vehicle.utilization}% full
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
