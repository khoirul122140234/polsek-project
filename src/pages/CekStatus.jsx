// src/pages/CekStatus.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, FileText, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// ✅ normalisasi nilai "from" supaya konsisten (selaras StatusCodePage & CekStatusHasil)
function normalizeFromToJenis(from) {
  const s = String(from || "").toLowerCase();

  if (s.includes("laporan")) return "laporan-online";
  if (s.includes("kehilangan")) return "pengajuan-tanda-kehilangan";
  if (s.includes("izin")) return "pengajuan-izin";
  if (s.includes("skck")) return "pengajuan-skck";

  return "pelayanan";
}

// ✅ mapping jenis -> key sessionStorage (selaras StatusCodePage.jsx)
function jenisToStorageKey(jenis) {
  const map = {
    "pengajuan-izin": "status_code_izin",
    "pengajuan-tanda-kehilangan": "status_code_kehilangan",
    "laporan-online": "status_code_laporan",
    "pengajuan-skck": "status_code_skck",
    pelayanan: "status_code_izin", // fallback aman
  };
  return map[jenis] || "status_code_izin";
}

export default function CekStatus() {
  const navigate = useNavigate();
  const location = useLocation();

  const qs = new URLSearchParams(location.search);

  // ✅ support:
  // - state.from (baru)
  // - query from (baru)
  // - query jenis (lama)
  const fromParam = qs.get("from") || "";
  const jenisParam = qs.get("jenis") || "";
  const fromState = location.state?.from || "";

  const inferredJenis = normalizeFromToJenis(fromState || fromParam || jenisParam || "pelayanan");

  const storageKey = React.useMemo(() => jenisToStorageKey(inferredJenis), [inferredJenis]);

  const [code, setCode] = React.useState(() => sessionStorage.getItem(storageKey) || "");

  // ✅ FIX: error message hanya di halaman CekStatus (tidak navigate kalau invalid)
  const [error, setError] = React.useState("");

  // ✅ FIX: validasi format kode per layanan
  const isValidCode = React.useCallback(
    (value) => {
      const v = String(value || "").trim();
      if (!v) return false;

      // year fleksibel (1900-2099) biar tidak kaku
      const year = "(19\\d{2}|20\\d{2})";

      // Format:
      // - IZN-2026-4GZ8QM (alnum 4-12)
      // - KLH-2026-4GZ8QM (alnum 4-12)
      // - LPR-2026-0142   (digit 3-6)
      // - SKCK-2026-0001  (digit 3-6)
      const reIZN = new RegExp(`^IZN-${year}-[A-Z0-9]{4,12}$`, "i");
      const reKLH = new RegExp(`^KLH-${year}-[A-Z0-9]{4,12}$`, "i");
      const reLPR = new RegExp(`^LPR-${year}-\\d{3,6}$`, "i");
      const reSKCK = new RegExp(`^SKCK-${year}-\\d{3,6}$`, "i");

      if (inferredJenis === "pengajuan-izin") return reIZN.test(v);
      if (inferredJenis === "pengajuan-tanda-kehilangan") return reKLH.test(v);
      if (inferredJenis === "laporan-online") return reLPR.test(v);
      if (inferredJenis === "pengajuan-skck") return reSKCK.test(v);

      // fallback aman jika jenis tidak dikenal
      return v.length >= 4;
    },
    [inferredJenis]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = (code || "").trim();
    if (!trimmed) return;

    // ✅ STOP: kalau bukan kode valid -> tampilkan error & JANGAN navigate
    if (!isValidCode(trimmed)) {
      setError("Data tidak ditemukan / kode tidak valid.");
      return;
    }

    // ✅ kalau valid -> lanjut normal
    setError("");
    sessionStorage.setItem(storageKey, trimmed);

    // ✅ menuju halaman hasil (pakai from=, tetap ikutkan jenis= untuk backward compat)
    navigate(
      `/cek-status/hasil?code=${encodeURIComponent(trimmed)}&from=${encodeURIComponent(
        inferredJenis
      )}&jenis=${encodeURIComponent(inferredJenis)}`
    );
  };

  // label cantik untuk badge layanan
  const niceFromLabel =
    {
      "pengajuan-skck": "SKCK",
      "pengajuan-izin": "Izin Keramaian",
      "pengajuan-tanda-kehilangan": "Surat Tanda Kehilangan",
      "laporan-online": "Laporan Online",
      pelayanan: "Pelayanan",
    }[inferredJenis] || "Pelayanan";

  const disabled = (code || "").trim().length === 0;

  // placeholder menyesuaikan jenis
  const placeholder =
    inferredJenis === "pengajuan-izin"
      ? "Contoh: IZN-2026-4GZ8QM"
      : inferredJenis === "pengajuan-tanda-kehilangan"
      ? "Contoh: KLH-2026-4GZ8QM"
      : inferredJenis === "laporan-online"
      ? "Contoh: LPR-2026-0142"
      : inferredJenis === "pengajuan-skck"
      ? "Contoh: SKCK-2026-0001"
      : "Masukkan kode pengajuan";

  return (
    <div className="relative min-h-screen bg-white">
      <Navbar />

      {/* ✅ Hero responsif: padding & font scale aman untuk semua device */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 break-words">
          Cek Status {niceFromLabel}
        </h1>
        <div className="mx-auto mt-2 h-1 w-20 sm:w-24 bg-black rounded-full" />
        <p className="mt-3 text-xs sm:text-sm md:text-lg text-gray-600">
          Masukkan nomor/kode pengajuan Anda untuk melihat progres terbaru.
        </p>
      </div>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur border border-black/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
            <div className="relative p-5 sm:p-8 md:p-10">
              {/* header kecil di dalam kartu */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Jenis Layanan</span>
                </div>

                {/* ✅ badge tidak maksa di kanan pada layar kecil */}
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold text-gray-800">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="break-words">{niceFromLabel}</span>
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 md:mt-8">
                <label className="block text-sm font-semibold text-gray-800">
                  Nomor/Kode Pengajuan
                </label>

                {/* ✅ RESPONSIF: di mobile jadi 1 kolom, tombol full width */}
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  {/* input + ikon */}
                  <div className="relative flex-1 min-w-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <Search className="h-5 w-5" />
                    </span>

                    {/* ✅ min-w-0 + break words untuk mencegah overflow */}
                    <input
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-10 py-3 text-sm sm:text-base text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder={placeholder}
                      aria-label="Nomor atau Kode Pengajuan"
                      autoComplete="off"
                      inputMode="text"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={disabled}
                    className={`w-full sm:w-auto rounded-[30px] px-6 py-3 text-sm sm:text-base font-bold transition ${
                      disabled
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-[#F8C301] hover:brightness-95 text-black shadow"
                    }`}
                  >
                    Cek Status
                  </button>
                </div>

                {/* ✅ FIX: pesan error tampil di halaman CekStatus saja */}
                {error ? (
                  <p className="mt-3 text-sm text-red-600 font-semibold">{error}</p>
                ) : null}

                {/* ✅ tip responsif: wrap + tidak kepanjangan */}
                <p className="mt-2 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                  Contoh format:{" "}
                  <span className="font-semibold break-all">IZN-2026-4GZ8QM</span>,{" "}
                  <span className="font-semibold break-all">KLH-2026-4GZ8QM</span>,{" "}
                  <span className="font-semibold break-all">LPR-2026-0142</span>
                </p>
              </form>

              {/* divider */}
              <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

              {/* info privasi */}
              <p className="mt-4 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                Data hanya digunakan untuk menampilkan status pengajuan Anda. Jika kesulitan, silakan
                hubungi petugas melalui halaman kontak.
              </p>

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}