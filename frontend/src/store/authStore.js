import { create } from "zustand";
import { api } from "../lib/api.js";

const savedToken = localStorage.getItem("tracky_token");
const savedUser = localStorage.getItem("tracky_user");

export const useAuthStore = create((set) => ({
  token: savedToken || "",
  user: savedUser ? JSON.parse(savedUser) : null,
  loading: false,
  async login(payload) {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/login", payload);
      localStorage.setItem("tracky_token", data.token);
      localStorage.setItem("tracky_user", JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  async signup(payload) {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/signup", payload);
      localStorage.setItem("tracky_token", data.token);
      localStorage.setItem("tracky_user", JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout() {
    localStorage.removeItem("tracky_token");
    localStorage.removeItem("tracky_user");
    set({ token: "", user: null, loading: false });
  }
}));
