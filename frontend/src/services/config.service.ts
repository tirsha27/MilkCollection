// src/services/config.service.ts
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const ConfigService = {
  getAll: () => api.get(API.config),
  update: (key: string, data: any) => api.put(`${API.config}/${key}`, data),
  addOption: (data: any) => api.post(`${API.config}/options`, data),
  deleteOption: (id: string) => api.delete(`${API.config}/options/${id}`),
};
