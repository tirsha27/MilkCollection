// domain/frontend/src/components/ChillingCenters.tsx
import { useEffect, useState } from "react";
import { StorageHubService } from "../services/storageHub.service";
import { Plus, Edit2, Trash2, MapPin, Activity } from "lucide-react";
import { OptimizationService } from "../services/optimization.service";

interface ChillingCenter {
  id: number; // backend int id
  hub_name: string;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  capacity_liters: number;
  current_load_liters?: number | null; // backend field name
  is_active?: boolean | null;
  // optional optimization fields:
  used_liters?: number;
  utilization_pct?: number;
}

export default function ChillingCenters() {
  const [centers, setCenters] = useState<ChillingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState<ChillingCenter | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location_lat: "",
    location_lng: "",
    address: "",
    capacity_liters: "",
  });

  // Auto-refresh when Excel file uploaded for chilling_centers
  useEffect(() => {
    loadCenters();

    const listener = (e: any) => {
      if (e.detail?.type === "chilling_centers") loadCenters();
    };

    window.addEventListener("data-uploaded", listener);
    return () => window.removeEventListener("data-uploaded", listener);
  }, []);

  const loadCenters = async () => {
    try {
      setLoading(true);
      const res = await StorageHubService.getAll();
      // res.data or res
      const hubs = res?.data ?? res ?? [];
      // normalize to array
      const normalized = Array.isArray(hubs) ? hubs : hubs.hubs ?? [];
      // map
      const mapped = normalized.map((c: any) => ({
        id: c.id ?? c.hub_id ?? c.hubCode ?? c.hub_code ?? Math.random(),
        hub_name: c.hub_name ?? c.name ?? c.title ?? c.hubName ?? "Unnamed Hub",
        latitude: c.latitude ?? c.lat ?? null,
        longitude: c.longitude ?? c.lng ?? null,
        location: c.location ?? c.address ?? c.village ?? null,
        capacity_liters: Number(c.capacity_liters ?? c.capacity ?? 0),
        current_load_liters: Number(c.current_load_liters ?? c.current_load ?? c.used_liters ?? 0),
        is_active: typeof c.is_active !== "undefined" ? c.is_active : c.active ?? true,
      })) as ChillingCenter[];

      // fetch optimization latest and merge per-hub info
      try {
        const optResp = await OptimizationService.getLatest();
        const optData = optResp?.data ?? null;
        if (optData && optData.hubs) {
          const hubsMap = optData.hubs;
          const merged = mapped.map((hub) => {
            // try to find hub by id then by name
            const byId = hubsMap[String(hub.id)];
            const byName = Object.values(hubsMap).find((h: any) => String(h.name).toLowerCase() === String(hub.hub_name).toLowerCase());
            const opt = byId ?? byName ?? null;
            if (opt) {
              return {
                ...hub,
                used_liters: Number(opt.used_liters ?? opt.used_liters ?? hub.current_load_liters ?? 0),
                capacity_liters: Number(opt.capacity_liters ?? hub.capacity_liters ?? hub.capacity_liters ?? 0),
                utilization_pct: Number(opt.utilization_pct ?? 0),
              };
            }
            return hub;
          });
          setCenters(merged);
          return;
        }
      } catch (err) {
        console.warn("Failed to load optimization for hubs:", err);
      }

      setCenters(mapped);
    } catch (err) {
      console.error("Error loading centers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      hub_name: formData.name.trim(),
      location: formData.address ? formData.address.trim() : "",
      latitude: formData.location_lat ? parseFloat(formData.location_lat) : 0,
      longitude: formData.location_lng ? parseFloat(formData.location_lng) : 0,
      capacity_liters: parseFloat(formData.capacity_liters),
      contact_number: null,
    };

    try {
      if (editingCenter) {
        await StorageHubService.update(editingCenter.id, payload);
      } else {
        await StorageHubService.create(payload);
      }
      resetForm();
      await loadCenters();
    } catch (err) {
      console.error("Error saving center:", err);
    }
  };

  const handleEdit = (center: ChillingCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.hub_name || "",
      location_lat: center.latitude?.toString() || "",
      location_lng: center.longitude?.toString() || "",
      address: center.location || "",
      capacity_liters: (center.capacity_liters || 0).toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this chilling center?")) return;
    try {
      await StorageHubService.delete(id);
      await loadCenters();
    } catch (err) {
      console.error("Error deleting center:", err);
    }
  };

  const toggleActive = async (center: ChillingCenter) => {
    try {
      const payload = { is_active: !center.is_active };
      await StorageHubService.update(center.id, payload);
      await loadCenters();
    } catch (err) {
      console.error("Error updating center status:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location_lat: "",
      location_lng: "",
      address: "",
      capacity_liters: "",
    });
    setEditingCenter(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading chilling centers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Chilling Centers</h2>
          <p className="text-slate-600 mt-1">Manage collection and storage facilities</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Center
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingCenter ? "Edit Chilling Center" : "Add New Chilling Center"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Center Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity (Liters) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacity_liters}
                  onChange={(e) => setFormData({ ...formData, capacity_liters: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.location_lat}
                  onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.location_lng}
                  onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {editingCenter ? "Update" : "Create"} Center
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {centers.map((center) => {
          const currentLoad = center.used_liters ?? center.current_load_liters ?? 0;
          const capacity = Number(center.capacity_liters ?? 0);
          const utilizationPercent = capacity > 0 ? (currentLoad / capacity) * 100 : 0;

          return (
            <div key={center.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{center.hub_name}</h3>
                  {center.location && (
                    <p className="text-sm text-slate-600 mt-1 flex items-start gap-1">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {center.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(center)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    center.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {center.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Capacity Utilization</span>
                    <span className="font-semibold text-slate-900">{(center.utilization_pct ?? utilizationPercent).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        (center.utilization_pct ?? utilizationPercent) > 90
                          ? "bg-red-500"
                          : (center.utilization_pct ?? utilizationPercent) > 70
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(center.utilization_pct ?? utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-slate-600" />
                  <span className="text-slate-600">
                    {(center.used_liters ?? center.current_load_liters ?? 0).toLocaleString()}L / {Number(center.capacity_liters ?? capacity).toLocaleString()}L
                  </span>
                </div>

                {center.latitude && center.longitude && (
                  <div className="text-xs text-slate-500">
                    Coordinates: {Number(center.latitude).toFixed(4)}, {Number(center.longitude).toFixed(4)}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleEdit(center)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                >
                  <Edit2 className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(center.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {centers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No chilling centers yet</h3>
          <p className="text-slate-600 mb-4">Get started by adding your first chilling center</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" /> Add Center
          </button>
        </div>
      )}
    </div>
  );
}
