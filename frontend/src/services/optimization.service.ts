// src/services/optimization.service.ts
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const OptimizationService = {
  // Run Optimization
  runOptimization: async (deadlineMinutes?: number, maxDistanceKm?: number) => {
    const params = new URLSearchParams();
    if (deadlineMinutes) params.append("deadline_minutes", String(deadlineMinutes));
    if (maxDistanceKm) params.append("max_distance_km", String(maxDistanceKm));
    const url = `${API.optimization}/run${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await api.post(url);
    return res.data;
  },

  // ✅ Get all machine-generated optimizations
  getRuns: async () => {
    const res = await api.get(`${API.optimization}/runs`);
    return res.data;
  },

  // ✅ Get all manual (drag-drop) optimizations
  getManualRuns: async () => {
    const res = await api.get(`${API.optimization}/manual`);
    return res.data;
  },

  // Other existing functions
  categorizeFleet: async () => {
    const res = await api.post(`${API.optimization}/categorize-fleet`);
    return res.data;
  },

  previewTransformation: async () => {
    const res = await api.get(`${API.optimization}/preview-transformation`);
    return res.data;
  },
};
