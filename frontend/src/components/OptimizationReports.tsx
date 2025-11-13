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

import React, { useEffect, useState } from "react";

interface OptimizationRun {
  id: string;
  trigger_type: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Generate machine and manual runs (dummy data similar to previous examples)
    // ... omitted here for brevity; assume same as your previous implementation

    const generateDummyMachineRuns = (): OptimizationRun[] =>
      Array.from({ length: 3 }).map((_, i) => ({
        id: `MO#D0000-${i + 1}`,
        trigger_type: "auto",
        status: "completed",
        created_at: new Date(Date.now() - i * 8600000).toISOString(),
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
        created_at: new Date(Date.now() - i * 7200000).toISOString(),
        results_summary: {
          previous_cost: randInt(60000, 90000),
          new_cost: randInt(50000, 70000),
          cost_saving: randInt(2000, 10000),
          distance_saving: randInt(10, 50),
          time_saving: randInt(30, 120),
          capacity_utilization: randFloat(60, 90),
          time_efficiency: randFloat(70, 95),
          file_saved: `manual_optimization_${i + 1}.json`,
          insights: "Manual optimization improved cost efficiency significantly.",
        },
      }));

    setLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        setMachineRuns(generateDummyMachineRuns());
        setManualRuns(generateDummyManualRuns());
      } catch {
        setError("Failed to generate dummy reports.");
      } finally {
        setLoading(false);
      }
    }, 700);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Example difference calculation for demonstration (only sums first runs for clarity)
  const machineSample = machineRuns[0];
  const manualSample = manualRuns[0];

  const diffDistance =
    (machineSample?.results_summary.after_distance ?? 0) - (manualSample?.results_summary?.distance_saving ?? 0);
  const diffCost =
    (manualSample?.results_summary?.new_cost ?? 0) - (manualSample?.results_summary?.previous_cost ?? 0);

  if (loading) return <p className="p-6">Loading reports...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-16">
      <h1 className="text-3xl font-bold text-gray-800">Optimization Reports</h1>



      {/* Machine Optimizations Table */}
      <section>
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">🧠 Machine Optimizations</h2>

        <table className="min-w-full border-collapse bg-white text-left shadow-md rounded-md overflow-hidden">
          <thead className="bg-blue-100 border-b border-blue-300">
            <tr>
              <th className="px-6 py-3 font-semibold text-blue-800 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 font-semibold text-blue-800 uppercase tracking-wider">Before Distance (km)</th>
              <th className="px-6 py-3 font-semibold text-blue-800 uppercase tracking-wider">After Distance (km)</th>
              <th className="px-6 py-3 font-semibold text-blue-800 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {machineRuns.map((run) => {
              const isExpanded = expandedIds.has(run.id);
              return (
                <React.Fragment key={run.id}>
                  <tr className={`border-b border-blue-200 hover:bg-blue-50 cursor-pointer ${isExpanded ? "bg-blue-50" : ""}`}>
                    <td className="px-6 py-4 font-medium text-blue-900">{run.id}</td>
                    <td className="px-6 py-4">{run.results_summary?.before_distance ?? "-"}</td>
                    <td className="px-6 py-4">{run.results_summary?.after_distance ?? "-"}</td>
                    <td className="px-6 py-4 text-blue-700">{run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => toggleExpand(run.id)}
                      >
                        {isExpanded ? "Hide Insights" : "View Insights"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-50">
                      <td colSpan={5} className="px-6 py-4 text-blue-900">
                        <p><strong>Vehicle Utilization Optimization:</strong> {run.results_summary?.vehicle_utilization_opt ?? "N/A"}</p>
                        <p><strong>Vehicle Counts Before:</strong> {run.results_summary?.before_vehicle_counts ?? "N/A"}</p>
                        <p><strong>Vehicle Counts After:</strong> {run.results_summary?.after_vehicle_counts ?? "N/A"}</p>
                        <p><strong>Insights:</strong> {run.results_summary?.insights ?? "No insights available."}</p>
                        <p className="italic text-sm mt-2">File: {run.results_summary?.file_saved ?? "N/A"}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Manual Optimizations Table */}
      <section>
        <h2 className="text-2xl font-semibold text-green-700 mb-6">🖐️ Manual Optimizations</h2>

        <table className="min-w-full border-collapse bg-white text-left shadow-md rounded-md overflow-hidden">
          <thead className="bg-green-100 border-b border-green-300">
            <tr>
              <th className="px-6 py-3 font-semibold text-green-800 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 font-semibold text-green-800 uppercase tracking-wider">Previous Cost (₹)</th>
              <th className="px-6 py-3 font-semibold text-green-800 uppercase tracking-wider">New Cost (₹)</th>
              <th className="px-6 py-3 font-semibold text-green-800 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {manualRuns.map((run) => {
              const isExpanded = expandedIds.has(run.id);
              return (
                <React.Fragment key={run.id}>
                  <tr className={`border-b border-green-200 hover:bg-green-50 cursor-pointer ${isExpanded ? "bg-green-50" : ""}`}>
                    <td className="px-6 py-4 font-medium text-green-900">{run.id}</td>
                    <td className="px-6 py-4">{run.results_summary?.previous_cost ?? "-"}</td>
                    <td className="px-6 py-4">{run.results_summary?.new_cost ?? "-"}</td>
                    <td className="px-6 py-4 text-green-700">{run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => toggleExpand(run.id)}
                      >
                        {isExpanded ? "Hide Insights" : "View Insights"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-green-50">
                      <td colSpan={5} className="px-6 py-4 text-green-900">
                        <p><strong>Cost Savings:</strong> ₹{run.results_summary?.cost_saving ?? "N/A"}</p>
                        <p><strong>Distance Reduced:</strong> {run.results_summary?.distance_saving ?? "N/A"} km</p>
                        <p><strong>Time Savings:</strong> {run.results_summary?.time_saving ?? "N/A"} min</p>
                        <p><strong>Capacity Utilization:</strong> {run.results_summary?.capacity_utilization ?? "N/A"}%</p>
                        <p><strong>Time Efficiency:</strong> {run.results_summary?.time_efficiency ?? "N/A"}%</p>
                        <p><strong>Insights:</strong> {run.results_summary?.insights ?? "No insights available."}</p>
                        <p className="italic text-sm mt-2">File: {run.results_summary?.file_saved ?? "N/A"}</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
            {/* Difference summary */}
      {machineSample && manualSample && (
        <section className="mb-12 p-6 bg-yellow-50 rounded-md border border-yellow-300 shadow-inner max-w-3xl">
          <h2 className="text-xl font-bold mb-4 text-yellow-900">Comparison Between Machine and Manual Optimizations</h2>
          <p>
            <strong>Distance After Machine Optimization:</strong> {machineSample.results_summary.after_distance} km
          </p>
          <p>
            <strong>Distance Saved by Manual Optimization:</strong> {manualSample.results_summary.distance_saving} km
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
      )}
    </div>
  );
}
