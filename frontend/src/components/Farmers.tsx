import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, MapPin, Droplets } from 'lucide-react';
import { VendorService } from '../services/vendor.service';

interface Farmer {
  id: number;
  name: string;
  contact: string | null;
  location_lat: number | null;
  location_lng: number | null;
  address: string | null;
  daily_supply_capacity: number | null;
  is_active: boolean | null;
}

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location_lat: '',
    location_lng: '',
    address: '',
    daily_supply_capacity: '',
  });

  // ✅ Auto-refresh when Excel upload completes
  useEffect(() => {
    loadFarmers();
    const listener = (e: any) => {
      if (e.detail?.type === "farmers") loadFarmers();
    };
    window.addEventListener("data-uploaded", listener);
    return () => window.removeEventListener("data-uploaded", listener);
  }, []);

  // ✅ Fetch vendors/farmers list
  const loadFarmers = async () => {
    try {
      const data = await VendorService.list();

      // 🧠 Handle both array or paginated object responses
      const vendorsArray = Array.isArray(data) ? data : data.vendors || [];

      const mapped = vendorsArray.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.vendor_name,
        contact: vendor.contact_number ?? vendor.contact ?? null,
        location_lat: vendor.latitude ?? vendor.location_lat ?? null,
        location_lng: vendor.longitude ?? vendor.location_lng ?? null,
        address: vendor.village ?? vendor.address ?? null,
        daily_supply_capacity: vendor.milk_quantity_cans ?? vendor.daily_supply_capacity ?? null,
        is_active: vendor.is_active ?? true,
      }));

      setFarmers(mapped);
    } catch (error) {
      console.error('Error loading farmers:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add / Update farmer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      vendor_name: formData.name.trim(),
      contact_number: formData.contact?.trim() || null,
      latitude: formData.location_lat ? parseFloat(formData.location_lat) : 0,
      longitude: formData.location_lng ? parseFloat(formData.location_lng) : 0,
      village: formData.address || '',
      milk_quantity_cans: formData.daily_supply_capacity
        ? parseFloat(formData.daily_supply_capacity)
        : 0,
    };

    try {
      if (editingFarmer) {
        await VendorService.update(editingFarmer.id, payload);
      } else {
        await VendorService.create(payload);
      }
      resetForm();
      await loadFarmers();
    } catch (error) {
      console.error('Error saving farmer:', error);
      alert('Failed to save farmer. Please check all required fields.');
    }
  };

  const handleEdit = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setFormData({
      name: farmer.name,
      contact: farmer.contact || '',
      location_lat: farmer.location_lat?.toString() || '',
      location_lng: farmer.location_lng?.toString() || '',
      address: farmer.address || '',
      daily_supply_capacity: farmer.daily_supply_capacity?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this farmer?')) return;

    try {
      await VendorService.remove(id);
      loadFarmers();
    } catch (error) {
      console.error('Error deleting farmer:', error);
    }
  };

  const toggleActive = async (farmer: Farmer) => {
    try {
      await VendorService.update(farmer.id, {
        is_active: !farmer.is_active,
      });
      loadFarmers();
    } catch (error) {
      console.error('Error updating farmer status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      location_lat: '',
      location_lng: '',
      address: '',
      daily_supply_capacity: '',
    });
    setEditingFarmer(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading farmers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Farmers</h2>
          <p className="text-slate-600 mt-1">Manage milk suppliers and vendors</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Farmer
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingFarmer ? 'Edit Farmer' : 'Add New Farmer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Farmer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Daily Supply Capacity (Liters)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.daily_supply_capacity}
                onChange={(e) =>
                  setFormData({ ...formData, daily_supply_capacity: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.location_lat}
                  onChange={(e) =>
                    setFormData({ ...formData, location_lat: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.location_lng}
                  onChange={(e) =>
                    setFormData({ ...formData, location_lng: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingFarmer ? 'Update' : 'Create'} Farmer
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
        {farmers.map((farmer) => (
          <div
            key={farmer.id}
            className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">
                    {farmer.name}
                  </h3>
                  {farmer.contact && (
                    <p className="text-sm text-slate-600">{farmer.contact}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleActive(farmer)}
                className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  farmer.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {farmer.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {farmer.daily_supply_capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  <span className="text-slate-600">
                    <span className="font-medium">{farmer.daily_supply_capacity}</span>{' '}
                    Cans
                  </span>
                </div>
              )}

              {farmer.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600 line-clamp-2">{farmer.address}</span>
                </div>
              )}

              {farmer.location_lat && farmer.location_lng && (
                <div className="text-xs text-slate-500">
                  Coordinates: {farmer.location_lat.toFixed(4)}, {farmer.location_lng.toFixed(4)}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => handleEdit(farmer)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(farmer.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {farmers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No farmers yet</h3>
          <p className="text-slate-600 mb-4">
            Add farmers to start tracking milk suppliers
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Farmer
          </button>
        </div>
      )}
    </div>
  );
}
