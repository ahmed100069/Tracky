import axios from "axios";

export const inferredApiUrl = (() => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }
  return "http://localhost:5000/api";
})();

export const api = axios.create({
  baseURL: inferredApiUrl,
  timeout: 8000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tracky_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const buildDashboardStreamUrl = () => {
  const token = localStorage.getItem("tracky_token");
  const base = inferredApiUrl.replace(/\/api$/, "");
  return `${base}/api/dashboard/stream?token=${encodeURIComponent(token || "")}`;
};
