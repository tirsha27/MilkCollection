import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const DashboardService = {
  getStats: async () => {
    try {
      const res = await api.get(API.dashboard);
      return res.data;
    } catch (error) {
      console.error("Dashboard error:", error);
      throw error;
    }
  },
};
