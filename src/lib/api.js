// src/lib/api.js
import { RESOLVED_API_PREFIX } from "./env";
import { authHeaders } from "./auth";

/**
 * Baca response body dengan aman (json / text)
 */
async function readBodySafe(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * Ambil error message yang konsisten
 */
async function toJsonOrThrow(res, fallback = "Request gagal") {
  const data = await readBodySafe(res);

  if (!res.ok) {
    const msg = data?.error || data?.message || fallback || `HTTP ${res.status}`;

    if (res.status === 401) {
      throw new Error(msg || "Unauthorized (silakan login ulang)");
    }
    if (res.status === 403) {
      throw new Error(msg || "Forbidden (akses ditolak)");
    }

    throw new Error(msg);
  }

  return data;
}

function makeUrl(path) {
  return path.startsWith("/")
    ? `${RESOLVED_API_PREFIX}${path}`
    : `${RESOLVED_API_PREFIX}/${path}`;
}

function qs(obj = {}) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * ✅ pastikan cookie ikut terkirim (kalau auth pakai cookie)
 */
function withCred(init = {}) {
  return { ...init, credentials: "include" };
}

/**
 * ✅ Header auth:
 * - ambil dari authHeaders()
 * - tetap aman walau kamu pakai cookie
 */
function buildHeaders(initHeaders = {}, isForm = false) {
  return {
    ...(initHeaders || {}),
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...authHeaders(),
  };
}

/**
 * ✅ Normalisasi init supaya mirip axios:
 * - support init.params -> jadi querystring
 * - buang params dari init agar tidak ikut masuk fetch option
 */
function normalizeInit(init = {}) {
  const { params, ...rest } = init || {};
  return { params: params || null, init: rest };
}

/**
 * Request wrapper
 */
async function request(method, path, body, init = {}) {
  const isForm = body instanceof FormData;

  const norm = normalizeInit(init);
  const finalPath = norm.params ? `${path}${qs(norm.params)}` : path;

  const res = await fetch(makeUrl(finalPath), {
    ...withCred(norm.init),
    method,
    headers: buildHeaders(norm.init?.headers, isForm),
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : isForm
        ? body
        : JSON.stringify(body ?? {}),
  });

  return toJsonOrThrow(res);
}

/* =====================
   HTTP Methods
===================== */
export function get(path, init = {}) {
  return request("GET", path, undefined, init);
}

export function post(path, body, init = {}) {
  return request("POST", path, body, init);
}

export function put(path, body, init = {}) {
  return request("PUT", path, body, init);
}

export function patch(path, body, init = {}) {
  return request("PATCH", path, body, init);
}

export function del(path, init = {}) {
  return request("DELETE", path, undefined, init);
}

/* =====================================================
   ✅ UPLOAD MULTI GAMBAR (field name: "file")
   - terima 1 file atau array file
   - backend: upload.array("file", 5)
   - response: { url, path, items: [...] }
===================================================== */
export async function uploadImage(files) {
  const arr = Array.isArray(files) ? files : [files];
  const clean = arr.filter(Boolean);

  if (!clean.length) {
    throw new Error("Pilih minimal 1 gambar untuk diunggah.");
  }

  const fd = new FormData();
  clean.slice(0, 5).forEach((f) => fd.append("file", f));
  return post("/uploads/image", fd);
}

/* =====================================================
   ✅ BARU: UPLOAD DOKUMEN (PDF/DOC/DOCX) (field name: "file")
   - backend: POST /api/uploads/document (SUPER_ADMIN)
   - response: { url, path, filename, ... }
===================================================== */
export async function uploadDocument(file) {
  if (!file) throw new Error("Pilih 1 dokumen untuk diunggah.");
  const fd = new FormData();
  fd.append("file", file);
  return post("/uploads/document", fd);
}

/* =====================
   API spesifik
===================== */
export const api = {
  // core
  get,
  post,
  put,
  patch,
  del,

  // ✅ alias biar kompatibel seperti axios usage
  delete: del,

  // Auth
  login: (email, password) => post("/auth/login", { email, password }),

  // Units
  listUnits: () => get("/units"),
  createUnit: (name) => post("/units", { name }),
  updateUnit: (id, data) => put(`/units/${id}`, data),
  deleteUnit: (id) => del(`/units/${id}`),

  // Anggota
  listAnggota: (params = {}) =>
    get(`/anggota${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`),
  createAnggota: (payload) => post("/anggota", payload),
  updateAnggota: (id, payload) => put(`/anggota/${id}`, payload),
  deleteAnggota: (id) => del(`/anggota/${id}`),

  // Leader profiles
  getProfiles: () => get("/leader-profiles"),
  getProfile: (roleKey) => get(`/leader-profiles/${roleKey}`),
  updateProfile: (roleKey, payload) => put(`/leader-profiles/${roleKey}`, payload),

  // Fasilitas
  listFasilitas: () => get("/fasilitas"),
  createFasilitas: (payload) => post("/fasilitas", payload),
  updateFasilitas: (id, payload) => put(`/fasilitas/${id}`, payload),
  deleteFasilitas: (id) => del(`/fasilitas/${id}`),

  // Berita
  listBerita: (params = {}) => get(`/berita${qs(params)}`),
  getBeritaById: (id) => get(`/berita/id/${id}`),
  getBeritaBySlug: (slug) => get(`/berita/${slug}`),
  createBerita: (payload) => post("/berita", payload),
  updateBerita: (id, payload) => put(`/berita/${id}`, payload),
  deleteBerita: (id) => del(`/berita/${id}`),
  addBeritaView: (slug) => post(`/berita/${slug}/view`, {}),
  addBeritaShare: (slug) => post(`/berita/${slug}/share`, {}),

  // Edukasi
  listEdukasi: (params = {}) => get(`/edukasi${qs(params)}`),
  getEdukasiById: (id) => get(`/edukasi/id/${id}`),
  getEdukasiBySlug: (slug) => get(`/edukasi/${slug}`),
  createEdukasi: (payload) => post("/edukasi", payload),
  updateEdukasi: (id, payload) => put(`/edukasi/${id}`, payload),
  deleteEdukasi: (id) => del(`/edukasi/${id}`),
  addEdukasiView: (slug) => post(`/edukasi/${slug}/view`, {}),
  addEdukasiShare: (slug) => post(`/edukasi/${slug}/share`, {}),

  // Upload
  uploadImage,
  uploadDocument,

  // Pelaporan Online
  submitPelaporanOnline: (formData) => post("/laporan/pelaporan-online", formData),
  cekStatusPelaporanOnline: (code) => get(`/laporan/pelaporan-online/status${qs({ code })}`),
  adminListPelaporanOnline: (params = {}) => get(`/laporan/admin/pelaporan-online${qs(params)}`),
  adminUpdateStatusPelaporanOnline: (id, payload) =>
    patch(`/laporan/admin/pelaporan-online/${id}/status`, payload),
  adminDeletePelaporanOnline: (id) => del(`/laporan/admin/pelaporan-online/${id}`),

  // ✅ BARU: Dokumen (Admin SUPER_ADMIN)
  adminListDocuments: (params = {}) => get(`/documents${qs(params)}`),
  adminCreateDocument: (payload) => post(`/documents`, payload),
  adminUpdateDocument: (id, payload) => patch(`/documents/${id}`, payload),
  adminDeleteDocument: (id) => del(`/documents/${id}`),

  // Admin users
  adminListUsers: (params = {}) => get(`/admin/users${qs(params)}`),
  adminCreateUser: (payload) => post("/admin/users", payload),
  adminUpdateUser: (id, payload) => patch(`/admin/users/${id}`, payload),
  adminResetUserPassword: (id, payload) => patch(`/admin/users/${id}/password`, payload),
  adminDeactivateUser: (id) => del(`/admin/users/${id}`),
};
