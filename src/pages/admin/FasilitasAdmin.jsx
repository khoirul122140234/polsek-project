// src/pages/admin/FasilitasAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { RESOLVED_API_BASE } from "../../lib/env";
import { get, post, put, del, uploadImage } from "../../lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

/* ------------------------------ Utils ------------------------------ */
const cn = (...a) => a.filter(Boolean).join(" ");

const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-wide.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
};

// cache bust helper
const withBust = (url, bustKey) => {
  if (!url) return url;
  return url.includes("?")
    ? `${url}&v=${encodeURIComponent(bustKey)}`
    : `${url}?v=${encodeURIComponent(bustKey)}`;
};

// klasifikasi error dari api.js (toJsonOrThrow)
function classifyApiError(e) {
  const msg = String(e?.message || "");
  const lower = msg.toLowerCase();

  const is401 =
    lower.includes("unauthorized") ||
    msg.includes("HTTP 401") ||
    lower.includes("silakan login");
  const is403 =
    lower.includes("forbidden") ||
    msg.includes("HTTP 403") ||
    lower.includes("akses ditolak");

  return { is401, is403, msg: msg || "Terjadi kesalahan" };
}

/* ------------------------------ Modal ------------------------------ */
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
        {/* ✅ responsif: header stack di mobile */}
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="self-end rounded-full p-2 hover:bg-gray-100 sm:self-auto"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Form Fasilitas --------------------------- */
function FasilitasForm({ initial, onSubmit, onCancel, submitting, onBumpRev }) {
  const [form, setForm] = useState(initial || { title: "", description: "", image: "" });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [localRev, setLocalRev] = useState(Date.now());

  useEffect(() => {
    setForm(initial || { title: "", description: "", image: "" });
    setErrors({});
    setLocalRev(Date.now());
  }, [initial]);

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "Judul wajib diisi.";
    if (!form.description?.trim()) e.description = "Deskripsi wajib diisi.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpload = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const up = await uploadImage(file); // dari lib/api (sudah authHeaders + credentials)
      const url = up?.url || up?.items?.[0]?.url; // jaga-jaga kalau backend mengembalikan items[]
      if (!url) throw new Error("Upload berhasil tapi URL tidak ditemukan pada response server.");

      setField("image", url);
      const now = Date.now();
      setLocalRev(now);
      onBumpRev?.(now); // bust cache di tabel juga
    } catch (e) {
      alert(e?.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
      // ✅ reset input file agar bisa pilih file yg sama lagi
      if (ev?.target) ev.target.value = "";
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.({
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image || null,
    });
  };

  const previewUrl = form.image ? withBust(resolveImageUrl(form.image), localRev) : "";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Judul</label>
          <input
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.title ? "border-red-400" : "border-gray-300"
            )}
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Contoh: Ruang SPKT"
            disabled={submitting}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Gambar (upload)</label>

          {/* ✅ responsif: file input full width + teks tidak mepet */}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={submitting || uploading}
            className={cn(
              "block w-full text-sm",
              "file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm",
              "hover:file:bg-gray-50"
            )}
          />

          {form.image && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <img
                src={previewUrl}
                alt="preview"
                className="h-12 w-20 rounded border object-cover"
                onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
              />
              <span className="text-xs text-gray-500 whitespace-normal break-words overflow-wrap-anywhere">
                {form.image}
              </span>
            </div>
          )}

          {uploading && <p className="mt-1 text-xs text-gray-500">Mengunggah…</p>}
        </div>

        <div className="sm:col-span-2 flex flex-col">
          <label className="mb-1 text-sm font-medium">Deskripsi</label>
          <textarea
            rows={4}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.description ? "border-red-400" : "border-gray-300"
            )}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Tulis deskripsi fasilitas…"
            disabled={submitting}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>
      </div>

      {/* ✅ responsif: tombol full width di mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 sm:w-auto"
          disabled={submitting}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 sm:w-auto",
            submitting && "opacity-60"
          )}
        >
          <Save className="h-4 w-4" /> {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}

/* --------------------------- Confirm Dialog --------------------------- */
function ConfirmDialog({ open, onClose, onConfirm, loading, title, message }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || "Konfirmasi"}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 sm:w-auto"
            disabled={loading}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto",
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

/* ------------------------------ Halaman ------------------------------ */
export default function FasilitasAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [targetDelete, setTargetDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // global rev untuk bust cache di tabel setelah upload/simpan
  const [rev, setRev] = useState(Date.now());
  const bumpRev = (v) => setRev(typeof v === "number" ? v : Date.now());

  // fetch list
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const list = await get("/fasilitas");
        if (!alive) return;
        setRows(Array.isArray(list) ? list : []);
        bumpRev();
      } catch (e) {
        console.error(e);
        const { is401, is403, msg } = classifyApiError(e);

        if (is401) {
          alert("Sesi berakhir. Silakan login ulang.");
          window.location.href = "/admin/login";
          return;
        }
        if (is403) {
          setErr("Akses ditolak (Forbidden). Akun Anda tidak punya izin mengelola Fasilitas.");
          return;
        }

        setErr(msg || "Gagal memuat data fasilitas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // filter & pagination
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      !q
        ? true
        : [r.title, r.description]
            .filter(Boolean)
            .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const resetPagination = () => setPage(1);

  const openAdd = () => {
    setEditing(null);
    setOpenForm(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setOpenForm(true);
  };

  // submit create/update
  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      setErr("");

      if (editing) {
        const updated = await put(`/fasilitas/${editing.id}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      } else {
        const created = await post("/fasilitas", payload);
        setRows((prev) => [created, ...prev]);
      }

      setOpenForm(false);
      setEditing(null);
      bumpRev();
    } catch (e) {
      console.error(e);
      const { is401, is403, msg } = classifyApiError(e);

      if (is401) {
        alert("Sesi berakhir. Silakan login ulang.");
        window.location.href = "/admin/login";
        return;
      }
      if (is403) {
        alert("Forbidden: akun Anda tidak punya izin untuk menyimpan fasilitas.");
        return;
      }

      alert(msg || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  // delete
  const askDelete = (row) => {
    setTargetDelete(row);
    setOpenConfirm(true);
  };

  const confirmDelete = async () => {
    if (!targetDelete) return;
    try {
      setDeleting(true);
      await del(`/fasilitas/${targetDelete.id}`);
      setRows((prev) => prev.filter((r) => r.id !== targetDelete.id));
      setOpenConfirm(false);
      setTargetDelete(null);
      bumpRev();
    } catch (e) {
      console.error(e);
      const { is401, is403, msg } = classifyApiError(e);

      if (is401) {
        alert("Sesi berakhir. Silakan login ulang.");
        window.location.href = "/admin/login";
        return;
      }
      if (is403) {
        alert("Forbidden: akun Anda tidak punya izin untuk menghapus fasilitas.");
        return;
      }

      alert(msg || "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50">
      {/* ✅ wrapper responsif + padding konsisten */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola Fasilitas</h1>
            <p className="mt-1 text-sm text-gray-600">
              CRUD fasilitas: daftar, tambah, ubah, hapus, dan upload gambar.
            </p>
          </div>

          {/* ✅ tombol full width di mobile */}
          <div className="flex items-center gap-2 sm:justify-end">
            <button
              onClick={openAdd}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Tambah Fasilitas
            </button>
          </div>
        </div>

        {/* BAR KONTROL */}
        <div className="mb-4 w-full">
          {/* ✅ responsif: 1 kolom (mobile) -> 3 kolom (sm) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPagination();
                }}
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-black/20"
                placeholder="Cari judul / deskripsi…"
              />
            </div>

            {/* ✅ page size align rapi di mobile */}
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <label className="text-sm text-gray-600">Baris</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  resetPagination();
                }}
                className="w-28 rounded-lg border border-gray-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 sm:w-auto"
              >
                {[5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {err && (
          <div className="mb-4 w-full rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {err}
          </div>
        )}

        {/* =========================
           MOBILE VIEW (CARD LIST) ✅
           tampil < sm, table disembunyikan
        ========================= */}
        <div className="space-y-3 sm:hidden">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-gray-500">
              Memuat…
            </div>
          ) : paged.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-gray-500">
              Tidak ada data.
            </div>
          ) : (
            paged.map((r) => {
              const img = withBust(resolveImageUrl(r.image), rev);
              return (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-gray-200">
                      <img
                        src={img}
                        onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug whitespace-normal break-words overflow-wrap-anywhere">
                        {r.title}
                      </div>
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {r.description}
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
              );
            })
          )}
        </div>

        {/* =========================
           DESKTOP/TABLE VIEW ✅
           tampil >= sm
        ========================= */}
        <div className="hidden sm:block">
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {/* ✅ FIX: paksa wrap + top align agar teks panjang turun ke bawah, bukan melebar ke kanan */}
              <table
                className="min-w-full text-left text-sm"
                style={{ tableLayout: "fixed" }} // penting: mencegah kolom melebar karena konten panjang
              >
                {/* ✅ FIX: tetapkan lebar kolom biar stabil */}
                <colgroup>
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "220px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "180px" }} />
                </colgroup>

                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Gambar</th>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                        Memuat…
                      </td>
                    </tr>
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    paged.map((r) => {
                      const img = withBust(resolveImageUrl(r.image), rev);
                      return (
                        <tr key={r.id} className="border-t align-top">
                          <td className="px-4 py-3">
                            <div className="h-14 w-24 overflow-hidden rounded-lg ring-1 ring-gray-200">
                              <img
                                src={img}
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder-wide.jpg";
                                }}
                                alt={r.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </td>

                          {/* ✅ wrap + pecah kata panjang */}
                          <td className="px-4 py-3 font-semibold">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {r.title}
                            </div>
                          </td>

                          {/* ✅ wrap + pecah kata panjang */}
                          <td className="px-4 py-3">
                            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                              {r.description}
                            </div>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {/* ✅ responsif: stack di mobile, row di desktop */}
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-600">
                Menampilkan{" "}
                <span className="font-semibold">
                  {filtered.length === 0 ? 0 : (pageSafe - 1) * pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold">{Math.min(pageSafe * pageSize, filtered.length)}</span>{" "}
                dari <span className="font-semibold">{filtered.length}</span> data
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                    pageSafe <= 1
                      ? "cursor-not-allowed border-gray-200 text-gray-300"
                      : "border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-sm">
                  Hal {pageSafe} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm",
                    pageSafe >= totalPages
                      ? "cursor-not-allowed border-gray-200 text-gray-300"
                      : "border-gray-300 hover:bg-gray-50"
                  )}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: TAMBAH / EDIT */}
        <Modal
          open={openForm}
          onClose={() => {
            if (!submitting) {
              setOpenForm(false);
              setEditing(null);
            }
          }}
          title={editing ? "Edit Fasilitas" : "Tambah Fasilitas"}
        >
          <FasilitasForm
            key={editing ? `edit-${editing.id}` : `add-${rows.length}`}
            initial={
              editing
                ? { title: editing.title, description: editing.description, image: editing.image || "" }
                : null
            }
            onSubmit={handleSubmit}
            onCancel={() => {
              if (!submitting) {
                setOpenForm(false);
                setEditing(null);
              }
            }}
            submitting={submitting}
            onBumpRev={bumpRev}
          />
        </Modal>

        {/* DIALOG: HAPUS */}
        <ConfirmDialog
          open={openConfirm}
          onClose={() => {
            if (!deleting) {
              setOpenConfirm(false);
              setTargetDelete(null);
            }
          }}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Hapus Fasilitas"
          message={
            <>
              Yakin menghapus fasilitas <span className="font-semibold">{targetDelete?.title}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </>
          }
        />
      </div>
    </section>
  );
}
