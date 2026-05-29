import { api } from "./client";
import type { Job, JobListResponse } from "../types/job";

export const jobsApi = {
  search: (params: Record<string, string | number>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") query.set(k, String(v));
    });
    return api.get<JobListResponse>(`/jobs?${query.toString()}`);
  },
  getById: (id: string) => api.get<Job>(`/jobs/${id}`),
};
