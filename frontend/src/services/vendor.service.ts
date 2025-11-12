// src/services/vendor.service.ts
import { api } from "../lib/api-client";

export const VendorService = {
  async list() {
    const res = await api.get("/vendors");
    return res.data; // backend returns list
  },

  async create(data: any) {
    // Transform frontend fields to backend fields
    const payload = {
      vendor_name: data.vendor_name || data.name,
      village: data.village || data.address,
      latitude: data.latitude ?? data.location_lat,
      longitude: data.longitude ?? data.location_lng,
      contact_number: data.contact_number ?? data.contact,
      milk_quantity_cans: data.milk_quantity_cans ?? data.daily_supply_capacity,
    };
    const res = await api.post("/vendors", payload);
    return res.data;
  },

  async update(id: string | number, data: any) {
    const payload: any = {};

    if (data.vendor_name || data.name) payload.vendor_name = data.vendor_name || data.name;
    if (data.village || data.address) payload.village = data.village || data.address;
    if (data.latitude !== undefined || data.location_lat !== undefined) payload.latitude = data.latitude ?? data.location_lat;
    if (data.longitude !== undefined || data.location_lng !== undefined) payload.longitude = data.longitude ?? data.location_lng;
    if (data.contact_number || data.contact) payload.contact_number = data.contact_number || data.contact;
    if (data.milk_quantity_cans !== undefined || data.daily_supply_capacity !== undefined) payload.milk_quantity_cans = data.milk_quantity_cans ?? data.daily_supply_capacity;
    if (data.is_active !== undefined) payload.is_active = data.is_active;

    const res = await api.put(`/vendors/${id}`, payload);
    return res.data;
  },

  async remove(id: string | number) {
    const res = await api.delete(`/vendors/${id}`);
    return res.data;
  },
};
