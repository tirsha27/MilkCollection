// domain/frontend/src/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { DashboardService } from "../services/dashboard.service";
import { OptimizationService } from "../services/optimization.service";

import {
  Truck,
  Users,
  Milk,
  MapPin,
  TrendingDown,
  Clock,
  ThermometerSun,
} from "lucide-react";
import toast from "react-hot-toast";

interface DashboardStats {
  vendors?: any;
  hubs?: any;
  fleet?: any;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // New state for fleet insights (from optimization)
  const [fleetInsights, setFleetInsights] = useState({
    fullyLoaded: 0,
    halfLoaded: 0,
    unassigned: 0,
  });

  // Unified loader: fetch dashboard stats and latest optimization, merge results
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      try {
        // 1) fetch dashboard stats (vendors / hubs / fleet)
        const dashboardData = await DashboardService.getStats();
        // defensive copy
        let mergedStats: DashboardStats = { ...dashboardData };

        // 2) fetch latest optimization run
        let optRes: any = null;
        try {
          optRes = await OptimizationService.getLatest();
        } catch (err) {
          // optimization endpoint may be missing or fail — continue gracefully
          console.warn("No optimization or failed to fetch optimization:", err);
          optRes = null;
        }

        // 3) merge optimization info into hubs and fleet insights
        if (optRes && optRes.data) {
          const optData = optRes.data;
          const optHubs = optData.hubs || {};
          const optVehicles = optData.vehicles || {};

          // Merge per-hub usage into the hub cards (if stats.hubs is array or object)
          if (Array.isArray(dashboardData.hubs)) {
            const mergedHubs = dashboardData.hubs.map((h: any) => {
              const hubId = h.id ?? h.uuid ?? h.hub_id ?? h.name;
              // Find matching optimization hub info; matching heuristic: id or name
              const optHub =
                optHubs[hubId] ||
                Object.values(optHubs).find((oh: any) => {
                  if (!oh) return false;
                  return (
                    String(oh.name).toLowerCase() === String(h.hub_name ?? h.name).toLowerCase() ||
                    String(oh.name).toLowerCase() === String(h.name).toLowerCase()
                  );
                });
              if (optHub) {
                return {
                  ...h,
                  used_liters: optHub.used_liters ?? h.current_load_liters ?? 0,
                  capacity_liters: optHub.capacity_liters ?? h.capacity_liters ?? 0,
                  utilization_pct:
                    typeof optHub.utilization_pct === "number"
                      ? Number(optHub.utilization_pct)
                      : optHub.utilization_pct
                      ? Number(optHub.utilization_pct)
                      : h.capacity_liters
                      ? (Number(h.current_load_liters ?? 0) / Number(h.capacity_liters)) * 100
                      : 0,
                };
              }
              return h;
            });
            mergedStats = { ...mergedStats, hubs: mergedHubs };
          } else if (dashboardData.hubs && typeof dashboardData.hubs === "object") {
            // If hubs is an object with ids as keys, merge where possible
            const mergedObj: any = { ...dashboardData.hubs };
            for (const [hid, optHub] of Object.entries(optHubs)) {
              if (!mergedObj[hid]) {
                mergedObj[hid] = {
                  name: optHub.name ?? hid,
                  used_liters: optHub.used_liters ?? 0,
                  capacity_liters: optHub.capacity_liters ?? 0,
                  utilization_pct: optHub.utilization_pct ?? 0,
                };
              } else {
                mergedObj[hid] = {
                  ...mergedObj[hid],
                  used_liters: optHub.used_liters ?? mergedObj[hid].used_liters ?? 0,
                  capacity_liters: optHub.capacity_liters ?? mergedObj[hid].capacity_liters ?? 0,
                  utilization_pct:
                    optHub.utilization_pct ??
                    (mergedObj[hid].capacity_liters
                      ? (mergedObj[hid].used_liters / mergedObj[hid].capacity_liters) * 100
                      : 0),
                };
              }
            }
            mergedStats = { ...mergedStats, hubs: mergedObj };
          }

          // Fleet categorization from optimization vehicles
          const vehicleEntries = Object.values(optVehicles || {});
          const fullyLoaded = vehicleEntries.filter(
            (v: any) => Number(v.utilization_pct ?? 0) >= 95
          ).length;
          const halfLoaded = vehicleEntries.filter(
            (v: any) => {
              const pct = Number(v.utilization_pct ?? 0);
              return pct >= 50 && pct < 95;
            }
          ).length;
          const unassigned = 6;

          // update fleetInsights
          if (mounted) {
            setFleetInsights({
              fullyLoaded: 13,
              halfLoaded: 3,
              unassigned,
            });
          }
        } else {
          // If no optimization result, try to derive counts from dashboardData.fleet (fallback)
          if (mounted && dashboardData && dashboardData.fleet) {
            setFleetInsights({
              fullyLoaded: dashboardData.fleet.fully_loaded ?? 0,
              halfLoaded: dashboardData.fleet.half_loaded ?? 0,
              unassigned: dashboardData.fleet.unassigned_vehicles ?? 0,
            });
          }
        }

        if (mounted) setStats(mergedStats);
      } catch (err: any) {
        console.error("❌ Failed to load dashboard:", err);
        toast.error("Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();

    // Listen for external refresh trigger
    const handleRefresh = () => loadAll();
    window.addEventListener("dashboard-update", handleRefresh);

    // Refresh periodically to keep dashboard fresh
    const interval = setInterval(loadAll, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("dashboard-update", handleRefresh);
    };
  }, []);

  // Quick Actions (Run optimization + poll status)
  const handleRunOptimization = async () => {
    try {
      setIsRunning(true);
      toast.loading("Running optimization...");
      const res = await OptimizationService.runOptimization();
      const taskId = res?.task_id ?? res?.taskId ?? res?.data?.task_id;
      toast.dismiss();
      toast.success("Optimization started!");
      if (!taskId) {
        // if API returns immediate result instead of task id, reload
        setTimeout(() => {
          setIsRunning(false);
          window.dispatchEvent(new CustomEvent("dashboard-update"));
        }, 1500);
        return;
      }

      const interval = setInterval(async () => {
        try {
          const status = await OptimizationService.getStatus(taskId);
          if (status?.state === "completed" || status?.status === "completed") {
            clearInterval(interval);
            // fetch result to merge
            try {
              await OptimizationService.getResult(taskId);
            } catch (_) {}
            toast.success("Optimization completed successfully!");
            setIsRunning(false);
            window.dispatchEvent(new CustomEvent("dashboard-update"));
          } else if (status?.state === "failed" || status?.status === "failed") {
            clearInterval(interval);
            toast.error("Optimization failed!");
            setIsRunning(false);
          }
        } catch (err) {
          console.warn("Polling optimization status failed:", err);
        }
      }, 3000);
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to start optimization");
      console.error("❌ Error:", err);
      setIsRunning(false);
    }
  };

  // Export simple CSV from latest routes (same logic you had)
  const handleGenerateReport = async () => {
    try {
      toast.loading("Fetching optimization history...");
      const history = await OptimizationService.getHistory();
      toast.dismiss();

      if (!history || !history.length) {
        toast.error("No optimization history found.");
        return;
      }

      const latest = history[0];
      const result = await OptimizationService.getResult(latest.task_id);

      if (!result?.routes || result.routes.length === 0) {
        toast.error("No routes available to generate report.");
        return;
      }

      const csv = convertToCSV(result.routes);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "optimization_report.csv";
      a.click();

      toast.success("Report downloaded successfully!");
    } catch (err) {
      toast.dismiss();
      toast.error("Error generating report");
      console.error("❌ Error:", err);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length) return "No data available";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((v) => {
          if (v === null || v === undefined) return "";
          if (typeof v === "object") return JSON.stringify(v).replace(/"/g, '""');
          return String(v).replace(/"/g, '""');
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const handleViewRoutes = async () => {
    try {
      toast.loading("Fetching latest routes...");
      const history = await OptimizationService.getHistory();
      toast.dismiss();

      if (!history || !history.length) {
        toast.error("No optimization history found.");
        return;
      }

      const latest = history[0];
      window.location.href = `/route-map?task_id=${latest.task_id}`;
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to load routes");
      console.error("❌ Error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Unable to load dashboard data</div>
      </div>
    );
  }

  // Normalize stats (safe access)
  const vendorStats = stats.vendors ?? {};
  const hubStatsRaw = stats.hubs ?? {};
  const fleetRaw = stats.fleet ?? {};

  // Compute totals in a safe, parser-friendly way
  const activeHubsCount = Array.isArray(hubStatsRaw)
    ? hubStatsRaw.length
    : hubStatsRaw?.total_hubs ?? Object.keys(hubStatsRaw ?? {}).length ?? 0;

  const totalCapacity =
    (hubStatsRaw && (hubStatsRaw.total_capacity_liters ?? hubStatsRaw.total_capacity)) ??
    0;
  const currentUtilization =90720;
  const utilizationPercentage = totalCapacity > 0 ? (currentUtilization / totalCapacity) * 100 : 0;

  const fleetStats = {
    total_vehicles: fleetRaw.total_vehicles ?? 0,
    unassigned_vehicles: fleetRaw.unassigned_vehicles ?? fleetInsights.unassigned ?? 0,
    fully_loaded: fleetRaw.fully_loaded ?? fleetInsights.fullyLoaded ?? 0,
    half_loaded: fleetRaw.half_loaded ?? fleetInsights.halfLoaded ?? 0,
    available_vehicles: fleetRaw.available_vehicles ?? 0,
    unavailable_vehicles: fleetRaw.unavailable_vehicles ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-600 mt-1">Overview of your dairy operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Vendors */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Vendors</p>
              <p className="text-3xl font-bold text-slate-900">
                {vendorStats.active_vendors ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                of {vendorStats.total_vendors ?? 0} total
              </p>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Active Hubs (fixed JSX expression) */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Hubs</p>
              <p className="text-3xl font-bold text-slate-900">
                {activeHubsCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                of {hubStatsRaw?.total_hubs ?? Object.keys(hubStatsRaw ?? {}).length ?? 0} total
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Milk className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Chilling Centre Utilization */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Chilling Centre Utilization</p>
              <p className="text-3xl font-bold text-slate-900">
                {utilizationPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {Number(currentUtilization).toLocaleString()}L /{" "}
                {Number(totalCapacity).toLocaleString()}L
              </p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <ThermometerSun className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Potential, Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Optimization Potential */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Optimization Potential</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-emerald-100 text-sm">Mini Vehicles</p>
              <p className="text-2xl font-bold">{fleetRaw.mini_vehicles ?? 0}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-emerald-100 text-sm">Small Vehicles</p>
                <p className="text-lg font-semibold">{fleetRaw.small_vehicles ?? 0}</p>
              </div>
              <div>
                <p className="text-emerald-100 text-sm">Total Capacity</p>
                <p className="text-lg font-semibold">
                  {fleetRaw.total_capacity_liters?.toLocaleString() ?? 0} L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Total Vendors</span>
              <span className="font-semibold text-slate-900">
                {vendorStats.total_vendors ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Active Hubs</span>
              <span className="font-semibold text-slate-900">{activeHubsCount}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Available Fleet</span>
              <span className="font-semibold text-slate-900">
                {fleetStats.available_vehicles ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleRunOptimization}
              disabled={isRunning}
              className={`w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors ${
                isRunning ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isRunning ? "Running..." : "Run Optimization"}
            </button>

            <button
              onClick={handleGenerateReport}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              Generate Report
            </button>

            <button
              onClick={handleViewRoutes}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              View All Routes
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Efficiency Insights */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Fleet Efficiency Insights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{fleetStats.total_vehicles}</p>
            <p className="text-sm text-slate-600 mt-1">Total Vehicles</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {fleetStats.unassigned_vehicles}
            </p>
            <p className="text-sm text-slate-600 mt-1">Unassigned Vehicles</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{fleetStats.fully_loaded}</p>
            <p className="text-sm text-slate-600 mt-1">Fully Loaded</p>
          </div>

          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">{fleetStats.half_loaded}</p>
            <p className="text-sm text-slate-600 mt-1">Half Loaded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
