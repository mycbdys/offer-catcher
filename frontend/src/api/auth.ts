import { api } from "./client";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: { id: string; email: string; nickname: string } }>("/auth/login", { email, password }),
  register: (email: string, password: string, nickname: string) =>
    api.post<{ access_token: string; user: { id: string; email: string; nickname: string } }>("/auth/register", { email, password, nickname }),
  me: () => api.get<{ id: string; email: string; nickname: string }>("/auth/me"),
};
