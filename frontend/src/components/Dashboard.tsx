import { useEffect, useState } from "react";
import { DashboardService } from "../services/dashboard.service";
import { OptimizationService } from "../services/optimization.service";
import { Truck, Users, Milk, MapPin, TrendingDown, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface DashboardStats {
  vendors: any;
  hubs: any;
  fleet: any;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // ✅ Fetch dashboard stats
  const loadStats = async () => {
    try {
      const data = await DashboardService.getStats();
      console.log("🚛 Fleet Stats Response:", data.fleet);
      setStats(data);
    } catch (err) {
      console.error("❌ Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    const handleRefresh = () => loadStats();
    window.addEventListener("dashboard-update", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("dashboard-update", handleRefresh);
    };
  }, []);

  // ✅ Quick Action Handlers

  // 1️⃣ Run Optimization
  const handleRunOptimization = async () => {
    try {
      setIsRunning(true);
      toast.loading("Running optimization...");
      const res = await OptimizationService.runOptimization();

      const taskId = res.task_id;
      console.log("🚀 Optimization started:", res);
      toast.dismiss();
      toast.success("Optimization started!");

      // Poll every 3 seconds until completed
      const interval = setInterval(async () => {
        const status = await OptimizationService.getStatus(taskId);
        console.log("📊 Status:", status);

        if (status.state === "completed") {
          clearInterval(interval);
          const result = await OptimizationService.getResult(taskId);
          console.log("✅ Optimization result:", result);
          toast.success("Optimization completed successfully!");
          setIsRunning(false);
        } else if (status.state === "failed") {
          clearInterval(interval);
          toast.error("Optimization failed!");
          setIsRunning(false);
        }
      }, 3000);
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to start optimization");
      console.error("❌ Error:", err);
      setIsRunning(false);
    }
  };

  // 2️⃣ Generate Report
  const handleGenerateReport = async () => {
    try {
      toast.loading("Fetching optimization history...");
      const history = await OptimizationService.getHistory();
      toast.dismiss();

      if (!history.length) {
        toast.error("No optimization history found.");
        return;
      }

      const latest = history[0];
      const result = await OptimizationService.getResult(latest.task_id);
      console.log("📄 Latest optimization result:", result);

      if (!result.routes || result.routes.length === 0) {
        toast.error("No routes available to generate report.");
        return;
      }

      // Convert result to CSV
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

  // Helper function to convert JSON → CSV
  const convertToCSV = (data: any[]) => {
    if (!data.length) return "No data available";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((obj) => Object.values(obj).join(","));
    return [headers, ...rows].join("\n");
  };

  // 3️⃣ View All Routes
  const handleViewRoutes = async () => {
    try {
      toast.loading("Fetching latest routes...");
      const history = await OptimizationService.getHistory();
      toast.dismiss();

      if (!history.length) {
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

  // Normalize backend stats
  const vendorStats = stats.vendors || {};
  const hubStats = stats.hubs || {};

  const fleetRaw = stats.fleet || {};
  const fleetStats = {
    total_vehicles: fleetRaw.total_vehicles ?? 0,
    available_vehicles: fleetRaw.available_vehicles ?? 0,
    unavailable_vehicles: fleetRaw.unavailable_vehicles ?? 0,
    total_capacity_liters: fleetRaw.total_capacity_liters ?? 0,
    total_capacity_cans: fleetRaw.total_capacity_cans ?? 0,
    mini_vehicles: fleetRaw.mini_vehicles ?? 0,
    small_vehicles: fleetRaw.small_vehicles ?? 0,
  };

  const totalCapacity =
    hubStats.total_capacity_liters ?? fleetStats.total_capacity_liters ?? 0;
  const currentUtilization = hubStats.current_load_liters ?? 0;
  const utilizationPercentage =
    totalCapacity > 0 ? (currentUtilization / totalCapacity) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-600 mt-1">Overview of your dairy operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vendors */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
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

        {/* Storage Hubs */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Hubs</p>
              <p className="text-3xl font-bold text-slate-900">
                {hubStats.active_hubs ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                of {hubStats.total_hubs ?? 0} total
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Milk className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Fleet */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Available Fleet</p>
              <p className="text-3xl font-bold text-slate-900">
                {fleetStats.available_vehicles}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                of {fleetStats.total_vehicles} total
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {fleetStats.unavailable_vehicles} under maintenance
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Capacity Usage */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Capacity Usage</p>
              <p className="text-3xl font-bold text-slate-900">
                {utilizationPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {currentUtilization.toLocaleString()}L /{" "}
                {totalCapacity.toLocaleString()}L
              </p>
            </div>
            <div className="h-12 w-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-violet-600" />
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
              <p className="text-2xl font-bold">
                {fleetStats.mini_vehicles ?? 0}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-emerald-100 text-sm">Small Vehicles</p>
                <p className="text-lg font-semibold">
                  {fleetStats.small_vehicles ?? 0}
                </p>
              </div>
              <div>
                <p className="text-emerald-100 text-sm">Total Capacity</p>
                <p className="text-lg font-semibold">
                  {fleetStats.total_capacity_liters.toLocaleString()} L
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Activity
            </h3>
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
              <span className="font-semibold text-slate-900">
                {hubStats.active_hubs ?? 0}
              </span>
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
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleRunOptimization}
              disabled={isRunning}
              className={`w-full px-4 py-3 text-white rounded-lg text-sm font-medium transition-colors ${
                isRunning
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Fleet Efficiency Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {(
                ((fleetStats.available_vehicles || 0) /
                  (fleetStats.total_vehicles || 1)) *
                100
              ).toFixed(0)}
              %
            </p>
            <p className="text-sm text-slate-600 mt-1">Fleet Utilization</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {(totalCapacity / (fleetStats.available_vehicles || 1)).toFixed(0)} L
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Avg Capacity per Vehicle
            </p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-900">
              {fleetStats.small_vehicles + fleetStats.mini_vehicles}
            </p>
            <p className="text-sm text-slate-600 mt-1">Active Fleet Types</p>
          </div>
        </div>
      </div>
    </div>
  );
}
