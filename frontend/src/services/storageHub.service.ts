// src/services/storageHub.service.ts
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const StorageHubService = {
  getAll: (params?: any) => api.get(API.storageHubs, { params }),
  getById: (id: number) => api.get(`${API.storageHubs}/${id}`),
  create: (data: any) => api.post(API.storageHubs, data), // POST /storage-hubs
  update: (id: number, data: any) => api.put(`${API.storageHubs}/${id}`, data),
  delete: (id: number) => api.delete(`${API.storageHubs}/${id}`),
  uploadExcel: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`${API.storageHubs}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
