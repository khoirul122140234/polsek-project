// src/pages/admin/RekapitulasiSurat.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import {
  Filter,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  FileText,
  Download as DownloadIcon,
  Loader2,
} from "lucide-react";

// ✅ Logo Polri (untuk PDF header)
import logoPolri from "../../assets/Lambang_Polri.png";

// ✅ pakai axios instance yang sudah include baseURL + auth header
import { api } from "../../lib/axios";

/* ===========================
   Util & konstanta kecil
=========================== */
const cn = (...cls) => cls.filter(Boolean).join(" ");
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
const monthsID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const getYear = (ds) => (ds ? parseInt(String(ds).split("-")[0], 10) || null : null);
const getMonth = (ds) => (ds ? parseInt(String(ds).split("-")[1], 10) || null : null);
const pad2 = (n) => String(n).padStart(2, "0");

const formatTanggalID = (iso) => {
  if (!iso || typeof iso !== "string") return "-";
  const raw = iso.slice(0, 10); // aman kalau ISO panjang
  const parts = raw.split("-");
  if (parts.length < 3) return "-";
  const [y, m, d] = parts;
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  if (Number.isNaN(mi) || Number.isNaN(di) || mi < 1 || mi > 12) return "-";
  return `${pad2(di)} ${monthsID[mi - 1]} ${y}`;
};

/* ===========================
   WIB helpers (Asia/Jakarta)
=========================== */
const JAKARTA_OFFSET_MIN = 7 * 60;
function getWibParts(date = new Date()) {
  const wib = new Date(date.getTime() + JAKARTA_OFFSET_MIN * 60_000);
  const y = wib.getUTCFullYear();
  const m = pad2(wib.getUTCMonth() + 1);
  const d = pad2(wib.getUTCDate());
  return { y, m, d, ym: `${y}-${m}`, ymd: `${y}-${m}-${d}` };
}

/* Tombol aksi seragam (untuk aksi di tabel) */
const btnAksiBase =
  "min-w-[120px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium active:scale-[.99] transition focus:outline-none focus:ring-2 focus:ring-offset-1";
const btnIndigo = "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300";
const btnRose = "bg-rose-600 hover:bg-rose-700 focus:ring-rose-300";

/* ===========================
   Helpers: Image -> DataURL (untuk jsPDF addImage)
=========================== */
async function toDataUrl(imageUrl) {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/* ===========================
   Modal Tambah / Edit
=========================== */
function RekapModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || { tanggal: "", noSurat: "", kepada: "", perihal: "", disposisiKa: "" }
  );

  useEffect(() => {
    setForm(initial || { tanggal: "", noSurat: "", kepada: "", perihal: "", disposisiKa: "" });
  }, [initial, open]);

  if (!open) return null;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.tanggal) return "Tanggal wajib diisi.";
    if (!form.noSurat?.trim()) return "No Surat wajib diisi.";
    if (!form.kepada?.trim()) return "Kepada wajib diisi.";
    if (!form.perihal?.trim()) return "Perihal wajib diisi.";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) return alert(err);
    onSave({ ...form, paraf: "" }); // Paraf selalu kosong, ditandatangani manual
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">{initial ? "Edit Baris" : "Tambah Baris"}</h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Tanggal</label>
            <input
              type="date"
              name="tanggal"
              value={form.tanggal}
              onChange={onChange}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">No Surat</label>
            <input
              name="noSurat"
              value={form.noSurat}
              onChange={onChange}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Kepada</label>
            <input
              name="kepada"
              value={form.kepada}
              onChange={onChange}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Perihal</label>
            <input
              name="perihal"
              value={form.perihal}
              onChange={onChange}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Disposisi-Ka</label>
            <input
              name="disposisiKa"
              value={form.disposisiKa}
              onChange={onChange}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200">
            Batal
          </button>
          <button onClick={handleSave} className={cn(btnAksiBase, btnIndigo, "min-w-[140px]")}>
            <Check className="h-4 w-4 mr-2" /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Filter Bar
=========================== */
function FilterBar({ bulan, tahun, kepada, tahunOpts, kepadaOpts, onChange, onReset }) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Bulan */}
        <div className="lg:col-span-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={bulan}
              onChange={(e) => onChange({ bulan: e.target.value })}
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

        {/* Tahun */}
        <div className="lg:col-span-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={tahun}
              onChange={(e) => onChange({ tahun: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Tahun</option>
              {tahunOpts.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Kepada */}
        <div className="lg:col-span-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={kepada}
              onChange={(e) => onChange({ kepada: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kepada</option>
              {kepadaOpts.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={onReset}
          className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 active:scale-[.99] transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* ===========================
   Tabel Rekap
=========================== */
function TabelRekap({ rows, onEdit, onDelete, busyId }) {
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white/80 backdrop-blur">
      <table className="min-w-[1100px] w-full table-auto">
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-sm">
          <tr className="text-slate-700">
            {["No", "Tanggal", "No Surat", "Kepada", "Perihal", "Disposisi-Ka", "Paraf", "Aksi"].map(
              (h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t hover:bg-slate-50/70">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{formatTanggalID(r.tanggal)}</td>
              <td className="px-3 py-2">{r.noSurat}</td>
              <td className="px-3 py-2">{r.kepada}</td>
              <td className="px-3 py-2">{r.perihal}</td>
              <td className="px-3 py-2">{r.disposisiKa || "-"}</td>
              <td className="px-3 py-6"></td>
              <td className="px-3 py-2">
                <div className="flex gap-2 flex-wrap">
                  <button
                    className={cn(btnAksiBase, btnIndigo)}
                    onClick={() => onEdit(r)}
                    disabled={busyId === r.id}
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </button>
                  <button
                    className={cn(btnAksiBase, btnRose)}
                    onClick={() => onDelete(r)}
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Proses
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" /> Hapus
                      </>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                Belum ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ===========================
   Modal Preview PDF (REAL PDF)
=========================== */
function PreviewModal({ open, onClose, rows, tahun }) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function build() {
      if (!open) return;

      // ✅ FIX: Jangan buat/ekspor PDF jika tidak ada data
      if (!rows || rows.length === 0) {
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return "";
        });
        setErr("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");

      try {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginX = 26;

        let logoData = "";
        try {
          logoData = await toDataUrl(logoPolri);
        } catch (_) {
          logoData = "";
        }

        const headerTop = 28;
        const logoW = 46;
        const logoH = 46;

        if (logoData) {
          doc.addImage(logoData, "PNG", pageW / 2 - logoW / 2, headerTop, logoW, logoH);
        }

        const title = "REKAPITULASI SURAT UNTUK POLSEK TANJUNG RAJA";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(17, 24, 39); // slate-900 (bukan hitam pekat)
        doc.text(title, pageW / 2, headerTop + logoH + 22, { align: "center" });

        // ✅ Periode Tahun di bawah judul
        const periodeTahun = tahun ? String(tahun) : "Semua";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`Periode Tahun: ${periodeTahun}`, pageW / 2, headerTop + logoH + 38, {
          align: "center",
        });

        // garis pemisah lebih soft
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(1);
        doc.line(marginX, headerTop + logoH + 56, pageW - marginX, headerTop + logoH + 56);

        const body = rows.map((r, i) => [
          String(i + 1),
          formatTanggalID(r.tanggal),
          r.noSurat || "-",
          r.kepada || "-",
          r.perihal || "-",
          r.disposisiKa || "-",
          " ",
        ]);

        const colW = {
          no: 28,
          tgl: 80,
          nos: 110,
          kepada: 165,
          perihal: 210,
          dispo: 115,
          paraf: 52,
        };

        // ✅ Warna tabel elegan & modern (cerah, bukan hitam)
        const headFill = [79, 70, 229]; // indigo-600
        const headLine = [199, 210, 254]; // indigo-200
        const gridLine = [226, 232, 240]; // slate-200
        const rowAlt = [249, 250, 251]; // gray-50

        autoTable(doc, {
          startY: headerTop + logoH + 74, // sedikit turun karena ada "Periode Tahun"
          head: [["No", "Tanggal", "No Surat", "Kepada", "Perihal", "Disposisi-Ka", "Paraf"]],
          body,
          theme: "striped",
          margin: { left: marginX, right: marginX, top: 0, bottom: 26 },
          styles: {
            font: "helvetica",
            fontSize: 8.6,
            cellPadding: 6,
            textColor: [30, 41, 59], // slate-800
            lineColor: gridLine,
            lineWidth: 0.8,
            valign: "middle",
            overflow: "linebreak",
          },
          headStyles: {
            fontStyle: "bold",
            textColor: [255, 255, 255],
            fillColor: headFill,
            lineColor: headLine,
            lineWidth: 1,
          },
          alternateRowStyles: { fillColor: rowAlt },
          columnStyles: {
            0: { cellWidth: colW.no, halign: "center" },
            1: { cellWidth: colW.tgl },
            2: { cellWidth: colW.nos },
            3: { cellWidth: colW.kepada },
            4: { cellWidth: colW.perihal },
            5: { cellWidth: colW.dispo },
            6: { cellWidth: colW.paraf, halign: "center" },
          },
          didDrawPage: () => {
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // slate-500
            const pageCount = doc.internal.getNumberOfPages();
            const curr = doc.internal.getCurrentPageInfo().pageNumber;
            doc.text(`Halaman ${curr} / ${pageCount}`, pageW - marginX, pageH - 16, {
              align: "right",
            });
          },
        });

        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);

        if (!alive) {
          URL.revokeObjectURL(url);
          return;
        }

        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        if (!alive) return;
        setErr("Gagal membuat preview PDF. Coba ulangi.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    build();
    return () => {
      alive = false;
    };
  }, [open, rows, tahun]);

  useEffect(() => {
    if (!open) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setErr("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "rekap_surat.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur p-4">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-bold">Preview PDF</h2>
            <p className="text-xs text-slate-500 mt-1">Preview terlebih dahulu sebelum download.</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 inline-flex items-center gap-1"
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="flex-1 bg-slate-50">
          {loading && (
            <div className="h-full w-full grid place-items-center">
              <div className="inline-flex items-center gap-2 text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Membuat preview PDF...
              </div>
            </div>
          )}

          {!loading && err && (
            <div className="h-full w-full grid place-items-center p-6 text-center">
              <div className="max-w-md">
                <div className="font-semibold text-rose-600">{err}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Pastikan dependensi <b>jspdf</b> dan <b>jspdf-autotable</b> sudah terpasang.
                </div>
              </div>
            </div>
          )}

          {!loading && !err && pdfUrl && (
            <div className="h-full w-full p-3">
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              </object>
            </div>
          )}

          {!loading && !err && !pdfUrl && (
            <div className="h-full w-full grid place-items-center text-slate-600">
              Tidak ada data untuk dipreview.
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2 bg-white">
          <button
            onClick={handleDownload}
            disabled={!pdfUrl || loading}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold active:scale-[.99]",
              !pdfUrl || loading ? "bg-slate-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            )}
          >
            <DownloadIcon className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Ringkasan Dashboard Rekap
=========================== */
function SummaryCards({ totalAll, totalToday, totalMonth, wibDateLabel, wibMonthLabel }) {
  const cardBase = "rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm p-4";
  const valueCls = "text-3xl font-extrabold tracking-tight";
  const labelCls = "text-sm font-semibold text-slate-700";
  const subCls = "text-xs text-slate-500 mt-1";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className={cardBase}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={labelCls}>Rekap dibuat Hari Ini</div>
            <div className={valueCls}>{totalToday}</div>
            <div className={subCls}>WIB: {wibDateLabel}</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 grid place-items-center font-bold">
            📅
          </div>
        </div>
      </div>

      <div className={cardBase}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={labelCls}>Rekap dibuat Bulan Ini</div>
            <div className={valueCls}>{totalMonth}</div>
            <div className={subCls}>WIB: {wibMonthLabel}</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 grid place-items-center font-bold">
            🗓️
          </div>
        </div>
      </div>

      <div className={cardBase}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={labelCls}>Total Semua Rekap</div>
            <div className={valueCls}>{totalAll}</div>
            <div className={subCls}>Total baris pada tabel</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 grid place-items-center font-bold">
            📄
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   API helpers (rekap surat)
=========================== */
function normalizeRowFromApi(r) {
  return {
    ...r,
    tanggal: r?.tanggal ? String(r.tanggal).slice(0, 10) : "",
  };
}

async function fetchRekapRows({ bulan, tahun, kepada }) {
  const params = {};
  if (bulan) params.bulan = bulan;
  if (tahun) params.tahun = tahun;
  if (kepada) params.kepada = kepada;

  // ✅ FIX: baseURL sudah /api → jangan dobel /api
  const res = await api.get("/rekap-surat", { params });
  const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
  return rows.map(normalizeRowFromApi);
}

/* ===========================
   Halaman Utama
=========================== */
export default function RekapitulasiSurat() {
  const [rows, setRows] = useState([]);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [kepada, setKepada] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  // ✅ Step 3: useEffect fetch GET (hapus dummy data)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchRekapRows({ bulan: "", tahun: "", kepada: "" });
        if (!alive) return;
        setRows(data);
      } catch (e) {
        if (!alive) return;
        const msg = e?.response?.data?.error || e?.message || "Gagal mengambil data rekap.";
        setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const tahunOpts = useMemo(() => {
    const s = new Set(rows.map((r) => getYear(r.tanggal)).filter(Boolean));
    if (!s.size) s.add(new Date().getFullYear());
    return Array.from(s).sort((a, b) => a - b);
  }, [rows]);

  const kepadaOpts = useMemo(() => {
    const s = new Set(rows.map((r) => (r.kepada || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const m = String(getMonth(r.tanggal) || "").padStart(2, "0");
      const y = String(getYear(r.tanggal) || "");
      const matchBulan = !bulan || m === bulan;
      const matchTahun = !tahun || y === tahun;
      const matchKepada = !kepada || r.kepada === kepada;
      return matchBulan && matchTahun && matchKepada;
    });
  }, [rows, bulan, tahun, kepada]);

  const summary = useMemo(() => {
    const { ymd, ym } = getWibParts(new Date());
    const totalAll = rows.length;
    const totalToday = rows.filter((r) => String(r.tanggal || "") === ymd).length;
    const totalMonth = rows.filter((r) => {
      const t = String(r.tanggal || "");
      return t.length >= 7 && t.slice(0, 7) === ym;
    }).length;

    const [yy, mm, dd] = ymd.split("-");
    const monthLabel = `${monthsID[parseInt(mm, 10) - 1]} ${yy}`;
    const dateLabel = `${dd} ${monthsID[parseInt(mm, 10) - 1]} ${yy}`;

    return { totalAll, totalToday, totalMonth, wibDateLabel: dateLabel, wibMonthLabel: monthLabel };
  }, [rows]);

  const onReset = () => {
    setBulan("");
    setTahun("");
    setKepada("");
  };

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEdit = (r) => {
    setEditing(r);
    setOpen(true);
  };

  // ✅ Step 3: onDelete -> DELETE
  const onDelete = async (r) => {
    if (!window.confirm("Hapus baris ini?")) return;
    try {
      setBusyId(r.id);
      // ✅ FIX: baseURL sudah /api → jangan dobel /api
      await api.delete(`/rekap-surat/${r.id}`);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Gagal menghapus data.";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  // ✅ Step 3: saveRow -> POST / PATCH
  const saveRow = async (data) => {
    try {
      setErr("");

      if (editing) {
        setBusyId(editing.id);
        const payload = {
          tanggal: data.tanggal,
          noSurat: data.noSurat,
          kepada: data.kepada,
          perihal: data.perihal,
          disposisiKa: data.disposisiKa || "",
        };

        // ✅ FIX: baseURL sudah /api → jangan dobel /api
        const res = await api.patch(`/rekap-surat/${editing.id}`, payload);
        const updated = normalizeRowFromApi(res?.data?.data || {});
        setRows((prev) => prev.map((x) => (x.id === editing.id ? { ...x, ...updated } : x)));
        return;
      }

      // create
      setBusyId(-1);
      const payload = {
        tanggal: data.tanggal,
        noSurat: data.noSurat,
        kepada: data.kepada,
        perihal: data.perihal,
        disposisiKa: data.disposisiKa || "",
      };

      // ✅ FIX: baseURL sudah /api → jangan dobel /api
      const res = await api.post("/rekap-surat", payload);
      const created = normalizeRowFromApi(res?.data?.data || {});
      if (created?.id) {
        setRows((prev) => [created, ...prev]);
      } else {
        const fresh = await fetchRekapRows({ bulan: "", tahun: "", kepada: "" });
        setRows(fresh);
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Gagal menyimpan data.";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-black text-white shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rekapitulasi Surat</h1>
            <p className="text-white/80">
              Dashboard rekap: jumlah rekap dibuat hari ini & bulan ini, lalu kelola tabel rekap (filter, tambah,
              edit, hapus, preview PDF, download PDF).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold active:scale-[.99]"
              title="Preview & Export PDF"
            >
              <FileText className="h-4 w-4" /> Preview & Export PDF
            </button>
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-black font-semibold active:scale-[.99] hover:opacity-90"
              style={{ backgroundColor: "#F8C301" }}
            >
              <Plus className="h-4 w-4" /> Tambah Baris
            </button>
          </div>
        </div>

        <div className="mt-4">
          <SummaryCards
            totalAll={summary.totalAll}
            totalToday={summary.totalToday}
            totalMonth={summary.totalMonth}
            wibDateLabel={summary.wibDateLabel}
            wibMonthLabel={summary.wibMonthLabel}
          />
        </div>
      </div>

      <FilterBar
        bulan={bulan}
        tahun={tahun}
        kepada={kepada}
        tahunOpts={tahunOpts}
        kepadaOpts={kepadaOpts}
        onChange={(o) => {
          if (o.bulan !== undefined) setBulan(o.bulan);
          if (o.tahun !== undefined) setTahun(o.tahun);
          if (o.kepada !== undefined) setKepada(o.kepada);
        }}
        onReset={onReset}
      />

      <Card className="border border-slate-200 rounded-2xl overflow-hidden">
        <CardBody>
          {loading ? (
            <div className="py-10 grid place-items-center text-slate-700">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data rekap...
              </div>
            </div>
          ) : err ? (
            <div className="py-10 text-center">
              <div className="font-semibold text-rose-600">{err}</div>
              <div className="text-sm text-slate-600 mt-1">
                Pastikan kamu login sebagai <b>ADMIN_KASIUM</b> / <b>SUPER_ADMIN</b> dan route{" "}
                <code>/api/rekap-surat</code> aktif.
              </div>
            </div>
          ) : (
            <TabelRekap rows={filtered} onEdit={onEdit} onDelete={onDelete} busyId={busyId} />
          )}
        </CardBody>
      </Card>

      <RekapModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={saveRow}
        initial={editing ? { ...editing } : null}
      />

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} rows={filtered} tahun={tahun} />
    </div>
  );
}