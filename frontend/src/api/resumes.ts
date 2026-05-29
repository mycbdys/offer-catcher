import { api } from "./client";
import type { Resume } from "../types/resume";

export const resumesApi = {
  create: (raw_text: string, file_name: string) =>
    api.post<Resume>("/resumes", { raw_text, file_name }),
  list: () => api.get<Resume[]>("/resumes"),
  getById: (id: string) => api.get<Resume>(`/resumes/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Resume>(`/resumes/${id}`, data),
  delete: (id: string) => api.delete(`/resumes/${id}`),
};
