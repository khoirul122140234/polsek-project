// src/pages/laporan/PelaporanOnlineForm.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { api } from "../lib/api"; // ✅ pakai api helper

// ====== Daftar Jenis Laporan ======
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

// ✅ Pembatasan wilayah Polsek Tanjung Raja
const KECAMATAN_ALLOWED = ["Tanjung Raja", "Sungai Pinang", "Rantau Panjang"];

const pad2 = (n) => String(n).padStart(2, "0");

export default function PelaporanOnlineForm() {
  const initial = useMemo(
    () => ({
      // ✅ BARU: Kecamatan (wajib, dibatasi 3 kecamatan) — TARUH PALING ATAS
      kecamatan: "",

      // Identitas pelapor (wajib semua)
      nama: "",
      nik: "",
      hp: "",

      // Data kejadian
      jenis: "",
      lokasi: "",
      tanggal: "",

      // Waktu kejadian dipisah agar pilihan tidak hilang
      jamHour: "", // "00".."23"
      jamMinute: "", // "00".."59"
      jam: "", // gabungan "HH:mm" (buat payload)

      kronologi: "",

      // Lampiran
      lampiran: null,
    }),
    []
  );

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);

  // ✅ tambahan state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const navigate = useNavigate();

  // ====== OPTION JAM/MENIT ======
  const HOURS = useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), []);
  const MINUTES = useMemo(() => Array.from({ length: 60 }, (_, i) => pad2(i)), []);

  const onChangeText = (e) => {
    const { name, value } = e.target;

    // ✅ enforce limit sesuai counter UI
    if (name === "lokasi") {
      setForm((f) => ({ ...f, lokasi: value.slice(0, 300) }));
      return;
    }
    if (name === "kronologi") {
      setForm((f) => ({ ...f, kronologi: value.slice(0, 1000) }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  const onChangeFile = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] ?? null;

    // ✅ validasi ukuran ringan saat pilih file (supaya user langsung tahu)
    if (file) {
      const max = 6 * 1024 * 1024;
      if (file.size > max) {
        alert("Ukuran lampiran maksimal 6MB");
        e.target.value = "";
        setForm((f) => ({ ...f, [name]: null }));
        return;
      }
    }

    setForm((f) => ({ ...f, [name]: file }));
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  // ✅ handler khusus untuk jam & menit
  const onChangeHour = (value) => {
    const jamHour = value ? pad2(value) : "";
    setForm((f) => {
      const jamMinute = f.jamMinute;
      const jam = jamHour && jamMinute ? `${jamHour}:${jamMinute}` : "";
      return { ...f, jamHour, jam };
    });
  };

  const onChangeMinute = (value) => {
    const jamMinute = value ? pad2(value) : "";
    setForm((f) => {
      const jamHour = f.jamHour;
      const jam = jamHour && jamMinute ? `${jamHour}:${jamMinute}` : "";
      return { ...f, jamMinute, jam };
    });
  };

  // ✅ helper cek tanggal "YYYY-MM-DD" > hari ini?
  const isDateInFuture = (ymd) => {
    if (!ymd) return false;
    try {
      const d = new Date(`${ymd}T00:00:00`);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.getTime() > today.getTime();
    } catch {
      return false;
    }
  };

  // Validasi
  const errors = useMemo(() => {
    const e = {};

    // ✅ Kecamatan (wajib & harus termasuk list)
    if (!form.kecamatan) e.kecamatan = "Pilih kecamatan (wajib)";
    else if (!KECAMATAN_ALLOWED.includes(form.kecamatan)) {
      e.kecamatan = "Kecamatan tidak valid";
    }

    // Identitas
    if (!form.nama.trim()) e.nama = "Nama wajib diisi";
    if (!/^\d{16}$/.test(form.nik)) e.nik = "NIK harus 16 digit angka";
    if (!/^0\d{9,13}$/.test(form.hp)) e.hp = "Nomor HP tidak valid";

    // Jenis
    if (!form.jenis) e.jenis = "Pilih jenis laporan";

    // Lokasi
    if (!form.lokasi.trim()) e.lokasi = "Lokasi kejadian wajib diisi";
    else if (form.lokasi.trim().length < 10) e.lokasi = "Tuliskan lokasi lebih detail (≥ 10 karakter)";

    // Waktu & kronologi
    if (!form.tanggal) e.tanggal = "Tanggal kejadian wajib dipilih";

    // ✅ OPTIONAL tapi disarankan: tidak boleh masa depan
    if (form.tanggal && isDateInFuture(form.tanggal)) {
      e.tanggal = "Tanggal kejadian tidak boleh di masa depan";
    }

    if (!(form.jamHour && form.jamMinute)) e.jam = "Waktu kejadian wajib dipilih";
    if (!form.kronologi.trim()) e.kronologi = "Kronologi kejadian wajib diisi";

    // Lampiran optional (validasi ringan bila ada)
    if (form.lampiran) {
      const okExt = [".jpg", ".jpeg", ".png", ".pdf"];
      const lower = String(form.lampiran.name || "").toLowerCase();
      const hasOk = okExt.some((x) => lower.endsWith(x));
      if (!hasOk) e.lampiran = "Lampiran harus JPG/PNG/PDF";

      const max = 6 * 1024 * 1024;
      if (form.lampiran.size > max) e.lampiran = "Ukuran lampiran maksimal 6MB";
    }

    return e;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setTouched({
      kecamatan: true, // ✅ BARU (PALING ATAS)
      nama: true,
      nik: true,
      hp: true,
      jenis: true,
      lokasi: true,
      tanggal: true,
      jam: true,
      kronologi: true,
      lampiran: true,
    });

    if (Object.keys(errors).length > 0) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      // ✅ FormData sesuai backend (multer upload.single("lampiran"))
      const fd = new FormData();

      // ✅ BARU: Kecamatan (wajib)
      fd.append("kecamatan", form.kecamatan);

      fd.append("nama", form.nama.trim());
      fd.append("nik", form.nik.trim());
      fd.append("hp", form.hp.trim());

      fd.append("jenis", form.jenis);
      fd.append("lokasi", form.lokasi.trim());
      fd.append("tanggal", form.tanggal);

      const jam =
        form.jamHour && form.jamMinute ? `${pad2(form.jamHour)}:${pad2(form.jamMinute)}` : "";
      fd.append("jam", jam);

      fd.append("kronologi", form.kronologi.trim());

      if (form.lampiran) fd.append("lampiran", form.lampiran);

      // ✅ REAL SUBMIT
      const res = await api.submitPelaporanOnline(fd);

      // backend return: { ok:true, id, code, status }
      const code = res?.code;
      if (!code) throw new Error("Server tidak mengembalikan code");

      sessionStorage.setItem("status_code_laporan", code);

      // notif sukses
      setSent(true);
      setTimeout(() => setSent(false), 3000);

      // reset form
      setForm(initial);
      setTouched({});

      // redirect ke halaman cek status
      navigate(`/status-laporan?code=${encodeURIComponent(code)}&from=laporan`, {
        state: { code, from: "laporan" },
      });
    } catch (err) {
      setSubmitError(err?.message || "Gagal mengirim pelaporan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const lokasiCount = form.lokasi.trim().length;
  const kronoCount = form.kronologi.trim().length;

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <Navbar />

      <div className="w-full max-w-[860px] mx-auto bg-white/80 backdrop-blur rounded-2xl border border-black/10 shadow-[0_8px_0_rgba(0,0,0,0.12)] p-4 sm:p-6 md:p-10 mt-20 sm:mt-24 mb-16 sm:mb-24">
        {/* ===== HERO TITLE  ===== */}
        <header className="mb-6 md:mb-10">
          <h1 className="text-[26px] sm:text-[32px] md:text-[48px] leading-[1.05] font-extrabold tracking-tight text-black">
            Formulir Pelaporan
          </h1>
          <p className="mt-2 text-sm sm:text-base md:text-lg text-black/60">
            Lengkapi data di bawah ini dengan benar untuk mempermudah proses verifikasi.
          </p>

          {/* ✅ Kebijakan wilayah */}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900 leading-relaxed">
              <b>Perhatian:</b> Layanan ini hanya untuk masyarakat dalam cakupan wilayah{" "}
              <b>Polsek Tanjung Raja</b> (Kecamatan <b>Tanjung Raja</b>, <b>Sungai Pinang</b>,{" "}
              <b>Rantau Panjang</b>). Pengajuan di luar wilayah tersebut <b>tidak dapat diproses</b>.
            </p>
          </div>
        </header>

        {sent && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
            ✅ Data berhasil dikirim. Mengalihkan ke halaman cek status…
          </div>
        )}

        {submitError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
            ❌ {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
          {/* ===== IDENTITAS ===== */}
          <fieldset className="rounded-2xl border border-black/10 p-4 sm:p-5 md:p-6">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Data Diri Pemohon
            </legend>
            <p className="text-sm text-black/60 mt-1 ml-1">Wajib diisi sesuai KTP.</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ✅ BARU: Kecamatan (PALING ATAS DI FORM) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Kecamatan <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <select
                    name="kecamatan"
                    value={form.kecamatan}
                    onChange={onChangeText}
                    onBlur={onBlur}
                    aria-invalid={touched.kecamatan && !!errors.kecamatan}
                    disabled={submitting}
                    className={`w-full appearance-none rounded-xl border p-3 pr-10 text-black/90 transition ${
                      touched.kecamatan && errors.kecamatan
                        ? "border-red-500 ring-2 ring-red-100"
                        : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                    } ${submitting ? "opacity-70" : ""}`}
                  >
                    <option value="">Pilih kecamatan</option>
                    {KECAMATAN_ALLOWED.map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
                    ▾
                  </span>
                </div>
                {touched.kecamatan && errors.kecamatan && (
                  <p className="mt-2 text-xs text-red-600">{errors.kecamatan}</p>
                )}
                {!errors.kecamatan ? (
                  <p className="mt-2 text-xs text-black/60">
                    Pilih sesuai domisili/wilayah kejadian (cakupan Polsek Tanjung Raja).
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Nama Pelapor <span className="text-red-600">*</span>
                </label>
                <input
                  name="nama"
                  value={form.nama}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Nama sesuai KTP"
                  aria-invalid={touched.nama && !!errors.nama}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 transition ${
                    touched.nama && errors.nama
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  } ${submitting ? "opacity-70" : ""}`}
                />
                {touched.nama && errors.nama && (
                  <p className="mt-2 text-xs text-red-600">{errors.nama}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  NIK (KTP) <span className="text-red-600">*</span>
                </label>
                <input
                  name="nik"
                  value={form.nik}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="36xxxxxxxxxxxxxx"
                  aria-invalid={touched.nik && !!errors.nik}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 transition ${
                    touched.nik && errors.nik
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  } ${submitting ? "opacity-70" : ""}`}
                />
                {touched.nik && errors.nik && (
                  <p className="mt-2 text-xs text-red-600">{errors.nik}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  No. HP <span className="text-red-600">*</span>
                </label>
                <input
                  name="hp"
                  value={form.hp}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  inputMode="tel"
                  placeholder="08xxxxxxxxxx"
                  aria-invalid={touched.hp && !!errors.hp}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 transition ${
                    touched.hp && errors.hp
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  } ${submitting ? "opacity-70" : ""}`}
                />
                {touched.hp && errors.hp && (
                  <p className="mt-2 text-xs text-red-600">{errors.hp}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ===== DATA KEJADIAN ===== */}
          <fieldset className="rounded-2xl border border-black/10 p-4 sm:p-5 md:p-6">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Data Kejadian
            </legend>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Jenis Laporan <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <select
                    name="jenis"
                    value={form.jenis}
                    onChange={onChangeText}
                    onBlur={onBlur}
                    aria-invalid={touched.jenis && !!errors.jenis}
                    disabled={submitting}
                    className={`w-full appearance-none rounded-xl border p-3 pr-10 text-black/90 transition ${
                      touched.jenis && errors.jenis
                        ? "border-red-500 ring-2 ring-red-100"
                        : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                    } ${submitting ? "opacity-70" : ""}`}
                  >
                    <option value="">Pilih jenis laporan</option>
                    {JENIS_LAPORAN.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
                    ▾
                  </span>
                </div>
                {touched.jenis && errors.jenis && (
                  <p className="mt-2 text-xs text-red-600">{errors.jenis}</p>
                )}
              </div>

              {/* === LOKASI MANUAL === */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Lokasi Kejadian <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="lokasi"
                  value={form.lokasi}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  rows={3}
                  placeholder="Contoh: Jl. Jenderal Sudirman No. 12, RT 04/RW 06, Kel. Sukamaju, Kec. Prabumulih Timur, Kota Prabumulih"
                  aria-invalid={touched.lokasi && !!errors.lokasi}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 transition ${
                    touched.lokasi && errors.lokasi
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  } ${submitting ? "opacity-70" : ""}`}
                />
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  {touched.lokasi && errors.lokasi ? (
                    <p className="text-xs text-red-600">{errors.lokasi}</p>
                  ) : (
                    <p className="text-xs text-black/60">
                      Tulis alamat selengkap mungkin (patokan/titik temu jika perlu).
                    </p>
                  )}
                  <span className="text-xs text-black/50">{lokasiCount}/300</span>
                </div>
              </div>

              {/* Waktu kejadian */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Waktu Kejadian <span className="text-red-600">*</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="date"
                    name="tanggal"
                    value={form.tanggal}
                    onChange={onChangeText}
                    onBlur={onBlur}
                    aria-invalid={touched.tanggal && !!errors.tanggal}
                    disabled={submitting}
                    className={`w-full rounded-xl border p-3 text-black/90 transition ${
                      touched.tanggal && errors.tanggal
                        ? "border-red-500 ring-2 ring-red-100"
                        : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                    } ${submitting ? "opacity-70" : ""}`}
                  />

                  {/* Dropdown Jam + Menit */}
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <select
                          value={form.jamHour}
                          onChange={(e) => onChangeHour(e.target.value)}
                          onBlur={() => setTouched((t) => ({ ...t, jam: true }))}
                          aria-invalid={touched.jam && !!errors.jam}
                          disabled={submitting}
                          className={`w-full appearance-none rounded-xl border p-3 pr-10 text-black/90 transition ${
                            touched.jam && errors.jam
                              ? "border-red-500 ring-2 ring-red-100"
                              : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                          } ${submitting ? "opacity-70" : ""}`}
                        >
                          <option value="">Jam</option>
                          {HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
                          ▾
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={form.jamMinute}
                          onChange={(e) => onChangeMinute(e.target.value)}
                          onBlur={() => setTouched((t) => ({ ...t, jam: true }))}
                          aria-invalid={touched.jam && !!errors.jam}
                          disabled={submitting}
                          className={`w-full appearance-none rounded-xl border p-3 pr-10 text-black/90 transition ${
                            touched.jam && errors.jam
                              ? "border-red-500 ring-2 ring-red-100"
                              : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                          } ${submitting ? "opacity-70" : ""}`}
                        >
                          <option value="">Menit</option>
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">
                          ▾
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(touched.tanggal && errors.tanggal) || (touched.jam && errors.jam) ? (
                  <p className="mt-2 text-xs text-red-600">{errors.tanggal || errors.jam}</p>
                ) : null}
              </div>

              {/* Kronologi */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Kronologi Kejadian <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="kronologi"
                  value={form.kronologi}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  rows={6}
                  placeholder="Tuliskan kronologi kejadian secara ringkas dan jelas"
                  aria-invalid={touched.kronologi && !!errors.kronologi}
                  disabled={submitting}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 transition ${
                    touched.kronologi && errors.kronologi
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  } ${submitting ? "opacity-70" : ""}`}
                />
                <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  {touched.kronologi && errors.kronologi ? (
                    <p className="text-xs text-red-600">{errors.kronologi}</p>
                  ) : (
                    <p className="text-xs text-black/60">
                      Fokus pada urutan kejadian & pihak yang terlibat.
                    </p>
                  )}
                  <span className="text-xs text-black/50">{kronoCount}/1000</span>
                </div>
              </div>
            </div>
          </fieldset>

          {/* ===== LAMPIRAN ===== */}
          <fieldset className="rounded-2xl border border-black/10 p-4 sm:p-5 md:p-6">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">Lampiran</legend>
            <p className="text-sm text-black/60 mt-1 ml-1">Opsional (foto/berkas pendukung).</p>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-black mb-2">Unggah berkas</label>
              <input
                type="file"
                name="lampiran"
                onChange={onChangeFile}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={submitting}
                className={`block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-white file:cursor-pointer border border-black/30 rounded-xl p-2 ${
                  submitting ? "opacity-70" : ""
                }`}
              />
              {touched.lampiran && errors.lampiran && (
                <p className="mt-2 text-xs text-red-600">{errors.lampiran}</p>
              )}
              {form.lampiran && !errors.lampiran && (
                <p className="mt-1 text-xs text-black/60">Terpilih: {form.lampiran.name}</p>
              )}
            </div>
          </fieldset>

          {/* Tombol */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={goBack}
              className={`w-full sm:w-auto px-6 md:px-8 py-3 rounded-full text-white font-bold shadow active:scale-[0.99] ${
                submitting ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Kembali
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full sm:w-auto px-6 md:px-8 py-3 rounded-full text-white font-bold shadow active:scale-[0.99] ${
                submitting ? "bg-[#198CFB]/60 cursor-not-allowed" : "bg-[#198CFB] hover:bg-[#1579d6]"
              }`}
            >
              {submitting ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>

      <Footer className="mt-auto" />
    </div>
  );
}
