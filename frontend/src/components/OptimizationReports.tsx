// import React, { useEffect, useState } from "react";
// import { OptimizationService } from "../services/optimization.service";

// interface OptimizationRun {
//   id: string;
//   trigger_type: string;
//   status: string;
//   results_summary: {
//     total_clusters?: number;
//     timestamp?: string;
//     file_saved?: string;
//     previous_cost?: number;
//     new_cost?: number;
//     optimization_percentage?: number;
//     time_efficiency?: number;
//     capacity_utilization?: number;
//     efficiency_score?: number;
//     total_cost?: number;
//     total_violations?: number;
//     distance_efficiency?: number;
//     distance_saving?: number;
//     cost_saving?: number;
//     time_saving?: number;
//   };
//   created_at?: string;
//   completed_at?: string;
// }

// export default function OptimizationReports() {
//   const [machineRuns, setMachineRuns] = useState<OptimizationRun[]>([]);
//   const [manualRuns, setManualRuns] = useState<OptimizationRun[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function loadReports() {
//       try {
//         setLoading(true);
//         const [machineRes, manualRes] = await Promise.all([
//           OptimizationService.getRuns(),
//           OptimizationService.getManualRuns(),
//         ]);
//         setMachineRuns(machineRes.data || []);
//         setManualRuns(manualRes.data || []);
//       } catch (err) {
//         console.error(err);
//         setError("Failed to fetch optimization reports.");
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadReports();
//   }, []);

//   if (loading) return <p className="p-6">Loading reports...</p>;
//   if (error) return <p className="p-6 text-red-500">{error}</p>;

//   return (
//     <div className="p-6">
//       <h1 className="text-3xl font-bold mb-2 text-gray-800">Optimization Reports</h1>
//       <p className="text-gray-600 mb-8">
//         View summary of machine and manual optimization runs.
//       </p>

//       {/* MACHINE OPTIMIZATIONS */}
//       <section className="mb-10">
//         <h2 className="text-2xl font-semibold text-blue-700 mb-4">🧠 Machine Optimizations</h2>

//         {machineRuns.length === 0 ? (
//           <p className="text-gray-500">No machine optimizations yet.</p>
//         ) : (
//           <div className="space-y-6">
//             {machineRuns.map((run) => (
//               <div
//                 key={run.id}
//                 className="p-6 bg-white shadow rounded-xl border border-gray-200"
//               >
//                 <div className="flex justify-between mb-4">
//                   <p>
//                     <span className="font-medium text-gray-600">Status: </span>
//                     <span
//                       className={
//                         run.status === "completed"
//                           ? "text-green-600 font-semibold"
//                           : "text-yellow-600 font-semibold"
//                       }
//                     >
//                       {run.status}
//                     </span>
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     {run.created_at
//                       ? new Date(run.created_at).toLocaleString()
//                       : "N/A"}
//                   </p>
//                 </div>

//                 {/* TEXT SUMMARY */}
//                 <p className="text-gray-700 leading-relaxed">
//                   <strong>Optimization Summary:</strong>{" "}
//                   The optimization achieved{" "}
//                   <strong>
//                     {run.results_summary?.optimization_percentage ?? "N/A"}%
//                   </strong>{" "}
//                   improvement with an efficiency score of{" "}
//                   <strong>{run.results_summary?.efficiency_score ?? "N/A"}</strong>.
//                   A total of{" "}
//                   <strong>{run.results_summary?.total_clusters ?? "N/A"} clusters</strong>{" "}
//                   were processed with{" "}
//                   <strong>{run.results_summary?.total_violations ?? 0} violations</strong>.
//                   The total operational cost recorded was{" "}
//                   <strong>₹{run.results_summary?.total_cost ?? "N/A"}</strong>.
//                 </p>

//                 {run.results_summary?.file_saved && (
//                   <p className="text-xs text-gray-400 mt-3 italic">
//                     File saved as: {run.results_summary.file_saved}
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* MANUAL OPTIMIZATIONS */}
//       <section>
//         <h2 className="text-2xl font-semibold text-green-700 mb-4">🖐️ Manual Optimizations</h2>

//         {manualRuns.length === 0 ? (
//           <p className="text-gray-500">No manual updates yet.</p>
//         ) : (
//           <div className="space-y-6">
//             {manualRuns.map((run) => (
//               <div
//                 key={run.id}
//                 className="p-6 bg-white shadow rounded-xl border border-gray-200"
//               >
//                 <div className="flex justify-between mb-4">
//                   <p>
//                     <span className="font-medium text-gray-600">Status: </span>
//                     <span
//                       className={
//                         run.status === "completed"
//                           ? "text-green-600 font-semibold"
//                           : "text-yellow-600 font-semibold"
//                       }
//                     >
//                       {run.status}
//                     </span>
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     {run.created_at
//                       ? new Date(run.created_at).toLocaleString()
//                       : "N/A"}
//                   </p>
//                 </div>

//                 {/* TEXT SUMMARY */}
//                 <p className="text-gray-700 leading-relaxed">
//                   <strong>Manual Optimization Summary:</strong>{" "}
//                   Previous cost was{" "}
//                   <strong>₹{run.results_summary?.previous_cost ?? "N/A"}</strong>{" "}
//                   which was reduced to{" "}
//                   <strong>₹{run.results_summary?.new_cost ?? "N/A"}</strong>.  
//                   Cost savings amounted to{" "}
//                   <strong>₹{run.results_summary?.cost_saving ?? 0}</strong>{" "}
//                   while distance reduced by{" "}
//                   <strong>{run.results_summary?.distance_saving ?? 0} km</strong>.  
//                   Time savings achieved were{" "}
//                   <strong>{run.results_summary?.time_saving ?? 0} min</strong>.  
//                   Capacity utilization improved to{" "}
//                   <strong>
//                     {run.results_summary?.capacity_utilization ?? "N/A"}%
//                   </strong>{" "}
//                   with time efficiency reaching{" "}
//                   <strong>{run.results_summary?.time_efficiency ?? "N/A"}%</strong>.
//                 </p>

//                 {run.results_summary?.file_saved && (
//                   <p className="text-xs text-gray-400 mt-3 italic">
//                     File saved as: {run.results_summary.file_saved}
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }




// import React, { useEffect, useState } from "react";

// interface OptimizationRun {
//   id: string;
//   trigger_type: string;
//   status: string;
//   results_summary: {
//     total_clusters?: number;
//     timestamp?: string;
//     file_saved?: string;
//     previous_cost?: number;
//     new_cost?: number;
//     optimization_percentage?: number;
//     time_efficiency?: number;
//     capacity_utilization?: number;
//     efficiency_score?: number;
//     total_cost?: number;
//     total_violations?: number;
//     distance_efficiency?: number;
//     distance_saving?: number;
//     cost_saving?: number;
//     time_saving?: number;
//   };
//   created_at?: string;
//   completed_at?: string;
// }

// // Utility to generate a random integer between [min, max]
// const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// // Utility to generate a random float between [min, max] with fixed decimals
// const randFloat = (min: number, max: number, decimals = 2) =>
//   parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// export default function OptimizationReports() {
//   const [machineRuns, setMachineRuns] = useState<OptimizationRun[]>([]);
//   const [manualRuns, setManualRuns] = useState<OptimizationRun[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     // Generate random dummy data for machine runs
//     const generateMachineRuns = (): OptimizationRun[] => {
//       return Array.from({ length: 5 }).map((_, i) => {
//         const totalClusters = randInt(5, 20);
//         const totalViolations = randInt(0, 5);
//         const optimizationPerc = randFloat(5, 25);
//         const efficiencyScore = randFloat(70, 95);
//         const totalCost = randInt(50000, 100000);
//         return {
//           id: `machine-${i + 1}`,
//           trigger_type: "auto",
//           status: Math.random() > 0.2 ? "completed" : "running",
//           results_summary: {
//             total_clusters: totalClusters,
//             optimization_percentage: optimizationPerc,
//             efficiency_score: efficiencyScore,
//             total_violations: totalViolations,
//             total_cost: totalCost,
//             file_saved: `optimization_run_${i + 1}.json`,
//           },
//           created_at: new Date(Date.now() - i * 3600 * 1000).toISOString(),
//         };
//       });
//     };

//     // Generate random dummy data for manual runs
//     const generateManualRuns = (): OptimizationRun[] => {
//       return Array.from({ length: 3 }).map((_, i) => {
//         const previousCost = randInt(60000, 90000);
//         const costSaving = randInt(2000, 10000);
//         const newCost = previousCost - costSaving;
//         const distSaving = randInt(10, 50);
//         const timeSaving = randInt(30, 120);
//         const capacityUtil = randFloat(60, 90);
//         const timeEfficiency = randFloat(70, 95);
//         return {
//           id: `manual-${i + 1}`,
//           trigger_type: "manual",
//           status: Math.random() > 0.1 ? "completed" : "running",
//           results_summary: {
//             previous_cost: previousCost,
//             new_cost: newCost,
//             cost_saving: costSaving,
//             distance_saving: distSaving,
//             time_saving: timeSaving,
//             capacity_utilization: capacityUtil,
//             time_efficiency: timeEfficiency,
//             file_saved: `manual_optimization_${i + 1}.json`,
//           },
//           created_at: new Date(Date.now() - i * 7200 * 1000).toISOString(),
//         };
//       });
//     };

//     setLoading(true);
//     setError(null);

//     // Simulate async fetch delay
//     setTimeout(() => {
//       try {
//         setMachineRuns(generateMachineRuns());
//         setManualRuns(generateManualRuns());
//       } catch (e) {
//         setError("Failed to generate dummy reports.");
//       } finally {
//         setLoading(false);
//       }
//     }, 1000);
//   }, []);

//   if (loading) return <p className="p-6">Loading reports...</p>;
//   if (error) return <p className="p-6 text-red-500">{error}</p>;

//   return (
//     <div className="p-6">
//       <h1 className="text-3xl font-bold mb-2 text-gray-800">Optimization Reports</h1>
//       <p className="text-gray-600 mb-8">
//         View summary of machine and manual optimization runs.
//       </p>

//       {/* MACHINE OPTIMIZATIONS */}
//       <section className="mb-10">
//         <h2 className="text-2xl font-semibold text-blue-700 mb-4">🧠 Machine Optimizations</h2>

//         {machineRuns.length === 0 ? (
//           <p className="text-gray-500">No machine optimizations yet.</p>
//         ) : (
//           <div className="space-y-6">
//             {machineRuns.map((run) => (
//               <div
//                 key={run.id}
//                 className="p-6 bg-white shadow rounded-xl border border-gray-200"
//               >
//                 <div className="flex justify-between mb-4">
//                   <p>
//                     <span className="font-medium text-gray-600">Status: </span>
//                     <span
//                       className={
//                         run.status === "completed"
//                           ? "text-green-600 font-semibold"
//                           : "text-yellow-600 font-semibold"
//                       }
//                     >
//                       {run.status}
//                     </span>
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     {run.created_at
//                       ? new Date(run.created_at).toLocaleString()
//                       : "N/A"}
//                   </p>
//                 </div>

//                 {/* TEXT SUMMARY */}
//                 <p className="text-gray-700 leading-relaxed">
//                   <strong>Optimization Summary:</strong>{" "}
//                   The optimization achieved{" "}
//                   <strong>
//                     {run.results_summary?.optimization_percentage ?? "N/A"}%
//                   </strong>{" "}
//                   improvement with an efficiency score of{" "}
//                   <strong>{run.results_summary?.efficiency_score ?? "N/A"}</strong>.
//                   A total of{" "}
//                   <strong>{run.results_summary?.total_clusters ?? "N/A"} clusters</strong>{" "}
//                   were processed with{" "}
//                   <strong>{run.results_summary?.total_violations ?? 0} violations</strong>.
//                   The total operational cost recorded was{" "}
//                   <strong>₹{run.results_summary?.total_cost ?? "N/A"}</strong>.
//                 </p>

//                 {run.results_summary?.file_saved && (
//                   <p className="text-xs text-gray-400 mt-3 italic">
//                     File saved as: {run.results_summary.file_saved}
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       {/* MANUAL OPTIMIZATIONS */}
//       <section>
//         <h2 className="text-2xl font-semibold text-green-700 mb-4">🖐️ Manual Optimizations</h2>

//         {manualRuns.length === 0 ? (
//           <p className="text-gray-500">No manual updates yet.</p>
//         ) : (
//           <div className="space-y-6">
//             {manualRuns.map((run) => (
//               <div
//                 key={run.id}
//                 className="p-6 bg-white shadow rounded-xl border border-gray-200"
//               >
//                 <div className="flex justify-between mb-4">
//                   <p>
//                     <span className="font-medium text-gray-600">Status: </span>
//                     <span
//                       className={
//                         run.status === "completed"
//                           ? "text-green-600 font-semibold"
//                           : "text-yellow-600 font-semibold"
//                       }
//                     >
//                       {run.status}
//                     </span>
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     {run.created_at
//                       ? new Date(run.created_at).toLocaleString()
//                       : "N/A"}
//                   </p>
//                 </div>

//                 {/* TEXT SUMMARY */}
//                 <p className="text-gray-700 leading-relaxed">
//                   <strong>Manual Optimization Summary:</strong>{" "}
//                   Previous cost was{" "}
//                   <strong>₹{run.results_summary?.previous_cost ?? "N/A"}</strong>{" "}
//                   which was reduced to{" "}
//                   <strong>₹{run.results_summary?.new_cost ?? "N/A"}</strong>.  
//                   Cost savings amounted to{" "}
//                   <strong>₹{run.results_summary?.cost_saving ?? 0}</strong>{" "}
//                   while distance reduced by{" "}
//                   <strong>{run.results_summary?.distance_saving ?? 0} km</strong>.  
//                   Time savings achieved were{" "}
//                   <strong>{run.results_summary?.time_saving ?? 0} min</strong>.  
//                   Capacity utilization improved to{" "}
//                   <strong>
//                     {run.results_summary?.capacity_utilization ?? "N/A"}%
//                   </strong>{" "}
//                   with time efficiency reaching{" "}
//                   <strong>{run.results_summary?.time_efficiency ?? "N/A"}%</strong>.
//                 </p>

//                 {run.results_summary?.file_saved && (
//                   <p className="text-xs text-gray-400 mt-3 italic">
//                     File saved as: {run.results_summary.file_saved}
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </section>
//     </div>
//   );
// }

// domain/frontend/src/components/OptimizationReports.tsx

// domain/frontend/src/components/OptimizationReports.tsx
import React, { useEffect, useState } from "react";

interface OptimizationRun {
  id: string;
  trigger_type: string; // "auto" | "manual"
  status: string;
  results_summary: {
    before_distance?: number;
    after_distance?: number;
    vehicle_utilization_opt?: string;
    before_vehicle_counts?: string;
    after_vehicle_counts?: string;
    insights?: string;
    file_saved?: string;
    previous_cost?: number;
    new_cost?: number;
    cost_saving?: number;
    distance_saving?: number;
    time_saving?: number;
    capacity_utilization?: number;
    time_efficiency?: number;
    // optional fields that might indicate an override relationship
    overridden_machine_id?: string;
    override_reason?: string; // optional explicit reason
  };
  created_at?: string;
}

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

export default function OptimizationReports() {
  const [machineRuns, setMachineRuns] = useState<OptimizationRun[]>([]);
  const [manualRuns, setManualRuns] = useState<OptimizationRun[]>([]);
  const [mergedRuns, setMergedRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Dummy data generators (kept similar to your original)
    const generateDummyMachineRuns = (): OptimizationRun[] =>
      Array.from({ length: 3 }).map((_, i) => ({
        id: `MO#D0000-${i + 1}`,
        trigger_type: "auto",
        status: "completed",
        created_at: new Date(Date.now() - i * 8600000).toISOString(), // spaced out
        results_summary: {
          before_distance: randInt(1100, 1300),
          after_distance: randInt(800, 1050),
          vehicle_utilization_opt: `${randInt(10, 25)}%`,
          before_vehicle_counts: "Viralimalai: 5 Vehicles, Melur: 5 vehicles",
          after_vehicle_counts: "Viralimalai: 3 Vehicles, Melur: 4 vehicles",
          insights:
            "Thuvarankuruchi, Viralimalai, Ponnamaravathi are collecting very low capacity of milk",
          file_saved: `optimization_run_${i + 1}.json`,
        },
      }));

    const generateDummyManualRuns = (): OptimizationRun[] =>
      Array.from({ length: 3 }).map((_, i) => ({
        id: `MP#D0000-${i + 1}`,
        trigger_type: "manual",
        status: "completed",
        created_at: new Date(Date.now() - i * 7200000 - 1800000).toISOString(), // slight offset
        results_summary: {
          previous_cost: randInt(10, 100),
          new_cost: randInt(10, 100),
          cost_saving: randInt(10, 100),
          distance_saving: randInt(10, 50),
          time_saving: randInt(30, 120),
          capacity_utilization: randFloat(60, 90),
          time_efficiency: randFloat(70, 95),
          file_saved: `manual_override_${i + 1}.json`,
          insights: i === 0
            ? "Override to free vehicle TN13ST7896 and route farmers to Alternate  vehicles for KM efficiency."
            : "Manual override to reduce distance and consolidate loads.",
          // simulate link to machine run occasionally
          overridden_machine_id: i === 0 ? "MO#D0000-1" : undefined,
        },
      }));

    setLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        const machines = generateDummyMachineRuns();
        const manuals = generateDummyManualRuns();
        setMachineRuns(machines);
        setManualRuns(manuals);

        // merge + sort by created_at descending (newest first)
        const merged = [...machines, ...manuals].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        setMergedRuns(merged);
      } catch (e) {
        setError("Failed to generate dummy reports.");
      } finally {
        setLoading(false);
      }
    }, 700);
  }, []);

  // keep expand toggle
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // helper formatters -> return empty string when missing
  const formatBefore = (run: OptimizationRun) => {
    if (run.trigger_type === "auto" || run.trigger_type === "machine") {
      return run.results_summary?.before_distance !== undefined ? `${run.results_summary.before_distance} km` : "";
    }
    // manual
    return run.results_summary?.previous_cost !== undefined ? `${run.results_summary.previous_cost}KM` : "";
  };
  const formatAfter = (run: OptimizationRun) => {
    if (run.trigger_type === "auto" || run.trigger_type === "machine") {
      return run.results_summary?.after_distance !== undefined ? `${run.results_summary.after_distance} km` : "";
    }
    // manual
    return run.results_summary?.new_cost !== undefined ? `${run.results_summary.new_cost}` : "";
  };

  /**
   * inferOverrideReason:
   * - If explicit override_reason is present, use it.
   * - Else check cost_saving/distance_saving/time_saving to deduce reason.
   * - Else try to extract meaningful short reason from insights (keyword match).
   * - Returns empty string for machine runs.
   */
  const inferOverrideReason = (run: OptimizationRun): string => {
    if (run.trigger_type !== "manual") return "";

    const rs = run.results_summary ?? ({} as any);

    if (rs.override_reason) return rs.override_reason;

    if (rs.cost_saving && Number(rs.cost_saving) > 0) {
      return `Vehicle Reduced — 1`;
    }
    if (rs.distance_saving && Number(rs.distance_saving) > 0) {
      return `Distance reduction — ${rs.distance_saving} km`;
    }
    if (rs.time_saving && Number(rs.time_saving) > 0) {
      return `Time reduction — ${rs.time_saving} min`;
    }

    // fallback: keyword scan from insights
    const insight = (rs.insights || "").toLowerCase();
    if (insight.includes("free") && insight.includes("vehicle")) return "Free vehicle (reassigned / removed)";
    if (insight.includes("cost")) return "Manual cost optimization";
    if (insight.includes("distance")) return "Manual distance optimization";
    if (insight.includes("consolidat") || insight.includes("consolidate")) return "Consolidation / load balancing";

    // last fallback: use a short trimmed portion of insights if present
    if (rs.insights && String(rs.insights).trim().length > 0) {
      const s = String(rs.insights).trim();
      return s.length > 60 ? s.slice(0, 60) + "…" : s;
    }

    return ""; // nothing inferred
  };

  // sample diffs (kept for display at bottom) — adapt if you want
  const machineSample = machineRuns[0];
  const manualSample = manualRuns[0];

  const diffDistance =
    (machineSample?.results_summary.after_distance ?? 0) - (manualSample?.results_summary?.distance_saving ?? 0);
  const diffCost =
    (manualSample?.results_summary?.new_cost ?? 0) - (manualSample?.results_summary?.previous_cost ?? 0);

  if (loading) return <p className="p-6">Loading reports...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Optimization Reports</h1>
          <p className="text-sm text-slate-600 mt-1">Merged view — machine & manual runs, sorted by timestamp.</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-blue-500" />
            <span className="text-sm text-slate-700">Machine</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-green-600" />
            <span className="text-sm text-slate-700">Manual (Override)</span>
          </div>
        </div>
      </header>

      {/* Combined table with Before / After / Override Reason columns */}
      <section className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Before</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">After</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Override Reason</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Timestamp</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {mergedRuns.map((run) => {
              const isMachine = run.trigger_type === "auto" || run.trigger_type === "machine";
              const isManual = run.trigger_type === "manual";
              const isExpanded = expandedIds.has(run.id);

              // row background for color difference (subtle)
              const rowAccent = isMachine ? "bg-gradient-to-r from-white to-blue-50" : "bg-gradient-to-r from-white to-green-50";

              const overrideReason = inferOverrideReason(run);

              return (
                <React.Fragment key={run.id}>
                  <tr className={`${isExpanded ? "bg-slate-50" : ""} hover:bg-slate-50 ${rowAccent}`}>
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-slate-900">{run.id}</div>
                      <div className="text-xs text-slate-500 mt-1">Status: {run.status}</div>
                      {isManual && run.results_summary?.overridden_machine_id && (
                        <div className="text-xs mt-1 text-slate-500">
                          Overrides: <span className="font-medium text-slate-700">{run.results_summary.overridden_machine_id}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${isMachine ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                        {isMachine ? "Machine Optimization" : "Manual Override"}
                      </span>
                    </td>

                    <td className="px-6 py-4 align-top text-slate-700">
                      <div className="text-sm">{formatBefore(run)}</div>
                    </td>

                    <td className="px-6 py-4 align-top text-slate-700">
                      <div className="text-sm">{formatAfter(run)}</div>
                    </td>

                    <td className="px-6 py-4 align-top">
                      {isManual && overrideReason ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                            Override
                          </span>
                          <span className="text-sm text-slate-700">{overrideReason}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">{/* empty for machines */}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top text-slate-600">
                      {run.created_at ? new Date(run.created_at).toLocaleString() : ""}
                    </td>

                    <td className="px-6 py-4 text-right align-top">
                      <button
                        onClick={() => toggleExpand(run.id)}
                        className={`text-sm font-medium ${isMachine ? "text-blue-600" : "text-green-600"} hover:underline`}
                      >
                        {isExpanded ? "Hide Insights" : "View Insights"}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className={`${isMachine ? "bg-blue-50" : "bg-green-50"}`}>
                      <td colSpan={7} className="px-6 py-4">
                        {/* Insights content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            {isMachine ? (
                              <>
                                <p><strong>Before Distance:</strong> {run.results_summary?.before_distance !== undefined ? `${run.results_summary.before_distance} km` : ""}</p>
                                <p><strong>After Distance:</strong> {run.results_summary?.after_distance !== undefined ? `${run.results_summary.after_distance} km` : ""}</p>
                                <p><strong>Utilization Optim:</strong> {run.results_summary?.vehicle_utilization_opt ?? ""}</p>
                                <p><strong>Vehicle counts (before):</strong> {run.results_summary?.before_vehicle_counts ?? ""}</p>
                                <p><strong>Vehicle counts (after):</strong> {run.results_summary?.after_vehicle_counts ?? ""}</p>
                              </>
                            ) : (
                              <>
                                
                              </>
                            )}
                          </div>

                          <div>
                            <p><strong>Capacity Utilization:</strong> {run.results_summary?.capacity_utilization !== undefined ? `${run.results_summary.capacity_utilization}%` : ""}</p>
                            <p><strong>Time Efficiency:</strong> {run.results_summary?.time_efficiency !== undefined ? `${run.results_summary.time_efficiency}%` : ""}</p>
                            <p className="mt-3"><strong>Insights:</strong></p>
                            <p className="text-sm text-slate-700">{run.results_summary?.insights ?? ""}</p>

                            {isManual && run.results_summary?.overridden_machine_id && (
                              <p className="mt-3 text-xs text-slate-600">
                                This manual override references machine run <strong>{run.results_summary.overridden_machine_id}</strong>.
                              </p>
                            )}

                            <p className="italic text-xs mt-3">File: {run.results_summary?.file_saved ?? ""}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Optional: Comparison block if you still want it */}
      {/* {machineSample && manualSample && (
        <section className="mb-12 p-6 bg-yellow-50 rounded-md border border-yellow-300 shadow-inner max-w-3xl">
          <h2 className="text-xl font-bold mb-4 text-yellow-900">Comparison Between Machine and Manual Optimizations</h2>
          <p>
            <strong>Distance After Machine Optimization:</strong> {machineSample.results_summary.after_distance ?? 0} km
          </p>
          <p>
            <strong>Distance Saved by Manual Optimization:</strong> {manualSample.results_summary.distance_saving ?? 0} km
          </p>
          <p>
            <strong>Net difference (Machine after - Manual savings):</strong>{" "}
            <span className={diffDistance >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {diffDistance.toFixed(2)} km
            </span>
          </p>
          <p>
            <strong>Manual Optimization Cost Change:</strong>{" "}
            <span className={diffCost <= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {diffCost > 0 ? `+₹${diffCost}` : `₹${diffCost}`}
            </span>
          </p>
        </section>
      )} */}
    </div>
  );
}
