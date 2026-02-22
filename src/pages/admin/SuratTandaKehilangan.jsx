// src/pages/admin/SuratTandaKehilangan.jsx
import { createPortal } from "react-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardBody } from "../../components/ui/Card";

// ✅ pakai single source of truth
import { api } from "../../lib/axios";
import { getUser } from "../../lib/auth";

// ✅ SURAT KEHILANGAN (preview + download)
import { generateSTPLKPDF, generateSTPLKPDFBlobUrl } from "../../lib/surat/stplkKehilangan";

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
  Loader2,
} from "lucide-react";

/* =====================================================
   Utility kecil
===================================================== */
const MAX_KEHI_ITEMS = 5;

const isNik = (v) => /^\d{16}$/.test(v || "");
const isHp = (v) => /^0\d{9,13}$/.test(v || "");
const cn = (...cls) => cls.filter(Boolean).join(" ");
const ellipsis = (s, n = 60) => (!s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s);

/* =====================================================
   ✅ RESPONSIVE FIX (AKSI BUTTONS)
   - Tambah whitespace-nowrap agar teks tombol tidak turun baris (menghindari tumpang tindih)
   - Tetap full width di mobile, auto di >=sm
===================================================== */
const btnAksiBase =
  "w-full sm:w-auto sm:min-w-[120px] inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-white font-medium active:scale-[.99] transition focus:outline-none focus:ring-2 focus:ring-offset-1 whitespace-nowrap";
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
function toYMD(dateIso) {
  if (!dateIso) return "";
  return String(dateIso).slice(0, 10);
}

function coerceArrayItems(v) {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.includes("\n")) return s.split("\n").map((t) => t.trim()).filter(Boolean);
    if (s.includes(";")) return s.split(";").map((t) => t.trim()).filter(Boolean);
    if (s.includes(",")) return s.split(",").map((t) => t.trim()).filter(Boolean);
    return [s];
  }

  return [];
}

/* =====================================================
   ✅ ROMAWI Bulan (untuk PREVIEW UI saja)
===================================================== */
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function getRomanMonthNow() {
  const m = new Date().getMonth(); // 0-11
  return ROMAN_MONTHS[m] || "I";
}
function pad2(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return "00";
  return String(x).padStart(2, "0");
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
      "inline-flex max-w-[28ch] items-center gap-1 rounded-full px-2 py-1 text-xs",
      "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
    )}
    title={text || ""}
  >
    <Info className="h-3.5 w-3.5" /> {ellipsis(text, 36) || <span className="opacity-50">-</span>}
  </span>
);

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
  const namePlaceholder = tab === "izin" ? "Cari penanggung jawab…" : "Cari nama pemohon…";
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-3 sm:p-4 shadow-sm">
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
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 active:scale-[.99] transition"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        * Bulan & tahun mengacu pada: tanggal laporan (jika ada), jika tidak ada memakai tanggal lahir.
      </p>
    </div>
  );
};

/* =====================================================
   ✅ Modal Edit (KEHILANGAN) — DINAMIS (maks 5)
===================================================== */
const EditModal = ({ open, onClose, data, onSave }) => {
  const emptyKehilangan = {
    id: null,
    jenisSurat: "kehilangan",
    nama: "",
    tempatLahir: "",
    tanggalLahir: "",
    jenisKelamin: "",
    nik: "",
    hp: "",
    pekerjaan: "",
    agama: "",
    alamat: "",
    kehilanganItems: [""],
    kronologi: "",
    tanggalLaporan: "",
  };

  const initial = useMemo(() => {
    if (!data) return null;

    const items = coerceArrayItems(data?.kehilanganItems);
    const normalized = items.length ? items.slice(0, MAX_KEHI_ITEMS) : [""];
    return {
      ...emptyKehilangan,
      ...data,
      kehilanganItems: normalized,
      tanggalLahir: data?.tanggalLahir ? toYMD(data.tanggalLahir) : "",
      tanggalLaporan: data?.tanggalLaporan ? toYMD(data.tanggalLaporan) : "",
    };
  }, [data]);

  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  if (!open || !form) return null;

  const handleText = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleNumber = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value.replace(/[^\d]/g, "") }));

  const items = Array.isArray(form.kehilanganItems) ? form.kehilanganItems : [""];

  const setItem = (idx, val) => {
    setForm((f) => {
      const next = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      next[idx] = val;
      return { ...f, kehilanganItems: next };
    });
  };

  const addItem = () => {
    setForm((f) => {
      const next = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      if (next.length >= MAX_KEHI_ITEMS) return f;
      return { ...f, kehilanganItems: [...next, ""] };
    });
  };

  const removeItem = (idx) => {
    setForm((f) => {
      const arr = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      const next = arr.filter((_, i) => i !== idx);
      return { ...f, kehilanganItems: next.length ? next : [""] };
    });
  };

  const buildItemsFromForm = (f) =>
    (Array.isArray(f.kehilanganItems) ? f.kehilanganItems : [""])
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, MAX_KEHI_ITEMS);

  const validateKehilangan = () => {
    if (!form.nama?.trim()) return "Nama wajib diisi.";
    if (!form.tempatLahir?.trim()) return "Tempat lahir wajib diisi.";
    if (!form.tanggalLahir) return "Tanggal lahir wajib diisi.";
    if (!form.jenisKelamin) return "Jenis kelamin wajib dipilih.";
    if (!isNik(form.nik)) return "NIK harus 16 digit angka.";
    if (!isHp(form.hp)) return "No HP tidak valid (0 + 10–14 digit).";
    if (!form.pekerjaan?.trim()) return "Pekerjaan wajib diisi.";
    if (!form.agama) return "Agama wajib dipilih.";
    if (!form.alamat?.trim()) return "Alamat wajib diisi.";

    const its = buildItemsFromForm(form);
    if (its.length === 0) return "Barang/dokumen yang hilang minimal 1 item.";
    if (its.length > MAX_KEHI_ITEMS) return `Maksimal ${MAX_KEHI_ITEMS} item.`;

    if (!form.kronologi || form.kronologi.trim().length < 10) return "Kronologi minimal 10 karakter.";
    return null;
  };

  const handleSave = () => {
    const err = validateKehilangan();
    if (err) return alert(err);

    const nextItems = buildItemsFromForm(form);
    onSave({ ...form, kehilanganItems: nextItems });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold">Edit Pengajuan Surat Tanda Kehilangan</h2>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Tutup
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-6 max-h-[82vh] sm:max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Nama Lengkap</label>
              <input
                name="nama"
                value={form.nama}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Tempat Lahir</label>
              <input
                name="tempatLahir"
                value={form.tempatLahir}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Tanggal Lahir</label>
              <input
                type="date"
                name="tanggalLahir"
                value={form.tanggalLahir}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Jenis Kelamin</label>
              <select
                name="jenisKelamin"
                value={form.jenisKelamin}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">NIK</label>
              <input
                name="nik"
                value={form.nik}
                onChange={handleNumber}
                maxLength={16}
                inputMode="numeric"
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">No. HP/WA</label>
              <input
                name="hp"
                value={form.hp}
                onChange={handleNumber}
                inputMode="tel"
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Pekerjaan</label>
              <input
                name="pekerjaan"
                value={form.pekerjaan}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Agama</label>
              <select
                name="agama"
                value={form.agama}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih Agama</option>
                <option value="Islam">Islam</option>
                <option value="Kristen">Kristen</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Konghucu">Konghucu</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Alamat</label>
              <input
                name="alamat"
                value={form.alamat}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3 sm:p-4 bg-slate-50/50">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Dokumen/Barang yang Hilang (Maks {MAX_KEHI_ITEMS})
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Isi per item (agar di surat tidak jadi 1 baris memanjang).
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs text-slate-500">
                  Total: <b>{items.length}</b> / {MAX_KEHI_ITEMS}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={items.length >= MAX_KEHI_ITEMS}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold",
                    items.length >= MAX_KEHI_ITEMS
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  + Tambah Item
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {items.map((val, idx) => {
                const disableRemove = idx === 0 && items.length === 1;
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="text-sm font-semibold">Item {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={disableRemove}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold",
                          disableRemove
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-rose-600 hover:bg-rose-700 text-white"
                        )}
                      >
                        Hapus
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={val ?? ""}
                      onChange={(e) => setItem(idx, e.target.value)}
                      placeholder={
                        idx === 0
                          ? "Contoh: Kartu Tanda Penduduk (E-KTP) dengan NIK: ...."
                          : "Contoh: Buku tabungan Bank BRI No Rek: ...."
                      }
                      className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500 whitespace-pre-wrap"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Kronologi</label>
              <textarea
                name="kronologi"
                rows={5}
                value={form.kronologi}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Tanggal Laporan</label>
              <input
                type="date"
                name="tanggalLaporan"
                value={form.tanggalLaporan || ""}
                onChange={handleText}
                className="w-full border rounded-xl p-3 text-base focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200 flex items-center justify-end gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Modal Ubah Status (integrasi PATCH backend)
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
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Ubah Status</h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Tutup
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-sm">
            <div className="text-slate-600">Data:</div>
            <div className="font-semibold break-words">{row.nama}</div>
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
            <label className="block text-sm font-semibold mt-2">Feedback (muncul di Cek Status)</label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Contoh: Berkas kurang jelas..."
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">Catatan ini akan disimpan dan terlihat oleh pemohon.</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" /> Simpan Status
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   ✅ Modal Preview Surat Tanda Kehilangan (PDF iframe)
===================================================== */
const SuratKehilanganPreviewModal = ({ open, onClose, row, receiverUser, supervisorUser }) => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const receiverKey = useMemo(() => {
    const u = receiverUser || {};
    return `${u.id || ""}|${u.nrp || ""}|${u.name || u.nama || ""}|${u.role || ""}`;
  }, [receiverUser]);

  const supervisorKey = useMemo(() => {
    const s = supervisorUser || {};
    return `${s.label || ""}|${s.jabatan || ""}|${s.name || s.nama || ""}|${s.pangkat || ""}|${s.nrp || ""}`;
  }, [supervisorUser]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!open || !row) return;

      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });

      try {
        setLoading(true);
        const blobUrl = await generateSTPLKPDFBlobUrl(row, { receiverUser, supervisorUser });
        if (!alive) return;
        setUrl(blobUrl);
      } catch (e) {
        console.error(e);
        alert(e?.message || "Gagal membuat preview surat");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id, receiverKey, supervisorKey]);

  useEffect(() => {
    if (!open) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    }
  }, [open]);

  useEffect(() => {
    return () => {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    };
  }, []);

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-6xl h-[92vh] sm:h-[90vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold">Preview Surat Tanda Kehilangan (STPLK)</h2>
            <p className="text-xs text-slate-500">Preview PDF (sesuai template) — bisa langsung Download.</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="flex-1 bg-slate-50">
          {url ? (
            <iframe title="preview-surat-kehilangan" src={url} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 px-4 text-center">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Membuat preview...
                </span>
              ) : (
                "Membuat preview..."
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={async () => {
              await generateSTPLKPDF(row, { receiverUser, supervisorUser });
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   Ekspor PDF (Table)
===================================================== */
async function exportTablePDF({ rows, filters }) {
  // ✅ FIX: jangan lanjut export kalau tidak ada data
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod?.default || autoTableMod?.autoTable || autoTableMod;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const title = "Daftar Pengajuan Surat Tanda Kehilangan";

  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, pageW / 2, 40, { align: "center" });

  const periodeTahun = filters?.year ? String(filters.year) : "Semua";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Periode Tahun: ${periodeTahun}`, pageW / 2, 60, { align: "center" });

  const columns = [
    { header: "No", dataKey: "no" },
    { header: "Kode Cek Status", dataKey: "code" },
    { header: "Nama", dataKey: "nama" },
    { header: "Tempat/Tgl Lahir", dataKey: "ttl" },
    { header: "JK", dataKey: "jenisKelamin" },
    { header: "NIK", dataKey: "nik" },
    { header: "HP", dataKey: "hp" },
    { header: "Pekerjaan", dataKey: "pekerjaan" },
    { header: "Agama", dataKey: "agama" },
    { header: "Alamat", dataKey: "alamat" },
    { header: `Yang Hilang (1-${MAX_KEHI_ITEMS})`, dataKey: "kehilanganItemsStr" },
    { header: "Tgl Laporan", dataKey: "tanggalLaporan" },
    { header: "Status", dataKey: "status" },
  ];

  const body = rows.map((r, i) => {
    const items = coerceArrayItems(r.kehilanganItems).slice(0, MAX_KEHI_ITEMS);
    return {
      no: i + 1,
      ...r,
      code: r.code || "-",
      ttl: `${r.tempatLahir} / ${toYMD(r.tanggalLahir)}`,
      tanggalLaporan: toYMD(r.tanggalLaporan),
      status: STATUS_ENUM_TO_LABEL[r.status] || r.status,
      kehilanganItemsStr: items.length ? items.map((it, idx) => `${idx + 1}. ${it}`).join("\n") : "-",
    };
  });

  autoTable(doc, {
    columns,
    body,
    startY: 80,
    theme: "striped",
    margin: { left: 36, right: 36 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 5,
      valign: "middle",
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;

  doc.save(`pengajuan_kehilangan_${stamp}.pdf`);
}

/* =====================================================
   Modal Preview Export PDF
===================================================== */
const PreviewExportModal = ({ open, onClose, rows, filters, TableKehilanganComp }) => {
  if (!open) return null;

  const handleDownload = async () => {
    // ✅ FIX: jika tidak ada data, jangan close modal (biar user paham) + jangan export
    if (!rows || rows.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    await exportTablePDF({ rows, filters });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur px-3 sm:px-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] sm:h-[88vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h2 className="font-semibold">Preview Tabel Sebelum Export</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <TableKehilanganComp
            rows={rows}
            onEdit={() => {}}
            onDelete={() => {}}
            onView={() => {}}
            onOpenStatus={() => {}}
          />
        </div>

        <div className="p-4 border-t flex items-center justify-end">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* =====================================================
   ✅ Tabel Tanda Kehilangan
===================================================== */
const TableKehilangan = ({ rows, onEdit, onDelete, onView, onOpenStatus, compact }) => {
  const headers = compact
    ? ["No", "Kode Cek Status", "Nama", "Tempat/Tgl Lahir", "NIK", "Status", "Aksi"]
    : [
        "No",
        "Kode Cek Status",
        "Nama",
        "Tempat/Tgl Lahir",
        "JK",
        "NIK",
        "HP",
        "Pekerjaan",
        "Agama",
        "Alamat",
        `Yang Hilang (1-${MAX_KEHI_ITEMS})`,
        "Status",
        "Feedback",
        "Aksi",
      ];

  const tdWrap = "whitespace-pre-wrap break-words align-top";

  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white/80 backdrop-blur">
      <table
        className={cn(
          compact ? "min-w-[980px] sm:min-w-[1100px]" : "min-w-[1400px] lg:min-w-[1850px]",
          "w-full table-auto"
        )}
      >
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-xs sm:text-sm">
          <tr className="text-slate-700">
            {headers.map((h) => (
              <th key={h} className="px-2 sm:px-3 py-2 sm:py-3 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="text-xs sm:text-sm">
          {rows.map((row, i) => {
            const items = coerceArrayItems(row.kehilanganItems).slice(0, MAX_KEHI_ITEMS);

            return (
              <tr key={row.id ?? i} className="border-t hover:bg-slate-50/70">
                <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{i + 1}</td>

                <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                  <span
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] sm:text-xs font-semibold text-slate-900"
                    title="Kode cek status (dipakai di halaman Cek Status)"
                  >
                    {row.code || "-"}
                  </span>
                </td>

                <td className={cn("px-2 sm:px-3 py-2 sm:py-3 font-medium", tdWrap)}>{row.nama}</td>
                <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                  {row.tempatLahir} / {toYMD(row.tanggalLahir)}
                </td>

                {compact ? (
                  <>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.nik}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                      <StatusBadge value={row.status} />
                    </td>

                    {/* ✅ RESPONSIVE FIX: Aksi (compact) */}
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap, "min-w-[240px]")}>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                        <button className={cn(btnAksiBase, btnDark)} onClick={() => onView(row)}>
                          Lihat
                        </button>
                        <button className={cn(btnAksiBase, btnIndigo)} onClick={() => onEdit(row)}>
                          Edit
                        </button>
                        <button
                          className={cn(btnAksiBase, btnEmerald)}
                          onClick={() => onOpenStatus(row)}
                        >
                          Ubah Status
                        </button>
                        <button className={cn(btnAksiBase, btnRose)} onClick={() => onDelete(row)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.jenisKelamin}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.nik}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.hp}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.pekerjaan}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.agama}</td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>{row.alamat}</td>

                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                      <div className="min-w-[360px] sm:min-w-[520px]">
                        {items.length ? (
                          <ul className="list-disc pl-5 space-y-1 whitespace-pre-wrap break-words">
                            {items.map((it, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {it}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                      <StatusBadge value={row.status} />
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap)}>
                      <FeedbackChip text={row.statusFeedback} />
                    </td>

                    {/* ✅ RESPONSIVE FIX: Aksi (full) */}
                    <td className={cn("px-2 sm:px-3 py-2 sm:py-3", tdWrap, "min-w-[240px]")}>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                        <button className={cn(btnAksiBase, btnDark)} onClick={() => onView(row)}>
                          Lihat
                        </button>
                        <button className={cn(btnAksiBase, btnIndigo)} onClick={() => onEdit(row)}>
                          Edit
                        </button>
                        <button
                          className={cn(btnAksiBase, btnEmerald)}
                          onClick={() => onOpenStatus(row)}
                        >
                          Ubah Status
                        </button>
                        <button className={cn(btnAksiBase, btnRose)} onClick={() => onDelete(row)}>
                          Hapus
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
              <td colSpan={compact ? 7 : 14} className="px-3 py-8 text-center text-slate-500">
                Belum ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* =====================================================
   ✅ ActionBar + tombol Tampilan Ringkas/Lengkap
===================================================== */
const ActionBar = ({ rows, filters, TableKehilanganComp, compact, onToggleCompact }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOpenPreview = () => {
    if (!rows || rows.length === 0) return alert("Tidak ada data untuk diekspor.");
    setPreviewOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="text-sm text-slate-600">
        Menampilkan <b>{rows.length}</b> data Tanda Kehilangan
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onToggleCompact}
          className={cn(
            "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold shadow hover:shadow-md active:scale-[.99] transition",
            compact
              ? "bg-slate-900 hover:bg-slate-800 text-white"
              : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
          )}
          title={compact ? "Kembali ke tampilan lengkap" : "Ringkaskan kolom utama saja"}
        >
          {compact ? "Tampilan Lengkap" : "Tampilan Ringkas"}
        </button>

        <button
          onClick={handleOpenPreview}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow hover:shadow-md active:scale-[.99]"
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
        TableKehilanganComp={TableKehilanganComp}
      />
    </div>
  );
};

function Portal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* =====================================================
   Halaman Utama (KEHILANGAN)
===================================================== */
export default function SuratTandaKehilangan({
  user: userProp,
  setTabAndSyncUrl,
  allowedTabs: allowedTabsProp,
  tab,
}) {
  const location = useLocation();
  const allowedTabs = Array.isArray(allowedTabsProp) ? allowedTabsProp : [];

  const [user, setUser] = useState(() => userProp || getUser());
  const [me, setMe] = useState(null);

  const pollRef = useRef(null);
  const hasShownLoadErrorRef = useRef(false);

  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setUser(userProp || getUser());
  }, [userProp, location.pathname, location.search]);

  useEffect(() => {
    if (tab === "kehilangan" && !allowedTabs.includes("kehilangan")) {
      const fallback = allowedTabs?.[0] || "izin";
      setTabAndSyncUrl?.(fallback);
    }
  }, [tab, allowedTabs, setTabAndSyncUrl]);

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

  // =====================================================
  // ✅ KA SPKT / Penanggung Jawab (STPLK)
  // =====================================================
  const STPLK_DEFAULT = useMemo(
    () => ({
      label: "A.n. KAPOLSEK TANJUNG RAJA",
      jabatan: "P.s. KA SPKT I",
      name: "",
      pangkat: "",
      nrp: "",
    }),
    []
  );

  const [supervisor, setSupervisor] = useState(STPLK_DEFAULT);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorDraft, setSupervisorDraft] = useState(STPLK_DEFAULT);

  const loadSupervisorFromApi = useCallback(async () => {
    try {
      const res = await api.get("/users/me/stplk", { params: { ts: Date.now() } });
      const st = res.data?.stplk || res.data?.data?.stplk || null;

      const next = {
        label: String(st?.label ?? STPLK_DEFAULT.label).trim() || STPLK_DEFAULT.label,
        jabatan: String(st?.jabatan ?? STPLK_DEFAULT.jabatan).trim() || STPLK_DEFAULT.jabatan,
        name: String(st?.nama ?? st?.name ?? "").trim(),
        pangkat: String(st?.pangkat ?? "").trim(),
        nrp: String(st?.nrp ?? "").trim(),
      };
      setSupervisor(next);
    } catch (e) {
      console.error("[STPLK] load failed:", e);
    }
  }, [STPLK_DEFAULT]);

  useEffect(() => {
    if (!user) return;
    loadSupervisorFromApi();
  }, [user, loadSupervisorFromApi]);

  useEffect(() => {
    if (supervisorOpen) setSupervisorDraft(supervisor);
  }, [supervisorOpen, supervisor]);

  const validateSupervisor = (s) => {
    if (!String(s?.name || "").trim()) return "Nama KA SPKT wajib diisi.";
    if (!String(s?.pangkat || "").trim()) return "Pangkat wajib diisi.";
    if (!String(s?.nrp || "").trim()) return "NRP wajib diisi.";
    if (!/^\d{5,20}$/.test(String(s?.nrp || "").trim())) return "NRP harus angka (minimal 5 digit).";
    return null;
  };

  const saveSupervisorToApi = async (next) => {
    const payload = {
      label: String(next.label || "").trim(),
      jabatan: String(next.jabatan || "").trim(),
      nama: String(next.name || "").trim(),
      pangkat: String(next.pangkat || "").trim(),
      nrp: String(next.nrp || "").trim(),
    };

    const res = await api.patch("/users/me/stplk", payload);
    const st = res.data?.stplk || null;

    const normalized = {
      label: String(st?.label ?? payload.label ?? STPLK_DEFAULT.label).trim() || STPLK_DEFAULT.label,
      jabatan:
        String(st?.jabatan ?? payload.jabatan ?? STPLK_DEFAULT.jabatan).trim() ||
        STPLK_DEFAULT.jabatan,
      name: String(st?.nama ?? payload.nama ?? "").trim(),
      pangkat: String(st?.pangkat ?? payload.pangkat ?? "").trim(),
      nrp: String(st?.nrp ?? payload.nrp ?? "").trim(),
    };
    setSupervisor(normalized);
  };

  const resetSupervisor = async () => {
    await api.patch("/users/me/stplk", {});
    await loadSupervisorFromApi();
  };

  /* =====================================================
     ✅ RESPONSIVE FIX: SupervisorBar (tanpa ubah logika)
  ====================================================== */
  const SupervisorBar = () => {
    const title = "Penanggung Jawab / KA SPKT (untuk STPLK)";
    const name = (supervisor?.name || "").trim();
    const pangkat = (supervisor?.pangkat || "").trim();
    const nrp = (supervisor?.nrp || "").trim();

    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-4 min-w-0">
            <div className="flex items-center gap-2">
              <UserRoundCog className="h-4 w-4 text-slate-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 break-words">{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data ini akan otomatis masuk ke surat (bagian kiri “Mengetahui / KA SPKT”).
            </p>
          </div>

          <div className="lg:col-span-6 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">Nama</div>
                <div className="font-semibold text-slate-900 break-words">
                  {name ? name.toUpperCase() : <span className="text-rose-600">Belum diisi</span>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">Pangkat</div>
                <div className="font-semibold text-slate-900 break-words">
                  {pangkat || <span className="text-rose-600">Belum diisi</span>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">NRP</div>
                <div className="font-semibold text-slate-900 break-words">
                  {nrp ? `NRP. ${nrp}` : <span className="text-rose-600">Belum diisi</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 min-w-0">
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full">
              <button
                onClick={() => setSupervisorOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 font-semibold"
              >
                <UserRoundCog className="h-4 w-4" /> Ubah
              </button>

              <button
                onClick={async () => {
                  const ok = window.confirm("Reset KA SPKT ke default (kosong)?");
                  if (!ok) return;
                  try {
                    await resetSupervisor();
                  } catch (e) {
                    const msg = e?.response?.data?.error || e?.message || "Gagal reset data KA SPKT";
                    alert(msg);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 font-semibold text-slate-800"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================
  // ✅ Counter STPLK (Tempat pengubahan mulai nomor)
  // =====================================================
  const canEditCounter = useMemo(() => {
    const role = String(me?.role || user?.role || "").toUpperCase();
    return role === "SUPER_ADMIN" || role === "ADMIN_SPKT";
  }, [me?.role, user?.role]);

  const [counterYear, setCounterYear] = useState(() => String(new Date().getFullYear()));
  const [counterNext, setCounterNext] = useState("");
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterSaving, setCounterSaving] = useState(false);

  const loadCounter = useCallback(
    async (y) => {
      if (!canEditCounter) return;
      const year = y || counterYear;

      try {
        setCounterLoading(true);
        const res = await api.get("/surat/admin/stplk-counter", { params: { year, ts: Date.now() } });
        const nextNumber = res.data?.nextNumber ?? res.data?.data?.nextNumber;
        setCounterNext(String(nextNumber ?? "1"));
      } catch (e) {
        console.error(e);
      } finally {
        setCounterLoading(false);
      }
    },
    [canEditCounter, counterYear]
  );

  useEffect(() => {
    if (!canEditCounter) return;
    loadCounter(counterYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEditCounter]);

  const saveCounter = useCallback(async () => {
    if (!canEditCounter) return;

    const year = Number(counterYear);
    const nn = Number(counterNext);

    if (!Number.isFinite(year) || year < 2000) return alert("Tahun tidak valid.");
    if (!Number.isFinite(nn) || nn < 1) return alert("Nomor berikutnya harus angka >= 1.");

    try {
      setCounterSaving(true);
      await api.put("/surat/admin/stplk-counter", { year, nextNumber: nn });
      await loadCounter(String(year));
      alert("Nomor STPLK berhasil diperbarui.");
    } catch (e) {
      const msg = e?.message || "Gagal menyimpan counter STPLK";
      alert(msg);
    } finally {
      setCounterSaving(false);
    }
  }, [canEditCounter, counterYear, counterNext, loadCounter]);

  /* =====================================================
     ✅ RESPONSIVE FIX: CounterBar (tanpa ubah logika)
  ====================================================== */
  const CounterBar = () => {
    if (!canEditCounter) return null;
    if (tab !== "kehilangan") return null;

    const year = Number(counterYear) || new Date().getFullYear();
    const romanMonth = getRomanMonthNow();
    const nextNum = Number(counterNext) || 1;

    const preview = `STPLK/C-${pad2(nextNum)}/${romanMonth}/${year}/SPKT/SUMSEL/RES-OI/SEK TGR`;

    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-4 min-w-0">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-slate-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Nomor STPLK (Counter)</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Nomor dibuat <b>hanya saat status = SELESAI</b> (anti loncat). Bulan Romawi & tahun realtime.
            </p>
          </div>

          <div className="lg:col-span-8 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">Tahun</div>
                <select
                  value={counterYear}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCounterYear(v);
                    loadCounter(v);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(() => {
                    const now = new Date().getFullYear();
                    const arr = [now - 1, now, now + 1];
                    return arr.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">Mulai dari nomor berikutnya</div>
                <input
                  value={counterNext}
                  onChange={(e) => setCounterNext(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="contoh: 1 / 28 / 105"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Format C- menggunakan 2 digit: <b>C-01, C-02 ... C-10, C-11</b>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
                <div className="text-xs text-slate-500">Preview nomor yang akan dipakai</div>

                <div className="mt-2 font-semibold text-slate-900 whitespace-normal break-words leading-relaxed">
                  {counterLoading ? (
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
                    </span>
                  ) : (
                    preview
                  )}
                </div>

                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={saveCounter}
                    disabled={counterSaving}
                    className={cn(
                      "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-white",
                      counterSaving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    {counterSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Simpan
                  </button>

                  <button
                    onClick={() => loadCounter(counterYear)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 font-semibold text-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================
  // Data + Filter
  // =========================
  const [kehilanganRows, setKehilanganRows] = useState([]);
  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusRow, setStatusRow] = useState(null);

  const [suratOpen, setSuratOpen] = useState(false);
  const [suratRow, setSuratRow] = useState(null);

  const [nameQuery, setNameQuery] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadKehilangan = useCallback(
    async ({ silent = false } = {}) => {
      if (!allowedTabs.includes("kehilangan")) return;

      try {
        const res = await api.get("/surat/admin/pengajuan-surat", {
          params: { page: 1, limit: 500, type: "TANDA_KEHILANGAN", ts: Date.now() },
          headers: { "Cache-Control": "no-store" },
        });

        const rowsRaw = res.data?.rows || res.data?.data?.rows || res.data || [];
        const rows = (Array.isArray(rowsRaw) ? rowsRaw : []).map((r) => ({
          ...r,
          jenisSurat: "kehilangan",
          tanggalLahir: toYMD(r.tanggalLahir),
          tanggalLaporan: toYMD(r.tanggalLaporan),
          statusFeedback: r.statusFeedback || "",
          kehilanganItems: coerceArrayItems(r.kehilanganItems).slice(0, MAX_KEHI_ITEMS),
        }));

        setKehilanganRows(rows);
        hasShownLoadErrorRef.current = false;
      } catch (err) {
        const msg =
          err?.response?.data?.error || err?.message || "Gagal mengambil data pengajuan kehilangan";
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
    },
    [allowedTabs]
  );

  useEffect(() => {
    if (!user) return;
    if (tab !== "kehilangan") return;
    loadKehilangan({ silent: false });
  }, [user, tab, loadKehilangan]);

  useEffect(() => {
    stopPolling();

    if (!user) return;
    if (tab !== "kehilangan") return;
    if (!allowedTabs?.includes("kehilangan")) return;

    loadKehilangan({ silent: true });

    pollRef.current = setInterval(() => {
      loadKehilangan({ silent: true });
    }, 5000);

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, tab, Array.isArray(allowedTabs) ? allowedTabs.join("|") : "", loadKehilangan]);

  const yearsOption = useMemo(() => {
    const ys = new Set();
    kehilanganRows.forEach((r) => {
      const y = getYearFromDateStr(r.tanggalLaporan || r.tanggalLahir);
      if (y) ys.add(y);
    });
    if (ys.size === 0) ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => a - b);
  }, [kehilanganRows]);

  const getDateStringForRow = (row) => row.tanggalLaporan || row.tanggalLahir || "";

  const filteredKehilangan = useMemo(
    () =>
      kehilanganRows.filter((r) => {
        const q = nameQuery.trim().toLowerCase();
        const matchName =
          q === "" ||
          (r.code || "").toLowerCase().includes(q) ||
          (r.nama || "").toLowerCase().includes(q);

        const d = getDateStringForRow(r);
        const m = String(getMonthFromDateStr(d) || "").padStart(2, "0");
        const y = String(getYearFromDateStr(d) || "");

        const matchMonth = month === "" || m === month;
        const matchYear = year === "" || y === year;
        return matchName && matchMonth && matchYear;
      }),
    [kehilanganRows, nameQuery, month, year]
  );

  const handleSave = async (updated) => {
    try {
      const payload = {
        nama: updated.nama,
        tempatLahir: updated.tempatLahir,
        tanggalLahir: updated.tanggalLahir ? new Date(updated.tanggalLahir).toISOString() : null,
        jenisKelamin: updated.jenisKelamin,
        nik: updated.nik,
        hp: updated.hp,
        pekerjaan: updated.pekerjaan,
        agama: updated.agama,
        alamat: updated.alamat,
        kehilanganItems: coerceArrayItems(updated.kehilanganItems).slice(0, MAX_KEHI_ITEMS),
        kronologi: updated.kronologi,
        tanggalLaporan: updated.tanggalLaporan ? new Date(updated.tanggalLaporan).toISOString() : null,
      };

      await api.put(`/surat/admin/pengajuan-surat/${updated.id}`, payload);
      await loadKehilangan({ silent: false });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Gagal menyimpan perubahan";
      alert(msg);
    }
  };

  const handleDelete = async (row) => {
    const ok = window.confirm(`Hapus data "${row.nama}"?`);
    if (!ok) return;

    try {
      await api.delete(`/surat/admin/pengajuan-surat/${row.id}`);
      await loadKehilangan({ silent: false });
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
      await api.patch(`/surat/admin/pengajuan-surat/${row.id}/status`, { status: statusEnum, statusFeedback });
      await loadKehilangan({ silent: false });

      if (canEditCounter) {
        await loadCounter(counterYear);
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
  const receiverUser = me || user || null;

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 bg-black text-white shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Manajemen Pengajuan Surat</h1>
            <p className="text-white/80 text-sm sm:text-base">Tanda Kehilangan.</p>
          </div>
        </div>
      </div>

      <SupervisorBar />

      {supervisorOpen && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4">
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold">Ubah Data KA SPKT / Penanggung Jawab</h2>
                  <p className="text-sm text-slate-600">
                    Isi <b>Nama, Pangkat, NRP</b>. Setelah disimpan, surat akan ikut berubah.
                  </p>
                </div>
                <button
                  onClick={() => setSupervisorOpen(false)}
                  className="shrink-0 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1 text-sm"
                >
                  <X className="h-4 w-4" /> Tutup
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[80vh] sm:max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold">Label (kiri atas)</label>
                    <input
                      value={supervisorDraft.label}
                      onChange={(e) => setSupervisorDraft((s) => ({ ...s, label: e.target.value }))}
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Jabatan (kiri)</label>
                    <input
                      value={supervisorDraft.jabatan}
                      onChange={(e) => setSupervisorDraft((s) => ({ ...s, jabatan: e.target.value }))}
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold">Nama</label>
                    <input
                      value={supervisorDraft.name}
                      onChange={(e) => setSupervisorDraft((s) => ({ ...s, name: e.target.value }))}
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">NRP</label>
                    <input
                      value={supervisorDraft.nrp}
                      onChange={(e) =>
                        setSupervisorDraft((s) => ({ ...s, nrp: e.target.value.replace(/[^\d]/g, "") }))
                      }
                      className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold">Pangkat</label>
                  <input
                    value={supervisorDraft.pangkat}
                    onChange={(e) => setSupervisorDraft((s) => ({ ...s, pangkat: e.target.value }))}
                    className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t flex items-center justify-end gap-2 bg-white flex-wrap">
                <button
                  onClick={() => setSupervisorOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    const err = validateSupervisor(supervisorDraft);
                    if (err) return alert(err);

                    try {
                      await saveSupervisorToApi({
                        ...supervisorDraft,
                        name: String(supervisorDraft.name || "").trim(),
                        pangkat: String(supervisorDraft.pangkat || "").trim(),
                        nrp: String(supervisorDraft.nrp || "").trim(),
                        label: String(supervisorDraft.label || "").trim(),
                        jabatan: String(supervisorDraft.jabatan || "").trim(),
                      });
                      setSupervisorOpen(false);
                    } catch (e) {
                      const msg = e?.response?.data?.error || e?.message || "Gagal menyimpan data KA SPKT";
                      alert(msg);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <Save className="h-4 w-4" /> Simpan
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <CounterBar />

      <FilterBar
        tab="kehilangan"
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
        rows={filteredKehilangan}
        filters={filters}
        TableKehilanganComp={TableKehilangan}
        compact={compact}
        onToggleCompact={() => setCompact((v) => !v)}
      />

      <Card className="border border-slate-200 rounded-2xl overflow-hidden">
        <CardBody className="p-3 sm:p-4">
          <TableKehilangan
            rows={filteredKehilangan}
            compact={compact}
            onEdit={(row) => {
              setCurrent(row);
              setOpen(true);
            }}
            onDelete={handleDelete}
            onView={handleView}
            onOpenStatus={(row) => {
              setStatusRow(row);
              setStatusOpen(true);
            }}
          />
        </CardBody>
      </Card>

      <EditModal open={open} onClose={() => setOpen(false)} data={current} onSave={handleSave} />

      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} row={statusRow} onChangeStatus={changeStatus} />

      <SuratKehilanganPreviewModal
        open={suratOpen}
        onClose={() => {
          setSuratOpen(false);
          setSuratRow(null);
        }}
        row={suratRow}
        receiverUser={receiverUser}
        supervisorUser={supervisor}
      />
    </div>
  );
}