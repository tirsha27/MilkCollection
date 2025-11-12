import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const DashboardService = {
  getStats: async () => {
    try {
      const [vendors, hubs, fleet] = await Promise.all([
        api.get(`${API.vendors}/stats`),
        api.get(`${API.storageHubs}/stats`),
        api.get(`${API.fleet}/stats`),
      ]);

      return {
        vendors: vendors.data,
        hubs: hubs.data,
        fleet: fleet.data,
      };
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },
};
