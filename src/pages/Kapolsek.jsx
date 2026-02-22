// src/pages/Kapolsek.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { RESOLVED_API_BASE } from "../lib/env";

// Base URL API (sudah dari env lib)
const API_BASE = RESOLVED_API_BASE;

// helper supaya URL gambar relative "/uploads/.." jadi absolut ke API_BASE
const resolveImageUrl = (u, bustKey = "") => {
  if (!u) return "/placeholder-person.jpg";
  if (/^https?:\/\//i.test(u)) return bustKey ? addBust(u, bustKey) : u;
  // pastikan hanya 1 slash
  const url = `${API_BASE.replace(/\/$/, "")}/${u.replace(/^\//, "")}`;
  return bustKey ? addBust(url, bustKey) : url;
};

const addBust = (url, key) => {
  if (!key) return url;
  return url.includes("?") ? `${url}&v=${encodeURIComponent(key)}` : `${url}?v=${encodeURIComponent(key)}`;
};

export default function Kapolsek() {
  const [data, setData] = useState(null); // { kapolsek: {...}, wakapolsek: {...} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("kapolsek"); // "kapolsek" | "wakapolsek"
  const [refreshKey, setRefreshKey] = useState(""); // untuk cache-busting img

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE.replace(/\/$/, "")}/api/leader-profiles`, {
        signal,
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Gagal memuat data dari server");
      const j = await r.json();
      setData(j);
      // pakai timestamp sederhana untuk bust cache gambar
      setRefreshKey(String(Date.now()));
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e?.message || "Terjadi kesalahan saat mengambil data. Coba beberapa saat lagi.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    // refetch ketika tab kembali fokus
    const onFocus = () => load(ac.signal);
    window.addEventListener("focus", onFocus);
    // polling ringan tiap 60s
    const id = setInterval(() => load(ac.signal), 60000);

    return () => {
      ac.abort();
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
  }, [load]);

  // Pilih section aktif berdasarkan toggle
  const section = useMemo(() => {
    if (!data) return null;
    const isKap = role === "kapolsek";
    const item = isKap ? data.kapolsek : data.wakapolsek;

    // fallback aman bila API belum ada datanya
    const fallback = isKap
      ? {
          nama: "Budi Santoso",
          jabatan: "Kapolsek",
          pesan: "Bersama masyarakat menciptakan keamanan.",
          fotoUrl: "/placeholder-person.jpg",
          bio: "Berpengalaman >20 tahun dan fokus pada peningkatan keamanan serta pelayanan publik.",
        }
      : {
          nama: "Andi Priyanto",
          jabatan: "Wakapolsek",
          pesan: "Menjaga ketertiban dan keamanan wilayah.",
          fotoUrl: "/placeholder-person.jpg",
          bio: "Berpengalaman menangani isu sosial-keamanan lintas daerah.",
        };

    return {
      key: isKap ? "kapolsek" : "wakapolsek",
      title: isKap ? "Kapolsek" : "Wakapolsek",
      ...(item || fallback),
    };
  }, [data, role]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* HERO */}
      {/* ✅ Posisi tetap, hanya background ditambah ke atas sampai mentok */}
      <header className="relative">
        {/* ✅ Tambahan layer background untuk nutup area atas (top:0) TANPA mengubah posisi konten */}
        <div className="absolute inset-x-0 top-0 h-12 sm:h-14 bg-gradient-to-r from-black via-zinc-800 to-slate-700" />

        {/* background utama tetap (posisi & ukuran tidak diubah) */}
        <div className="absolute inset-x-0 top-10 h-[130px] sm:top-12 sm:h-[155px] bg-gradient-to-r from-black via-zinc-800 to-slate-700" />

        {/* konten hero tetap */}
        <div className="relative pt-14 sm:pt-16 text-white shadow">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight">
              Pimpinan Polsek
            </h1>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-zinc-200">
              Profil Kapolsek dan Wakapolsek beserta pesan untuk masyarakat.
            </p>
          </div>
        </div>
      </header>

      {/* ✅ Turunkan juga seluruh isi halaman di bawah hero */}
      <main className="pb-16 pt-4 sm:pt-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Toggle Button */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setRole("kapolsek")}
              className={[
                "px-4 sm:px-6 py-2 rounded-[30px] border transition-all duration-200 text-sm font-semibold",
                "w-full xs:w-auto sm:w-auto",
                role === "kapolsek"
                  ? "bg-yellow-400 text-black shadow-lg scale-[1.03] border-yellow-300"
                  : "bg-white text-gray-700 border-gray-200 hover:shadow-md hover:scale-[1.03]",
              ].join(" ")}
            >
              Kapolsek
            </button>
            <button
              onClick={() => setRole("wakapolsek")}
              className={[
                "px-4 sm:px-6 py-2 rounded-[30px] border transition-all duration-200 text-sm font-semibold",
                "w-full xs:w-auto sm:w-auto",
                role === "wakapolsek"
                  ? "bg-yellow-400 text-black shadow-lg scale-[1.03] border-yellow-300"
                  : "bg-white text-gray-700 border-gray-200 hover:shadow-md hover:scale-[1.03]",
              ].join(" ")}
            >
              Wakapolsek
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-6 rounded-2xl bg-white p-4 sm:p-6 shadow">
              {/* ✅ dibuat “landscape besar” juga pada skeleton */}
              <div className="mb-4 h-64 sm:h-80 md:h-[28rem] lg:h-[32rem] w-full animate-pulse rounded-xl bg-gray-200" />
              <div className="mb-2 h-6 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="mb-1 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-16 w-full animate-pulse rounded bg-gray-200" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="sm:pr-4 break-words">{error}</p>
                <button
                  onClick={() => {
                    const ac = new AbortController();
                    load(ac.signal);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-white text-sm hover:bg-red-700 w-full sm:w-auto"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && section && (
            <article className="mt-6 rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
              {/* ✅ FOTO: dibuat LANDSCAPE BESAR untuk Kapolsek & Wakapolsek (sama-sama besar) */}
              <div
                className={[
                  "w-full",
                  // landscape besar: lebih lebar terlihat (tinggi dinaikkan, tetap responsif)
                  "h-64 sm:h-80 md:h-[28rem] lg:h-[32rem]",
                ].join(" ")}
              >
                <img
                  src={resolveImageUrl(section.fotoUrl, refreshKey)}
                  alt={`${section.jabatan || section.title} ${section.nama || ""}`}
                  className="h-full w-full object-cover object-center"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-person.jpg";
                  }}
                />
              </div>

              <div className="p-4 sm:p-6 md:p-8">
                <h2
                  className={[
                    "font-bold text-gray-900 break-words",
                    section.key === "kapolsek"
                      ? "text-xl sm:text-2xl md:text-3xl"
                      : "text-lg sm:text-xl md:text-2xl",
                  ].join(" ")}
                >
                  {section.nama || `${section.title} (Belum diisi)`}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs md:text-sm uppercase tracking-wider text-gray-500 break-words">
                  {section.jabatan || section.title}
                </p>

                <p
                  className={[
                    "mt-4 text-gray-700 leading-relaxed break-words",
                    section.key === "kapolsek"
                      ? "text-sm sm:text-base md:text-xl"
                      : "text-sm sm:text-base md:text-lg",
                  ].join(" ")}
                >
                  {section.pesan || "Belum ada pesan."}
                </p>

                <p
                  className={[
                    "mt-3 text-gray-600 break-words",
                    section.key === "kapolsek"
                      ? "text-sm sm:text-base md:text-lg"
                      : "text-sm sm:text-base",
                  ].join(" ")}
                >
                  {section.bio || "Belum ada biografi."}
                </p>
              </div>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
