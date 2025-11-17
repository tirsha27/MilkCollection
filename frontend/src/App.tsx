import { Link, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ChillingCenters from "./components/ChillingCenters";
import Vehicles from "./components/Vehicles";
import Farmers from "./components/Farmers";
import OptimizationReports from "./components/OptimizationReports";
import Configuration from "./components/Configuration";
import DataUpload from "./components/DataUpload";
import MapView from "./components/MapView";
import TripSchedule from "./components/TripSchedule";
import { Milk, Truck, Users, BarChart3, Settings, Upload, Map } from "lucide-react";

function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navigation = [
    { path: "/dashboard", name: "Dashboard", icon: BarChart3 },
    { path: "/centers", name: "Chilling Centers", icon: Milk },
    { path: "/vehicles", name: "Vehicles", icon: Truck },
    { path: "/farmers", name: "Farmers", icon: Users },
    { path: "/map", name: "Route Map", icon: Map },
    { path: "/trip-schedule", name: "Trip Scheduler", icon: Truck },
    { path: "/reports", name: "Optimization Reports", icon: BarChart3 },
    { path: "/upload", name: "Data Upload", icon: Upload },
    { path: "/config", name: "Configuration", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Milk className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">KoOptix</h1>
              <span className="text-sm text-slate-500 hidden sm:inline">
                Procurement Planning
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentPath === item.path
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/centers" element={<ChillingCenters />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/farmers" element={<Farmers />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/trip-schedule" element={<TripSchedule />} />
            <Route path="/reports" element={<OptimizationReports />} />
            <Route path="/upload" element={<DataUpload />} />
            <Route path="/config" element={<Configuration />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
