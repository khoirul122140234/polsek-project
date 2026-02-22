// src/lib/axios.js
import axios from "axios";
import { getToken, clearAuth } from "./auth";
import { RESOLVED_API_PREFIX } from "./env";

export const api = axios.create({
  baseURL: RESOLVED_API_PREFIX, // harus: http://localhost:4000/api
  withCredentials: false,
});

if (import.meta.env.DEV) {
  // ini penting: biar kamu lihat dia nembak kemana
  console.debug("[axios] baseURL =", RESOLVED_API_PREFIX);
}

api.interceptors.request.use((cfg) => {
  try {
    const t = getToken();
    if (t) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${t}`;
    }

    // kalau payload object biasa (bukan FormData), set JSON
    if (cfg.data && typeof FormData !== "undefined" && !(cfg.data instanceof FormData)) {
      cfg.headers = cfg.headers || {};
      if (!cfg.headers["Content-Type"]) cfg.headers["Content-Type"] = "application/json";
    }
  } catch {}
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      clearAuth();
      try {
        if (typeof window !== "undefined") {
          const path = window.location.pathname || "";
          if (path.startsWith("/admin")) window.location.replace("/login-admin");
        }
      } catch {}
    }
    return Promise.reject(err);
  }
);

export function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);

  return api.post("/uploads/image", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}