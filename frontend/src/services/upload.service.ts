// src/services/upload.service.ts
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

export const UploadService = {
  uploadVendors: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return api.post(`${API.vendors}/upload`, f);
  },
  uploadHubs: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return api.post(`${API.storageHubs}/upload`, f);
  },
  uploadFleet: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return api.post(`${API.fleet}/upload`, f);
  },
};
