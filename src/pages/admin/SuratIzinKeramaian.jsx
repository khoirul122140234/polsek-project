// src/pages/admin/SuratIzinKeramaian.jsx
import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardBody } from "../../components/ui/Card";

// ✅ pakai single source of truth
import { api } from "../../lib/axios";
import { getUser } from "../../lib/auth";

// ✅ SURAT IZIN (preview + download)
import {
  generateIzinKeramaianPDF,
  generateIzinKeramaianPDFBlobUrl,
} from "../../lib/surat/izinKeramaian";

import {
  Download,
  Filter,
  Search,
  BadgeCheck,
  X,
  ChevronRight,
  Check,
  Info,
  Save,
  RotateCcw,
  UserRoundCog,
} from "lucide-react";

/* =====================================================
   Utility kecil
===================================================== */
const isNik = (v) => /^\d{16}$/.test(v || "");
const isHp = (v) => /^0\d{9,13}$/.test(v || "");
const cn = (...cls) => cls.filter(Boolean).join(" ");
const ellipsis = (s, n = 60) =>
  !s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s;

const btnAksiBase =
  "min-w-[120px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium active:scale-[.99] transition focus:outline-none focus:ring-2 focus:ring-offset-1";
const btnDark = "bg-slate-900 hover:bg-slate-800 focus:ring-slate-300";
const btnIndigo = "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300";
const btnEmerald = "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300";
const btnRose = "bg-rose-600 hover:bg-rose-700 focus:ring-rose-300";

/* =====================================================
   Mapping status (Backend <-> UI)
===================================================== */
const STATUS_ENUM_TO_LABEL = {
  DIAJUKAN: "Menunggu Verifikasi",
  DIVERIFIKASI: "Proses",
  SELESAI: "Diterima",
  DITOLAK: "Ditolak",
};
const STATUS_LABEL_TO_ENUM = {
  "Menunggu Verifikasi": "DIAJUKAN",
  Proses: "DIVERIFIKASI",
  Diterima: "SELESAI",
  Ditolak: "DITOLAK",
};

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
  const [y] = dateStr.split("-");
  const yi = parseInt(y, 10);
  return Number.isNaN(yi) ? null : yi;
}
function getMonthFromDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length < 2) return null;
  const mi = parseInt(parts[1], 10);
  return Number.isNaN(mi) ? null : mi;
}
function toYMD(dateIso) {
  if (!dateIso) return "";
  return String(dateIso).slice(0, 10);
}

/* =====================================================
   Badge Status + chip Feedback
===================================================== */
const StatusBadge = ({ value }) => {
  const label = STATUS_ENUM_TO_LABEL[value] || value || "Menunggu Verifikasi";
  const map = {
    Diterima: "bg-green-100 text-green-700 ring-green-200",
    Ditolak: "bg-rose-100 text-rose-700 ring-rose-200",
    Proses: "bg-amber-100 text-amber-700 ring-amber-200",
    "Menunggu Verifikasi": "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ring-1 whitespace-nowrap",
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
      "inline-flex max-w-[28ch] items-center gap-1 rounded-full px-2 py-1 text-xs",
      "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    )}
    title={text || ""}
  >
    <Info className="h-3.5 w-3.5" />{" "}
    {ellipsis(text, 36) || <span className="opacity-50">-</span>}
  </span>
);

/* =====================================================
   ✅ Kartu Pengaturan Nomor Surat IZIN (Counter)
===================================================== */
const NomorIzinCounterCard = ({ yearValue, yearsOption, onChanged, refreshToken }) => {
  const currentYear = new Date().getFullYear();
  const yearForCounter = useMemo(() => {
    const y = Number(yearValue);
    return Number.isFinite(y) && y > 2000 ? y : currentYear;
  }, [yearValue, currentYear]);

  const [loading, setLoading] = useState(false);
  const [nextNumber, setNextNumber] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const s = new Set([currentYear, ...(yearsOption || [])]);
    return Array.from(s).sort((a, b) => a - b);
  }, [yearsOption, currentYear]);

  const loadCounter = async ({ silent = false } = {}) => {
    try {
      setLoading(true);
      const res = await api.get("/surat/admin/izin-counter", {
        params: { year: yearForCounter, ts: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });
      const nn = res.data?.nextNumber;
      const parsed = typeof nn === "number" ? nn : Number(nn) || null;
      setNextNumber(parsed);
      setDraft(String(parsed || ""));
    } catch (e) {
      if (!silent) {
        const msg =
          e?.response?.data?.error ||
          e?.message ||
          "Gagal memuat counter nomor IZIN";
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounter({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearForCounter]);

  useEffect(() => {
    if (refreshToken == null) return;
    loadCounter({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const saveCounter = async () => {
    const nn = Number(String(draft || "").replace(/[^\d]/g, ""));
    if (!Number.isFinite(nn) || nn < 1) return alert("Nomor mulai harus angka >= 1");

    try {
      setSaving(true);
      await api.put("/surat/admin/izin-counter", {
        year: yearForCounter,
        nextNumber: nn,
      });
      await loadCounter({ silent: true });
      onChanged?.();
      alert("Counter nomor IZIN berhasil diperbarui.");
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Gagal menyimpan counter nomor IZIN";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 w-full lg:w-auto lg:min-w-[240px]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              Pengaturan Nomor Surat (IZIN)
            </h3>

            <button
              type="button"
              onClick={() => loadCounter({ silent: false })}
              disabled={loading || saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800",
                "hover:bg-slate-50 active:scale-[.99] transition",
                (loading || saving) ? "opacity-60 cursor-not-allowed" : "",
                "w-full sm:w-auto justify-center"
              )}
              title="Refresh nomor berikutnya"
            >
              <RotateCcw className={cn("h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Nomor dibuat saat admin klik <b>SELESAI</b> ✅ (anti loncat).
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Tahun</div>
            <div className="mt-1">
              <select
                value={String(yearForCounter)}
                onChange={() => {
                  alert(
                    "Untuk ubah tahun counter, gunakan filter Tahun di atas (Semua Tahun/Tahun tertentu)."
                  );
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Mengikuti filter tahun (default: tahun sekarang).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Nomor berikutnya (nextNumber)</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {loading ? "..." : nextNumber ?? "-"}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Contoh format: <b>SI / 287 / X / 2026 / INTELKAM</b>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">Ubah mulai dari</div>
            <div className="mt-1 flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="misal: 287"
              />
              <button
                disabled={saving}
                onClick={saveCounter}
                className={cn(
                  "px-4 py-2 rounded-xl text-white font-semibold",
                  saving ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700",
                  "w-full sm:w-auto"
                )}
              >
                Simpan
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Disarankan set saat awal tahun/awal penggunaan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Filter Bar modern
===================================================== */
const FilterBar = ({
  tab,
  nameQuery,
  month,
  year,
  yearsOption,
  onChangeName,
  onChangeMonth,
  onChangeYear,
  onReset,
}) => {
  const namePlaceholder =
    tab === "izin" ? "Cari nama organisasi / penanggung jawab…" : "Cari nama pemohon…";

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        <div className="lg:col-span-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder={namePlaceholder}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
        <div className="lg:col-span-3 flex gap-2 justify-start lg:justify-end">
          <button
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 active:scale-[.99] transition w-full sm:w-auto"
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        * Bulan & tahun mengacu pada:{" "}
        {tab === "izin"
          ? "tanggal kegiatan"
          : "tanggal laporan (jika ada), jika tidak ada memakai tanggal lahir"}
        .
      </p>
    </div>
  );
};

/* =====================================================
   Modal Edit (IZIN SAJA)
===================================================== */
const EMPTY_IZIN = {
  id: null,
  jenisSurat: "izin",
  namaOrganisasi: "",
  penanggungJawab: "",
  nik: "",
  hp: "",
  alamat: "",
  jenisKegiatan: "",
  namaKegiatan: "",
  lokasi: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  perkiraanPeserta: "",

  // ✅ BARU (Tahap 1): untuk DASAR no.7
  rekomDesaNama: "",
  rekomDesaNomor: "",
};

const EditModal = ({ open, onClose, data, onSave }) => {
  const initial = useMemo(() => {
    if (!data) return null;
    return { ...EMPTY_IZIN, ...data };
  }, [data]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  if (!open || !form) return null;

  const handleText = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleNumber = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value.replace(/[^\d]/g, "") }));

  const validateIzin = () => {
    if (!form.penanggungJawab?.trim()) return "Nama penanggung jawab wajib diisi.";
    if (!isNik(form.nik)) return "NIK harus 16 digit angka.";
    if (!isHp(form.hp)) return "No HP tidak valid (0 + 10–14 digit).";
    if (!form.alamat?.trim()) return "Alamat wajib diisi.";
    if (!form.jenisKegiatan) return "Jenis kegiatan wajib dipilih.";
    if (!form.namaKegiatan?.trim()) return "Dalam rangka kegiatan wajib diisi.";
    if (!form.lokasi?.trim()) return "Lokasi wajib diisi.";
    if (!form.tanggal) return "Tanggal wajib diisi.";
    if (!form.waktuMulai) return "Waktu mulai wajib diisi.";
    if (!form.waktuSelesai) return "Waktu selesai wajib diisi.";
    if (form.waktuMulai && form.waktuSelesai && form.waktuSelesai <= form.waktuMulai)
      return "Waktu selesai harus setelah waktu mulai.";
    if (!form.perkiraanPeserta || Number(form.perkiraanPeserta) <= 0)
      return "Perkiraan peserta harus > 0.";
    return null;
  };

  const handleSave = () => {
    const err = validateIzin();
    if (err) return alert(err);
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold break-words">
            Edit Pengajuan Surat Izin Keramaian
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 shrink-0"
            type="button"
          >
            <X className="h-4 w-4" />
            Tutup
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">
                Nama Organisasi{" "}
                <span className="text-xs font-normal text-slate-500">(opsional)</span>
              </label>
              <input
                name="namaOrganisasi"
                value={form.namaOrganisasi || ""}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Contoh: Karang Taruna / Panitia / Komunitas"
              />
              <p className="text-xs text-slate-500 mt-1">
                Jika bukan organisasi, biarkan kosong dan langsung isi{" "}
                <b>Nama Penanggung Jawab</b>.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Nama Penanggung Jawab</label>
              <input
                name="penanggungJawab"
                value={form.penanggungJawab}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">NIK</label>
              <input
                name="nik"
                value={form.nik}
                onChange={handleNumber}
                maxLength={16}
                inputMode="numeric"
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">No. HP/WA</label>
              <input
                name="hp"
                value={form.hp}
                onChange={handleNumber}
                inputMode="tel"
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Alamat</label>
              <input
                name="alamat"
                value={form.alamat}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* ✅ BARU (Tahap 1) */}
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">
                  Rekomendasi Desa (untuk DASAR no.7)
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Diisi oleh Admin sesuai surat rekomendasi desa fisik. Bulan Romawi &amp; tahun akan
                  otomatis realtime saat surat dipreview/didownload.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-sm font-semibold">Nama Desa</label>
                    <input
                      name="rekomDesaNama"
                      value={form.rekomDesaNama || ""}
                      onChange={handleText}
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Contoh: Tanjung Raja / Sungai Pinang II"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Nomor Rekomendasi Desa{" "}
                      <span className="text-xs font-normal text-slate-500">(opsional)</span>
                    </label>
                    <input
                      name="rekomDesaNomor"
                      value={form.rekomDesaNomor || ""}
                      onChange={handleText}
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Contoh: 140"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Jika kosong, PDF akan tampil: <b>Nomor: … / (Romawi) / (Tahun)</b>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* ✅ END BARU */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Jenis Kegiatan</label>
              <select
                name="jenisKegiatan"
                value={form.jenisKegiatan}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih jenis</option>
                <option value="hiburan">Hiburan/Acara Musik</option>
                <option value="olahraga">Olahraga/Turnamen</option>
                <option value="keagamaan">Keagamaan</option>
                <option value="budaya">Budaya/Adat</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Dalam Rangka Kegiatan</label>
              <input
                name="namaKegiatan"
                value={form.namaKegiatan}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Lokasi</label>
              <input
                name="lokasi"
                value={form.lokasi}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Tanggal</label>
              <input
                type="date"
                name="tanggal"
                value={form.tanggal}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Waktu Mulai</label>
              <input
                type="time"
                name="waktuMulai"
                value={form.waktuMulai}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Waktu Selesai</label>
              <input
                type="time"
                name="waktuSelesai"
                value={form.waktuSelesai}
                onChange={handleText}
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Perkiraan Peserta</label>
              <input
                name="perkiraanPeserta"
                value={form.perkiraanPeserta}
                onChange={handleNumber}
                inputMode="numeric"
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 flex items-center justify-end gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 w-full sm:w-auto"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold w-full sm:w-auto"
            type="button"
          >
            Simpan Perubahan
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
    onChangeStatus(row, STATUS_LABEL_TO_ENUM[statusLabel] || "DIAJUKAN", feedback?.trim() || "");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Ubah Status</h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 shrink-0"
            type="button"
          >
            <X className="h-4 w-4" />
            Tutup
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          <div className="text-sm">
            <div className="text-slate-600">Data:</div>
            <div className="font-semibold break-words">{row.penanggungJawab}</div>
          </div>
          <label className="block text-sm font-semibold">Status</label>
          <select
            value={statusLabel}
            onChange={(e) => setStatusLabel(e.target.value)}
            className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option>Menunggu Verifikasi</option>
            <option>Proses</option>
            <option>Diterima</option>
            <option>Ditolak</option>
          </select>
          <div>
            <label className="block text-sm font-semibold mt-2">
              Feedback (muncul di Cek Status)
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Contoh: Berkas kurang jelas..."
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Catatan ini akan disimpan dan terlihat oleh pemohon.
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 w-full sm:w-auto"
            type="button"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 w-full sm:w-auto justify-center"
            type="button"
          >
            <Check className="h-4 w-4" /> Simpan Status
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Preview Surat Izin Keramaian (PDF iframe)
===================================================== */
const SuratIzinPreviewModal = ({ open, onClose, row, signer }) => {
  const [url, setUrl] = React.useState("");

  const rowId = row?.id;
  const issuedDate = row?.updatedAt || row?.createdAt || "";

  const signerJabatan = signer?.jabatan || "";
  const signerNama = signer?.nama || "";
  const signerPangkatNrp = signer?.pangkatNrp || "";

  React.useEffect(() => {
    let alive = true;

    async function load() {
      if (!open || !row) return;

      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });

      try {
        const blobUrl = await generateIzinKeramaianPDFBlobUrl(row, {
          signer,
          issuedPlace: "Tanjung Raja",
          issuedDate: issuedDate || new Date().toISOString(),
        });
        if (!alive) return;
        setUrl(blobUrl);
      } catch (e) {
        console.error(e);
        alert(e?.message || "Gagal membuat preview surat");
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [open, rowId, issuedDate, signerJabatan, signerNama, signerPangkatNrp, row, signer]);

  React.useEffect(() => {
    if (!open) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    }
  }, [open]);

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-semibold break-words">Preview Surat Izin Keramaian</h2>
            <p className="text-xs text-slate-500">
              Preview PDF (sesuai template) — bisa langsung Download.
            </p>
            {row?.nomorSurat ? (
              <p className="text-xs text-slate-600 mt-1 break-words">
                <b>Nomor:</b> {row.nomorSurat}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Nomor surat akan muncul setelah status <b>SELESAI</b>.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm shrink-0"
            type="button"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="flex-1 bg-slate-50 min-h-0">
          {url ? (
            <iframe title="preview-surat-izin" src={url} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              Membuat preview...
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={async () => {
              // ✅ FIX: Jangan bisa export/download PDF surat jika tidak ada data row
              if (!row) return alert("Tidak ada data untuk diekspor.");
              await generateIzinKeramaianPDF(row, {
                signer,
                issuedPlace: "Tanjung Raja",
                issuedDate: row?.updatedAt || row?.createdAt || new Date().toISOString(),
              });
            }}
            disabled={!row}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold w-full sm:w-auto justify-center",
              !row ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            )}
            type="button"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Ekspor PDF (tabel)
===================================================== */
async function exportTablePDF({ rows, filters }) {
  // ✅ FIX: Jangan proses export PDF jika tidak ada data
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const { default: jsPDF } = await import("jspdf");

  const autoTableModule = await import("jspdf-autotable");
  const autoTable =
    autoTableModule?.default || autoTableModule?.autoTable || autoTableModule;

  const doc = new jsPDF({ orientation: "landscape" });

  // ✅ Template: Judul (tengah + bold) -> Periode Tahun -> Tabel
  const title = "Daftar Pengajuan Surat Izin Keramaian";
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16); // ✅ JUDUL TETAP
  doc.text(title, pageW / 2, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10); // ✅ PERIODE TETAP
  const periodeTahun = filters?.year ? String(filters.year) : "Semua";
  doc.text(`Periode Tahun: ${periodeTahun}`, pageW / 2, 20, { align: "center" });

  const columns = [
    { header: "No", dataKey: "no" },
    { header: "Kode Cek Status", dataKey: "code" },
    { header: "Nama Organisasi", dataKey: "namaOrganisasi" },
    { header: "Penanggung Jawab", dataKey: "penanggungJawab" },
    { header: "NIK", dataKey: "nik" },
    { header: "HP", dataKey: "hp" },
    { header: "Alamat", dataKey: "alamat" },
    { header: "Jenis", dataKey: "jenisKegiatan" },
    { header: "Dalam Rangka Kegiatan", dataKey: "namaKegiatan" },
    { header: "Lokasi", dataKey: "lokasi" },
    { header: "Tanggal", dataKey: "tanggal" },
    { header: "Mulai", dataKey: "waktuMulai" },
    { header: "Selesai", dataKey: "waktuSelesai" },
    { header: "Peserta", dataKey: "perkiraanPeserta" },
    { header: "Status", dataKey: "status" },
  ];

  const body = rows.map((r, i) => ({
    no: i + 1,
    ...r,
    code: r.code || "-",
    namaOrganisasi: r.namaOrganisasi || "-",
    status: STATUS_ENUM_TO_LABEL[r.status] || r.status,
  }));

  autoTable(doc, {
    columns,
    body,
    startY: 26,

    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 7.5, // ✅ DIKURANGI -1 (sebelumnya 8.5) — hanya tabel & isi
      cellPadding: 3,
      lineWidth: 0.2,
      lineColor: [226, 232, 240], // slate-200
      textColor: [15, 23, 42], // slate-900
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    rowStyles: {
      fillColor: [255, 255, 255],
    },
    tableLineWidth: 0.3,
    tableLineColor: [226, 232, 240],
    margin: { left: 14, right: 14 },
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
  const file = `pengajuan_izin_${stamp}.pdf`;

  doc.save(file);
}

/* =====================================================
   Modal Preview Export PDF
===================================================== */
const PreviewExportModal = ({ open, onClose, rows, filters, TableIzinComp, compact }) => {
  if (!open) return null;

  const handleDownload = async () => {
    // ✅ FIX: Jangan download/export jika tidak ada data
    if (!rows || rows.length === 0) return alert("Tidak ada data untuk diekspor.");
    await exportTablePDF({ rows, filters });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-6xl h-[88vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h2 className="font-semibold">Preview Tabel Sebelum Export</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm shrink-0"
            type="button"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          <TableIzinComp
            rows={rows}
            compact={compact}
            onEdit={() => {}}
            onDelete={() => {}}
            onView={() => {}}
            onOpenStatus={() => {}}
          />
        </div>
        <div className="p-4 border-t flex items-center justify-end">
          <button
            onClick={handleDownload}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold w-full sm:w-auto justify-center",
              !rows || rows.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            )}
            type="button"
            disabled={!rows || rows.length === 0}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Tabel Izin Keramaian
===================================================== */
const TableIzin = ({ rows, onEdit, onDelete, onView, onOpenStatus, compact }) => {
  const headersFull = [
    "No",
    "Kode Cek Status",
    "Nama Organisasi",
    "Penanggung Jawab",
    "NIK",
    "HP",
    "Alamat",
    "Jenis",
    "Dalam Rangka Kegiatan",
    "Lokasi",
    "Tanggal",
    "Mulai",
    "Selesai",
    "Peserta",
    "Status",
    "Feedback",
    "Aksi",
  ];

  const headersCompact = [
    "No",
    "Kode Cek Status",
    "Nama Organisasi",
    "Penanggung Jawab",
    "Dalam Rangka Kegiatan",
    "Lokasi",
    "Tanggal",
    "Status",
    "Feedback",
    "Aksi",
  ];

  const headers = compact ? headersCompact : headersFull;

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white/80 backdrop-blur">
      <table
        className={cn(
          "w-full table-auto",
          compact ? "min-w-[980px] sm:min-w-[1180px]" : "min-w-[1480px] sm:min-w-[1750px]"
        )}
      >
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-sm">
          <tr className="text-slate-700">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="text-sm">
          {rows.map((row, i) => (
            <tr key={row.id} className="border-t hover:bg-slate-50/70 align-top">
              <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>

              <td className="px-3 py-2">
                <span
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 break-all"
                  title="Kode cek status (dipakai di halaman Cek Status)"
                >
                  {row.code || "-"}
                </span>
              </td>

              <td className="px-3 py-2 break-words">
                {row.namaOrganisasi ? row.namaOrganisasi : "-"}
              </td>
              <td className="px-3 py-2 break-words">{row.penanggungJawab}</td>

              {!compact && <td className="px-3 py-2 whitespace-nowrap">{row.nik}</td>}
              {!compact && <td className="px-3 py-2 whitespace-nowrap">{row.hp}</td>}
              {!compact && <td className="px-3 py-2 break-words">{row.alamat}</td>}
              {!compact && <td className="px-3 py-2 break-words">{row.jenisKegiatan || "-"}</td>}

              <td className="px-3 py-2 break-words">{row.namaKegiatan}</td>
              <td className="px-3 py-2 break-words">{row.lokasi}</td>
              <td className="px-3 py-2 whitespace-nowrap">{toYMD(row.tanggal)}</td>

              {!compact && <td className="px-3 py-2 whitespace-nowrap">{row.waktuMulai}</td>}
              {!compact && <td className="px-3 py-2 whitespace-nowrap">{row.waktuSelesai}</td>}
              {!compact && <td className="px-3 py-2 whitespace-nowrap">{row.perkiraanPeserta}</td>}

              <td className="px-3 py-2 whitespace-nowrap">
                <StatusBadge value={row.status} />
              </td>

              <td className="px-3 py-2 whitespace-nowrap">
                <FeedbackChip text={row.statusFeedback} />
              </td>

              <td className="px-3 py-2">
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    className={cn(btnAksiBase, btnDark, "w-full sm:w-auto")}
                    onClick={() => onView(row)}
                    type="button"
                  >
                    Lihat
                  </button>
                  <button
                    className={cn(btnAksiBase, btnIndigo, "w-full sm:w-auto")}
                    onClick={() => onEdit(row)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={cn(btnAksiBase, btnEmerald, "w-full sm:w-auto")}
                    onClick={() => onOpenStatus(row)}
                    type="button"
                  >
                    Ubah Status
                  </button>
                  <button
                    className={cn(btnAksiBase, btnRose, "w-full sm:w-auto")}
                    onClick={() => onDelete(row)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">
                Belum ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ActionBar = ({ rows, filters, TableIzinComp, compact, onToggleCompact }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpenPreview = () => {
    // ✅ FIX: Tidak bisa export PDF jika tidak ada data
    if (!rows || rows.length === 0) return alert("Tidak ada data untuk diekspor.");
    setPreviewOpen(true);
  };

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="text-sm text-slate-600 w-full sm:w-auto">
        Menampilkan <b>{rows.length}</b> data Izin Keramaian
      </div>

      <div className="flex gap-2 flex-wrap w-full sm:w-auto">
        <button
          onClick={onToggleCompact}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-semibold shadow-sm active:scale-[.99] w-full sm:w-auto justify-center"
          title="Ubah tampilan kolom tabel"
          type="button"
        >
          {compact ? "Tampilan Lengkap" : "Tampilan Ringkas"}
        </button>

        <button
          onClick={handleOpenPreview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow hover:shadow-md active:scale-[.99] w-full sm:w-auto justify-center"
          type="button"
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
        TableIzinComp={TableIzin}
        compact={compact}
      />
    </div>
  );
};

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* =====================================================
   ✅ MODAL KAPOLSEK / PENANGGUNG JAWAB (FIX FOCUS)
   - Dipindah ke TOP-LEVEL agar tidak re-mount setiap render,
     sehingga input tidak kehilangan fokus per kata.
===================================================== */
function SupervisorModal({
  open,
  onClose,
  supervisorDraft,
  setSupervisorDraft,
  saving,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-bold break-words">Ubah KAPOLSEK / Penanggung Jawab</h3>
            <p className="text-xs text-slate-500 mt-1">
              Data ini akan masuk ke bagian TTD pada surat.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 shrink-0"
            type="button"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 gap-3 overflow-auto">
          <div>
            <label className="text-sm font-semibold">Jabatan</label>
            <input
              value={supervisorDraft.jabatan || ""}
              onChange={(e) =>
                setSupervisorDraft((s) => ({ ...s, jabatan: e.target.value }))
              }
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: KEPALA KEPOLISIAN SEKTOR TANJUNG RAJA"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Nama</label>
            <input
              value={supervisorDraft.name || ""}
              onChange={(e) =>
                setSupervisorDraft((s) => ({ ...s, name: e.target.value }))
              }
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
              placeholder="Nama lengkap"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold">Pangkat</label>
              <input
                value={supervisorDraft.pangkat || ""}
                onChange={(e) =>
                  setSupervisorDraft((s) => ({ ...s, pangkat: e.target.value }))
                }
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Contoh: AKP"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">NRP</label>
              <input
                value={supervisorDraft.nrp || ""}
                onChange={(e) =>
                  setSupervisorDraft((s) => ({
                    ...s,
                    nrp: e.target.value.replace(/[^\d]/g, ""),
                  }))
                }
                inputMode="numeric"
                className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Contoh: 12345678"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 w-full sm:w-auto"
            type="button"
            disabled={saving}
          >
            Batal
          </button>

          <button
            onClick={onSave}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold active:scale-[.99] justify-center",
              saving ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700",
              "w-full sm:w-auto"
            )}
            type="button"
            disabled={saving}
          >
            <Save className="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   Halaman Utama (IZIN)
===================================================== */
export default function SuratIzinKeramaian({ user: userProp, setTabAndSyncUrl, allowedTabs, tab }) {
  const location = useLocation();


  const [user, setUser] = useState(() => userProp || getUser());


  const pollRef = useRef(null);
  const hasShownLoadErrorRef = useRef(false);

  useEffect(() => {
    setUser(userProp || getUser());
  }, [userProp, location.pathname, location.search]);

  useEffect(() => {
    let ignore = false;

    async function loadMe() {
      try {
        if (!user) {
          if (!ignore) setMe(null);
          return;
        }
        const res = await api.get("/users/me", { params: { ts: Date.now() } });
        const u = res.data?.user || res.data || null;
        if (!ignore) setMe(u);
      } catch (_e) {
        if (!ignore) setMe(user || null);
      }
    }

    loadMe();
    return () => {
      ignore = true;
    };
  }, [user]);

  // =========================
  // Profil TTD
  // =========================
  const supervisorDefault = useMemo(
    () => ({
      jabatan: "KEPALA KEPOLISIAN SEKTOR TANJUNG RAJA",
      name: "",
      pangkat: "",
      nrp: "",
    }),
    []
  );

  const [supervisor, setSupervisor] = useState(supervisorDefault);
  const [supervisorOpen, setSupervisorOpen] = useState(false);

  const [supervisorDraft, setSupervisorDraft] = useState(() => ({
    jabatan: "",
    name: "",
    pangkat: "",
    nrp: "",
  }));

  // ✅ saving dipindah ke parent supaya modal tidak punya state internal (lebih stabil)
  const [supervisorSaving, setSupervisorSaving] = useState(false);

  useEffect(() => {
    setSupervisorDraft(supervisor);
  }, [supervisor]);

  useEffect(() => {
    if (supervisorOpen) setSupervisorDraft(supervisor);
  }, [supervisorOpen, supervisor]);

  const validateSupervisor = (s) => {
    if (!String(s?.jabatan || "").trim()) return "Jabatan wajib diisi.";
    if (!String(s?.name || "").trim()) return "Nama wajib diisi.";
    if (!String(s?.pangkat || "").trim()) return "Pangkat wajib diisi.";
    if (!String(s?.nrp || "").trim()) return "NRP wajib diisi.";
    if (!/^\d{5,20}$/.test(String(s?.nrp || "").trim()))
      return "NRP harus angka (minimal 5 digit).";
    return null;
  };

  const mapApiTtdToSupervisor = (ttd) => {
    const jabatan = String(ttd?.jabatan ?? ttd?.ttdJabatan ?? "").trim();
    const nama = String(ttd?.nama ?? ttd?.ttdNama ?? "").trim();
    const pangkat = String(ttd?.pangkat ?? ttd?.ttdPangkat ?? "").trim();
    const nrp = String(ttd?.nrp ?? ttd?.ttdNrp ?? "").trim();

    return {
      jabatan: jabatan || supervisorDefault.jabatan,
      name: nama || "",
      pangkat: pangkat || "",
      nrp: nrp || "",
    };
  };

  async function loadSupervisorProfile({ silent = false } = {}) {
    try {
      const res = await api.get("/users/me/ttd", { params: { ts: Date.now() } });
      const ttd = res.data?.ttd || res.data || {};
      setSupervisor(mapApiTtdToSupervisor(ttd));
    } catch (err) {
      try {
        const res2 = await api.get("/users/me", { params: { ts: Date.now() } });
        const u = res2.data?.user || res2.data || null;
        const ttdFallback = {
          ttdJabatan: u?.ttdJabatan,
          ttdNama: u?.ttdNama,
          ttdPangkat: u?.ttdPangkat,
          ttdNrp: u?.ttdNrp,
        };
        setSupervisor(mapApiTtdToSupervisor(ttdFallback));
      } catch (e2) {
        if (!silent) {
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            "Gagal memuat profil KAPOLSEK/penanggung jawab";
          console.error(err);
          alert(msg);
        }
      }
    }
  }

  async function saveSupervisorToBackend(next) {
    await api.patch("/users/me/ttd", {
      jabatan: next.jabatan,
      nama: next.name,
      pangkat: next.pangkat,
      nrp: next.nrp,
    });

    await loadSupervisorProfile({ silent: true });
  }

  async function resetSupervisorToBackend() {
    await api.patch("/users/me/ttd", {});
    await loadSupervisorProfile({ silent: true });
  }

  useEffect(() => {
    if (!user) {
      setSupervisor(supervisorDefault);
      return;
    }
    loadSupervisorProfile({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // =========================
  // Data + Filter
  // =========================
  const [izinRows, setIzinRows] = useState([]);
  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusRow, setStatusRow] = useState(null);

  const [suratOpen, setSuratOpen] = useState(false);
  const [suratRow, setSuratRow] = useState(null);

  const [nameQuery, setNameQuery] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [compactTable, setCompactTable] = useState(false);

  // ✅ token untuk memaksa refresh counter card
  const [counterRefreshToken, setCounterRefreshToken] = useState(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  async function loadIzin({ silent = false } = {}) {
    if (!allowedTabs.includes("izin")) return;

    try {
      const res = await api.get("/surat/admin/pengajuan-surat", {
        params: { page: 1, limit: 500, type: "IZIN_KERAMAIAN", ts: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });

      const rows = (res.data?.rows || []).map((r) => ({
        ...r,
        jenisSurat: "izin",
        tanggal: toYMD(r.tanggal),
        statusFeedback: r.statusFeedback || "",
        namaOrganisasi: r.namaOrganisasi || "",
        nomorSurat: r.nomorSurat || null,
        nomorUrut: r.nomorUrut ?? null,

        // ✅ BARU (Tahap 1)
        rekomDesaNama: r.rekomDesaNama || "",
        rekomDesaNomor: r.rekomDesaNomor || "",
      }));

      setIzinRows(rows);
      hasShownLoadErrorRef.current = false;
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.message || "Gagal mengambil data pengajuan surat";
      console.error(err);

      if (!silent) {
        alert(msg);
        hasShownLoadErrorRef.current = true;
        return;
      }

      if (!hasShownLoadErrorRef.current) {
        hasShownLoadErrorRef.current = true;
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    loadIzin({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    stopPolling();

    if (!user) return;
    if (tab !== "izin") return;
    if (!allowedTabs?.includes("izin")) return;

    loadIzin({ silent: true });

    pollRef.current = setInterval(() => {
      loadIzin({ silent: true });
    }, 5000);

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, tab, Array.isArray(allowedTabs) ? allowedTabs.join("|") : ""]);

  const yearsOption = useMemo(() => {
    const ys = new Set();
    izinRows.forEach((r) => {
      const y = getYearFromDateStr(r.tanggal);
      if (y) ys.add(y);
    });
    if (ys.size === 0) ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => a - b);
  }, [izinRows]);

  const getDateStringForRow = (row) => row.tanggal || "";

  const filteredIzin = useMemo(
    () =>
      izinRows.filter((r) => {
        const q = nameQuery.trim().toLowerCase();

        const matchName =
          q === "" ||
          (r.code || "").toLowerCase().includes(q) ||
          (r.namaOrganisasi || "").toLowerCase().includes(q) ||
          (r.penanggungJawab || "").toLowerCase().includes(q);

        const d = getDateStringForRow(r);
        const m = String(getMonthFromDateStr(d) || "").padStart(2, "0");
        const y = String(getYearFromDateStr(d) || "");
        const matchMonth = month === "" || m === month;
        const matchYear = year === "" || y === year;

        return matchName && matchMonth && matchYear;
      }),
    [izinRows, nameQuery, month, year]
  );

  const handleSave = async (updated) => {
    try {
      const payload = {
        namaOrganisasi: String(updated.namaOrganisasi || "").trim() || null,
        penanggungJawab: updated.penanggungJawab,
        nik: updated.nik,
        hp: updated.hp,
        alamat: updated.alamat,
        jenisKegiatan: updated.jenisKegiatan || null,
        namaKegiatan: updated.namaKegiatan,
        lokasi: updated.lokasi,
        tanggal: updated.tanggal ? new Date(updated.tanggal).toISOString() : null,
        waktuMulai: updated.waktuMulai,
        waktuSelesai: updated.waktuSelesai,
        perkiraanPeserta: Number(updated.perkiraanPeserta) || 0,

        // ✅ BARU (Tahap 1)
        rekomDesaNama: String(updated.rekomDesaNama || "").trim() || null,
        rekomDesaNomor: String(updated.rekomDesaNomor || "").trim() || null,
      };

      await api.put(`/surat/admin/pengajuan-surat/${updated.id}`, payload);
      await loadIzin({ silent: false });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Gagal menyimpan perubahan";
      alert(msg);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Hapus data "${row.penanggungJawab}"?`);
    if (!ok) return;

    try {
      await api.delete(`/surat/admin/pengajuan-surat/${row.id}`);
      await loadIzin({ silent: false });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Gagal menghapus data";
      alert(msg);
    }
  };

  const handleView = (row) => {
    setSuratRow(row);
    setSuratOpen(true);
  };

  const changeStatus = async (row, statusEnum, statusFeedback = "") => {
    try {
      await api.patch(`/surat/admin/pengajuan-surat/${row.id}/status`, {
        status: statusEnum,
        statusFeedback,
      });

      await loadIzin({ silent: false });

      if (statusEnum === "SELESAI") {
        setCounterRefreshToken((v) => v + 1);
      }

      setStatusRow(null);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Gagal update status";
      alert(msg);
    }
  };

  const resetFilter = () => {
    setNameQuery("");
    setMonth("");
    setYear("");
  };

  const filters = { nameQuery, month, year };

  const canSeeIzin = allowedTabs.includes("izin");
  const canSeeKehilangan = allowedTabs.includes("kehilangan");

  const SupervisorBar = () => {
    const title =
      tab === "kehilangan"
        ? "KAPOLSEK/ PENANGGUNG JAWAB (untuk STPLK)"
        : "KAPOLSEK/ PENANGGUNG JAWAB";

    const jabatan = (supervisor?.jabatan || "").trim();
    const name = (supervisor?.name || "").trim();
    const pangkat = (supervisor?.pangkat || "").trim();
    const nrp = (supervisor?.nrp || "").trim();

    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 w-full lg:w-auto lg:min-w-[240px]">
            <div className="flex items-center gap-2">
              <UserRoundCog className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900 break-words">{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data ini akan otomatis masuk ke surat (bagian TTD).
            </p>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Jabatan</div>
              <div className="font-semibold text-slate-900 break-words">
                {jabatan ? jabatan : <span className="text-rose-600">Belum diisi</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Nama</div>
              <div className="font-semibold text-slate-900 break-words">
                {name ? name.toUpperCase() : <span className="text-rose-600">Belum diisi</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Pangkat</div>
              <div className="font-semibold text-slate-900 break-words">
                {pangkat || <span className="text-rose-600">Belum diisi</span>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">NRP</div>
              <div className="font-semibold text-slate-900 break-words">
                {nrp ? `NRP. ${nrp}` : <span className="text-rose-600">Belum diisi</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto flex-wrap">
            <button
              onClick={() => setSupervisorOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 font-semibold w-full sm:w-auto justify-center"
              type="button"
            >
              <UserRoundCog className="h-4 w-4" /> Ubah
            </button>
            <button
              onClick={async () => {
                const ok = window.confirm("Reset data ke default (kosong)?");
                if (!ok) return;
                try {
                  await resetSupervisorToBackend();
                } catch (e) {
                  const msg = e?.response?.data?.error || e?.message || "Gagal reset profil TTD";
                  alert(msg);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 font-semibold text-slate-800 w-full sm:w-auto justify-center"
              type="button"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 bg-black text-white shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              Manajemen Pengajuan Surat
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              Izin Keramaian
            </p>
          </div>

          <div className="flex gap-2 bg-white/10 rounded-2xl p-1 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {canSeeIzin && (
              <button
                className={cn(
                  "px-4 py-2 rounded-xl w-full sm:w-auto",
                  tab === "izin" ? "bg-white text-slate-900" : "text-white/90 hover:bg-white/10"
                )}
                onClick={() => setTabAndSyncUrl("izin")}
                type="button"
              >
                Izin Keramaian
              </button>
            )}
            {canSeeKehilangan && (
              <button
                className={cn(
                  "px-4 py-2 rounded-xl w-full sm:w-auto",
                  tab === "kehilangan"
                    ? "bg-white text-slate-900"
                    : "text-white/90 hover:bg-white/10"
                )}
                onClick={() => setTabAndSyncUrl("kehilangan")}
                type="button"
              >
                Tanda Kehilangan
              </button>
            )}
          </div>
        </div>
      </div>

      <SupervisorBar />

      {/* ✅ FIX: Modal dipindah ke top-level agar input tidak kehilangan fokus */}
      <Portal>
        <SupervisorModal
          open={supervisorOpen}
          onClose={() => setSupervisorOpen(false)}
          supervisorDraft={supervisorDraft}
          setSupervisorDraft={setSupervisorDraft}
          saving={supervisorSaving}
          onSave={async () => {
            const err = validateSupervisor(supervisorDraft);
            if (err) return alert(err);

            try {
              setSupervisorSaving(true);
              await saveSupervisorToBackend({
                jabatan: String(supervisorDraft.jabatan || "").trim(),
                name: String(supervisorDraft.name || "").trim(),
                pangkat: String(supervisorDraft.pangkat || "").trim(),
                nrp: String(supervisorDraft.nrp || "").trim(),
              });
              setSupervisorOpen(false);
              alert("Profil KAPOLSEK/penanggung jawab berhasil diperbarui.");
            } catch (e) {
              const msg = e?.response?.data?.error || e?.message || "Gagal menyimpan profil TTD";
              alert(msg);
            } finally {
              setSupervisorSaving(false);
            }
          }}
        />
      </Portal>

      <NomorIzinCounterCard
        yearValue={year}
        yearsOption={yearsOption}
        refreshToken={counterRefreshToken}
        onChanged={() => loadIzin({ silent: true })}
      />

      <FilterBar
        tab="izin"
        nameQuery={nameQuery}
        month={month}
        year={year}
        yearsOption={yearsOption}
        onChangeName={setNameQuery}
        onChangeMonth={setMonth}
        onChangeYear={setYear}
        onReset={resetFilter}
      />

      <ActionBar
        rows={filteredIzin}
        filters={filters}
        TableIzinComp={TableIzin}
        compact={compactTable}
        onToggleCompact={() => setCompactTable((v) => !v)}
      />

      <Card className="border border-slate-200 rounded-2xl overflow-hidden">
        <CardBody className="p-0 sm:p-0">
          <TableIzin
            rows={filteredIzin}
            compact={compactTable}
            onEdit={(row) => {
              setCurrent(row);
              setOpen(true);
            }}
            onDelete={handleDelete}
            onView={(row) => {
              handleView(row);
            }}
            onOpenStatus={(row) => {
              setStatusRow(row);
              setStatusOpen(true);
            }}
          />
        </CardBody>
      </Card>

      <EditModal open={open} onClose={() => setOpen(false)} data={current} onSave={handleSave} />

      <StatusModal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        row={statusRow}
        onChangeStatus={changeStatus}
      />

      <SuratIzinPreviewModal
        open={suratOpen}
        onClose={() => {
          setSuratOpen(false);
          setSuratRow(null);
        }}
        row={suratRow}
        signer={{
          jabatan: supervisor?.jabatan || "",
          nama: supervisor?.name || "",
          pangkatNrp:
            (supervisor?.pangkat ? supervisor.pangkat : "") +
            (supervisor?.nrp ? ` NRP. ${supervisor.nrp}` : ""),
        }}
      />
    </div>
  );
}