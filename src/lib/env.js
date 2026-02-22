// src/lib/env.js

// Base URL backend (tanpa /api), contoh: http://localhost:4000
const RAW =
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000";

// buang trailing slash agar aman
export const RESOLVED_API_BASE = String(RAW).replace(/\/+$/, "");

// prefix final (dipakai axios/fetch helper) => http://localhost:4000/api
export const RESOLVED_API_PREFIX = `${RESOLVED_API_BASE}/api`;

export const RESOLVED_VAPID_PUBLIC =
  import.meta.env.VITE_VAPID_PUBLIC ||
  "BC2wdn6U0AT28tiTO7OWpa0YLEyZp104EEMKaFanjykD5oCYoKVLhY2qFTPTVdXRRtTaiJ3tDOhuJmH-KJcntbs";

if (import.meta.env.DEV) {
  console.debug("[env] API_BASE:", RESOLVED_API_BASE);
  console.debug("[env] API_PREFIX:", RESOLVED_API_PREFIX);
}