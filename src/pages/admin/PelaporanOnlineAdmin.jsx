// src/pages/admin/PelaporanOnlineAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { RESOLVED_API_BASE } from "../../lib/env";

import {
  Search,
  Filter,
  ChevronRight,
  Download,
  Loader2,
  X,
  Check,
  BadgeCheck,
  Info,
  Eye,
  Trash2,
  RefreshCcw,
  FileText,
  MapPin,
  Phone,
  IdCard,
  CalendarDays,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

/* =====================================================
   Data dari PelaporanOnlineForm.jsx
===================================================== */
const JENIS_LAPORAN = [
  "Curas",
  "Pembunuhan",
  "Penculikan",
  "Pembajakan",
  "Perkosaan",
  "Curat",
  "Anirat",
  "Curanmor",
  "Pengeroyokan",
  "Aniring",
  "Curbis",
  "Curi Ringan",
  "Penipuan",
  "Penggelapan",
  "Penadahan",
  "Pemalsuan",
  "Rusak Barang",
  "Perzinahan",
  "Lari Perempuan/Gadis",
  "Perjudian",
  "Kejadian Materai/Surat",
  "Penyelundupan",
  "Senpi/Handak",
  "Pemerasan atau Ancaman",
  "Masalah Tanah",
  "Demo atau Mogok",
  "Sajam",
  "Penghinaan",
  "KDRT",
  "Perbuatan Cabul",
  "Pengancaman",
  "Perbuatan Tidak Menyenangkan",
  "Laporan Palsu",
  "Lain-lain (termasuk yang melibatkan anak)",
  "Penggelapan dalam Jabatan",
];

/* =====================================================
   Utility kecil
===================================================== */
const cn = (...cls) => cls.filter(Boolean).join(" ");
const ellipsis = (s, n = 70) => (!s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s);
const toYMD = (dateIso) => (!dateIso ? "" : String(dateIso).slice(0, 10));

const monthNames = [
  "01 - Januari",
  "02 - Februari",
  "03 - Maret",
  "04 - April",
  "05 - Mei",
  "06 - Juni",
  "07 - Juli",
  "08 - Agustus",
  "09 - September",
  "10 - Oktober",
  "11 - November",
  "12 - Desember",
];

function getYearFromDateStr(dateStr) {
  if (!dateStr) return null;
  const [y] = String(dateStr).split("-");
  const yi = parseInt(y, 10);
  return Number.isNaN(yi) ? null : yi;
}

function getMonthFromDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("-");
  if (parts.length < 2) return null;
  const mi = parseInt(parts[1], 10);
  return Number.isNaN(mi) ? null : mi;
}

function safeId() {
  try {
    if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** ✅ FIX PENTING: bikin URL lampiran jadi benar (backend origin) */
function resolveUploadUrl(lampiran) {
  if (!lampiran) return null;

  const raw = String(lampiran).trim();
  if (!raw) return null;

  // sudah absolute
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = String(RESOLVED_API_BASE || "").replace(/\/$/, "");

  // kalau sudah /uploads/...
  if (raw.startsWith("/uploads/")) return `${base}${raw}`;

  // kalau hanya filename
  if (!raw.startsWith("/")) return `${base}/uploads/${raw}`;

  // path lain => tetap prefix base
  return `${base}${raw}`;
}

function isPdfUrl(u) {
  return /\.pdf(\?|#|$)/i.test(String(u || ""));
}

/**
 * ✅ lebih toleran:
 * - jika path mengandung /uploads/pelaporan-online/ dan bukan pdf, anggap image
 * - atau berdasarkan ekstensi umum
 */
function isImageLikeUrl(u) {
  const s = String(u || "");
  if (!s) return false;
  if (isPdfUrl(s)) return false;
  if (/\/uploads\/pelaporan-online\//i.test(s)) return true;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(s);
}

/* =====================================================
   Mapping status (Admin)
===================================================== */
const STATUS_ENUM_TO_LABEL = {
  BARU: "Menunggu Verifikasi",
  DIPROSES: "Proses",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

const STATUS_LABEL_TO_ENUM = {
  "Menunggu Verifikasi": "BARU",
  Proses: "DIPROSES",
  Selesai: "SELESAI",
  Ditolak: "DITOLAK",
};

const StatusBadge = ({ value }) => {
  const label = STATUS_ENUM_TO_LABEL[value] || value || "Menunggu Verifikasi";
  const map = {
    Selesai: "bg-green-100 text-green-700 ring-green-200",
    Ditolak: "bg-rose-100 text-rose-700 ring-rose-200",
    Proses: "bg-amber-100 text-amber-700 ring-amber-200",
    "Menunggu Verifikasi": "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ring-1",
        map[label] || map["Menunggu Verifikasi"]
      )}
      title={label}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

const FeedbackChip = ({ text }) => (
  <span
    className={cn(
      "inline-flex max-w-[32ch] items-center gap-1 rounded-full px-2 py-1 text-xs",
      "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    )}
    title={text || ""}
  >
    <Info className="h-3.5 w-3.5" /> {ellipsis(text, 40) || <span className="opacity-50">-</span>}
  </span>
);

/* === Base class tombol Aksi === */
const btnAksiBase =
  "min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium active:scale-[.99] transition focus:outline-none focus:ring-2 focus:ring-offset-1";
const btnDark = "bg-slate-900 hover:bg-slate-800 focus:ring-slate-300";
const btnEmerald = "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300";
const btnRose = "bg-rose-600 hover:bg-rose-700 focus:ring-rose-300";

/* =====================================================
   Filter Bar
===================================================== */
const FilterBar = ({
  q,
  jenis,
  month,
  year,
  yearsOption,
  onChangeQ,
  onChangeJenis,
  onChangeMonth,
  onChangeYear,
  onReset,
}) => {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        <div className="lg:col-span-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => onChangeQ(e.target.value)}
              placeholder="Cari kode / nama / NIK / HP / lokasi…"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={jenis}
              onChange={(e) => onChangeJenis(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jenis</option>
              {JENIS_LAPORAN.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={month}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Bulan</option>
              {monthNames.map((label, idx) => (
                <option key={idx + 1} value={String(idx + 1).padStart(2, "0")}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={year}
              onChange={(e) => onChangeYear(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tahun</option>
              {yearsOption.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* ✅ Responsive tweak: tombol + info jadi rapi di mobile */}
        <div className="lg:col-span-12 flex gap-2 justify-between flex-wrap">
          <button
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 active:scale-[.99] transition inline-flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
            title="Reset filter"
          >
            <RefreshCcw className="h-4 w-4" /> Reset
          </button>

          <p className="text-xs text-slate-500 w-full sm:w-auto">
            * Filter bulan & tahun mengacu pada: <b>tanggal kejadian</b> (field <code>tanggal</code>).
          </p>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Modal Detail
===================================================== */
const DetailModal = ({ open, onClose, row }) => {
  if (!open || !row) return null;

  const href = resolveUploadUrl(row.lampiran);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">Detail Pelaporan Online</h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm shrink-0"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Kode Cek Status
              </div>
              <div className="mt-1 font-semibold break-all">{row.code || "-"}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Jenis
              </div>
              <div className="mt-1 font-semibold break-words">{row.jenis || "-"}</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Tanggal & Jam
              </div>
              <div className="mt-1 font-semibold">
                {toYMD(row.tanggal) || "-"} {row.jam ? `• ${row.jam}` : ""}
              </div>
            </div>

            <div className="rounded-2xl border p-4 md:col-span-3">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> Status
              </div>
              <div className="mt-2">
                <StatusBadge value={row.status} />
              </div>
              <div className="mt-2">
                <FeedbackChip text={row.statusFeedback} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="font-bold mb-3">Identitas Pelapor</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">
                  <BadgeCheck className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0">
                  <div className="text-slate-500 text-xs">Nama</div>
                  <div className="font-semibold break-words">{row.nama || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="mt-0.5">
                  <IdCard className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0">
                  <div className="text-slate-500 text-xs">NIK</div>
                  <div className="font-semibold break-all">{row.nik || "-"}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 md:col-span-2">
                <span className="mt-0.5">
                  <Phone className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0">
                  <div className="text-slate-500 text-xs">No HP</div>
                  <div className="font-semibold break-all">{row.hp || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="font-bold mb-3">Lokasi Kejadian</h4>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
              <div className="whitespace-pre-wrap break-words text-slate-800">{row.lokasi || "-"}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="font-bold mb-3">Kronologi</h4>
            <div className="whitespace-pre-wrap break-words text-sm text-slate-800">{row.kronologi || "-"}</div>
          </div>

          {/* ✅ LAMPIRAN: tampilkan preview + tombol buka */}
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="font-bold mb-2">Lampiran</h4>

            {!row.lampiran ? (
              <p className="text-sm text-slate-500">-</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700 break-words">
                  Path: <b className="break-all">{String(row.lampiran)}</b>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-0 sm:ml-2 mt-2 sm:mt-0 inline-flex items-center gap-1 text-indigo-600 underline"
                    >
                      <ExternalLink className="h-4 w-4" /> Buka
                    </a>
                  ) : null}
                </p>

                {href && isImageLikeUrl(href) ? (
                  <div className="rounded-xl overflow-hidden ring-1 ring-slate-200 bg-slate-50">
                    <img
                      src={href}
                      alt="Lampiran"
                      className="w-full max-h-[360px] sm:max-h-[420px] object-contain"
                      onError={(e) => {
                        e.currentTarget.outerHTML =
                          '<div style="padding:12px;font-size:12px;color:#64748b">Gagal memuat gambar. Coba klik tombol <b>Buka</b>.</div>';
                      }}
                    />
                  </div>
                ) : null}

                {href && isPdfUrl(href) ? (
                  <div className="rounded-xl overflow-hidden ring-1 ring-slate-200">
                    <iframe
                      title="Lampiran PDF"
                      src={href}
                      className="w-full h-[420px] sm:h-[520px] bg-white"
                    />
                  </div>
                ) : null}

                {href && !isImageLikeUrl(href) && !isPdfUrl(href) ? (
                  <p className="text-xs text-slate-500">
                    File terdeteksi bukan gambar/pdf. Silakan klik <b>Buka</b>.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 w-full sm:w-auto">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Modal Ubah Status
===================================================== */
const StatusModal = ({ open, onClose, row, onChangeStatus }) => {
  const initialLabel = STATUS_ENUM_TO_LABEL[row?.status] || row?.status || "Menunggu Verifikasi";
  const [statusLabel, setStatusLabel] = useState(initialLabel);
  const [feedback, setFeedback] = useState(row?.statusFeedback || "");

  useEffect(() => {
    const label = STATUS_ENUM_TO_LABEL[row?.status] || row?.status || "Menunggu Verifikasi";
    setStatusLabel(label);
    setFeedback(row?.statusFeedback || "");
  }, [row, open]);

  if (!open || !row) return null;

  const handleSave = () => {
    onChangeStatus(row, STATUS_LABEL_TO_ENUM[statusLabel] || "BARU", feedback?.trim() || "");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl ring-1 ring-slate-200 max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="font-semibold truncate">Ubah Status Pelaporan</h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 shrink-0"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-auto">
          <div className="text-sm">
            <div className="text-slate-600">Pelapor:</div>
            <div className="font-semibold break-words">{row.nama || "-"}</div>
          </div>

          <label className="block text-sm font-semibold">Status</label>
          <select
            value={statusLabel}
            onChange={(e) => setStatusLabel(e.target.value)}
            className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option>Menunggu Verifikasi</option>
            <option>Proses</option>
            <option>Selesai</option>
            <option>Ditolak</option>
          </select>

          <div>
            <label className="block text-sm font-semibold mt-2">Feedback (muncul di Cek Status)</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Contoh: Mohon lengkapi kronologi lebih detail..."
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">Catatan ini akan disimpan dan terlihat oleh pemohon.</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 w-full sm:w-auto">
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Check className="h-4 w-4" /> Simpan Status
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Export PDF (tabel)
   ✅ FIX: sesuaikan antar-kolom biar rapi (header tidak pecah)
   ✅ FIX REQUEST: jangan bisa export PDF jika tidak ada data
===================================================== */
async function exportTablePDF({ rows, filters }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  // ✅ FIX: block export bila data kosong
  if (safeRows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const { default: jsPDF } = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule?.default || autoTableModule?.autoTable || autoTableModule;

  // ✅ Pakai A3 landscape biar kolom tidak saling tindih & lebih terbaca
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });

  const title = "Daftar Pelaporan Online";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const periodeTahun = filters?.year ? String(filters.year) : "Semua";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, pageW / 2, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Periode Tahun: ${periodeTahun}`, pageW / 2, 26, { align: "center" });

  // Helper: pendekkan lampiran biar tidak makan lebar tabel
  const lampiranLabel = (v) => {
    const s = String(v || "").trim();
    if (!s) return "-";
    const clean = s.replace(/\\/g, "/");
    const last = clean.split("/").filter(Boolean).pop() || clean;
    return last.length > 38 ? `${last.slice(0, 35)}…` : last;
  };

  const columns = [
    { header: "No", dataKey: "no" },
    { header: "Kode", dataKey: "code" },
    { header: "Nama", dataKey: "nama" },
    { header: "NIK", dataKey: "nik" },
    { header: "HP", dataKey: "hp" },
    { header: "Jenis", dataKey: "jenis" },
    { header: "Tgl", dataKey: "tanggal" },
    { header: "Jam", dataKey: "jam" },
    { header: "Lokasi", dataKey: "lokasi" },
    { header: "Kronologi", dataKey: "kronologi" },
    { header: "Status", dataKey: "status" },
  ];

  const body = safeRows.map((r, i) => ({
    no: i + 1,
    code: r.code || "-",
    nama: r.nama || "-",
    nik: r.nik || "-",
    hp: r.hp || "-",
    jenis: r.jenis || "-",
    tanggal: toYMD(r.tanggal) || "-",
    jam: r.jam || "-",
    lokasi: (r.lokasi || "-").replace(/\s+/g, " ").trim(),
    kronologi: (r.kronologi || "-").replace(/\s+/g, " ").trim(),
    status: STATUS_ENUM_TO_LABEL[r.status] || r.status || "Menunggu Verifikasi",
    lampiran: lampiranLabel(r.lampiran),
  }));

  const M_LEFT = 16;
  const M_RIGHT = 16;

  autoTable(doc, {
    columns,
    body,
    startY: 34,

    tableWidth: pageW - M_LEFT - M_RIGHT,

    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 4,
      overflow: "linebreak",
      cellWidth: "wrap",
      valign: "top",
      lineWidth: 0.25,
      lineColor: [226, 232, 240],
      textColor: [15, 23, 42],
    },

    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      lineWidth: 0,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },

    margin: { left: M_LEFT, right: M_RIGHT },

    // ✅ KOLOM RAPi: lebar disusun agar header tidak pecah ("No" dan "Jam" tidak turun baris)
    // Total = 388 (pas dengan tableWidth A3 landscape & margin 16+16)
    columnStyles: {
      no: { cellWidth: 12, halign: "center" },
      code: { cellWidth: 24 },
      nama: { cellWidth: 44 },
      nik: { cellWidth: 30 },
      hp: { cellWidth: 28 },
      jenis: { cellWidth: 30 },
      tanggal: { cellWidth: 22, halign: "center" },
      jam: { cellWidth: 20, halign: "center" },
      lokasi: { cellWidth: 64 },
      kronologi: { cellWidth: 84 },
      status: { cellWidth: 30, halign: "center" },
    },

    // ✅ Buat alignment kolom tertentu konsisten (header & isi)
    didParseCell: (hookData) => {
      const key = hookData?.column?.dataKey;
      if (!key) return;

      const centerCols = new Set(["no", "tanggal", "jam", "status"]);
      if (centerCols.has(key)) {
        hookData.cell.styles.halign = "center";
      }

      // jaga header agar tetap terlihat rapi (tidak terasa "numpuk")
      if (hookData.section === "head") {
        hookData.cell.styles.valign = "middle";
      }
    },

    didDrawPage: (data) => {
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Halaman ${pageNumber}`, pageW - M_RIGHT, pageH - 10, { align: "right" });
    },
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;

  doc.save(`pelaporan_online_${stamp}.pdf`);
}

/* =====================================================
   Preview Export Modal
===================================================== */
const PreviewExportModal = ({ open, onClose, rows, filters, TableComp, compact }) => {
  if (!open) return null;

  const handleDownload = async () => {
    // ✅ FIX: block export bila data kosong (double-guard)
    if (!rows || rows.length === 0) return alert("Tidak ada data untuk diekspor.");
    await exportTablePDF({ rows, filters });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] sm:h-[88vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h2 className="font-semibold truncate">Preview Tabel Sebelum Export</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm shrink-0"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <TableComp rows={rows} compact={compact} onView={() => {}} onOpenStatus={() => {}} onDelete={() => {}} />
        </div>

        <div className="p-4 border-t flex items-center justify-end">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold w-full sm:w-auto justify-center"
            title="Download PDF hasil tabel yang dipreview"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Action Bar
===================================================== */
const ActionBar = ({ rows, filters, TableComp, onReload, compact, onToggleCompact }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpenPreview = () => {
    if (!rows || rows.length === 0) return alert("Tidak ada data untuk diekspor.");
    setPreviewOpen(true);
  };

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="text-sm text-slate-600 w-full sm:w-auto">
        Menampilkan <b>{rows.length}</b> laporan
      </div>

      {/* ✅ Responsive tweak: tombol jadi wrap + full width di mobile */}
      <div className="flex gap-2 w-full sm:w-auto flex-wrap">
        <button
          onClick={onToggleCompact}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow active:scale-[.99] transition w-full sm:w-auto justify-center",
            compact
              ? "bg-slate-900 hover:bg-slate-800 text-white"
              : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
          )}
          title={compact ? "Kembali ke tampilan lengkap" : "Ringkaskan kolom inti saja"}
        >
          {compact ? "Tampilan Lengkap" : "Tampilan Ringkas"}
        </button>

        <button
          onClick={onReload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow active:scale-[.99] w-full sm:w-auto justify-center"
          title="Reload data"
        >
          <RefreshCcw className="h-4 w-4" /> Reload
        </button>

        <button
          onClick={handleOpenPreview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow active:scale-[.99] w-full sm:w-auto justify-center"
          title="Preview sebelum ekspor PDF"
        >
          <Download className="h-4 w-4" />
          Ekspor PDF
        </button>
      </div>

      <PreviewExportModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        rows={rows}
        filters={filters}
        TableComp={TablePelaporan}
        compact={compact}
      />
    </div>
  );
};

/* =====================================================
   Table Pelaporan Online
   ✅ Lampiran jadi preview/link
===================================================== */
const TablePelaporan = ({ rows, onView, onOpenStatus, onDelete, compact }) => {
  const [brokenImg, setBrokenImg] = useState({}); // key: row.id -> true jika gagal load

  const headers = compact
    ? ["No", "Kode", "Nama", "Jenis", "Tanggal", "Status", "Aksi"]
    : [
        "No",
        "Kode",
        "Nama",
        "NIK",
        "HP",
        "Jenis",
        "Tanggal",
        "Jam",
        "Lokasi",
        "Kronologi",
        "Lampiran",
        "Status",
        "Feedback",
        "Aksi",
      ];

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white/80 backdrop-blur">
      {/* ✅ Responsive tweak:
          - mobile: min-w diturunkan + tombol aksi bisa stack
          - desktop: tetap lebar agar tabel tidak “pecah”
          - ✅ FIX NIK/HP: dibuat nowrap + min-width biar tidak turun ke bawah */}
      <table
        className={cn(
          compact ? "min-w-[980px] sm:min-w-[1180px]" : "min-w-[1480px] sm:min-w-[1750px]",
          "w-full table-auto"
        )}
      >
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-sm">
          <tr className="text-slate-700">
            {headers.map((h) => (
              <th
                key={h}
                className={cn(
                  "px-3 py-2 text-left font-semibold whitespace-nowrap",
                  h === "NIK" ? "min-w-[170px]" : "",
                  h === "HP" ? "min-w-[120px]" : ""
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="text-sm">
          {rows.map((row, i) => {
            const href = resolveUploadUrl(row.lampiran);
            const imgLike = href && isImageLikeUrl(href);
            const isBroken = !!brokenImg[row.id];

            return (
              <tr key={row.id || i} className="border-t hover:bg-slate-50/70 align-top">
                <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-semibold break-all">{row.code || "-"}</span>
                </td>
                <td className="px-3 py-2 font-semibold break-words">{row.nama || "-"}</td>

                {compact ? (
                  <>
                    <td className="px-3 py-2 break-words">{row.jenis || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{toYMD(row.tanggal) || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      {/* ✅ Responsive tweak: aksi jadi kolom stack di mobile */}
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button className={cn(btnAksiBase, btnDark, "w-full sm:w-auto")} onClick={() => onView(row)}>
                          <Eye className="h-4 w-4" /> Lihat
                        </button>
                        <button
                          className={cn(btnAksiBase, btnEmerald, "w-full sm:w-auto")}
                          onClick={() => onOpenStatus(row)}
                        >
                          <Check className="h-4 w-4" /> Status
                        </button>
                        <button className={cn(btnAksiBase, btnRose, "w-full sm:w-auto")} onClick={() => onDelete(row)}>
                          <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    {/* ✅ FIX: NIK & HP jangan wrap ke bawah, biarkan memanjang ke kanan */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono tabular-nums min-w-[170px]">
                      {row.nik || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono tabular-nums min-w-[120px]">
                      {row.hp || "-"}
                    </td>

                    <td className="px-3 py-2 break-words">{row.jenis || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{toYMD(row.tanggal) || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.jam || "-"}</td>

                    {/* ✅ Responsive tweak: max-width lebih kecil di mobile */}
                    <td className="px-3 py-2 max-w-[220px] sm:max-w-[320px]">
                      <div className="text-slate-800 break-words">{ellipsis(row.lokasi, 110) || "-"}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[240px] sm:max-w-[360px]">
                      <div className="text-slate-800 break-words">{ellipsis(row.kronologi, 120) || "-"}</div>
                    </td>

                    {/* ✅ LAMPIRAN: thumbnail/link (ikon tidak menimpa gambar) */}
                    <td className="px-3 py-2">
                      {!row.lampiran ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <div className="flex items-center gap-2 min-w-[220px]">
                          <div className="w-12 h-12 rounded-lg overflow-hidden ring-1 ring-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                            {imgLike && !isBroken ? (
                              <img
                                src={href}
                                alt="Lampiran"
                                className="w-full h-full object-cover"
                                onError={() => setBrokenImg((m) => ({ ...m, [row.id]: true }))}
                              />
                            ) : isPdfUrl(href) ? (
                              <FileText className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs text-slate-700 break-all">
                              {ellipsis(String(row.lampiran), 42)}
                            </div>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Buka
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <FeedbackChip text={row.statusFeedback} />
                    </td>
                    <td className="px-3 py-2">
                      {/* ✅ Responsive tweak: aksi jadi stack di mobile */}
                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button className={cn(btnAksiBase, btnDark, "w-full sm:w-auto")} onClick={() => onView(row)}>
                          <Eye className="h-4 w-4" /> Lihat
                        </button>
                        <button
                          className={cn(btnAksiBase, btnEmerald, "w-full sm:w-auto")}
                          onClick={() => onOpenStatus(row)}
                        >
                          <Check className="h-4 w-4" /> Status
                        </button>
                        <button className={cn(btnAksiBase, btnRose, "w-full sm:w-auto")} onClick={() => onDelete(row)}>
                          <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={compact ? 7 : 14} className="px-3 py-10 text-center text-slate-500">
                Belum ada data pelaporan online.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* =====================================================
   Halaman Utama
===================================================== */
export default function PelaporanOnlineAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // filter
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // ✅ mode ringkas
  const [compact, setCompact] = useState(false);

  // modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusRow, setStatusRow] = useState(null);

  const loadFromLocalFallback = () => {
    try {
      const raw = localStorage.getItem("pelaporan_online_rows");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  };

  const persistToLocal = (nextRows) => {
    try {
      localStorage.setItem("pelaporan_online_rows", JSON.stringify(nextRows));
    } catch {}
  };

  const normalizeRow = (r) => ({
    id: r.id ?? safeId(),
    code: r.code ?? r.statusCode ?? r.kode ?? "",
    nama: r.nama ?? "",
    nik: r.nik ?? "",
    hp: r.hp ?? "",
    jenis: r.jenis ?? "",
    lokasi: r.lokasi ?? "",
    tanggal: r.tanggal ? toYMD(r.tanggal) : "",
    jam: r.jam ?? "",
    kronologi: r.kronologi ?? "",
    lampiran: r.lampiran ?? r.lampiranPath ?? null,
    status: r.status ?? "BARU",
    statusFeedback: r.statusFeedback ?? "",
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
  });

  const loadData = async () => {
    setLoading(true);
    setToast("");
    try {
      const json = await api.adminListPelaporanOnline({
        page: 1,
        limit: 500,
        q: q || undefined,
        jenis: jenis || undefined,
        month: month || undefined,
        year: year || undefined,
        ts: Date.now(),
      });

      const data = Array.isArray(json?.rows) ? json.rows : Array.isArray(json?.data) ? json.data : [];

      const normalized = data.map(normalizeRow);
      setRows(normalized);
      persistToLocal(normalized);
      return;
    } catch (e) {
      const fallback = loadFromLocalFallback().map(normalizeRow);
      setRows(fallback);
      setToast(
        e?.message
          ? `Fallback localStorage dipakai (server belum siap / error): ${e.message}`
          : "Fallback localStorage dipakai (server belum siap / error)."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yearsOption = useMemo(() => {
    const ys = new Set();
    rows.forEach((r) => {
      const y = getYearFromDateStr(r.tanggal);
      if (y) ys.add(y);
    });
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        qq === "" ||
        (r.code || "").toLowerCase().includes(qq) ||
        (r.nama || "").toLowerCase().includes(qq) ||
        (r.nik || "").toLowerCase().includes(qq) ||
        (r.hp || "").toLowerCase().includes(qq) ||
        (r.lokasi || "").toLowerCase().includes(qq);

      const matchJenis = jenis === "" || r.jenis === jenis;

      const d = r.tanggal || "";
      const m = String(getMonthFromDateStr(d) || "").padStart(2, "0");
      const y = String(getYearFromDateStr(d) || "");
      const matchMonth = month === "" || m === month;
      const matchYear = year === "" || y === year;

      return matchQ && matchJenis && matchMonth && matchYear;
    });
  }, [rows, q, jenis, month, year]);

  const filters = { q, jenis, month, year };

  const handleView = (row) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const openStatus = (row) => {
    setStatusRow(row);
    setStatusOpen(true);
  };

  const changeStatus = async (row, statusEnum, statusFeedback = "") => {
    const prevRows = rows;

    const optimistic = prevRows.map((r) => (r.id === row.id ? { ...r, status: statusEnum, statusFeedback } : r));
    setRows(optimistic);
    persistToLocal(optimistic);

    try {
      await api.adminUpdateStatusPelaporanOnline(row.id, { status: statusEnum, statusFeedback });
      setToast("✅ Status berhasil diperbarui.");
      await loadData();
    } catch (e) {
      setRows(prevRows);
      persistToLocal(prevRows);
      setToast(`❌ Gagal update status: ${e?.message || "Unknown error"}`);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Hapus laporan "${row.nama || "-"}"?`);
    if (!ok) return;

    const prevRows = rows;

    const optimistic = prevRows.filter((r) => r.id !== row.id);
    setRows(optimistic);
    persistToLocal(optimistic);

    try {
      await api.adminDeletePelaporanOnline(row.id);
      setToast("✅ Laporan berhasil dihapus.");
      await loadData();
    } catch (e) {
      setRows(prevRows);
      persistToLocal(prevRows);
      setToast(`❌ Gagal menghapus laporan: ${e?.message || "Unknown error"}`);
    }
  };

  const resetFilter = () => {
    setQ("");
    setJenis("");
    setMonth("");
    setYear("");
  };

  return (
    <div className="space-y-6">
      {/* ✅ Responsive tweak: padding header adaptif */}
      <div className="p-4 sm:p-6 bg-black text-white shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              Dashboard Admin — Pelaporan Online
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              Manajemen laporan (kode, nama, NIK, HP, jenis, lokasi, tanggal, jam, kronologi, lampiran).
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm bg-white/10 rounded-xl px-4 py-2 w-full sm:w-auto justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {toast ? (
        <div className="mx-2 md:mx-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 break-words">
          {toast}
        </div>
      ) : null}

      <FilterBar
        q={q}
        jenis={jenis}
        month={month}
        year={year}
        yearsOption={yearsOption}
        onChangeQ={setQ}
        onChangeJenis={setJenis}
        onChangeMonth={setMonth}
        onChangeYear={setYear}
        onReset={resetFilter}
      />

      <ActionBar
        rows={filtered}
        filters={filters}
        TableComp={TablePelaporan}
        onReload={loadData}
        compact={compact}
        onToggleCompact={() => setCompact((v) => !v)}
      />

      <Card className="border border-slate-200 rounded-2xl overflow-hidden">
        <CardBody className="p-0 sm:p-0">
          <TablePelaporan
            rows={filtered}
            compact={compact}
            onView={handleView}
            onOpenStatus={openStatus}
            onDelete={handleDelete}
          />
        </CardBody>
      </Card>

      <DetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        row={detailRow}
      />

      <StatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        row={statusRow}
        onChangeStatus={changeStatus}
      />
    </div>
  );
}