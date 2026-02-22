// src/pages/Fasilitas.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { RESOLVED_API_BASE } from "../lib/env";

const API = RESOLVED_API_BASE.replace(/\/$/, "");
const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-wide.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${API}/${String(u).replace(/^\//, "")}`;
};

export default function Fasilitas() {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // toggle desc
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch(`${API}/api/fasilitas`, { cache: "no-store" });
        if (!r.ok) throw new Error("Gagal memuat fasilitas");
        const j = await r.json();
        if (!alive) return;
        const list = Array.isArray(j) ? j : [];
        setItems(list.map((x) => ({ ...x, image: resolveImageUrl(x.image) })));
        setIndex(0);
        setExpanded(false);
      } catch (e) {
        if (alive) setErr(e?.message || "Gagal memuat fasilitas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const total = items.length;
  const current = items[index] ?? {};
  const goPrev = () => {
    if (!total) return;
    setIndex((p) => (p - 1 + total) % total);
    setExpanded(false);
  };
  const goNext = () => {
    if (!total) return;
    setIndex((p) => (p + 1) % total);
    setExpanded(false);
  };

  const touchStartX = useRef(null);
  const onTouchStart = (e) => (touchStartX.current = e.changedTouches[0].screenX);
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].screenX - (touchStartX.current ?? 0);
    if (Math.abs(dx) > 50) (dx > 0 ? goPrev() : goNext());
  };

  const progress = total ? Math.round(((index + 1) / total) * 100) : 0;

  // buat cek apakah deskripsi panjang (tampilkan tombol)
  const desc = String(current.description || "");
  const showToggle = useMemo(() => desc.trim().length > 180, [desc]);

  return (
    <section className="relative min-h-screen w-full bg-white pt-16">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-4 text-center">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
          Fasilitas Polsek
        </h1>
        <div className="mx-auto mt-2 h-1 w-20 sm:w-28 rounded-full bg-black" />
        <p className="mt-3 text-xs sm:text-base md:text-lg text-gray-600">
          Galeri fasilitas yang tersedia untuk pelayanan masyarakat.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {loading && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow">
            <div className="mb-4 h-56 sm:h-72 w-full animate-pulse rounded-xl bg-gray-200" />
            <div className="mb-2 h-6 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mb-1 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-16 w-full animate-pulse rounded bg-gray-200" />
          </div>
        )}

        {!loading && err && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>
        )}

        {!loading && !err && total === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 sm:p-10 text-center text-gray-600">
            Belum ada fasilitas yang ditambahkan.
          </div>
        )}

        {!loading && !err && total > 0 && (
          <>
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black shadow-2xl">
              <div className="absolute left-0 top-0 h-1 w-full bg-white/10">
                <div className="h-full bg-white/80" style={{ width: `${progress}%` }} aria-hidden />
              </div>

              {/* ✅ FIX RESPONSIF UTAMA:
                 - Jangan pakai vh besar yang bikin kepanjangan di device tertentu
                 - Pakai aspect ratio + max-height yang aman
                 - Height adaptif: aspect-video (16:9) di mobile, lalu lebih tinggi di layar besar
              */}
              <div
                className={[
                  "relative w-full select-none",
                  "aspect-[16/10] sm:aspect-video lg:aspect-[21/9]", // ✅ konsisten di semua device
                  "max-h-[520px] sm:max-h-[620px] lg:max-h-[720px]", // ✅ batas aman
                ].join(" ")}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <img
                  src={current.image || "/placeholder-wide.jpg"}
                  alt={current.title || "Fasilitas"}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

                {/* CARD INFO */}
                <div className="absolute left-3 right-3 bottom-3 sm:left-6 sm:bottom-6 sm:right-auto sm:max-w-xl">
                  <div className="backdrop-blur bg-white/10 ring-1 ring-white/20 rounded-2xl p-3 sm:p-5">
                    <h2 className="text-white text-base sm:text-2xl font-semibold drop-shadow break-words">
                      {current.title}
                    </h2>

                    {/* ✅ teks responsif + tidak bikin layout “melebar” */}
                    <div className="mt-2">
                      <p
                        className={[
                          "text-white/90 text-xs sm:text-base leading-relaxed",
                          "break-words whitespace-pre-wrap",
                          expanded
                            ? "max-h-28 sm:max-h-44 overflow-auto pr-1"
                            : "line-clamp-4",
                        ].join(" ")}
                      >
                        {desc}
                      </p>

                      {showToggle && (
                        <button
                          type="button"
                          onClick={() => setExpanded((v) => !v)}
                          className="mt-2 inline-flex items-center rounded-lg bg-white/15 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/20"
                        >
                          {expanded ? "Lebih sedikit" : "Selengkapnya"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ tombol nav responsif (lebih kecil di mobile, tidak nutup konten) */}
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Sebelumnya"
                  className="group absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 sm:p-3 backdrop-blur ring-1 ring-black/10 hover:bg-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800"
                  >
                    <path
                      fillRule="evenodd"
                      d="M15.78 4.22a.75.75 0 010 1.06L9.06 12l6.72 6.72a.75.75 0 11-1.06 1.06l-7.25-7.25a.75.75 0 010-1.06l7.25-7.25a.75.75 0 011.06 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Berikutnya"
                  className="group absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 sm:p-3 backdrop-blur ring-1 ring-black/10 hover:bg-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 sm:h-6 sm:w-6 text-gray-800"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 19.78a.75.75 0 010-1.06L14.94 12 8.22 5.28a.75.75 0 111.06-1.06l7.25 7.25a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="absolute left-1/2 top-3 sm:top-4 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] sm:text-xs font-semibold text-gray-800 shadow">
                  {index + 1} / {total}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIndex(i);
                    setExpanded(false);
                  }}
                  aria-label={`Pilih slide ${i + 1}`}
                  className={[
                    "h-2.5 rounded-full transition-all",
                    i === index ? "w-7 bg-gray-900" : "w-2.5 bg-gray-300 hover:bg-gray-400",
                  ].join(" ")}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </section>
  );
}
