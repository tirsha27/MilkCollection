import { useState } from 'react';
import Dashboard from './components/Dashboard';
import ChillingCenters from './components/ChillingCenters';
import Vehicles from './components/Vehicles';
import Farmers from './components/Farmers';
import OptimizationReports from './components/OptimizationReports';
import Configuration from './components/Configuration';
import DataUpload from './components/DataUpload';
import MapView from './components/MapView';
import TripSchedule from './components/TripSchedule'; // ✅ Added
import { Milk, Truck, Users, BarChart3, Settings, Upload, Map } from 'lucide-react';

// ✅ Added 'tripSchedule' to the View type
type View =
  | 'dashboard'
  | 'centers'
  | 'vehicles'
  | 'farmers'
  | 'map'
  | 'tripSchedule'
  | 'reports'
  | 'upload'
  | 'config';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // ✅ Added Trip Scheduler to the sidebar navigation
  const navigation = [
    { id: 'dashboard' as View, name: 'Dashboard', icon: BarChart3 },
    { id: 'centers' as View, name: 'Chilling Centers', icon: Milk },
    { id: 'vehicles' as View, name: 'Vehicles', icon: Truck },
    { id: 'farmers' as View, name: 'Farmers', icon: Users },
    { id: 'map' as View, name: 'Route Map', icon: Map },
    { id: 'tripSchedule' as View, name: 'Trip Scheduler', icon: Truck }, // ✅ Added
    { id: 'reports' as View, name: 'Optimization Reports', icon: BarChart3 },
    { id: 'upload' as View, name: 'Data Upload', icon: Upload },
    { id: 'config' as View, name: 'Configuration', icon: Settings },
  ];

  // ✅ Added TripSchedule to renderView() switch
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'centers':
        return <ChillingCenters />;
      case 'vehicles':
        return <Vehicles />;
      case 'farmers':
        return <Farmers />;
      case 'map':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Route Map</h2>
              <p className="text-slate-600 mt-1">Visualize collection routes and locations</p>
            </div>
            <MapView />
          </div>
        );
      case 'tripSchedule': // ✅ Added
        return <TripSchedule />;
      case 'reports':
        return <OptimizationReports />;
      case 'upload':
        return <DataUpload />;
      case 'config':
        return <Configuration />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Milk className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Konvey</h1>
              <span className="text-sm text-slate-500 hidden sm:inline">Procurement Planning</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">{renderView()}</main>
      </div>
    </div>
  );
}

export default App;
