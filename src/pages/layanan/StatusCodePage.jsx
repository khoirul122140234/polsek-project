// src/pages/layanan/StatusCodePage.jsx
import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// ✅ normalisasi nilai "from" supaya konsisten
function normalizeFrom(v) {
  const s = String(v || "").toLowerCase();

  // dukung beberapa bentuk nilai "from"
  if (
    s.includes("pengajuan-tanda-kehilangan") ||
    s.includes("tanda-kehilangan") ||
    s.includes("kehilangan")
  ) {
    return "kehilangan";
  }
  if (s.includes("pengajuan-izin") || s.includes("izin")) return "izin";
  if (s.includes("pengajuan-skck") || s.includes("skck")) return "skck";
  if (s.includes("laporan-online") || s.includes("laporan")) return "laporan";

  return "izin";
}

// ✅ ambil query params dengan aman untuk BrowserRouter & HashRouter
function getQueryParams(locationSearch) {
  if (locationSearch && locationSearch.startsWith("?")) {
    return new URLSearchParams(locationSearch);
  }

  if (typeof window !== "undefined") {
    const hash = window.location.hash || "";
    const idx = hash.indexOf("?");
    if (idx >= 0) {
      const qs = hash.slice(idx);
      return new URLSearchParams(qs);
    }
  }

  return new URLSearchParams("");
}

export default function StatusCodePage() {
  const location = useLocation();

  const query = useMemo(() => getQueryParams(location.search), [location.search]);

  const from = useMemo(() => {
    return normalizeFrom(location.state?.from || query.get("from") || "izin");
  }, [location.state, query]);

  // ✅ SAMAKAN KEY DENGAN YANG DIPAKAI FORM
  const fallbackKey = useMemo(() => {
    const map = {
      izin: "status_code_izin",
      kehilangan: "status_code_tanda_kehilangan", // ✅ penting: ini yang dipakai form kehilangan
      laporan: "status_code_laporan",
      skck: "status_code_skck",
    };
    return map[from] || "status_code_izin";
  }, [from]);

  const code = useMemo(() => {
    const c =
      location.state?.code ||
      query.get("code") ||
      sessionStorage.getItem(fallbackKey) ||
      "";

    if (c) sessionStorage.setItem(fallbackKey, c);
    return c;
  }, [location.state, query, fallbackKey]);

  const cekStatusHref = useMemo(() => {
    if (!code) return "/cek-status";

    // kalau kamu punya halaman status pelaporan online khusus:
    if (from === "laporan") {
      return `/laporan-online/status?code=${encodeURIComponent(code)}`;
    }

    // default halaman cek-status umum (CekStatusHasil membaca ?from=...)
    return `/cek-status?code=${encodeURIComponent(code)}&from=${encodeURIComponent(from)}`;
  }, [code, from]);

  // ✅ kelas tombol biar teks selalu CENTER & SIMETRIS (termasuk Link)
  const btnBase =
    "w-full inline-flex items-center justify-center text-center leading-none whitespace-normal break-words " +
    "min-h-[48px] px-6 py-3 rounded-full text-sm sm:text-base font-semibold " +
    "transition active:scale-95";

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-[820px] px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="w-full bg-white rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] p-5 sm:p-6 md:p-10">
            <div className="w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden bg-white mx-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-black to-gray-700 text-white py-5 sm:py-6 px-5 sm:px-8 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide">
                  Kode Cek Status
                </h1>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-8 md:p-12 flex flex-col items-center text-center">
                <p className="font-mono text-xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-10 tracking-widest break-all text-gray-900">
                  {code || "—"}
                </p>

                <p className="text-sm sm:text-base text-red-600 font-semibold mb-4 sm:mb-6">
                  *Simpan atau screenshot kode di atas untuk memantau status.
                </p>

                {/* ✅ PERINGATAN TAMBAHAN: pantau status 1x24 jam */}
                <div className="w-full max-w-2xl mb-7 sm:mb-10">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 sm:px-5 py-4 text-left shadow-sm">
                    <div className="font-semibold text-amber-900 text-sm sm:text-base">
                      Peringatan Penting
                    </div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-900/90 text-xs sm:text-sm leading-relaxed">
                      <li>
                        Pantau status secara berkala minimal <b>1× dalam 24 jam</b> setelah pengajuan dikirim.
                      </li>
                      <li>
                        Jika dalam <b>24 jam</b> status belum berubah, coba cek kembali di jam berbeda (misalnya pagi/siang/malam)
                        karena proses verifikasi bisa bertahap.
                      </li>
                      <li>
                        Pastikan <b>kode</b> ini tidak hilang—tanpa kode, Anda tidak dapat melacak proses pengajuan.
                      </li>
                      <li>
                        Jika diminta melengkapi data/berkas, lakukan secepatnya agar proses tidak tertunda.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ✅ tombol: simetris (text center), tinggi sama, dan responsif */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                  <button
                    onClick={() => code && navigator.clipboard.writeText(code)}
                    className={[
                      btnBase,
                      code ? "bg-black text-white hover:opacity-90" : "bg-gray-400 text-white cursor-not-allowed",
                    ].join(" ")}
                    type="button"
                    disabled={!code}
                  >
                    Salin Kode
                  </button>

                  <Link
                    to={cekStatusHref}
                    className={[
                      btnBase,
                      code
                        ? "bg-[#198CFB] text-white hover:bg-blue-600"
                        : "bg-gray-400 text-white cursor-not-allowed pointer-events-none",
                    ].join(" ")}
                  >
                    Cek Status
                  </Link>

                  <Link
                    to="/"
                    className={[btnBase, "bg-slate-800 text-white hover:bg-slate-700"].join(" ")}
                  >
                    Kembali ke Beranda
                  </Link>
                </div>

                {!code && (
                  <p className="mt-5 text-xs text-gray-500">
                    Kode belum tersedia. Silakan kembali dan lakukan pengajuan terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
