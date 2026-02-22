// src/pages/admin/BeritaAdmin.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  XCircle,
} from "lucide-react";

/* =========================== Utils =========================== */
const cn = (...a) => a.filter(Boolean).join(" ");
const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-wide.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
};
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 140);

// ✅ AUTO RINGKASAN dari KONTEN (1 klik)
const makeExcerptFromContent = (content, maxLen = 200) => {
  const raw = String(content || "");
  if (!raw.trim()) return "";

  // hilangkan tag HTML sederhana bila ada
  const noTags = raw.replace(/<[^>]*>/g, " ");

  // rapikan whitespace + buang baris berlebih
  const clean = noTags
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!clean) return "";

  // coba ambil 1-2 kalimat awal kalau ada tanda titik
  const normalized = clean.replace(/\n+/g, " ");
  const parts = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);

  let candidate = "";
  if (parts.length >= 2) {
    candidate = `${parts[0]} ${parts[1]}`.trim();
  } else {
    candidate = parts[0] || normalized;
  }

  // potong aman
  if (candidate.length <= maxLen) return candidate;

  const cut = candidate.slice(0, maxLen).trimEnd();
  // jangan berhenti di tengah kata
  const safe = cut.replace(/\s+\S*$/, "").trimEnd();
  return (safe || cut).replace(/[,\s]+$/g, "").trimEnd() + "…";
};

// ✅ TAMPILKAN RINGKASAN SEDIKIT + "......"
const truncateExcerpt = (text, maxLen = 60) => {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen).trimEnd();
  const safe = cut.replace(/\s+\S*$/, "").trimEnd();
  return (safe || cut).replace(/[,\s]+$/g, "").trimEnd() + "......";
};

const months = [
  { v: "", label: "Semua Bulan" },
  { v: "1", label: "Januari" },
  { v: "2", label: "Februari" },
  { v: "3", label: "Maret" },
  { v: "4", label: "April" },
  { v: "5", label: "Mei" },
  { v: "6", label: "Juni" },
  { v: "7", label: "Juli" },
  { v: "8", label: "Agustus" },
  { v: "9", label: "September" },
  { v: "10", label: "Oktober" },
  { v: "11", label: "November" },
  { v: "12", label: "Desember" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
yearOptions.unshift("");

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(iso);
  }
};

/* =========================== Modal Shell =========================== */
function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
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

/* =========================== Form Berita =========================== */
function BeritaForm({ initial, onSubmit, onCancel, submitting }) {
  const MAX_IMAGES = 5;

  const [form, setForm] = useState(
    initial || {
      title: "",
      slug: "",
      date: new Date().toISOString().slice(0, 10),
      image: "",
      images: [],
      excerpt: "",
      content: "",
      popularity: 0,
    }
  );

  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  // cache-bust untuk preview
  const [rev, setRev] = useState(Date.now());

  const fileRef = useRef(null);

  // FIX STALE COUNT: pakai ref agar handleUpload selalu baca jumlah terbaru
  const imagesRef = useRef([]);
  useEffect(() => {
    imagesRef.current = Array.isArray(form.images) ? form.images : [];
  }, [form.images]);

  useEffect(() => {
    setForm(
      initial || {
        title: "",
        slug: "",
        date: new Date().toISOString().slice(0, 10),
        image: "",
        images: [],
        excerpt: "",
        content: "",
        popularity: 0,
      }
    );
    setErrors({});
    setRev(Date.now());
    if (fileRef.current) fileRef.current.value = "";
  }, [initial]);

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "Judul wajib diisi.";
    if (!form.slug?.trim()) e.slug = "Slug wajib diisi.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) e.date = "Tanggal tidak valid (YYYY-MM-DD).";
    if (!form.excerpt?.trim()) e.excerpt = "Ringkasan wajib diisi.";
    if (!form.content?.trim()) e.content = "Konten wajib diisi.";
    if (form.popularity !== "" && isNaN(Number(form.popularity))) e.popularity = "Popularitas harus angka.";
    if ((form.images?.length || 0) > MAX_IMAGES) e.images = `Maksimal ${MAX_IMAGES} gambar.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const autoSlug = () => setField("slug", slugify(form.title));

  // ✅ 1 klik: ambil ringkasan dari konten
  const autoExcerpt = () => {
    const ex = makeExcerptFromContent(form.content, 200);
    if (!ex) {
      setErrors((e) => ({ ...e, excerpt: "Konten masih kosong, tidak bisa membuat ringkasan otomatis." }));
      return;
    }
    setField("excerpt", ex);
  };

  const openPicker = () => fileRef.current?.click();

  const removeImageAt = (idx) => {
    const next = (form.images || []).filter((_, i) => i !== idx);
    setField("images", next);
    setField("image", next[0] || "");
    setRev(Date.now());
    if (fileRef.current) fileRef.current.value = "";
  };

  const moveImage = (from, to) => {
    if (to < 0 || to >= (form.images?.length || 0)) return;
    const arr = [...(form.images || [])];
    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
    setField("images", arr);
    setField("image", arr[0] || "");
  };

  const handleUpload = async (ev) => {
    const files = Array.from(ev.target.files || []);

    // user cancel picker
    if (!files.length) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const currentCount = imagesRef.current.length;
    const remain = Math.max(0, MAX_IMAGES - currentCount);

    // kalau sudah penuh, jangan kirim request kosong
    if (remain <= 0) {
      alert(`Maksimal ${MAX_IMAGES} gambar. Hapus dulu salah satu gambar untuk mengganti.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const slice = files.slice(0, remain);
    if (!slice.length) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    try {
      setUploading(true);

      const res = await uploadImage(slice);

      const uploaded = Array.isArray(res?.items)
        ? res.items.map((it) => it.url).filter(Boolean)
        : res?.url
        ? [res.url]
        : [];

      if (!uploaded.length) {
        throw new Error("Upload berhasil tapi URL gambar tidak ditemukan.");
      }

      const next = [...imagesRef.current, ...uploaded].slice(0, MAX_IMAGES);
      setField("images", next);
      setField("image", next[0] || "");
      setRev(Date.now());
    } catch (e) {
      alert(e?.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.({
      title: form.title.trim(),
      slug: form.slug.trim(),
      date: form.date,
      image: (form.images?.[0] || form.image || null) ?? null,
      images: (form.images || []).slice(0, MAX_IMAGES),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      popularity: Number(form.popularity) || 0,
    });
  };

  const imgCount = form.images?.length || 0;

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
            placeholder="Judul berita…"
            disabled={submitting}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Slug</label>
          {/* ✅ responsif: stack di mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <input
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
                errors.slug ? "border-red-400" : "border-gray-300"
              )}
              value={form.slug}
              onChange={(e) => setField("slug", slugify(e.target.value))}
              placeholder="slug-berita"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={autoSlug}
              className="w-full sm:w-auto shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50"
            >
              Auto
            </button>
          </div>
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Tanggal</label>
          <input
            type="date"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.date ? "border-red-400" : "border-gray-300"
            )}
            value={form.date}
            onChange={(e) => setField("date", e.target.value)}
            disabled={submitting}
          />
          {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium">Popularitas (angka)</label>
          <input
            type="number"
            min="0"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.popularity ? "border-red-400" : "border-gray-300"
            )}
            value={form.popularity}
            onChange={(e) => setField("popularity", e.target.value)}
            disabled={submitting}
          />
          {errors.popularity && <p className="mt-1 text-xs text-red-600">{errors.popularity}</p>}
        </div>

        {/* ========== UPLOAD MULTI GAMBAR (MAX 5) ========== */}
        <div className="sm:col-span-2">
          <label className="mb-1 text-sm font-medium">Gambar (maks {MAX_IMAGES})</label>

          {/* ✅ responsif: stack di mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={submitting || uploading || imgCount >= MAX_IMAGES}
              className="hidden"
            />
            <button
              type="button"
              onClick={openPicker}
              disabled={submitting || uploading || imgCount >= MAX_IMAGES}
              className={cn(
                "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50",
                (submitting || uploading || imgCount >= MAX_IMAGES) && "opacity-60 cursor-not-allowed"
              )}
            >
              <ImagePlus className="h-4 w-4" /> Tambah Gambar
            </button>
            <span className="text-xs text-gray-500">
              {uploading ? "Mengunggah…" : `Terpilih ${imgCount} / ${MAX_IMAGES}`}
            </span>
          </div>

          {/* preview grid */}
          {imgCount > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {form.images.map((src, idx) => (
                <div key={`${src}-${idx}`} className="relative overflow-hidden rounded-lg ring-1 ring-gray-200">
                  <img
                    src={`${resolveImageUrl(src)}?v=${Date.now()}`}
                    alt={`img-${idx + 1}`}
                    className="h-28 w-full object-cover"
                    onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/40 px-1 py-1">
                    <div className="rounded bg-black/40 px-1 text-[10px] text-white">
                      {idx + 1}/{MAX_IMAGES}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx - 1)}
                        disabled={idx === 0}
                        className={cn(
                          "rounded p-1 text-white/90 hover:bg-white/10",
                          idx === 0 && "cursor-not-allowed opacity-40"
                        )}
                        title="Geser kiri"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx + 1)}
                        disabled={idx === form.images.length - 1}
                        className={cn(
                          "rounded p-1 text-white/90 hover:bg-white/10",
                          idx === form.images.length - 1 && "cursor-not-allowed opacity-40"
                        )}
                        title="Geser kanan"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImageAt(idx)}
                        className="rounded p-1 text-white/90 hover:bg-white/10"
                        title="Hapus"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.images && <p className="mt-1 text-xs text-red-600">{errors.images}</p>}
        </div>

        <div className="sm:col-span-2">
          {/* ✅ tambah tombol 1 klik untuk ambil ringkasan dari konten */}
          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-medium">Ringkasan</label>
            <button
              type="button"
              onClick={autoExcerpt}
              disabled={submitting}
              className={cn(
                "w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50",
                submitting && "opacity-60 cursor-not-allowed"
              )}
              title="Ambil ringkasan otomatis dari konten"
            >
              Ambil dari Konten
            </button>
          </div>

          <textarea
            rows={2}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.excerpt ? "border-red-400" : "border-gray-300"
            )}
            value={form.excerpt}
            onChange={(e) => setField("excerpt", e.target.value)}
            placeholder="Ringkasan singkat berita…"
            disabled={submitting}
          />
          {errors.excerpt && <p className="mt-1 text-xs text-red-600">{errors.excerpt}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 text-sm font-medium">Konten</label>
          <textarea
            rows={8}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20",
              errors.content ? "border-red-400" : "border-gray-300"
            )}
            value={form.content}
            onChange={(e) => setField("content", e.target.value)}
            placeholder="Konten lengkap berita…"
            disabled={submitting}
          />
          {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
        </div>
      </div>

      {/* ✅ responsif tombol: stack di mobile */}
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
          <Save className="h-4 w-4" /> {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}

/* =========================== Confirm Dialog =========================== */
function ConfirmDialog({ open, onClose, onConfirm, loading, title, message }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || "Konfirmasi"}
      footer={
        /* ✅ responsif tombol confirm */
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

/* =========================== Halaman =========================== */
export default function BeritaAdmin() {
  const MAX_IMAGES = 5;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("terbaru");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);
  const [targetDelete, setTargetDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const bcRef = useRef(null);

  const bumpBySlug = (slug, field, delta = 1) => {
    if (!slug || !["viewCount", "shareCount"].includes(field)) return;
    setRows((prev) =>
      prev.map((r) =>
        r.slug === slug ? { ...r, [field]: Math.max(0, Number(r[field] || 0) + delta) } : r
      )
    );
  };

  const mergeCounts = (oldRows, newRows) => {
    const map = new Map(oldRows.map((r) => [r.id, r]));
    return newRows.map((n) => {
      const o = map.get(n.id);
      if (!o) return n;
      return { ...o, ...n };
    });
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      if (sort) params.set("sort", sort);
      if (query.trim()) params.set("q", query.trim());

      const path = `/berita${params.toString() ? `?${params}` : ""}`;
      const res = await get(path);
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setRows((prev) => (prev && prev.length ? mergeCounts(prev, items) : items));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Gagal memuat data berita");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchRows();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, sort, query]);

  useEffect(() => {
    const onFocus = () => fetchRows();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchRows();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel("news");
      bcRef.current = bc;
      bc.onmessage = (ev) => {
        const msg = ev?.data || {};
        if (msg?.type === "view" && msg?.slug) bumpBySlug(msg.slug, "viewCount", msg.delta ?? 1);
        if (msg?.type === "share" && msg?.slug) bumpBySlug(msg.slug, "shareCount", msg.delta ?? 1);
      };
      return () => {
        try {
          bc.close();
        } catch {}
      };
    } catch {}
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== "news:counter" || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        if (!payload || payload.__handled) return;
        if (payload.field === "view" && payload.slug) bumpBySlug(payload.slug, "viewCount", payload.delta ?? 1);
        if (payload.field === "share" && payload.slug) bumpBySlug(payload.slug, "shareCount", payload.delta ?? 1);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onCustom = (e) => {
      const detail = e?.detail || {};
      if (detail?.type === "view" && detail?.slug) bumpBySlug(detail.slug, "viewCount", detail.delta ?? 1);
      if (detail?.type === "share" && detail?.slug) bumpBySlug(detail.slug, "shareCount", detail.delta ?? 1);
    };
    window.addEventListener("news:counter", onCustom);
    return () => window.removeEventListener("news:counter", onCustom);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const textOk = !q
        ? true
        : [r.title, r.slug, r.excerpt].filter(Boolean).some((s) => s.toLowerCase().includes(q));
      if (!month && !year) return textOk;

      let dateOk = true;
      if (r.date) {
        const d = new Date(r.date);
        if (year) dateOk = dateOk && d.getFullYear().toString() === year;
        if (month) dateOk = dateOk && (d.getMonth() + 1).toString() === month;
      } else if (month || year) {
        dateOk = false;
      }
      return textOk && dateOk;
    });
  }, [rows, query, month, year]);

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

  const openEdit = async (row) => {
    try {
      setDetailLoadingId(row.id);
      const detail = await get(`/berita/id/${row.id}`);
      setEditing(detail);
      setOpenForm(true);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Gagal memuat detail berita untuk diedit.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      if (editing && editing.id) {
        const updated = await put(`/berita/${editing.id}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      } else {
        const created = await post("/berita", payload);
        setRows((prev) => [created, ...prev]);
      }
      setOpenForm(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!targetDelete) return;
    try {
      setDeleting(true);
      await del(`/berita/${targetDelete.id}`);
      setRows((prev) => prev.filter((r) => r.id !== targetDelete.id));
      setOpenConfirm(false);
      setTargetDelete(null);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
      {/* HEADER */}
      <div className="mx-auto mb-6 w-full max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola Berita</h1>
            <p className="mt-1 text-sm text-gray-600">
              CRUD berita: daftar, tambah, ubah, hapus, dan upload gambar (maks {MAX_IMAGES}).
            </p>
          </div>

          {/* ✅ responsif: tombol full di mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={openAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90"
            >
              <Plus className="h-4 w-4" /> Tambah Berita
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mx-auto mb-4 w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-8">
          <div className="relative sm:col-span-3 lg:col-span-3">
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
              placeholder="Cari judul / slug / ringkasan…"
            />
          </div>

          <div className="lg:col-span-1">
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                resetPagination();
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
              aria-label="Filter bulan"
            >
              {months.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                resetPagination();
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
              aria-label="Filter tahun"
            >
              <option value="">Semua Tahun</option>
              {yearOptions.filter(Boolean).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                resetPagination();
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
              aria-label="Urutkan"
            >
              <option value="terbaru">Urutkan: Terbaru</option>
              <option value="populer">Urutkan: Populer</option>
            </select>
          </div>

          {/* ✅ responsif: rata kiri di mobile, rata kanan di desktop */}
          <div className="flex items-center justify-start gap-2 lg:col-span-2 lg:justify-end">
            <label className="text-sm text-gray-600">Baris</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                resetPagination();
              }}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
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

      {err && (
        <div className="mx-auto mb-4 w-full max-w-7xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      )}

      {/* ✅ LIST MOBILE (tanpa scroll horizontal) */}
      <div className="mx-auto w-full max-w-7xl sm:hidden">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Memuat…
          </div>
        ) : paged.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
            Tidak ada data.
          </div>
        ) : (
          <div className="space-y-3">
            {paged.map((r) => {
              const imgs =
                Array.isArray(r.images) && r.images.length ? r.images : r.image ? [r.image] : [];
              const firstImg = imgs[0] || r.image;
              const extra = Math.max(0, (imgs?.length || 0) - 1);
              const isLoadingThis = detailLoadingId === r.id;

              return (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-24 overflow-hidden rounded-xl ring-1 ring-gray-200 shrink-0">
                      <img
                        src={resolveImageUrl(firstImg)}
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-wide.jpg";
                        }}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                      {extra > 0 && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          +{extra}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 break-words">{r.title}</div>
                      <div className="mt-1 text-xs text-gray-500 break-words">{r.slug}</div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 ring-1 ring-gray-200">
                          {formatDate(r.date)}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 ring-1 ring-gray-200">
                          Pop: {r.popularity ?? 0}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 ring-1 ring-gray-200">
                          {r.viewCount ?? 0}x dilihat
                        </span>
                        <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs text-yellow-900 ring-1 ring-yellow-200">
                          {r.shareCount ?? 0}x dibagikan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {truncateExcerpt(r.excerpt, 70)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      disabled={isLoadingThis}
                      className={cn(
                        "inline-flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-50",
                        isLoadingThis && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <Pencil className="h-4 w-4" /> {isLoadingThis ? "Memuat…" : "Edit"}
                    </button>

                    <button
                      onClick={() => {
                        setTargetDelete(r);
                        setOpenConfirm(true);
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
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
              - <span className="font-semibold">{Math.min(pageSafe * pageSize, filtered.length)}</span>{" "}
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

      {/* ✅ TABLE DESKTOP (sm+) */}
      <div className="mx-auto hidden w-full max-w-7xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "140px" }} />
              <col style={{ width: "240px" }} />
              <col style={{ width: "220px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "190px" }} />
            </colgroup>

            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Gambar</th>
                <th className="px-4 py-3">Judul</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Popularitas</th>
                <th className="px-4 py-3">Dilihat</th>
                <th className="px-4 py-3">Dibagikan</th>
                <th className="px-4 py-3">Ringkasan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Memuat…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const imgs =
                    Array.isArray(r.images) && r.images.length ? r.images : r.image ? [r.image] : [];
                  const firstImg = imgs[0] || r.image;
                  const extra = Math.max(0, (imgs?.length || 0) - 1);
                  const isLoadingThis = detailLoadingId === r.id;

                  return (
                    <tr key={r.id} className="border-t align-top">
                      <td className="px-4 py-3">
                        <div className="relative h-14 w-24 overflow-hidden rounded-lg ring-1 ring-gray-200">
                          <img
                            src={resolveImageUrl(firstImg)}
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-wide.jpg";
                            }}
                            alt={r.title}
                            className="h-full w-full object-cover"
                          />
                          {extra > 0 && (
                            <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                              +{extra}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        <div className="whitespace-normal break-words overflow-wrap-anywhere">{r.title}</div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-mono text-xs whitespace-normal break-words overflow-wrap-anywhere">
                          {r.slug}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.popularity ?? 0}</td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 ring-1 ring-gray-200">
                          {r.viewCount ?? 0}x
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs text-yellow-900 ring-1 ring-yellow-200">
                          {r.shareCount ?? 0}x
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {truncateExcerpt(r.excerpt, 80)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            disabled={isLoadingThis}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50",
                              isLoadingThis && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <Pencil className="h-4 w-4" /> {isLoadingThis ? "Memuat…" : "Edit"}
                          </button>

                          <button
                            onClick={() => {
                              setTargetDelete(r);
                              setOpenConfirm(true);
                            }}
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

        {/* PAGINATION DESKTOP */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-xs text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold">
              {filtered.length === 0 ? 0 : (pageSafe - 1) * pageSize + 1}
            </span>{" "}
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

      {/* MODAL FORM */}
      <Modal
        open={openForm}
        onClose={() => {
          if (!submitting) {
            setOpenForm(false);
            setEditing(null);
          }
        }}
        title={editing ? "Edit Berita" : "Tambah Berita"}
      >
        <BeritaForm
          key={editing ? `edit-${editing.id}` : `add-${rows.length}`}
          initial={
            editing
              ? {
                  title: editing.title,
                  slug: editing.slug,
                  date: editing.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                  image: editing.image || "",
                  images:
                    Array.isArray(editing.images) && editing.images.length
                      ? editing.images.slice(0, MAX_IMAGES)
                      : editing.image
                      ? [editing.image]
                      : [],
                  excerpt: editing.excerpt || "",
                  content: editing.content || "",
                  popularity: editing.popularity ?? 0,
                }
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
        />
      </Modal>

      {/* CONFIRM DELETE */}
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
        title="Hapus Berita"
        message={
          <>
            Yakin menghapus berita <span className="font-semibold">{targetDelete?.title}</span>? Tindakan ini tidak dapat
            dibatalkan.
          </>
        }
      />
    </section>
  );
}
