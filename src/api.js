import axios from "axios";

export const api = axios.create({
  baseURL: "https://proyecto-5v-backend.onrender.com/api"
});

// token automático
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["ngrok-skip-browser-warning"] = "true";
  return config;
});