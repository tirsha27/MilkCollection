// domain/frontend/src/components/Vehicles.tsx
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Truck, MapPin } from "lucide-react";
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

interface Vehicle {
  id: string;
  chilling_center_id: string | null;
  vehicle_number: string;
  capacity_liters: number;
  used_liters?: number;
  utilization_percent?: number;
  assigned_center?: string | null;
  address?: string | null;
  driver_name: string | null;
  driver_contact: string | null;
  is_active: boolean | null;
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
      id: c.id ?? c.hub_id ?? c.name,
      name: c.name ?? c.hub_name ?? c.title,
    }));
  };

  const normalizeVehicles = (raw: any): Vehicle[] => {
    const payload = Array.isArray(raw) ? raw : raw?.data ?? raw;
    if (!Array.isArray(payload)) return [];

    return payload.map((v: any) => {
      const id = v.id != null ? String(v.id) : v.vehicle_number;
      const vehicle_number = v.vehicle_number ?? "Unknown";
      const capacity_liters = Number(v.capacity ?? v.capacity_liters ?? 0);
      const used_liters = Number(v.used_liters ?? v.current_load_liters ?? 0);

      const utilization_percent =
        typeof v.utilization_percent === "number"
          ? v.utilization_percent
          : capacity_liters
          ? Number(((used_liters ?? 0) / capacity_liters) * 100)
          : 0;

      return {
        id,
        chilling_center_id: v.chilling_center_id
          ? String(v.chilling_center_id)
          : null,
        vehicle_number,
        capacity_liters,
        used_liters,
        utilization_percent,
        assigned_center:
          v.assigned_center ?? v.chilling_center_name ?? v.hub_name ?? null,
        address: v.address ?? v.location ?? null,
        driver_name: v.driver_name ?? v.driver_details?.name ?? null,
        driver_contact: v.driver_contact ?? v.driver_details?.contact ?? null,
        is_active: typeof v.is_active !== "undefined" ? v.is_active : typeof v.is_available !== "undefined"? v.is_available: null,
        capacity_cans: v.capacity_cans ?? null,
        realistic_specs: v.realistic_specs ?? {},
        driver_details: v.driver_details ?? {},
      };
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [vehiclesRes, centersRes, optRes] = await Promise.all([
        api.get(`${API.fleet}/`),
        api.get(`${API.storageHubs}/list`),
        api.get(`${API.optimization}/latest`).catch(() => null),
      ]);

      const vehiclesJson = vehiclesRes?.data ?? null;
      const centersJson = centersRes?.data ?? null;
      const optJson = optRes?.data ?? null;

      const normalizedCenters = normalizeCenters(centersJson ?? []);
      let normalizedVehicles = normalizeVehicles(vehiclesJson ?? []);

      const optVehiclesMap =
        optJson?.data?.vehicles ?? optJson?.vehicles ?? null;

      if (optVehiclesMap) {
        normalizedVehicles = normalizedVehicles.map((v) => {
          const matchById = optVehiclesMap[String(v.id)];
          const matchByNumber = Object.values(optVehiclesMap).find(
            (ov: any) =>
              ov.vehicle_number &&
              String(ov.vehicle_number) === String(v.vehicle_number)
          );

          const opt = matchById ?? matchByNumber ?? null;

          if (opt) {
            return {
              ...v,
              used_liters: Number(opt.used_liters ?? v.used_liters ?? 0),
              capacity_liters: Number(
                opt.capacity_liters ?? v.capacity_liters ?? 0
              ),
              utilization_percent: Number(
                opt.utilization_pct ??
                  opt.utilization ??
                  v.utilization_percent ??
                  0
              ),
              assigned_center: opt.nearest_hub_name
                ? opt.nearest_hub_name
                : "Unassigned",
            };
          }
          return v;
        });
      }

      setCenters(normalizedCenters);
      setVehicles(normalizedVehicles);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const capLit = parseFloat(formData.capacity_liters) || 0;

    const payload = {
      vehicle_name: formData.vehicle_number,
      vehicle_number: formData.vehicle_number,
      category: "small",
      capacity_cans: capLit,
      capacity_liters: capLit,
      realistic_specs: { service_time: 10, cost_per_km: 8, fixed_cost: 300 },
      driver_details: {
        name: formData.driver_name || null,
        contact: formData.driver_contact || null,
      },
      driver_name: formData.driver_name || null,
      driver_contact: formData.driver_contact || null,
      chilling_center_id: formData.chilling_center_id || null,
      is_available: true,
    };

    try {
      if (editingVehicle) {
        await api.put(`${API.fleet}/${editingVehicle.id}`, payload);
      } else {
        await api.post(`${API.fleet}/`, payload);
      }
      resetForm();
      loadData();
    } catch (error) {
      alert("Failed to save vehicle");
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_number: vehicle.vehicle_number,
      chilling_center_id: vehicle.chilling_center_id
        ? String(vehicle.chilling_center_id)
        : "",
      capacity_liters: String(vehicle.capacity_liters ?? ""),
      driver_name: vehicle.driver_name || "",
      driver_contact: vehicle.driver_contact || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`${API.fleet}/${id}`);
      loadData();
    } catch (error) {}
  };

  const toggleActive = (vehicle: Vehicle) => {
    if (vehicle.is_active) {
      if (!confirm("Inactivate this fleet?")) return;
    }

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicle.id ? { ...v, is_active: !v.is_active } : v
      )
    );
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
    const byId = centers.find((c) => String(c.id) === String(centerIdOrName));
    if (byId) return byId.name;
    const byName = centers.find((c) => c.name === centerIdOrName);
    return byName?.name ?? centerIdOrName;
  };

  if (loading) return <div className="text-center py-12">Loading…</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Vehicles</h2>
          <p className="text-slate-600 mt-1">Manage your fleet</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="h-5 w-5 inline-block mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg mb-4">
            {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Vehicle Number *</label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_number: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full"
                  required
                />
              </div>

              <div>
                <label>Capacity (Liters) *</label>
                <input
                  type="number"
                  value={formData.capacity_liters}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity_liters: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label>Chilling Center</label>
              <select
                value={formData.chilling_center_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    chilling_center_id: e.target.value,
                  })
                }
                className="border px-3 py-2 rounded-lg w-full"
              >
                <option value="">Select</option>
                {centers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Driver Name</label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_name: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full"
                />
              </div>

              <div>
                <label>Driver Contact</label>
                <input
                  type="text"
                  value={formData.driver_contact}
                  onChange={(e) =>
                    setFormData({ ...formData, driver_contact: e.target.value })
                  }
                  className="border px-3 py-2 rounded-lg w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                {editingVehicle ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white p-6 rounded-xl border shadow-sm"
          >
            <div className="flex justify-between mb-4">
              <div className="flex gap-3">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {vehicle.vehicle_number}
                  </h3>
                  <p>{vehicle.capacity_liters} L capacity</p>
                </div>
              </div>

              <button
              onClick={() => toggleActive(vehicle)}
              className="flex items-center gap-1 text-xs font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                vehicle.is_active ? "bg-green-500" : "bg-red-500"
                }`}
                ></span>
                <span className={vehicle.is_active ? "text-green-700" : "text-red-700"}>
                {vehicle.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            </div>

            {/* UI Improvements */}
            <div className="space-y-4 mb-4">

              {/* Assigned / Unassigned Badge */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-600" />

                {vehicle.assigned_center &&
                vehicle.assigned_center !== "Unassigned" ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Assigned • {vehicle.assigned_center}
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Unassigned
                  </span>
                )}
              </div>

              {/* Used Capacity + Progress Bar */}
              {typeof vehicle.used_liters !== "undefined" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Capacity Used</span>
                    <span>
                      {Math.round(vehicle.used_liters ?? 0).toLocaleString()} L /
                      {Math.round(vehicle.capacity_liters ?? 0).toLocaleString()} L
                      {" "}
                      ({(vehicle.utilization_percent ?? 0).toFixed(2)}%)
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        (vehicle.utilization_percent ?? 0) > 70
                          ? "bg-green-500"
                          : (vehicle.utilization_percent ?? 0) >= 50
                          ? "bg-yellow-400"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          vehicle.utilization_percent ?? 0,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {vehicle.driver_name && (
                <div className="text-sm text-slate-700">
                  <span className="font-medium">Driver:</span>{" "}
                  {vehicle.driver_name}
                </div>
              )}
              {vehicle.driver_contact && (
                <div className="text-sm text-slate-700">
                  <span className="font-medium">Contact:</span>{" "}
                  {vehicle.driver_contact}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => handleEdit(vehicle)}
                className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm"
              >
                <Edit2 className="h-4 w-4 inline-block mr-1" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(vehicle.id)}
                className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm"
              >
                <Trash2 className="h-4 w-4 inline-block mr-1" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {vehicles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3>No vehicles yet</h3>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            <Plus className="h-4 w-4 inline-block mr-1" />
            Add Vehicle
          </button>
        </div>
      )}
    </div>
  );
}
