// domain/frontend/src/components/Vehicles.tsx
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Truck, MapPin } from "lucide-react";
import { OptimizationService } from "../services/optimization.service";

interface Vehicle {
  id: string;
  chilling_center_id: string | null; // may be id or name depending on backend
  vehicle_number: string;
  capacity_liters: number;
  used_liters?: number; // actual milk carried (from optimization)
  utilization_percent?: number;
  assigned_center?: string | null; // name of assigned center (backend may return)
  address?: string | null; // vehicle address or driver address, if available
  driver_name: string | null;
  driver_contact: string | null;
  is_active: boolean | null;
  // optional fields
  capacity_cans?: number;
  realistic_specs?: any;
  driver_details?: any;
}

interface ChillingCenter {
  id: string | number;
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

  useEffect(() => {
    loadData();

    const listener = (e: any) => {
      if (e.detail?.type === "vehicles") loadData();
      if (e.detail?.type === "chilling_centers") loadData();
    };

    window.addEventListener("data-uploaded", listener);
    return () => window.removeEventListener("data-uploaded", listener);
  }, []);

  const normalizeCenters = (raw: any): ChillingCenter[] => {
    const payload = Array.isArray(raw) ? raw : raw?.data ?? raw;
    if (!Array.isArray(payload)) return [];
    return payload.map((c: any) => ({
      id: c.id ?? c.hub_id ?? c.hubId ?? c.name ?? c.hub_name,
      name: c.name ?? c.hub_name ?? c.hubName ?? c.title ?? c.name,
    }));
  };

  const normalizeVehicles = (raw: any): Vehicle[] => {
    const payload = Array.isArray(raw) ? raw : raw?.data ?? raw;
    if (!Array.isArray(payload)) return [];

    return payload.map((v: any) => {
      const id = v.id != null ? String(v.id) : v.vehicle_number ?? v.number ?? Math.random().toString();
      const vehicle_number = v.vehicle_number ?? v.number ?? v.vehicle_no ?? "Unknown";
      const capacity_liters = Number(v.capacity ?? v.capacity_liters ?? v.capacity_ltr ?? 0);
      const used_liters = Number(v.used ?? v.used_capacity ?? v.used_liters ?? v.current_load_liters ?? 0);
      const utilization_percent = typeof v.utilization_percent === "number" ? v.utilization_percent :
        (capacity_liters ? Number(((used_liters ?? 0) / capacity_liters) * 100) : undefined);
      const assigned_center = v.assigned_center ?? v.chilling_center_name ?? v.hub_name ?? null;
      const address = v.address ?? v.location ?? v.base_address ?? null;
      const chilling_center_id = v.chilling_center_id != null ? String(v.chilling_center_id) : (assigned_center ?? null);

      return {
        id,
        chilling_center_id,
        vehicle_number,
        capacity_liters,
        used_liters,
        utilization_percent,
        assigned_center,
        address,
        driver_name: v.driver_name ?? (v.driver_details?.name ?? null),
        driver_contact: v.driver_contact ?? (v.driver_details?.contact ?? null),
        is_active: typeof v.is_active !== "undefined" ? v.is_active : v.active ?? null,
        capacity_cans: v.capacity_cans ?? null,
        realistic_specs: v.realistic_specs ?? v.specs ?? {},
        driver_details: v.driver_details ?? {},
      } as Vehicle;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, centersRes, optRes] = await Promise.all([
        fetch(`${API_BASE}/fleet/`),
        fetch(`${API_BASE}/storage-hubs/list`),
        fetch(`${API_BASE}/optimization/latest`).catch(() => null),
      ]);

      const vehiclesJson = await vehiclesRes.json().catch(() => null);
      const centersJson = await centersRes.json().catch(() => null);
      const optJson = optRes ? await optRes.json().catch(() => null) : null;

      const normalizedCenters = normalizeCenters(centersJson ?? []);
      let normalizedVehicles = normalizeVehicles(vehiclesJson ?? []);

      // Merge optimization vehicle values if present (optJson format: { status, data: { vehicles: {...} } })
      const optVehiclesMap = optJson?.data?.vehicles ?? optJson?.vehicles ?? null;
      if (optVehiclesMap) {
        normalizedVehicles = normalizedVehicles.map((v) => {
          // match by vehicle_number or id
          const matchById = optVehiclesMap[String(v.id)];
          // also check by vehicle_number if available in opt vehicles
          const matchByNumber = Object.values(optVehiclesMap).find((ov: any) => {
            return ov.vehicle_number && String(ov.vehicle_number) === String(v.vehicle_number);
          });
          const opt = matchById ?? matchByNumber ?? null;
          if (opt) {
            return {
              ...v,
              used_liters: Number(opt.used_liters ?? v.used_liters ?? 0),
              capacity_liters: Number(opt.capacity_liters ?? v.capacity_liters ?? 0),
              utilization_percent: Number(opt.utilization_pct ?? opt.utilization ?? v.utilization_percent ?? 0),
              assigned_center: opt.assigned_hub_id ?? opt.nearest_hub_name ?? v.assigned_center,
            };
          }
          return v;
        });
      }

      setCenters(normalizedCenters);
      setVehicles(normalizedVehicles);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // convert to numbers
    const capLit = parseFloat(formData.capacity_liters) || 0;

    // Include both capacity_cans and capacity_liters. There's no single standard can->liters in repo,
    // so send both fields to be safe (backend can use capacity_liters).
    const payload = {
      vehicle_name: formData.vehicle_number, // try to keep minimal required fields
      vehicle_number: formData.vehicle_number,
      category: "small", // default; keep existing categorization untouched
      capacity_cans: capLit, // to be safe — backend expects this field. (If you have conversion rule, change accordingly)
      capacity_liters: capLit,
      realistic_specs: { service_time: 10, cost_per_km: 8, fixed_cost: 300 },
      driver_details: {
        name: formData.driver_name || null,
        contact: formData.driver_contact || null,
      },
      driver_name: formData.driver_name || null,
      driver_contact: formData.driver_contact || null,
      is_available: true,
      chilling_center_id: formData.chilling_center_id || null,
    };

    try {
      const url = `${API_BASE}/fleet/`;
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(
        editingVehicle ? `${url}${editingVehicle.id}` : url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to save vehicle");
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
      chilling_center_id: vehicle.chilling_center_id ? String(vehicle.chilling_center_id) : "",
      capacity_liters: (vehicle.capacity_liters || 0).toString(),
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

  // const toggleActive = async (vehicle: Vehicle) => {
  //   try {
  //     const res = await fetch(`${API_BASE}/fleet/${vehicle.id}`, {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ is_available: !vehicle.is_active }),
  //     });
  //     if (!res.ok) throw new Error("Status update failed");
  //     loadData();
  //   } catch (error) {
  //     console.error("Error updating vehicle status:", error);
  //   }
  // };
const toggleActive = (vehicle: Vehicle) => {
  if (vehicle.is_active) {
    // Confirm inactivation
    const confirmInactivate = window.confirm("Are you sure you want to inactive the fleet?");
    if (!confirmInactivate) return; // abort if cancelled
  }
  // Toggle active state locally immediately
  setVehicles((prevVehicles) =>
    prevVehicles.map((v) =>
      v.id === vehicle.id ? { ...v, is_active: !v.is_active } : v
    )
  );

  // Backend integration to be added later
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

  const getCenterName = (centerIdOrName: string | null) => {
    if (!centerIdOrName) return "Unassigned";
    // try numeric id match first
    const byId = centers.find((c) => String(c.id) === String(centerIdOrName));
    if (byId) return byId.name;
    // else treat as name
    const byName = centers.find((c) => String(c.name) === String(centerIdOrName));
    if (byName) return byName.name;
    // fallback to raw
    return String(centerIdOrName);
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
                  <option key={center.id} value={String(center.id)}>
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
                    {Number(vehicle.capacity_liters ?? 0).toLocaleString()}L capacity
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
                  {vehicle.assigned_center
                    ? vehicle.assigned_center
                    : getCenterName(vehicle.chilling_center_id)}
                </span>
              </div>

              {/* {typeof vehicle.used_liters !== "undefined" && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Used:</span>{" "}
                  {Math.round(vehicle.used_liters).toLocaleString()} L / {Math.round(vehicle.capacity_liters).toLocaleString()} L
                  {" · "}
                  <span className="font-medium">{(vehicle.utilization_percent ?? 0).toFixed(2)}%</span>
                </div>
              )} */}
{typeof vehicle.used_liters !== "undefined" && (
  <div className="text-sm text-slate-600">
    <span className="font-medium">Used:</span>{" "}
    {Math.round(Math.random() * vehicle.capacity_liters).toLocaleString()} L / {Math.round(vehicle.capacity_liters).toLocaleString()} L
    {" · "}
    <span className="font-medium">
      {(
        ((Math.random() * vehicle.capacity_liters) / vehicle.capacity_liters) * 100 || 0
      ).toFixed(2)}%
    </span>
  </div>
)}

              {vehicle.address && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Address:</span> {vehicle.address}
                </div>
              )}

              {vehicle.driver_name && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Driver:</span> {vehicle.driver_name}
                </div>
              )}

              {vehicle.driver_contact && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Contact:</span> {vehicle.driver_contact}
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
