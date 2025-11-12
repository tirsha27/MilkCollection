import React, { useEffect, useState } from "react";
import { OptimizationService } from "../services/optimization.service";

interface OptimizationRun {
  id: string;
  trigger_type: string;
  status: string;
  results_summary: {
    total_clusters?: number;
    timestamp?: string;
    file_saved?: string;
    previous_cost?: number;
    new_cost?: number;
    optimization_percentage?: number;
    time_efficiency?: number;
    capacity_utilization?: number;
    efficiency_score?: number;
    total_cost?: number;
    total_violations?: number;
  };
  created_at?: string;
  completed_at?: string;
}

export default function OptimizationReports() {
  const [machineRuns, setMachineRuns] = useState<OptimizationRun[]>([]);
  const [manualRuns, setManualRuns] = useState<OptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [machineRes, manualRes] = await Promise.all([
          OptimizationService.getRuns(),
          OptimizationService.getManualRuns(),
        ]);
        setMachineRuns(machineRes.data || []);
        setManualRuns(manualRes.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch optimization reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) return <p className="p-6">Loading reports...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Optimization Reports</h1>
      <p className="text-gray-600 mb-8">
        View history of both machine-generated and manual optimization runs with performance metrics.
      </p>

      {/* 🧠 MACHINE OPTIMIZATIONS */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
          🧠 Machine Optimizations
        </h2>

        {machineRuns.length === 0 ? (
          <p className="text-gray-500">No machine optimizations yet.</p>
        ) : (
          <div className="grid gap-6">
            {machineRuns.map((run) => (
              <div
                key={run.id}
                className="p-6 bg-white shadow-lg rounded-2xl border border-gray-200 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between mb-3">
                  <p>
                    <span className="font-medium text-gray-600">Status: </span>
                    <span
                      className={`font-semibold ${
                        run.status === "completed" ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {run.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Metric label="Optimization %" value={run.results_summary?.optimization_percentage} suffix="%" />
                  <Metric label="Efficiency Score" value={run.results_summary?.efficiency_score} />
                  <Metric label="Total Clusters" value={run.results_summary?.total_clusters} />
                  <Metric label="Total Cost" value={run.results_summary?.total_cost} prefix="₹" />
                  <Metric label="Total Violations" value={run.results_summary?.total_violations} />
                  <Metric label="Timestamp" value={formatTimestamp(run.results_summary?.timestamp)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 🖐️ MANUAL OPTIMIZATIONS */}
      <section>
        <h2 className="text-2xl font-semibold text-green-700 mb-4 flex items-center">
          🖐️ Manual Optimizations
        </h2>

        {manualRuns.length === 0 ? (
          <p className="text-gray-500">No manual updates recorded.</p>
        ) : (
          <div className="grid gap-6">
            {manualRuns.map((run) => (
              <div
                key={run.id}
                className="p-6 bg-white shadow-lg rounded-2xl border border-gray-200 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between mb-3">
                  <p>
                    <span className="font-medium text-gray-600">Status: </span>
                    <span
                      className={`font-semibold ${
                        run.status === "completed" ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {run.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Metric label="Optimization %" value={run.results_summary?.optimization_percentage} suffix="%" />
                  <Metric label="Efficiency Score" value={run.results_summary?.efficiency_score} />
                  <Metric label="Capacity Utilization" value={run.results_summary?.capacity_utilization} suffix="%" />
                  <Metric label="Time Efficiency" value={run.results_summary?.time_efficiency} suffix="%" />
                  <Metric label="Previous Cost" value={run.results_summary?.previous_cost} prefix="₹" />
                  <Metric label="Distance Efficiency" value={run.results_summary?.distance_efficiency} suffix="%" />
                  <Metric label="Distance Saved" value={run.results_summary?.distance_saving} suffix=" km" />
                  <Metric label="Cost Saved" value={run.results_summary?.cost_saving} prefix="₹" />
                  <Metric label="Time Saved" value={run.results_summary?.time_saving} suffix=" min" />

                  <Metric label="New Cost" value={run.results_summary?.new_cost} prefix="₹" />
                </div>

                {run.results_summary?.file_saved && (
                  <p className="text-xs text-gray-400 mt-3 italic">
                    Saved file: {run.results_summary.file_saved}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* 🌟 Reusable Metric Component */
function Metric({
  label,
  value,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value?: number | string | null;
  prefix?: string;
  suffix?: string;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "N/A"
      : `${prefix}${value}${suffix}`;
  return (
    <div className="p-3 rounded-lg bg-gray-50 border text-gray-700 flex justify-between">
      <span className="font-medium">{label}</span>
      <span className="font-semibold text-gray-900">{display}</span>
    </div>
  );
}

/* 🌟 Helper to format ISO timestamps */
function formatTimestamp(ts?: string) {
  if (!ts) return "N/A";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}
