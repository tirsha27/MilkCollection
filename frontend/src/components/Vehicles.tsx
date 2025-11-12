import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Truck, MapPin } from "lucide-react";

interface Vehicle {
  id: string;
  chilling_center_id: string | null;
  vehicle_number: string;
  capacity_liters: number;
  driver_name: string | null;
  driver_contact: string | null;
  is_active: boolean | null;
}

interface ChillingCenter {
  id: string;
  name: string;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [centers, setCenters] = useState<ChillingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    chilling_center_id: "",
    capacity_liters: "",
    driver_name: "",
    driver_contact: "",
  });

  const API_BASE = "http://localhost:8000/api/v1";

  // ✅ Modified useEffect: auto-refresh on Excel upload for vehicles
  useEffect(() => {
    loadData();

    const listener = (e: any) => {
      if (e.detail?.type === "vehicles") loadData();
    };

    window.addEventListener("data-uploaded", listener);
    return () => window.removeEventListener("data-uploaded", listener);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, centersRes] = await Promise.all([
        fetch(`${API_BASE}/fleet/`),
        fetch(`${API_BASE}/storage-hubs/list`),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const centersData = await centersRes.json();

      setVehicles(vehiclesData || []);
      setCenters(centersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const vehicleData = {
      vehicle_number: formData.vehicle_number,
      chilling_center_id: formData.chilling_center_id || null,
      capacity_liters: parseFloat(formData.capacity_liters) || 0,
      driver_name: formData.driver_name || null,
      driver_contact: formData.driver_contact || null,
      is_active: true,
    };

    try {
      const url = `${API_BASE}/fleet/`;
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(
        editingVehicle ? `${url}${editingVehicle.id}` : url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vehicleData),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Failed to save vehicle. Check logs for details.");
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      chilling_center_id: vehicle.chilling_center_id || "",
      capacity_liters: vehicle.capacity_liters.toString(),
      driver_name: vehicle.driver_name || "",
      driver_contact: vehicle.driver_contact || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const res = await fetch(`${API_BASE}/fleet/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      loadData();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
    }
  };

  const toggleActive = async (vehicle: Vehicle) => {
    try {
      const res = await fetch(`${API_BASE}/fleet/${vehicle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !vehicle.is_active }),
      });
      if (!res.ok) throw new Error("Status update failed");
      loadData();
    } catch (error) {
      console.error("Error updating vehicle status:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_number: "",
      chilling_center_id: "",
      capacity_liters: "",
      driver_name: "",
      driver_contact: "",
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const getCenterName = (centerId: string | null) => {
    if (!centerId) return "Unassigned";
    return centers.find((c) => c.id === centerId)?.name || "Unknown";
  };

  if (loading) {
    return <div className="text-center py-12">Loading vehicles...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Vehicles</h2>
          <p className="text-slate-600 mt-1">
            Manage your fleet for milk collection
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Vehicle
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehicle_number: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Capacity (Liters) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacity_liters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity_liters: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Chilling Center
              </label>
              <select
                value={formData.chilling_center_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    chilling_center_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a center</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      driver_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Driver Contact
                </label>
                <input
                  type="text"
                  value={formData.driver_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      driver_contact: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingVehicle ? "Update" : "Create"} Vehicle
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {vehicle.vehicle_number}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {vehicle.capacity_liters}L capacity
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleActive(vehicle)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  vehicle.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {vehicle.is_active ? "Active" : "Inactive"}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-600" />
                <span className="text-slate-600">
                  {getCenterName(vehicle.chilling_center_id)}
                </span>
              </div>

              {vehicle.driver_name && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Driver:</span>{" "}
                  {vehicle.driver_name}
                </div>
              )}

              {vehicle.driver_contact && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Contact:</span>{" "}
                  {vehicle.driver_contact}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => handleEdit(vehicle)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(vehicle.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {vehicles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Truck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No vehicles yet
          </h3>
          <p className="text-slate-600 mb-4">
            Add vehicles to start managing your fleet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
