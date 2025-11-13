// // domain/frontend/src/components/TripSchedule.tsx
// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   DragDropContext,
//   Droppable,
//   Draggable,
//   DropResult,
// } from "react-beautiful-dnd";
// import {
//   Truck,
//   MapPin,
//   Droplets,
//   ChevronDown,
//   ChevronRight,
//   Save,
//   Route,
//   Timer,
//   Ruler,
//   AlertTriangle,
// } from "lucide-react";
// import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// // -------- Utility: Calculate Distance between two lat/lon points -------- //
// function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
//   const toRad = (x: number) => (x * Math.PI) / 180;
//   const R = 6371; // km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// // -------- Utility: Generate realistic nearby address -------- //
// function generateLocation(lat: number, lng: number) {
//   if (lat < 10.2) return "Near Madurai, Tamil Nadu";
//   if (lat < 10.4 && lng > 78.3) return "Near Viralimalai, Tamil Nadu";
//   if (lat < 10.5 && lng > 78.2) return "Near Dindigul, Tamil Nadu";
//   if (lat > 10.5 && lng < 78.2) return "Near Karur, Tamil Nadu";
//   if (lat > 10.6) return "Near Trichy, Tamil Nadu";
//   return "Near Pudukkottai, Tamil Nadu";
// }

// interface Farmer {
//   id: string;
//   name: string;
//   milk_liters: number;
//   lat?: number;
//   lng?: number;
//   location?: string;
// }

// interface Trip {
//   id: string;
//   type: string; // will be replaced by vehicle_number when available
//   farmers: Farmer[];
//   total_milk: number;
//   distance?: number;
//   travel_time?: number;
//   utilization?: number;
//   capacity?: number;
//   // optional display field
//   vehicle_number?: string;
// }

// interface CenterSchedule {
//   name: string;
//   total_milk: number;
//   capacity?: number;
//   vehicles: Trip[];
//   lat?: number;
//   lng?: number;
//   // computed stats
//   stats?: {
//     vehiclesUsed: number;
//     totalAssignedMilk: number;
//     fullnessPercent: number;
//     lowUtilized: { vehicle_number: string; pct: number }[];
//   };
// }

// // Numbered circular marker icon
// const farmerIcon = (number: number) =>
//   L.divIcon({
//     html: `<div style="background-color:#2563eb;color:white;font-size:12px;font-weight:600;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">${number}</div>`,
//     className: "number-icon",
//   });

// export default function TripSchedule() {
//   const [data, setData] = useState<{ clusters: CenterSchedule[] }>({ clusters: [] });
//   const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
//   const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
//   const [loading, setLoading] = useState(true);
//   const [changesMade, setChangesMade] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     loadSchedule();
//   }, []);

//   /**
//    * loadSchedule
//    *  - fetches latest optimization schedule
//    *  - fetches fleet list to map category_name -> vehicle_number
//    *  - normalizes clusters and injects:
//    *      - vehicle_number (replacing `type` display when possible)
//    *      - per-cluster stats (vehiclesUsed, totalAssignedMilk, fullnessPercent, lowUtilized list)
//    */
//   const loadSchedule = async () => {
//     try {
//       setLoading(true);
//       // 1) get schedule
//       const res = await axios.get("http://localhost:8000/api/v1/trips/schedule");
//       const raw = res.data?.data || res.data;
//       const clusters = raw?.clusters || raw?.optimization_results?.clusters || [];

//       // 2) fetch fleet to map category_name -> vehicle_number (first available)
//       let fleetMap: Record<string, string> = {}; // category_name -> vehicle_number
//       try {
//         const fleetRes = await axios.get("http://localhost:8000/api/v1/fleet/?skip=0&limit=500");
//         const fleetArr = Array.isArray(fleetRes.data) ? fleetRes.data : fleetRes.data?.data ?? [];
//         for (const f of fleetArr) {
//           const cat = f?.category_name ?? f?.category_name ?? null;
//           const vn = f?.vehicle_number ?? f?.vehicle_no ?? f?.vehicleNumber ?? null;
//           if (cat && vn && !fleetMap[cat]) {
//             // keep first available mapping for stability
//             fleetMap[cat] = vn;
//           }
//         }
//       } catch (err) {
//         // if fleet fetch fails, we simply leave fleetMap empty and fallback to type
//         console.warn("Failed to fetch fleet list for mapping:", err);
//       }

//       // 3) normalize clusters and vehicles
//       const normalized = clusters.map((cluster: any, cIdx: number) => {
//         const vehicles: Trip[] =
//   (cluster.vehicles || []).map((v: any, vIdx: number) => {
//     // decide a typeKey and matched vehicle number as before
//     const typeKey = v.type ?? v.vehicle_type ?? v.category_name ?? v.category ?? `Vehicle ${vIdx + 1}`;
//     const matchedVehicleNumber = fleetMap[String(typeKey)] ?? null;

//     // build farmers array (keep your existing generation logic)
//     const farmers =
//       (v.farmers || []).map((f: any, fIdx: number) => {
//         const lat = f?.lat ?? 10.0 + Math.random() * 0.5;
//         const lng = f?.lng ?? 78.0 + Math.random() * 0.5;
//         return {
//           id: `${cluster.name}-v${vIdx}-f${fIdx}`,
//           name: typeof f === "string" ? f : f?.name ?? `Farmer ${fIdx + 1}`,
//           milk_liters: typeof f === "string" ? Math.floor(Math.random() * 40) + 10 : f?.milk_liters ?? 10,
//           lat,
//           lng,
//           location: generateLocation(lat, lng),
//         } as Farmer;
//       }) || [];

//     // COMPUTE totalMilk from farmers (defensive)
//     const totalMilk = farmers.length > 0
//       ? farmers.reduce((sum: number, f: Farmer) => sum + (Number(f?.milk_liters) || 0), 0)
//       : Number(v.total_milk ?? 0);

//     // capacity value (vehicle-level preferred)
//     const capacityVal = Number(v?.capacity ?? v?.capacity_liters ?? 0);

//     // compute utilization as percent (0..100) when capacity available
//     let utilizationVal = 0;
//     if (capacityVal > 0) {
//       utilizationVal = Number(((totalMilk / capacityVal) * 100).toFixed(2));
//       utilizationVal = Math.max(0, Math.min(100, utilizationVal));
//     } else {
//       // fallback to any provided utilization (normalize fraction->percent)
//       const provided = Number(v.utilization ?? v.utilization_pct ?? 0) || 0;
//       utilizationVal = provided > 0 && provided <= 1 ? Number((provided * 100).toFixed(2)) : Number(provided.toFixed ? provided.toFixed(2) : provided);
//       utilizationVal = Math.max(0, Math.min(100, utilizationVal));
//     }

//     // compute distance from farmer coords (sum of consecutive legs)
//     let computedDistance = 0;
//     const coords: [number, number][] = farmers.map((f) => [Number(f.lat) || 0, Number(f.lng) || 0]);
//     for (let i = 0; i + 1 < coords.length; i++) {
//       computedDistance += haversine(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
//     }
//     // round to 2 decimals
//     computedDistance = Math.round((computedDistance + Number.EPSILON) * 100) / 100;

//     // travel time estimate (minutes) using avg speed 30 km/h
//     const avgSpeedKmh = 30;
//     const computedTravelTime = Math.round((computedDistance / (avgSpeedKmh || 1)) * 60);

//     return {
//       id: `droppable-${cIdx}-${vIdx}`,
//       type: matchedVehicleNumber ?? String(typeKey),
//       vehicle_number: matchedVehicleNumber ?? String(typeKey),
//       farmers,
//       total_milk: totalMilk,
//       capacity: capacityVal,
//       distance: typeof v.distance === "number" && v.distance > 0 ? v.distance : computedDistance,
//       travel_time: typeof v.travel_time === "number" && v.travel_time > 0 ? v.travel_time : computedTravelTime,
//       utilization: utilizationVal,
//     } as Trip;
//   }) || [];
//         // compute cluster-level stats
//         const totalAssignedMilk = vehicles.reduce((s, vv) => s + (Number(vv.total_milk) || 0), 0);
//         const vehiclesUsed = vehicles.length;
//         const centerCapacity = Number(cluster.capacity ?? cluster.capacity_liters ?? cluster.total_capacity ?? 0);
//         const fullnessPercent = centerCapacity > 0 ? (totalAssignedMilk / centerCapacity) * 100 : 0;
//         const lowUtilized = vehicles
//           .filter((vv) => Number(vv.utilization ?? 0) < 70)
//           .map((vv) => ({
//             vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown",
//             pct: Math.round((Number(vv.utilization ?? 0) + Number.EPSILON) * 100) / 100,
//           }));

//         return {
//           name: cluster.name ?? `Center ${cIdx + 1}`,
//           total_milk: cluster.total_milk ?? totalAssignedMilk,
//           capacity: centerCapacity,
//           lat: 10.1 + Math.random() * 0.6,
//           lng: 78.0 + Math.random() * 0.6,
//           vehicles,
//           stats: {
//             vehiclesUsed,
//             totalAssignedMilk,
//             fullnessPercent: Math.round((fullnessPercent + Number.EPSILON) * 100) / 100,
//             lowUtilized,
//           },
//         } as CenterSchedule;
//       });

//       setData({ clusters: normalized });
//     } catch (err) {
//       console.error("Error loading trip schedule:", err);
//       setData({ clusters: [] });
//     } finally {
//       setLoading(false);
//     }
//   };
// // ----------------- Utilities (drop-in) -----------------
// function toNum(x: any, fallback = 0) {
//   const n = Number(x);
//   return Number.isFinite(n) ? n : fallback;
// }

// function normalizeUtil(u: any) {
//   let n = toNum(u, 0);
//   // convert fractional util (0..1) to percent
//   if (n > 0 && n <= 1) n = Number((n * 100).toFixed(2));
//   // clamp and round
//   n = Math.max(0, Math.min(100, Number(n.toFixed(2))));
//   return n;
// }

// /**
//  * Build a map of vehicleTypeName -> capacity using data.configuration.vehicle_types
//  * (safe if configuration missing)
//  */
// function buildTypeCapacityMap(cfg: any) {
//   const map: Record<string, number> = {};
//   try {
//     const types = cfg?.vehicle_types ?? cfg?.vehicleTypes ?? [];
//     if (Array.isArray(types)) {
//       for (const t of types) {
//         if (t?.name) {
//           map[String(t.name)] = toNum(t.capacity ?? t.capacity_liters ?? 0, 0);
//         }
//       }
//     }
//   } catch (e) {
//     // swallow — return empty map
//   }
//   return map;
// }

// // ----------------- computeVehicleMetrics -----------------
// function computeVehicleMetrics(
//   vehicle: any,
//   opts?: {
//     includeEnd?: boolean;
//     endLat?: number;
//     endLng?: number;
//     avgSpeedKmh?: number;
//     typeCapacityMap?: Record<string, number>;
//     cluster?: any;
//   }
// ) {
//   const avgSpeedKmh = toNum(opts?.avgSpeedKmh ?? 30, 30);
//   const farmers = Array.isArray(vehicle.farmers) ? vehicle.farmers : [];

//   // coordinate array for route legs
//   const coords: [number, number][] = farmers.map((f: any) => [toNum(f.lat, 0), toNum(f.lng, 0)]);

//   let distance = 0;
//   for (let i = 0; i + 1 < coords.length; i++) {
//     distance += haversine(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
//   }
//   if (opts?.includeEnd && coords.length > 0 && typeof opts?.endLat === "number" && typeof opts?.endLng === "number") {
//     const last = coords[coords.length - 1];
//     distance += haversine(last[0], last[1], toNum(opts.endLat, 0), toNum(opts.endLng, 0));
//   }
//   distance = Number(distance.toFixed(2));

//   const travel_time = Math.round((distance / (avgSpeedKmh || 1)) * 60);

//   // total milk computed from farmers if possible, else fallback to vehicle.total_milk
//   const totalMilk = farmers.length > 0 ? farmers.reduce((s: number, f: any) => s + toNum(f?.milk_liters, 0), 0) : toNum(vehicle.total_milk, 0);

//   // capacity: prefer vehicle.capacity then type map
//   const vehicleTypeKey = vehicle.type ?? vehicle.vehicle_code ?? "";
//   const capFromVehicle = toNum(vehicle.capacity ?? vehicle.capacity_liters ?? 0, 0);
//   const capFromType = opts?.typeCapacityMap?.[String(vehicleTypeKey)] ?? 0;
//   const capacity = capFromVehicle > 0 ? capFromVehicle : capFromType;

//   // utilization percent 0..100 (rounded)
//   let utilization = 0;
//   if (capacity > 0) {
//     utilization = Number(((totalMilk / capacity) * 100).toFixed(2));
//   } else {
//     utilization = normalizeUtil(vehicle.utilization ?? 0);
//   }
//   utilization = Math.max(0, Math.min(100, utilization));

//   return { distance, travel_time, utilization, totalMilk, capacity };
// }

// // ----------------- handleDragEnd (minimal-recompute, unambiguous IDs) -----------------
// function findVehiclePosFromDroppableId(clusters: any[], droppableId: string | number) {
//   // If droppableId uses clusterName::vehicleId format, prefer that
//   if (typeof droppableId === "string" && droppableId.includes("::")) {
//     const [clusterNameRaw, vehicleIdRaw] = droppableId.split("::");
//     const clusterName = clusterNameRaw;
//     const vehicleId = vehicleIdRaw;
//     for (let ci = 0; ci < clusters.length; ci++) {
//       if (String(clusters[ci].name) === String(clusterName)) {
//         const vehicles = Array.isArray(clusters[ci].vehicles) ? clusters[ci].vehicles : [];
//         for (let vi = 0; vi < vehicles.length; vi++) {
//           if (String(vehicles[vi].id) === String(vehicleId)) return { clusterIdx: ci, vehicleIdx: vi };
//         }
//       }
//     }
//     // fall-through to generic lookup if not found
//   }

//   // fallback: search by vehicle id — but it's ambiguous if id repeats across clusters
//   const matches: Array<{ clusterIdx: number; vehicleIdx: number }> = [];
//   for (let ci = 0; ci < clusters.length; ci++) {
//     const vehicles = Array.isArray(clusters[ci]?.vehicles) ? clusters[ci].vehicles : [];
//     for (let vi = 0; vi < vehicles.length; vi++) {
//       if (String(vehicles[vi].id) === String(droppableId)) matches.push({ clusterIdx: ci, vehicleIdx: vi });
//     }
//   }
//   if (matches.length === 1) return matches[0];
//   if (matches.length > 1) {
//     console.warn(
//       "Ambiguous droppableId matched multiple vehicles. Use `${cluster.name}::${vehicle.id}` for droppableId to fix.",
//       { droppableId, matches }
//     );
//     return matches[0];
//   }
//   return null;
// }

// const handleDragEnd = (result: DropResult) => {
//   if (!result.destination) return;
//   try {
//     const { source, destination } = result;

//     // clone clusters array immutably (work on a local copy)
//     const clustersArr: any[] = Array.isArray((data as any).clusters)
//       ? (typeof structuredClone === "function" ? structuredClone((data as any).clusters) : JSON.parse(JSON.stringify((data as any).clusters)))
//       : [];

//     // resolve src/dst positions
//     const srcPos = findVehiclePosFromDroppableId(clustersArr, source.droppableId);
//     const dstPos = findVehiclePosFromDroppableId(clustersArr, destination.droppableId);
//     if (!srcPos || !dstPos) {
//       console.warn("Could not resolve source/destination from droppableId", { source: source.droppableId, destination: destination.droppableId });
//       return;
//     }

//     const srcCluster = clustersArr[srcPos.clusterIdx];
//     const dstCluster = clustersArr[dstPos.clusterIdx];
//     if (!srcCluster || !dstCluster) {
//       console.warn("Malformed cluster data", { srcCluster, dstCluster });
//       return;
//     }

//     const srcVehicle = Array.isArray(srcCluster.vehicles) ? srcCluster.vehicles[srcPos.vehicleIdx] : null;
//     const dstVehicle = Array.isArray(dstCluster.vehicles) ? dstCluster.vehicles[dstPos.vehicleIdx] : null;
//     if (!srcVehicle || !dstVehicle) {
//       console.warn("Could not find vehicles after lookup", { srcPos, dstPos, srcVehicle, dstVehicle });
//       return;
//     }

//     console.log("BEFORE MOVE src:", { id: srcVehicle.id, total_milk: srcVehicle.total_milk, capacity: srcVehicle.capacity, util: srcVehicle.utilization });
//     console.log("BEFORE MOVE dst:", { id: dstVehicle.id, total_milk: dstVehicle.total_milk, capacity: dstVehicle.capacity, util: dstVehicle.utilization });

//     // move farmer between arrays
//     const [movedFarmer] = (srcVehicle.farmers || []).splice(source.index, 1);
//     if (!movedFarmer) {
//       console.warn("No farmer moved - source index out of range", { source, srcVehicle });
//       return;
//     }
//     dstVehicle.farmers = dstVehicle.farmers || [];
//     dstVehicle.farmers.splice(destination.index, 0, movedFarmer);

//     // only recompute the two affected vehicles
//     const typeCapacityMap = buildTypeCapacityMap((data as any).configuration);
//     const srcMetrics = computeVehicleMetrics(srcVehicle, {
//       includeEnd: true,
//       endLat: srcCluster.lat,
//       endLng: srcCluster.lng,
//       avgSpeedKmh: 30,
//       typeCapacityMap,
//       cluster: srcCluster,
//     });
//     const dstMetrics = computeVehicleMetrics(dstVehicle, {
//       includeEnd: true,
//       endLat: dstCluster.lat,
//       endLng: dstCluster.lng,
//       avgSpeedKmh: 30,
//       typeCapacityMap,
//       cluster: dstCluster,
//     });

//     // write computed values (safe numeric assignment)
//     srcVehicle.total_milk = toNum(srcMetrics.totalMilk, 0);
//     srcVehicle.capacity = toNum(srcMetrics.capacity, toNum(srcVehicle.capacity, 0));
//     srcVehicle.distance = srcMetrics.distance;
//     srcVehicle.travel_time = srcMetrics.travel_time;
//     srcVehicle.utilization = normalizeUtil(srcMetrics.utilization);

//     dstVehicle.total_milk = toNum(dstMetrics.totalMilk, 0);
//     dstVehicle.capacity = toNum(dstMetrics.capacity, toNum(dstVehicle.capacity, 0));
//     dstVehicle.distance = dstMetrics.distance;
//     dstVehicle.travel_time = dstMetrics.travel_time;
//     dstVehicle.utilization = normalizeUtil(dstMetrics.utilization);

//     // recompute stats only for affected clusters
//     const recomputeClusterStatsByIndex = (clusterIdx: number) => {
//       const cluster = clustersArr[clusterIdx];
//       if (!cluster || typeof cluster !== "object") return;
//       const vehicles = Array.isArray(cluster.vehicles) ? cluster.vehicles : [];
//       const totalAssignedMilk = vehicles.reduce((s: number, vv: any) => s + toNum(vv.total_milk, 0), 0);
//       const vehiclesUsed = vehicles.length;
//       const centerCapacity = toNum(cluster.capacity ?? cluster.capacity_liters ?? cluster.total_capacity ?? 0, 0);
//       const fullnessPercent = centerCapacity > 0 ? Number(((totalAssignedMilk / centerCapacity) * 100).toFixed(2)) : 0;
//       const lowUtilized = vehicles
//         .filter((vv: any) => toNum(vv.utilization, 0) < 70)
//         .map((vv: any) => ({ vehicle_number: vv.vehicle_number ?? vv.type ?? "Unknown", pct: Number(toNum(vv.utilization, 0).toFixed(2)) }));
//       cluster.stats = { vehiclesUsed, totalAssignedMilk, fullnessPercent, lowUtilized };
//     };

//     recomputeClusterStatsByIndex(srcPos.clusterIdx);
//     if (dstPos.clusterIdx !== srcPos.clusterIdx) recomputeClusterStatsByIndex(dstPos.clusterIdx);

//     console.log("AFTER MOVE src sample:", clustersArr[srcPos.clusterIdx].vehicles[srcPos.vehicleIdx]);
//     console.log("AFTER MOVE dst sample:", clustersArr[dstPos.clusterIdx].vehicles[dstPos.vehicleIdx]);

//     // commit
//     setData({ clusters: clustersArr });
//     setChangesMade(true);
//   } catch (err) {
//     console.error("handleDragEnd error:", err, result);
//   }
// };




//   // const handleSaveChanges = async () => {
//   //   try {
//   //     setSaving(true);
//   //     await axios.put("http://localhost:8000/api/v1/trips/schedule/update", data);
//   //     alert("✅ Schedule saved successfully!");
     
//   //     setChangesMade(false);
//   //   } catch (err) {
//   //     console.error("Error saving schedule:", err);
//   //     alert("❌ Failed to save schedule.");
//   //   } finally {
//   //     setSaving(false);
//   //   }
//   // };

//   if (loading) return <div className="text-center py-12">Loading trip schedule...</div>;

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div>
//           <h2 className="text-3xl font-bold text-slate-900">Trip Scheduler</h2>
//           <p className="text-slate-600">
//             Optimized milk collection routes with real-time visualization.
//           </p>
//         </div>
//         {/* {changesMade && (
//           <button
//             onClick={handleSaveChanges}
//             disabled={saving}
//             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
//           >
//             <Save className="h-5 w-5" />
//             {saving ? "Saving..." : "Save Changes"}
//           </button>
//         )} */}
//       </div>

//       <DragDropContext onDragEnd={handleDragEnd}>
//         {data.clusters.map((cluster, cIdx) => {
//           const isExpanded = expandedCenters.has(cluster.name);
//           const stats = cluster.stats ?? { vehiclesUsed: 0, totalAssignedMilk: 0, fullnessPercent: 0, lowUtilized: [] };

//           return (
//             <div
//               key={cluster.name}
//               className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
//             >
//               <div
//                 className="p-4 cursor-pointer hover:bg-slate-50"
//                 onClick={() => {
//                   const next = new Set(expandedCenters);
//                   next.has(cluster.name)
//                     ? next.delete(cluster.name)
//                     : next.add(cluster.name);
//                   setExpandedCenters(next);
//                 }}
//               >
//                 <div className="flex items-center gap-3">
//                   {isExpanded ? <ChevronDown /> : <ChevronRight />}
//                   <h3 className="font-bold text-xl text-slate-900">{cluster.name}</h3>
//                   <span className="text-slate-600 ml-2">
//                     {cluster.total_milk}L total
//                   </span>

//                   {/* ---- Compact overall stats (small badges) ---- */}
//                   <div className="ml-4 flex items-center gap-2">
//                     <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
//                       Vehicles: <strong className="text-slate-900">{stats.vehiclesUsed}</strong>
//                     </div>
//                     <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
//                       Assigned: <strong className="text-slate-900">{Number(stats.totalAssignedMilk).toLocaleString()}L</strong>
//                     </div>
//                     <div className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
//                       Fullness: <strong className="text-slate-900">{stats.fullnessPercent}%</strong>
//                     </div>
//                     {stats.lowUtilized && stats.lowUtilized.length > 0 && (
//                       <div className="text-xs bg-orange-50 border border-orange-200 px-2 py-1 rounded-md text-orange-700">
//                         Low Util: <strong>{stats.lowUtilized.length}</strong>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* show low utilized list inline when present */}
//                 {stats.lowUtilized && stats.lowUtilized.length > 0 && (
//                   <div className="mt-2 ml-[30px] text-sm text-orange-700">
//                     <strong>Low-utilized vehicles:</strong>{" "}
//                     {stats.lowUtilized.map((lv, i) => (
//                       <span key={lv.vehicle_number} className="inline-block mr-2">
//                         <span className="px-2 py-0.5 bg-orange-100 rounded-md text-orange-800 text-xs">
//                           {lv.vehicle_number} — {lv.pct}%
//                         </span>
//                       </span>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {isExpanded && (
//                 <div className="border-t border-slate-200 bg-slate-50 p-4">
//                   {cluster.vehicles.map((vehicle) => {
//                     const isTripExpanded = expandedTrips.has(vehicle.id);
//                     const routeCoords = vehicle.farmers.map((f) => [f.lat || 0, f.lng || 0]);

//                     // find nearest chilling center as end point
//                     let nearestCenter: CenterSchedule | null = null;
//                     let minDist = Infinity;
//                     if (routeCoords.length > 0) {
//                       const [endLat, endLng] = routeCoords[routeCoords.length - 1];
//                       for (const c of data.clusters) {
//                         const dist = haversine(endLat, endLng, c.lat || 0, c.lng || 0);
//                         if (dist < minDist) {
//                           minDist = dist;
//                           nearestCenter = c;
//                         }
//                       }
//                     }

//                     const fullRoute = [...routeCoords];
//                     if (nearestCenter) fullRoute.push([nearestCenter.lat || 0, nearestCenter.lng || 0]);

//                     return (
// <Droppable droppableId={`${cluster.name}::${vehicle.id}`} key={`${cluster.name}::${vehicle.id}`}>
//                         {(provided) => (
//                           <div
//                             {...provided.droppableProps}
//                             ref={provided.innerRef}
//                             className="bg-white rounded-lg border border-slate-200 mb-6 overflow-hidden"
//                           >
//                             <div
//                               className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center"
//                               onClick={() => {
//                                 const next = new Set(expandedTrips);
//                                 next.has(vehicle.id)
//                                   ? next.delete(vehicle.id)
//                                   : next.add(vehicle.id);
//                                 setExpandedTrips(next);
//                               }}
//                             >
//                               <div className="flex items-center gap-2">
//                                 <Truck className="text-green-600" />
//                                 <span className="font-semibold">
//                                   {/* display vehicle_number (we replaced type earlier) */}
//                                   {vehicle.vehicle_number ?? vehicle.type}{" "}
//                                   <span className="text-slate-500 text-sm font-normal">
//                                     • Vehicle #{vehicle.id.split("-").pop()}
//                                   </span>
//                                 </span>
//                                 <span className="text-slate-600 ml-2">
//                                   {vehicle.farmers.length} stops
//                                 </span>
//                               </div>
//                               <div className="flex items-center gap-4 text-slate-600 text-sm">
//                                 <Ruler className="h-4 w-4 text-blue-500" /> {vehicle.distance} km
//                                 <Timer className="h-4 w-4 text-orange-500" /> {vehicle.travel_time} mins
//                                 <Droplets className="h-4 w-4 text-sky-500" /> {vehicle.total_milk} L
//                                 <Route className="h-4 w-4 text-green-600" /> {vehicle.utilization}% full
//                                 <span className="ml-3 text-slate-500 text-sm">
//                                   🚛 Vehicle #{vehicle.id.split("-").pop()}
//                                 </span>
//                               </div>
//                             </div>

//                             {isTripExpanded && (
//                               <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-4">
//                                 {/* Left: Farmer List */}
//                                 <div>
//                                   {vehicle.farmers.map((farmer, fIdx) => (
//                                     <Draggable key={farmer.id} draggableId={farmer.id} index={fIdx}>
//                                       {(provided) => (
//                                         <div
//                                           ref={provided.innerRef}
//                                           {...provided.draggableProps}
//                                           {...provided.dragHandleProps}
//                                           className="bg-white p-3 mb-2 rounded-lg border flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
//                                         >
//                                           <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold">
//                                             {fIdx + 1}
//                                           </div>
//                                           <div className="flex-1">
//                                             <div className="font-semibold text-slate-900">
//                                               {farmer.name}
//                                             </div>
//                                             <div className="text-sm text-slate-600">
//                                               {farmer.milk_liters} L · {farmer.location}
//                                             </div>
//                                           </div>
//                                           <MapPin className="text-slate-500" />
//                                         </div>
//                                       )}
//                                     </Draggable>
//                                   ))}
//                                   {provided.placeholder}

//                                   {/* Visible Recommendation */}
//                                   {vehicle.utilization && vehicle.utilization < 70 && (
//                                     <div className="mt-3 bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-3 rounded-md text-sm flex items-start gap-2 shadow-sm">
//                                       <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-600" />
//                                       <div>
//                                         <strong>Low Utilization:</strong> This vehicle is only{" "}
//                                         {vehicle.utilization}% full. Consider using a smaller
//                                         vehicle (Auto/Jeeto) for better efficiency.
//                                       </div>
//                                     </div>
//                                   )}
//                                 </div>

//                                 {/* Right: Enlarged Map */}
//                                 <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200 shadow-lg">
//                                   <MapContainer
//                                     center={
//                                       routeCoords.length ? routeCoords[0] : [10.5, 78.1]
//                                     }
//                                     zoom={10}
//                                     style={{ height: "100%", width: "100%" }}
//                                   >
//                                     <TileLayer
//                                       url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                                       attribution="&copy; OpenStreetMap contributors"
//                                     />
//                                     {fullRoute.length > 1 && (
//                                       <Polyline positions={fullRoute} color="blue" weight={3} />
//                                     )}
//                                     {vehicle.farmers.map((f, idx) => (
//                                       <Marker
//                                         key={f.id}
//                                         position={[f.lat || 0, f.lng || 0]}
//                                         icon={farmerIcon(idx + 1)}
//                                       >
//                                         <Popup>
//                                           <strong>{f.name}</strong>
//                                           <br />
//                                           {f.location}
//                                           <br />
//                                           Milk: {f.milk_liters} L
//                                         </Popup>
//                                       </Marker>
//                                     ))}
//                                     {/* Final chilling center marker */}
//                                     {nearestCenter && (
//                                       <Marker
//                                         position={[nearestCenter.lat || 0, nearestCenter.lng || 0]}
//                                         icon={L.divIcon({
//                                           html: `<div style='background-color:#16a34a;color:white;border-radius:50%;font-size:10px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;'>🏭</div>`,
//                                           className: "hub-icon",
//                                         })}
//                                       >
//                                         <Popup>
//                                           <strong>{nearestCenter.name}</strong>
//                                           <br />
//                                           Final chilling centre
//                                         </Popup>
//                                       </Marker>
//                                     )}
//                                   </MapContainer>
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </Droppable>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </DragDropContext>
//     </div>
//   );
// }




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
                                {/* <span className="ml-3 text-slate-500 text-sm">
                                  🚛 Vehicle #{vehicle.id.split("-").pop()}
                                </span> */}
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
