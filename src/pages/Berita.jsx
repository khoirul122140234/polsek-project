// src/pages/Berita.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { get, post as apiPost } from "../lib/api";
import { RESOLVED_API_BASE } from "../lib/env";

/* ==========================
   Utils
   ========================== */
const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-wide.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso || "-";
  }
}

function formatCompact(n) {
  try {
    return new Intl.NumberFormat("id-ID", { notation: "compact" }).format(Number(n) || 0);
  } catch {
    return String(n);
  }
}

function getNumbers(row) {
  const views = row?.views ?? row?.viewCount ?? row?.reads ?? 0;
  const shares = row?.shares ?? row?.shareCount ?? 0;
  return { views: Number(views) || 0, shares: Number(shares) || 0 };
}

function getAdminName(row) {
  const name =
    row?.sharedBy?.name ??
    row?.sharedBy ??
    row?.author?.name ??
    row?.adminName ??
    "-";
  return String(name || "-");
}

/** Ambil maksimal 5 url gambar: prioritas row.images (array), fallback row.image */
function getImages(row) {
  let arr = [];
  if (Array.isArray(row?.images)) {
    arr = row.images.filter((s) => typeof s === "string" && s.trim());
  }
  if (arr.length === 0 && row?.image) arr = [row.image];
  return arr.slice(0, 5);
}

/* ==========================
   Komponen kecil
   ========================== */
function MetaRow({ post, className = "" }) {
  const { views, shares } = getNumbers(post);
  const adminName = getAdminName(post);
  const showAdmin = adminName && adminName.trim() !== "-" && adminName.trim() !== "";

  return (
    <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5c-5.523 0-10 5.5-10 7s4.477 7 10 7 10-5.5 10-7-4.477-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
        Dilihat {formatCompact(views)}x
      </span>

      <span className="inline-flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8a3 3 0 1 0-2.815-4H15a3 3 0 0 0 0 6c.552 0 1.06-.149 1.5-.407l-7.086 4.044A2.995 2.995 0 0 0 6 13a3 3 0 1 0 2.815 4H9a2.99 2.99 0 0 0-.5-1.593l7.086-4.044A2.99 2.99 0 0 0 18 8Zm0 10a3 3 0 1 0 0-6 2.99 2.99 0 0 0-2.5 1.407l-7.086-4.044A2.99 2.99 0 0 0 6 8a3 3 0 1 0 0 6c.552 0 1.06-.149 1.5-.407l7.086 4.044A2.99 2.99 0 0 0 18 18Z" />
        </svg>
        Dibagikan {formatCompact(shares)}x
      </span>

      {/* ✅ HAPUS "Admin: -" -> hanya tampil kalau ada nama admin valid */}
      {showAdmin && (
        <span className="w-full sm:w-auto sm:ml-auto text-xs text-gray-500 break-words">
          Admin: {adminName}
        </span>
      )}
    </div>
  );
}

function FeaturedCard({ post, onClick }) {
  const img = getImages(post)[0] || "/placeholder-wide.jpg";
  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 md:grid-cols-12">
      <div className="relative aspect-[16/10] md:aspect-auto md:col-span-5 md:min-h-[260px]">
        <img
          src={resolveImageUrl(img)}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
        />
      </div>
      <div className="p-4 sm:p-6 md:col-span-7">
        <p className="text-xs sm:text-sm text-gray-600">{formatDate(post.date)}</p>
        <h2 className="mt-1 line-clamp-2 text-lg sm:text-xl font-semibold leading-snug text-gray-900 md:text-2xl">
          {post.title}
        </h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm sm:text-base text-gray-700">{post.excerpt}</p>}
        <MetaRow post={post} className="mt-3" />
        <div className="mt-4">
          <button
            onClick={onClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-yellow-300"
          >
            Selengkapnya
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

function NewsCard({ post, onClick }) {
  const img = getImages(post)[0] || "/placeholder-wide.jpg";
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
      <div className="relative aspect-[16/11] w-full">
        <img
          src={resolveImageUrl(img)}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
        />
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-xs sm:text-sm text-gray-600">{formatDate(post.date)}</p>
        <h3 className="mt-2 line-clamp-3 text-base sm:text-lg font-extrabold leading-snug text-gray-900">
          {post.title}
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-xs sm:text-sm text-gray-700">{post.excerpt}</p>}
        <MetaRow post={post} className="mt-3" />
        <div className="mt-3">
          <button
            onClick={onClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-3.5 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-yellow-300"
          >
            Selengkapnya
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

function Pagination({ page, pages, onPrev, onNext, onGoto }) {
  const numbers = useMemo(() => {
    const arr = [];
    const start = Math.max(1, page - 1);
    const end = Math.min(pages, page + 1);
    if (start > 1) arr.push(1);
    if (start > 2) arr.push("...");
    for (let i = start; i <= end; i++) arr.push(i);
    if (end < pages - 1) arr.push("...");
    if (end < pages) arr.push(pages);
    return arr;
  }, [page, pages]);

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-gray-800">
      <button onClick={onPrev} className="rounded-full p-2 hover:bg-gray-100" aria-label="Sebelumnya">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path
            fillRule="evenodd"
            d="M15.78 4.22a.75.75 0 0 1 0 1.06L9.06 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {numbers.map((n, idx) =>
        n === "..." ? (
          <span key={idx} className="px-2">
            …
          </span>
        ) : (
          <button
            key={idx}
            onClick={() => onGoto(n)}
            className={
              n === page
                ? "flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 font-semibold text-gray-900 shadow"
                : "flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
            }
          >
            {n}
          </button>
        )
      )}

      <button onClick={onNext} className="rounded-full p-2 hover:bg-gray-100" aria-label="Berikutnya">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path
            fillRule="evenodd"
            d="M8.22 19.78a.75.75 0  0 1 0-1.06L14.94 12 8.22 5.28a.75.75 0  0 1 1.06-1.06l7.25 7.25a.75.75 0  0 1 0 1.06l-7.25 7.25a.75.75 0  0 1-1.06 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

/* ==========================
   Halaman Daftar Berita
   ========================== */
export default function Berita() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("terbaru"); // "terbaru" | "populer"
  const [page, setPage] = useState(1);

  const pageSize = 6;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await get("/berita");
        if (!alive) return;
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        setRows(items);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message || "Gagal memuat daftar berita.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = rows.filter((p) => (!q ? true : String(p.title || "").toLowerCase().includes(q)));
    if (tab === "terbaru") {
      arr = arr.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } else {
      const score = (x) =>
        Number(x?.popularity ?? 0) * 1_000_000 +
        Number(x?.viewCount ?? 0) * 1_000 +
        Number(x?.shareCount ?? 0);
      arr = arr.slice().sort((a, b) => score(b) - score(a));
    }
    return arr;
  }, [rows, query, tab]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);

  const showFeatured = safePage === 1 && pageItems.length > 0;
  const featured = showFeatured ? pageItems[0] : null;
  const gridItems = showFeatured ? pageItems.slice(1) : pageItems;

  return (
    <section className="relative min-h-screen w-full bg-gray-50 pt-16">
      {/* ✅ BACKGROUND HITAM hanya di halaman utama berita */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24 bg-gradient-to-r from-black via-zinc-800 to-slate-700" />

      <Navbar />

      <header className="relative w-full pt-0">
        <div className="w-full bg-gradient-to-r from-black via-zinc-800 to-slate-700 text-white shadow">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-8">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight">Berita</h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-zinc-200">Informasi terbaru untuk Masyarakat.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-3xl">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari"
              className="w-full rounded-full border border-gray-300 bg-white px-5 py-3 text-gray-900 shadow focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

          </div>

          <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setTab("terbaru");
                setPage(1);
              }}
              className={[
                "w-full sm:w-auto rounded-full px-6 py-2 font-semibold shadow",
                tab === "terbaru"
                  ? "bg-yellow-400 text-gray-900"
                  : "bg-yellow-100 text-gray-800 hover:bg-yellow-200",
              ].join(" ")}
            >
              Terbaru
            </button>
            <button
              onClick={() => {
                setTab("populer");
                setPage(1);
              }}
              className={[
                "w-full sm:w-auto rounded-full px-6 py-2 font-semibold shadow",
                tab === "populer"
                  ? "bg-yellow-400 text-gray-900"
                  : "bg-yellow-100 text-gray-800 hover:bg-yellow-200",
              ].join(" ")}
            >
              Populer
            </button>
          </div>
        </div>

        {err && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>}

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="h-56 w-full animate-pulse rounded-2xl bg-gray-200" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {showFeatured && featured && (
              <div className="mt-6">
                <FeaturedCard post={featured} onClick={() => navigate(`/berita/${featured.slug}`)} />
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gridItems.map((post) => (
                <NewsCard key={post.id} post={post} onClick={() => navigate(`/berita/${post.slug}`)} />
              ))}
            </div>

            {!err && filtered.length === 0 && !loading && (
              <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
                Tidak ada berita yang cocok.
              </div>
            )}

            {filtered.length > 0 && (
              <Pagination
                page={safePage}
                pages={pages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(pages, p + 1))}
                onGoto={(n) => setPage(n)}
              />
            )}
          </>
        )}
      </div>

      <Footer />
    </section>
  );
}

/* ==========================
   Halaman Detail Berita
   ========================== */
export function BeritaDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const images = getImages(article || {});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await get(`/berita/${slug}`);
        if (!alive) return;
        setArticle(data || null);

        try {
          await apiPost(`/berita/${slug}/view`, {});
          setArticle((prev) => (prev ? { ...prev, viewCount: Number(prev.viewCount || 0) + 1 } : prev));
        } catch (_) {}
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message || "Gagal memuat detail berita.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    setActiveIdx(0);
  }, [slug]);

  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const title = article?.title || "Berita";
      const text = "Cek berita ini:";

      try {
        if (navigator.share) {
          await navigator.share({ title, text, url });
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          alert("Tautan telah disalin.");
        } else {
          const ok = window.confirm("Fitur bagikan tidak tersedia. Salin tautan secara manual?");
          if (ok) prompt("Salin tautan berikut:", url);
        }
      } catch (_) {}

      try {
        await apiPost(`/berita/${slug}/share`, {});
        setArticle((prev) => (prev ? { ...prev, shareCount: Number(prev.shareCount || 0) + 1 } : prev));
      } catch (e) {
        console.error("increment share gagal:", e);
      }
    } finally {
      setSharing(false);
    }
  }, [article, slug, sharing]);

  const mainImg = images[activeIdx] || article?.image || "/placeholder-wide.jpg";
  const goPrev = () => setActiveIdx((i) => (i - 1 + images.length) % Math.max(images.length, 1));
  const goNext = () => setActiveIdx((i) => (i + 1) % Math.max(images.length, 1));

  return (
    <section className="min-h-screen w-full bg-gray-50 pt-16">
      {/* ✅ DI DETAIL: TIDAK ADA background hitam di atas */}

      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow ring-1 ring-black/5 hover:bg-gray-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M15.78 4.22a.75.75 0 0 1 0 1.06L9.06 12l6.72 6.72a.75.75 0 1 1-1.06 1.06l-7.25-7.25a.75.75 0 0 1 0-1.06l7.25-7.25a.75.75 0 0 1 1.06 0z"
              clipRule="evenodd"
            />
          </svg>
          Kembali
        </button>

        {loading ? (
          <div className="h-72 w-full animate-pulse rounded-2xl bg-gray-200" />
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>
        ) : !article ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            Berita tidak ditemukan.
          </div>
        ) : (
          <article className="prose prose-slate max-w-none">
            <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-gray-900 break-words">{article.title}</h1>
            <p className="text-xs sm:text-sm text-gray-600">{formatDate(article.date)}</p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <MetaRow post={article} className="mt-0" />
              <button
                onClick={handleShare}
                disabled={sharing}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-yellow-300 ${
                  sharing ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {sharing ? "Memproses…" : "Bagikan"}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8a3 3 0 1 0-2.815-4H15a3 3 0 0 0 0 6c.552 0 1.06-.149 1.5-.407l-7.086 4.044A2.995 2.995 0 0 0 6 13a3 3 0 1 0 2.815 4H9a2.99 2.99 0 0 0-.5-1.593l7.086-4.044A2.99 2.99 0 0 0 18 8Zm0 10a3 3 0 1 0 0-6 2.99 2.99 0 0 0-2.5 1.407l-7.086-4.044A2.99 2.99 0 0 0 6 8a3 3 0 1 0 0 6c.552 0 1.06-.149 1.5-.407l7.086 4.044A2.99 2.99 0 0 0 18 18Z" />
                </svg>
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5">
              <div className="relative aspect-[16/9]">
                <img
                  src={resolveImageUrl(mainImg)}
                  alt={article.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow hover:bg-white"
                      aria-label="Sebelumnya"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.78 4.22a.75.75 0 0 1 0 1.06L10.06 11l5.72 5.72a.75.75 0 1 1-1.06 1.06l-6.25-6.25a.75.75 0 0 1 0-1.06l6.25-6.25a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-800 shadow hover:bg-white"
                      aria-label="Berikutnya"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.22 19.78a.75.75 0 0 1 0-1.06L13.94 13 8.22 7.28a.75.75 0 0 1 1.06-1.06l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 0 1-1.06 0Z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-4">
                  {images.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      onClick={() => setActiveIdx(idx)}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ${
                        idx === activeIdx ? "ring-yellow-400" : "ring-transparent hover:ring-gray-200"
                      }`}
                      aria-label={`Gambar ${idx + 1}`}
                    >
                      <img
                        src={resolveImageUrl(img)}
                        alt={`thumb-${idx + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4 sm:p-5 text-gray-800">
                {(article.content || "")
                  .split("\n\n")
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="mb-4 leading-relaxed break-words">
                      {para}
                    </p>
                  ))}
              </div>
            </div>
          </article>
        )}
      </div>

      <Footer />
    </section>
  );
}
