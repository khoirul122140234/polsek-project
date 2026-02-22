// src/pages/admin/AnggotaAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Search, Filter,
  ChevronLeft, ChevronRight, Save, Edit
} from "lucide-react";
import { RESOLVED_API_BASE, RESOLVED_API_PREFIX } from "../../lib/env";

const cn = (...cls) => cls.filter(Boolean).join(" ");
const BASE = RESOLVED_API_BASE;
const API  = RESOLVED_API_PREFIX;

/* ===== Helpers Auth + HTTP ===== */
function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function readBodySafe(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { message: text }; }
}
async function toJsonOrThrow(res, fallback = "Request gagal") {
  if (!res.ok) {
    let msg = fallback;
    try {
      const j = await readBodySafe(res);
      msg = j?.error || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return readBodySafe(res);
}

// URL absolut utk path relatif dari backend
function resolveUrl(p) {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  return `${BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

// tambah timestamp utk bust cache
function withTs(url) {
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

/* ====== SORTING: KANIT paling atas (ADMIN) ====== */
function jabatanRank(jabatan) {
  const j = String(jabatan || "").toLowerCase();
  const isKanit = j.includes("kanit") || j.includes("ka unit") || j.includes("k a n i t");
  return isKanit ? 0 : 1;
}
function sortRows(arr = []) {
  return (arr || []).slice().sort((a, b) => {
    // 1) KANIT dulu
    const ra = jabatanRank(a?.jabatan);
    const rb = jabatanRank(b?.jabatan);
    if (ra !== rb) return ra - rb;

    // 2) optional: urut unit biar rapih (kalau mau)
    const ua = String(a?.unit?.name || "").toLowerCase();
    const ub = String(b?.unit?.name || "").toLowerCase();
    const ucmp = ua.localeCompare(ub, "id");
    if (ucmp !== 0) return ucmp;

    // 3) nama A-Z
    const na = String(a?.nama || "").toLowerCase();
    const nb = String(b?.nama || "").toLowerCase();
    return na.localeCompare(nb, "id");
  });
}

/* ===== API Client ===== */
async function apiListUnits() {
  const res = await fetch(withTs(`${API}/units`), { cache: "no-store" });
  return toJsonOrThrow(res, "Gagal memuat unit");
}
async function apiCreateUnit(name) {
  const res = await fetch(`${API}/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal menambah unit");
}
async function apiUpdateUnit(id, payload) {
  const res = await fetch(`${API}/units/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal mengubah unit");
}
async function apiUploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/uploads/image`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: fd,
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal mengunggah gambar"); // -> { url, path }
}
async function apiListAnggota(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API}/anggota${qs ? `?${qs}` : ""}`;
  const res = await fetch(withTs(url), { cache: "no-store" });
  return toJsonOrThrow(res, "Gagal memuat anggota");
}
async function apiCreateAnggota(payload) {
  const res = await fetch(`${API}/anggota`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal menambah anggota");
}
async function apiUpdateAnggota(id, payload) {
  const res = await fetch(`${API}/anggota/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal mengubah anggota");
}
async function apiDeleteAnggota(id) {
  const res = await fetch(`${API}/anggota/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  return toJsonOrThrow(res, "Gagal menghapus anggota");
}

/* ===== Modal ===== */
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ===== Form Unit (Create) ===== */
function UnitForm({ onSubmit, onCancel, submitting }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  function handleSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr("Nama unit wajib diisi.");
    onSubmit?.(n);
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-medium">Nama Unit</label>
        <input
          className={cn(
            "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
            err ? "border-red-400" : "border-gray-300"
          )}
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(""); }}
          placeholder="Contoh: Intelkam / Binmas"
        />
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90",
            submitting && "opacity-60"
          )}
        >
          <Plus className="h-4 w-4" /> {submitting ? "Menambahkan..." : "Tambah Unit"}
        </button>
      </div>
    </form>
  );
}

/* ===== Form Editor Unit ===== */
function UnitEditForm({ unit, onSaved, disabled, onBumpRev }) {
  const [name, setName] = useState(unit.name || "");
  const [description, setDescription] = useState(unit.description || "");
  const [logo, setLogo] = useState(unit.logo || "");
  const [rev, setRev] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await apiUploadImage(file);
      setLogo(url);
      setRev(Date.now());
    } catch (err) {
      alert(err.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        logo: logo || null,
      };
      const updated = await apiUpdateUnit(unit.id, payload);
      onSaved?.(updated);
      onBumpRev?.();
    } catch (err) {
      alert(err.message || "Gagal menyimpan unit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2 flex flex-col">
          <label className="mb-1 text-sm font-medium">Nama Unit</label>
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Logo (upload file)</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={disabled || uploading}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50"
            />
          </div>
          {(logo) && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={`${resolveUrl(logo)}?v=${rev}`}
                alt="preview"
                className="h-12 w-12 rounded border object-contain"
                onError={(e)=>{e.currentTarget.src="/placeholder-logo.png"}}
              />
              <span className="text-xs text-gray-500 break-all">{logo}</span>
            </div>
          )}
          {uploading && <p className="mt-1 text-xs text-gray-500">Mengunggah…</p>}
        </div>

        <div className="sm:col-span-3 flex flex-col">
          <label className="mb-1 text-sm font-medium">Deskripsi / Penjelasan</label>
          <textarea
            rows={4}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            placeholder="Tulis penjelasan singkat tentang unit ini…"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={disabled || saving}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90",
            (disabled || saving) && "opacity-60"
          )}
        >
          <Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}

/* ===== Form Anggota ===== */
function AnggotaForm({ initial, units, onSubmit, onCancel, submitting, onOpenAddUnit, onBumpRev }) {
  const [form, setForm] = useState(
    initial || { nama: "", jabatan: "", unit_id: units?.[0]?.id || "", foto_url: "" }
  );
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [rev, setRev] = useState(Date.now());

  useEffect(() => {
    if (!form.unit_id && units?.length) {
      setForm((p) => ({ ...p, unit_id: units[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const e = {};
    if (!form.nama?.trim()) e.nama = "Nama wajib diisi.";
    if (!form.jabatan?.trim()) e.jabatan = "Jabatan wajib diisi.";
    if (!form.unit_id) e.unit_id = "Unit wajib dipilih.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { url } = await apiUploadImage(file);
      setField("foto_url", url);
      setRev(Date.now());   // preview form
      onBumpRev?.();        // bust cache global
    } catch (err) {
      alert(err.message || "Gagal upload foto");
    } finally {
      setUploading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      nama: form.nama.trim(),
      jabatan: form.jabatan.trim(),
      unit_id: Number(form.unit_id),
      foto_url: form.foto_url || null,
    };
    onSubmit?.(payload);
    onBumpRev?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Nama</label>
          <input
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.nama ? "border-red-400" : "border-gray-300"
            )}
            value={form.nama}
            onChange={(e) => setField("nama", e.target.value)}
            placeholder="Nama lengkap"
          />
          {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Jabatan</label>
          <input
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.jabatan ? "border-red-400" : "border-gray-300"
            )}
            value={form.jabatan}
            onChange={(e) => setField("jabatan", e.target.value)}
            placeholder="Kanit / Penyidik / Anggota"
          />
          {errors.jabatan && <p className="mt-1 text-xs text-red-600">{errors.jabatan}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Unit</label>
          <select
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.unit_id ? "border-red-400" : "border-gray-300"
            )}
            value={form.unit_id}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__ADD_UNIT__") return onOpenAddUnit?.();
              setField("unit_id", v);
            }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
            <option value="__ADD_UNIT__">+ Tambah unit baru…</option>
          </select>
          {errors.unit_id && <p className="mt-1 text-xs text-red-600">{errors.unit_id}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Foto Anggota (upload file)</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading || submitting}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50"
            />
          </div>
          {form.foto_url && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={`${resolveUrl(form.foto_url)}?v=${rev}`}
                alt="preview"
                className="h-12 w-12 rounded border object-cover"
                onError={(e)=>{e.currentTarget.src="/placeholder-person.jpg"}}
              />
              <span className="text-xs text-gray-500 break-all">{form.foto_url}</span>
            </div>
          )}
          {uploading && <p className="mt-1 text-xs text-gray-500">Mengunggah…</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onOpenAddUnit}
          className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50"
        >
          + Tambah Unit
        </button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90",
              submitting && "opacity-60"
            )}
          >
            <Save className="h-4 w-4" /> {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ===== Dialog Konfirmasi ===== */
function ConfirmDialog({ open, onClose, onConfirm, loading, title, message }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || "Konfirmasi"}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "w-full sm:w-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700",
              loading && "opacity-60"
            )}
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-700">{message}</p>
    </Modal>
  );
}

/* ===== Halaman Utama ===== */
export default function AnggotaAdmin() {
  const [units, setUnits] = useState([]);
  const [rows, setRows] = useState([]);

  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [targetDelete, setTargetDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [openUnit, setOpenUnit] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  const [openManageUnit, setOpenManageUnit] = useState(false);
  const [unitBeingEdit, setUnitBeingEdit] = useState(null);

  // versi global untuk bust cache gambar
  const [rev, setRev] = useState(Date.now());
  const bumpRev = () => setRev(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, a] = await Promise.all([apiListUnits(), apiListAnggota()]);
        if (!alive) return;
        setUnits(u);
        setRows(a);
        bumpRev();
      } catch (e) {
        console.error(e);
        if (String(e.message || "").includes("Unauthorized")) {
          alert("Sesi berakhir. Silakan login ulang.");
          window.location.href = "/admin/login";
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const onlyFiltered = rows.filter((r) => {
      const matchUnit = unitFilter ? String(r.unit_id) === String(unitFilter) : true;
      const matchQuery = q
        ? [r.nama, r.jabatan, r.unit?.name].filter(Boolean).some(s => String(s).toLowerCase().includes(q))
        : true;
      return matchUnit && matchQuery;
    });

    // ✅ KANIT paling atas di hasil akhir
    return sortRows(onlyFiltered);
  }, [rows, query, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  function resetPagination() { setPage(1); }
  function openAdd() { setEditing(null); setOpenForm(true); }
  function openEdit(row) { setEditing(row); setOpenForm(true); }

  async function handleSubmit(payload) {
    try {
      setSubmitting(true);
      if (editing) {
        const updated = await apiUpdateAnggota(editing.id, payload);
        setRows((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      } else {
        const created = await apiCreateAnggota(payload);
        setRows((prev) => [created, ...prev]);
      }
      setOpenForm(false);
      setEditing(null);
      bumpRev();
    } catch (e) {
      console.error(e);
      alert(e.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  function askDelete(row) { setTargetDelete(row); setOpenConfirm(true); }
  async function confirmDelete() {
    if (!targetDelete) return;
    try {
      setDeleting(true);
      await apiDeleteAnggota(targetDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== targetDelete.id));
      setOpenConfirm(false);
      setTargetDelete(null);
      bumpRev();
    } catch (e) {
      console.error(e);
      alert(e.message || "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenAddUnit() { setOpenUnit(true); }
  async function handleCreateUnit(name) {
    try {
      setAddingUnit(true);
      const dupe = units.some((u) => u.name.toLowerCase() === name.toLowerCase());
      if (dupe) { alert("Unit sudah ada."); setAddingUnit(false); return; }
      const created = await apiCreateUnit(name);
      setUnits((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "id")));
      setOpenUnit(false);
      bumpRev();
    } catch (e) {
      console.error(e);
      alert(e.message || "Gagal menambah unit");
    } finally {
      setAddingUnit(false);
    }
  }

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
      {/* HEADER */}
      <div className="mx-auto mb-6 w-full max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola Anggota</h1>
            <p className="mt-1 text-sm text-gray-600">
              Tabel anggota lintas unit dengan pencarian, filter, paginasi, dan form modal.
            </p>
          </div>

          {/* ✅ responsif: tombol jadi stack di mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={handleOpenAddUnit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" /> Tambah Unit
            </button>
            <button
              onClick={() => setOpenManageUnit(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" /> Kelola Unit
            </button>
            <button
              onClick={openAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90"
            >
              <Plus className="h-4 w-4" /> Tambah Anggota
            </button>
          </div>
        </div>
      </div>

      {/* BAR KONTROL */}
      <div className="mx-auto mb-4 w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPagination(); }}
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Cari nama / jabatan / unit…"
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Filter className="h-4 w-4" />
            </span>
            <select
              value={unitFilter}
              onChange={(e) => { setUnitFilter(e.target.value); resetPagination(); }}
              className="w-full appearance-none rounded-xl border border-gray-300 py-2.5 pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-black/20"
            >
              <option value="">Semua Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">▼</span>
          </div>

          {/* ✅ responsif: rata kiri di mobile, rata kanan di desktop */}
          <div className="flex items-center justify-start gap-2 sm:justify-end">
            <label className="text-sm text-gray-600">Baris per halaman</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); resetPagination(); }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
            >
              {[5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* LIST MOBILE (tanpa scroll horizontal) */}
      <div className="mx-auto w-full max-w-7xl sm:hidden">
        {paged.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Tidak ada data.
          </div>
        ) : (
          <div className="space-y-3">
            {paged.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl ring-1 ring-gray-200 shrink-0">
                    <img
                      src={`${resolveUrl(r.foto_url) || "/placeholder-person.jpg"}?v=${rev}`}
                      onError={(e) => { e.currentTarget.src = "/placeholder-person.jpg"; }}
                      alt={r.nama}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 break-words">{r.nama}</div>
                    <div className="mt-1 text-sm text-gray-600 break-words">{r.jabatan}</div>
                    <div className="mt-2">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium">
                        {r.unit?.name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    onClick={() => askDelete(r)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION MOBILE */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-600">
              Menampilkan{" "}
              <span className="font-semibold">
                {filtered.length === 0 ? 0 : (pageSafe - 1) * pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold">{Math.min(pageSafe * pageSize, filtered.length)}</span>{" "}
              dari <span className="font-semibold">{filtered.length}</span> data
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm",
                  pageSafe <= 1 ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 hover:bg-gray-50"
                )}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm",
                  pageSafe >= totalPages ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 hover:bg-gray-50"
                )}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm text-gray-700">
              Hal <span className="font-semibold">{pageSafe}</span> / <span className="font-semibold">{totalPages}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABEL DESKTOP (sm+) */}
      <div className="mx-auto hidden w-full max-w-7xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg ring-1 ring-gray-200">
                      <img
                        src={`${resolveUrl(r.foto_url) || "/placeholder-person.jpg"}?v=${rev}`}
                        onError={(e) => { e.currentTarget.src = "/placeholder-person.jpg"; }}
                        alt={r.nama}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="font-semibold">{r.nama}</div></td>
                  <td className="px-4 py-3">{r.jabatan}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium">
                      {r.unit?.name || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => askDelete(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION DESKTOP */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-xs text-gray-600">
            Menampilkan <span className="font-semibold">{filtered.length === 0 ? 0 : (pageSafe - 1) * pageSize + 1}</span>{" "}
            - <span className="font-semibold">{Math.min(pageSafe * pageSize, filtered.length)}</span>{" "}
            dari <span className="font-semibold">{filtered.length}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                pageSafe <= 1 ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 hover:bg-gray-50"
              )}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-sm">Hal {pageSafe} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                pageSafe >= totalPages ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 hover:bg-gray-50"
              )}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: TAMBAH / EDIT ANGGOTA */}
      <Modal
        open={openForm}
        onClose={() => { if (!submitting) { setOpenForm(false); setEditing(null); } }}
        title={editing ? "Edit Anggota" : "Tambah Anggota"}
      >
        <AnggotaForm
          key={editing ? `edit-${editing.id}` : `add-${units.length}`}
          initial={editing ? {
            nama: editing.nama,
            jabatan: editing.jabatan,
            unit_id: editing.unit_id,
            foto_url: editing.foto_url || ""
          } : null}
          units={units}
          onSubmit={handleSubmit}
          onCancel={() => { if (!submitting) { setOpenForm(false); setEditing(null); } }}
          submitting={submitting}
          onOpenAddUnit={handleOpenAddUnit}
          onBumpRev={bumpRev}
        />
      </Modal>

      {/* DIALOG: HAPUS */}
      <ConfirmDialog
        open={openConfirm}
        onClose={() => { if (!deleting) { setOpenConfirm(false); setTargetDelete(null); } }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Hapus Anggota"
        message={<>Yakin menghapus anggota <span className="font-semibold">{targetDelete?.nama}</span>? Tindakan ini tidak dapat dibatalkan.</>}
      />

      {/* MODAL: TAMBAH UNIT */}
      <Modal open={openUnit} onClose={() => { if (!addingUnit) setOpenUnit(false); }} title="Tambah Unit">
        <UnitForm
          onSubmit={handleCreateUnit}
          onCancel={() => { if (!addingUnit) setOpenUnit(false); }}
          submitting={addingUnit}
        />
      </Modal>

      {/* MODAL: KELOLA UNIT */}
      <Modal
        open={openManageUnit}
        onClose={() => { setOpenManageUnit(false); setUnitBeingEdit(null); }}
        title={unitBeingEdit ? "Edit Unit" : "Kelola Unit"}
      >
        {!unitBeingEdit ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Pilih unit untuk diedit.</div>
            <div className="divide-y rounded-xl border">
              {units.map((u) => (
                <div key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.logo ? `${resolveUrl(u.logo)}?v=${rev}` : "/placeholder-logo.png"}
                      alt={u.name}
                      className="h-10 w-10 rounded border object-contain shrink-0"
                      onError={(e)=>{e.currentTarget.src="/placeholder-logo.png"}}
                    />
                    <div className="min-w-0">
                      <div className="font-medium break-words">{u.name}</div>
                      <div className="text-xs text-gray-500 break-words">{u.description || "—"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUnitBeingEdit(u)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <UnitEditForm
            unit={unitBeingEdit}
            disabled={false}
            onSaved={(updated) => {
              setUnits((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setUnitBeingEdit(null);
              // update label unit di tabel anggota jika namanya berubah
              setRows((prev) =>
                prev.map((r) =>
                  r.unit_id === updated.id ? { ...r, unit: { ...(r.unit || {}), name: updated.name } } : r
                )
              );
              setOpenManageUnit(false);
            }}
            onBumpRev={bumpRev}
          />
        )}
      </Modal>
    </section>
  );
}
