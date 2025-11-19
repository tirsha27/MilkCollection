//frontend/src/services/fleet.service.ts
import apiClient from "../lib/api-client";

export const FleetService = {
  async getAll() {
    return apiClient.get("/api/v1/fleet/");
  },
  async create(data: any) {
    return apiClient.post("/api/v1/fleet/", data);
  },
  async uploadExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/api/v1/fleet/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  async update(id: number, data: any) {
    return apiClient.put(`/api/v1/fleet/${id}`, data);
  },
  async delete(id: number) {
    return apiClient.delete(`/api/v1/fleet/${id}`);
  },
  async getStats() {
    return apiClient.get("/api/v1/fleet/stats");
  },
};
