import { create } from "zustand";
import { api } from "../api/client";

interface User {
  id: string;
  email: string;
  nickname: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  loading: false,

  login: async (email, password) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/login", { email, password });
    api.setToken(res.access_token);
    set({ user: res.user, isLoggedIn: true });
  },

  register: async (email, password, nickname) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/register", { email, password, nickname });
    api.setToken(res.access_token);
    set({ user: res.user, isLoggedIn: true });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, isLoggedIn: false });
  },

  fetchUser: async () => {
    if (!api.getToken()) return;
    set({ loading: true });
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isLoggedIn: true });
    } catch {
      api.setToken(null);
      set({ user: null, isLoggedIn: false });
    } finally {
      set({ loading: false });
    }
  },
}));
