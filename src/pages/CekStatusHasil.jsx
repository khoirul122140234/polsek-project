// src/pages/CekStatusHasil.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  MessageSquareText,
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle,
  SearchX,
  IdCard,
  CalendarDays,
  FileText,
  MapPin,
  RotateCcw,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { api } from "../lib/api"; // ✅ gunakan wrapper yang konsisten

// ===== label layanan (tampilan) =====
const label = (jenis) =>
  jenis === "pengajuan-skck"
    ? "SKCK"
    : jenis === "pengajuan-izin"
    ? "Izin Keramaian"
    : jenis === "pengajuan-tanda-kehilangan"
    ? "Surat Tanda Kehilangan"
    : jenis === "laporan-online"
    ? "Laporan Online"
    : "Pelayanan";

// ===== status surat (izin/kehilangan) =====
const STATUS_SURAT_ENUM_TO_LABEL = {
  DIAJUKAN: "Menunggu Verifikasi",
  DIVERIFIKASI: "Proses",
  SELESAI: "Diterima",
  DITOLAK: "Ditolak",
};

// ===== status laporan online =====
const STATUS_LAPORAN_ENUM_TO_LABEL = {
  BARU: "Menunggu Verifikasi",
  DIPROSES: "Proses",
  SELESAI: "Diterima",
  DITOLAK: "Ditolak",
};

function getStatusStyle(statusLabel = "") {
  const s = (statusLabel || "").toLowerCase();
  let style = {
    wrap: "bg-gray-100 text-gray-800 ring-1 ring-gray-300",
    icon: Clock3,
    bar: "bg-gray-300",
    title: "text-gray-900",
  };

  if (s.includes("diterima") || s.includes("selesai")) {
    style = {
      wrap: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
      icon: CheckCircle2,
      bar: "bg-emerald-500",
      title: "text-emerald-900",
    };
  } else if (s.includes("proses") || s.includes("diproses")) {
    style = {
      wrap: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
      icon: Loader2,
      bar: "bg-blue-500",
      title: "text-blue-900",
    };
  } else if (s.includes("menunggu")) {
    style = {
      wrap: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
      icon: Clock3,
      bar: "bg-amber-500",
      title: "text-amber-900",
    };
  } else if (s.includes("tolak") || s.includes("tidak ditemukan") || s.includes("invalid")) {
    style = {
      wrap: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
      icon: XCircle,
      bar: "bg-rose-500",
      title: "text-rose-900",
    };
  }

  return style;
}

function toDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("id-ID");
  } catch {
    return String(iso);
  }
}

function toYMD(iso) {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

// ✅ normalisasi "from" => jenis internal yang kamu pakai di label()
function normalizeFromToJenis(from) {
  const s = String(from || "").toLowerCase();

  // dukung beberapa variasi
  if (s.includes("laporan")) return "laporan-online";
  if (s.includes("tanda-kehilangan") || s.includes("kehilangan")) return "pengajuan-tanda-kehilangan";
  if (s.includes("izin")) return "pengajuan-izin";
  if (s.includes("skck")) return "pengajuan-skck";

  return "pelayanan";
}

export default function CekStatusHasil() {
  const nav = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);

  const code = (qs.get("code") || "").trim();

  // ✅ support dua parameter: from (baru) dan jenis (lama)
  const fromParam = qs.get("from") || "";
  const jenisParamRaw = qs.get("jenis") || "";
  const jenisParam = fromParam ? normalizeFromToJenis(fromParam) : jenisParamRaw || "pelayanan";

  // ✅ infer tipe dari prefix code
  const inferredJenis = React.useMemo(() => {
    if (/^IZN-\d{4}-/i.test(code) || /^IZN-/i.test(code)) return "pengajuan-izin";
    if (/^KLH-\d{4}-/i.test(code) || /^KLH-/i.test(code)) return "pengajuan-tanda-kehilangan";
    if (/^LPR-/i.test(code)) return "laporan-online";
    return jenisParam;
  }, [code, jenisParam]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null);

  const doFetch = React.useCallback(async () => {
    setError("");

    if (!code) {
      setResult({
        nama: "—",
        layanan: label(inferredJenis),
        tanggal: "—",
        statusEnum: null,
        statusLabel: "Kode tidak ditemukan",
        statusFeedback: "Kode kosong.",
        lokasi: "—",
        waktu: "—",
        dibuat: "—",
        diperbarui: "—",
        code,
      });
      return;
    }

    try {
      setLoading(true);

      // =========================
      // 1) LAPORAN ONLINE (LPR)
      // =========================
      if (inferredJenis === "laporan-online") {
        const json = await api.cekStatusPelaporanOnline(code);
        const d = json?.data || {};

        const statusEnum = d.status || null;
        const statusLabel =
          STATUS_LAPORAN_ENUM_TO_LABEL[statusEnum] || statusEnum || "Menunggu Verifikasi";

        const statusFeedback = String(d.statusFeedback ?? "").trim();

        setResult({
          nama: d.nama || "—",
          layanan: "Laporan Online",
          tanggal: toYMD(d.tanggal || d.createdAt),
          statusEnum,
          statusLabel,
          statusFeedback: statusFeedback || "—",
          lokasi: d.lokasi || "—",
          waktu: d.jam || "—",
          dibuat: toDate(d.createdAt),
          diperbarui: toDate(d.updatedAt),
          code: d.code || code,
        });
        return;
      }

      // =========================
      // 2) SURAT (IZN / KLH)
      // =========================
      const isSurat =
        inferredJenis === "pengajuan-izin" || inferredJenis === "pengajuan-tanda-kehilangan";

      if (!isSurat) {
        setResult({
          nama: "—",
          layanan: label(inferredJenis),
          tanggal: "—",
          statusEnum: null,
          statusLabel: "Kode tidak ditemukan",
          statusFeedback: "Jenis layanan ini belum terhubung ke server status.",
          lokasi: "—",
          waktu: "—",
          dibuat: "—",
          diperbarui: "—",
          code,
        });
        return;
      }

      // ✅ pakai wrapper api biar konsisten base URL + cookies + error message
      const json = await api.get(`/surat/status/${encodeURIComponent(code)}${`?ts=${Date.now()}`}`);
      const d = json?.data || {};

      const statusEnum = d.status || null;
      const statusLabel =
        STATUS_SURAT_ENUM_TO_LABEL[statusEnum] || statusEnum || "Menunggu Verifikasi";

      const statusFeedback = String(d.statusFeedback ?? "").trim();

      // Izin Keramaian
      if (inferredJenis === "pengajuan-izin" || d.type === "IZIN_KERAMAIAN") {
        setResult({
          nama: d.penanggungJawab || "—",
          layanan: "Izin Keramaian",
          tanggal: toYMD(d.tanggal),
          statusEnum,
          statusLabel,
          statusFeedback: statusFeedback || "—",
          lokasi: d.lokasi || "—",
          waktu: d.waktuMulai && d.waktuSelesai ? `${d.waktuMulai}–${d.waktuSelesai}` : "—",
          dibuat: toDate(d.createdAt),
          diperbarui: toDate(d.updatedAt),
          code: d.code || code,
        });
        return;
      }

      // Tanda Kehilangan (KLH)
      setResult({
        nama: d.nama || "—",
        layanan: "Surat Tanda Kehilangan",
        tanggal: toYMD(d.tanggalLaporan || d.createdAt),
        statusEnum,
        statusLabel,
        statusFeedback: statusFeedback || "—",
        lokasi: "—",
        waktu: "—",
        dibuat: toDate(d.createdAt),
        diperbarui: toDate(d.updatedAt),
        code: d.code || code,
      });
    } catch (e) {
      setError(e?.message || "Gagal mengambil status");

      setResult((prev) => {
        if (prev) return prev;
        return {
          nama: "—",
          layanan: label(inferredJenis),
          tanggal: "—",
          statusEnum: null,
          statusLabel: "Kode tidak ditemukan",
          statusFeedback: "Periksa kembali nomor/kode Anda.",
          lokasi: "—",
          waktu: "—",
          dibuat: "—",
          diperbarui: "—",
          code,
        };
      });
    } finally {
      setLoading(false);
    }
  }, [code, inferredJenis]);

  React.useEffect(() => {
    doFetch();
  }, [doFetch]);

  React.useEffect(() => {
    if (!code) return;
    const id = setInterval(() => doFetch(), 10000);
    return () => clearInterval(id);
  }, [code, doFetch]);

  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") doFetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [doFetch]);

  const data = result;

  const statusLabel = data?.statusLabel || "";
  const styles = getStatusStyle(statusLabel);
  const StatusIcon = styles.icon;

  return (
    <div className="relative min-h-screen bg-white">
      <Navbar />

      {/* ✅ Hero responsif */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-24 pb-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 break-words">
          Hasil Pencarian Status
        </h1>
        <div className="mx-auto mt-2 h-1 w-20 sm:w-24 bg-black rounded-full" />
        <p className="mt-3 text-xs sm:text-sm md:text-lg text-gray-600">
          Ringkasan status dan keterangan pengajuan Anda.
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-16">
        <div className="mx-auto w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur border border-black/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
            <div className="relative p-5 sm:p-8 md:p-10">
              {/* ✅ header atas: wrap di mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Memuat status…</span>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-600">
                    Terakhir diperbarui: <b>{data?.diperbarui || "—"}</b>
                  </div>
                )}

                <button
                  onClick={doFetch}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  title="Muat ulang"
                >
                  <RotateCcw className="h-4 w-4" /> Muat Ulang
                </button>
              </div>

              {!loading && error && (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 break-words">
                  {error}
                </div>
              )}

              {!loading && data && (
                <>
                  {/* ✅ GRID: tablet jangan kepaksa 2 kolom, pakai lg untuk 2 kolom */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                    <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <IdCard className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Atas Nama</span>
                      </div>
                      <div className="mt-1 text-base sm:text-lg lg:text-xl font-semibold text-gray-900 break-words">
                        {data.nama}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <FileText className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Pengajuan</span>
                      </div>
                      <div className="mt-1 text-base sm:text-lg lg:text-xl font-semibold text-gray-900 break-words">
                        {data.layanan}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarDays className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Tanggal</span>
                      </div>
                      <div className="mt-1 text-base sm:text-lg lg:text-xl font-semibold text-gray-900 break-words">
                        {data.tanggal}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <SearchX className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Kode Dicari</span>
                      </div>
                      {/* ✅ break-all buat kode panjang */}
                      <div className="mt-1 text-base sm:text-lg lg:text-xl font-semibold text-gray-900 break-all">
                        {data.code || code || "—"}
                      </div>
                    </div>

                    {/* Lokasi & Waktu */}
                    <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-5 w-5 shrink-0" />
                          <span className="text-sm font-medium">Lokasi</span>
                        </div>
                        <div className="mt-1 text-base sm:text-lg font-semibold text-gray-900 break-words">
                          {data.lokasi}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock3 className="h-5 w-5 shrink-0" />
                          <span className="text-sm font-medium">Waktu</span>
                        </div>
                        <div className="mt-1 text-base sm:text-lg font-semibold text-gray-900 break-words">
                          {data.waktu}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mt-8">
                    <div className="flex items-center gap-3 text-lg sm:text-xl md:text-2xl font-bold">
                      <ClipboardList className="w-6 h-6 shrink-0" />
                      <span>Status</span>
                    </div>

                    {/* ✅ wrapper status: ring + responsive layout */}
                    <div className="mt-3 rounded-2xl px-4 sm:px-5 py-4 sm:py-5 ring-1 ring-black/5 bg-white/80">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className={`flex w-full sm:w-auto items-center gap-3 rounded-[14px] px-4 py-2 ${styles.wrap}`}>
                          <StatusIcon className={`h-5 w-5 ${StatusIcon === Loader2 ? "animate-spin" : ""}`} />
                          <span className={`text-sm sm:text-base md:text-lg font-extrabold ${styles.title} break-words`}>
                            {statusLabel}
                          </span>
                        </div>
                        <span className={`hidden sm:inline-block h-1 w-16 rounded-full ${styles.bar}`} />
                      </div>
                    </div>
                  </div>

                  {/* Keterangan */}
                  <div className="mt-8">
                    <div className="flex items-center gap-3 text-lg sm:text-xl md:text-2xl font-bold">
                      <MessageSquareText className="w-6 h-6 shrink-0" />
                      <span>Keterangan</span>
                    </div>

                    <div className="mt-3 rounded-2xl border bg-white/80 ring-1 ring-black/5 overflow-hidden">
                      <div className="flex">
                        <div className={`w-2 ${styles.bar}`} />
                        <div className="px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 min-w-0">
                          <div className="text-gray-800 text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-line break-words">
                            {data.statusFeedback || "—"}
                          </div>
                          <p className="mt-3 text-[11px] sm:text-xs text-gray-500 break-words">
                            Dibuat: {data.dibuat} — Diperbarui: {data.diperbarui}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Aksi */}
              <div className="mt-8 grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
                <button
                  onClick={() => nav(-1)}
                  className="w-full sm:w-auto rounded-[30px] border px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={() => nav("/cek-status", { state: { from: inferredJenis } })}
                  className="w-full sm:w-auto rounded-[30px] bg-[#F8C301] px-5 py-2.5 text-sm font-bold hover:brightness-95 transition"
                >
                  Cek Kode Lain
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] sm:text-xs text-gray-500 px-4">
            *Halaman akan memuat ulang otomatis setiap 10 detik saat terbuka.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
