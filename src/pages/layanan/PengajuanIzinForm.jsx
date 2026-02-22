// src/pages/layanan/PengajuanIzinForm.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const RAW_API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, ""); // hapus trailing slash

// ✅ BATAS WILAYAH (Polsek Tanjung Raja)
const OPSI_KECAMATAN = ["Tanjung Raja", "Sungai Pinang", "Rantau Panjang"];

export default function PengajuanIzinForm() {
  const initial = useMemo(
    () => ({
      // ✅ BARU (opsional)
      namaOrganisasi: "",

      // ✅ BARU (wajib): Kecamatan dalam cakupan Polsek
      kecamatan: "",

      // DATA DIRI
      penanggungJawab: "",
      nik: "",
      hp: "",
      alamat: "",
      // DETAIL KEGIATAN
      jenisKegiatan: "",
      namaKegiatan: "",
      lokasi: "",
      tanggal: "",
      waktuMulai: "",
      waktuSelesai: "",
      perkiraanPeserta: "",
      // DOKUMEN (opsional)
      ktp: null,
      rekomendasiDesa: null,
    }),
    []
  );

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  // opsi jam & menit (24 jam, bahasa Indonesia)
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")),
    []
  );
  const minutes = useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")),
    []
  );

  // helper pecah HH:MM -> {h,m}
  const splitHM = (val) => {
    if (!val || !/^\d{2}:\d{2}$/.test(val)) return { h: "", m: "" };
    const [h, m] = val.split(":");
    return { h, m };
  };

  // set waktu gabungan dari dropdown
  const setTime = (name, h, m) => {
    const hh = h || "00";
    const mm = m || "00";
    setForm((f) => ({ ...f, [name]: `${hh}:${mm}` }));
  };

  const errors = useMemo(() => {
    const e = {};

    // ✅ namaOrganisasi opsional -> tidak divalidasi wajib

    // ✅ kecamatan wajib + harus salah satu dari 3 opsi
    if (!form.kecamatan) e.kecamatan = "Pilih kecamatan (cakupan Polsek Tanjung Raja)";
    else if (!OPSI_KECAMATAN.includes(form.kecamatan)) {
      e.kecamatan = "Kecamatan tidak valid";
    }

    if (!form.penanggungJawab.trim()) e.penanggungJawab = "Penanggung jawab wajib diisi";
    if (!/^\d{16}$/.test(form.nik)) e.nik = "NIK harus 16 digit angka";
    if (!/^0\d{9,13}$/.test(form.hp)) e.hp = "Nomor HP tidak valid";
    if (!form.alamat.trim()) e.alamat = "Alamat wajib diisi";

    if (!form.jenisKegiatan) e.jenisKegiatan = "Pilih jenis kegiatan";
    if (!form.namaKegiatan.trim()) e.namaKegiatan = "Dalam rangka kegiatan wajib diisi";
    if (!form.lokasi.trim()) e.lokasi = "Lokasi wajib diisi";
    if (!form.tanggal) e.tanggal = "Tanggal kegiatan wajib diisi";

    if (!form.waktuMulai) e.waktuMulai = "Waktu mulai wajib diisi";
    if (!form.waktuSelesai) e.waktuSelesai = "Waktu selesai wajib diisi";
    if (form.waktuMulai && form.waktuSelesai && form.waktuSelesai <= form.waktuMulai) {
      e.waktuSelesai = "Waktu selesai harus setelah waktu mulai";
    }

    if (!form.perkiraanPeserta || Number(form.perkiraanPeserta) <= 0) {
      e.perkiraanPeserta = "Perkiraan peserta harus > 0";
    }
    return e;
  }, [form]);

  const onChangeText = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const onChangeNumber = (e) => {
    const { name, value } = e.target;
    const onlyDigits = value.replace(/[^\d]/g, "");
    setForm((f) => ({ ...f, [name]: onlyDigits }));
  };
  const onChangeFile = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB");
      e.target.value = "";
      return;
    }
    setForm((f) => ({ ...f, [name]: file }));
  };
  const onBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));
  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setServerError("");

    // sentuh field wajib
    setTouched({
      // ✅ opsional juga boleh disentuh untuk konsistensi, tapi tidak wajib
      namaOrganisasi: true,

      // ✅ baru
      kecamatan: true,

      penanggungJawab: true,
      nik: true,
      hp: true,
      alamat: true,
      jenisKegiatan: true,
      namaKegiatan: true,
      lokasi: true,
      tanggal: true,
      waktuMulai: true,
      waktuSelesai: true,
      perkiraanPeserta: true,
      ktp: false,
      rekomendasiDesa: false,
    });

    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);

      const fd = new FormData();

      // ✅ BARU
      fd.append("namaOrganisasi", String(form.namaOrganisasi || "").trim());

      // ✅ BARU: kecamatan (wajib)
      fd.append("kecamatan", String(form.kecamatan || "").trim());

      fd.append("penanggungJawab", form.penanggungJawab);
      fd.append("nik", form.nik);
      fd.append("hp", form.hp);
      fd.append("alamat", form.alamat);
      fd.append("jenisKegiatan", form.jenisKegiatan);
      fd.append("namaKegiatan", form.namaKegiatan);
      fd.append("lokasi", form.lokasi);
      fd.append("tanggal", form.tanggal); // yyyy-mm-dd
      fd.append("waktuMulai", form.waktuMulai); // HH:MM (24 jam)
      fd.append("waktuSelesai", form.waktuSelesai); // HH:MM (24 jam)
      fd.append("perkiraanPeserta", String(form.perkiraanPeserta));
      if (form.ktp) fd.append("ktp", form.ktp);
      if (form.rekomendasiDesa) fd.append("rekomendasiDesa", form.rekomendasiDesa);

      const resp = await fetch(`${API_BASE}/api/surat/izin`, {
        method: "POST",
        body: fd,
      });

      let json = {};
      try {
        json = await resp.json();
      } catch {
        /* noop */
      }
      if (!resp.ok) throw new Error(json?.error || `Gagal mengirim pengajuan (HTTP ${resp.status})`);

      if (json.code) sessionStorage.setItem("status_code_izin", json.code);

      setSent(true);
      setForm(initial);
      setTouched({});

      const code = encodeURIComponent(json.code || "");
      navigate(`/status-laporan?code=${code}&from=izin`, {
        state: { code: json.code, from: "izin", id: json.id },
      });
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Gagal mengirim pengajuan");
      setSent(false);
    } finally {
      setSubmitting(false);
    }
  };

  const mulai = splitHM(form.waktuMulai);
  const selesai = splitHM(form.waktuSelesai);

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between overflow-x-hidden">
      <Navbar />

      <div className="w-full max-w-[920px] mx-auto bg-white rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] px-4 sm:px-6 md:px-10 py-6 md:py-10 mt-20 sm:mt-24 mb-16 sm:mb-24">
        {/* Header */}
        <header>
          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-extrabold text-black leading-tight">
            Formulir Pengajuan Surat Izin Keramaian
          </h1>
          <p className="mt-2 text-sm sm:text-base text-black/60">
            Lengkapi data di bawah ini dengan benar untuk mempermudah proses verifikasi.
          </p>

          {/* ✅ Kebijakan wilayah */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm leading-relaxed">
            <b>Perhatian:</b> Hanya masyarakat dalam cakupan wilayah <b>Polsek Tanjung Raja</b> yang boleh mengajukan.
            Cakupan kecamatan: <b>Tanjung Raja</b>, <b>Sungai Pinang</b>, <b>Rantau Panjang</b>
            . Pengajuan di luar wilayah tersebut <b>tidak dapat diproses</b>.
          </div>
        </header>

        {serverError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
            {serverError}
          </div>
        )}
        {sent && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
            Data terkirim. Mengalihkan ke halaman status…
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* ====== DATA DIRI ====== */}
          <fieldset className="border border-black/10 rounded-xl p-4 md:p-5">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Data Diri Penanggung Jawab
            </legend>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* ✅ BARU: Kecamatan (wajib) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Kecamatan (Cakupan Polsek Tanjung Raja) <span className="text-red-600">*</span>
                </label>
                <select
                  name="kecamatan"
                  value={form.kecamatan}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  aria-invalid={touched.kecamatan && !!errors.kecamatan}
                  className={`w-full rounded-xl border p-3 text-black/90 ${
                    touched.kecamatan && errors.kecamatan
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                >
                  <option value="">Pilih kecamatan</option>
                  {OPSI_KECAMATAN.map((kec) => (
                    <option key={kec} value={kec}>
                      {kec}
                    </option>
                  ))}
                </select>
                {touched.kecamatan && errors.kecamatan && (
                  <p className="mt-2 text-xs text-red-600">{errors.kecamatan}</p>
                )}
                <p className="mt-2 text-xs text-black/60 leading-relaxed">
                  Jika domisili di luar cakupan, pengajuan <b>tidak dapat diproses</b>.
                </p>
              </div>

              {/* ✅ BARU: Nama Organisasi (opsional) - paling atas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Nama Organisasi / Panitia <span className="text-black/60">(opsional)</span>
                </label>
                <input
                  type="text"
                  name="namaOrganisasi"
                  value={form.namaOrganisasi}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Contoh: Karang Taruna / Panitia HUT RI / Komunitas (boleh kosong)"
                  className="w-full rounded-xl border p-3 text-black/90 placeholder-black/40 border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                />
                <p className="mt-2 text-xs text-black/60 leading-relaxed">
                  Jika bukan organisasi, biarkan kosong dan isi <b>Nama Lengkap</b>.
                </p>
              </div>

              {/* Nama */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Nama Lengkap <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="penanggungJawab"
                  value={form.penanggungJawab}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Masukkan nama sesuai KTP"
                  aria-invalid={touched.penanggungJawab && !!errors.penanggungJawab}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.penanggungJawab && errors.penanggungJawab
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.penanggungJawab && errors.penanggungJawab && (
                  <p className="mt-2 text-xs text-red-600">{errors.penanggungJawab}</p>
                )}
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Nomor Induk Kependudukan (NIK) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="nik"
                  value={form.nik}
                  onChange={onChangeNumber}
                  onBlur={onBlur}
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="16 digit angka sesuai KTP"
                  aria-invalid={touched.nik && !!errors.nik}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.nik && errors.nik
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.nik && errors.nik && <p className="mt-2 text-xs text-red-600">{errors.nik}</p>}
              </div>

              {/* HP */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Nomor HP/WhatsApp <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="hp"
                  value={form.hp}
                  onChange={onChangeNumber}
                  onBlur={onBlur}
                  inputMode="tel"
                  placeholder="Contoh: 081234567890"
                  aria-invalid={touched.hp && !!errors.hp}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.hp && errors.hp
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.hp && errors.hp && <p className="mt-2 text-xs text-red-600">{errors.hp}</p>}
              </div>

              {/* Alamat */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Alamat / Tempat Tinggal <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="alamat"
                  value={form.alamat}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kabupaten/kota"
                  aria-invalid={touched.alamat && !!errors.alamat}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.alamat && errors.alamat
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.alamat && errors.alamat && <p className="mt-2 text-xs text-red-600">{errors.alamat}</p>}
              </div>
            </div>
          </fieldset>

          {/* ====== DETAIL KEGIATAN ====== */}
          <fieldset className="border border-black/10 rounded-xl p-4 md:p-5">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Detail Kegiatan
            </legend>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Jenis Kegiatan */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Jenis Kegiatan <span className="text-red-600">*</span>
                </label>
                <select
                  name="jenisKegiatan"
                  value={form.jenisKegiatan}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  aria-invalid={touched.jenisKegiatan && !!errors.jenisKegiatan}
                  className={`w-full rounded-xl border p-3 text-black/90 ${
                    touched.jenisKegiatan && errors.jenisKegiatan
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                >
                  <option value="">Pilih jenis</option>
                  <option value="hiburan">Hiburan/Acara Musik</option>
                  <option value="olahraga">Olahraga/Turnamen</option>
                  <option value="keagamaan">Keagamaan</option>
                  <option value="budaya">Budaya/Adat</option>
                  <option value="lainnya">Lainnya</option>
                </select>
                {touched.jenisKegiatan && errors.jenisKegiatan && (
                  <p className="mt-2 text-xs text-red-600">{errors.jenisKegiatan}</p>
                )}
              </div>

              {/* Dalam Rangka Kegiatan */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Dalam Rangka Kegiatan <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="namaKegiatan"
                  value={form.namaKegiatan}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Contoh: HUT RI ke-80 / Festival Kampung Damai"
                  aria-invalid={touched.namaKegiatan && !!errors.namaKegiatan}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.namaKegiatan && errors.namaKegiatan
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.namaKegiatan && errors.namaKegiatan && (
                  <p className="mt-2 text-xs text-red-600">{errors.namaKegiatan}</p>
                )}
              </div>

              {/* Lokasi */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Lokasi Kegiatan <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="lokasi"
                  value={form.lokasi}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  placeholder="Contoh: Lapangan Merdeka, Tanjung Raja"
                  aria-invalid={touched.lokasi && !!errors.lokasi}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.lokasi && errors.lokasi
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.lokasi && errors.lokasi && (
                  <p className="mt-2 text-xs text-red-600">{errors.lokasi}</p>
                )}
              </div>

              {/* Tanggal */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Tanggal Kegiatan <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="tanggal"
                  value={form.tanggal}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  aria-invalid={touched.tanggal && !!errors.tanggal}
                  className={`w-full rounded-xl border p-3 text-black/90 ${
                    touched.tanggal && errors.tanggal
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.tanggal && errors.tanggal && (
                  <p className="mt-2 text-xs text-red-600">{errors.tanggal}</p>
                )}
              </div>

              {/* Waktu Mulai & Selesai */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {/* Waktu Mulai */}
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Waktu Mulai <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Jam Mulai"
                      value={mulai.h}
                      onChange={(e) => setTime("waktuMulai", e.target.value, mulai.m)}
                      onBlur={() => setTouched((t) => ({ ...t, waktuMulai: true }))}
                      className={`w-full rounded-xl border p-3 text-black/90 ${
                        touched.waktuMulai && errors.waktuMulai
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                      }`}
                    >
                      <option value="">Jam</option>
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Menit Mulai"
                      value={mulai.m}
                      onChange={(e) => setTime("waktuMulai", mulai.h, e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, waktuMulai: true }))}
                      className={`w-full rounded-xl border p-3 text-black/90 ${
                        touched.waktuMulai && errors.waktuMulai
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                      }`}
                    >
                      <option value="">Menit</option>
                      {minutes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {touched.waktuMulai && errors.waktuMulai && (
                    <p className="mt-2 text-xs text-red-600">{errors.waktuMulai}</p>
                  )}
                </div>

                {/* Waktu Selesai */}
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Waktu Selesai <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Jam Selesai"
                      value={selesai.h}
                      onChange={(e) => setTime("waktuSelesai", e.target.value, selesai.m)}
                      onBlur={() => setTouched((t) => ({ ...t, waktuSelesai: true }))}
                      className={`w-full rounded-xl border p-3 text-black/90 ${
                        touched.waktuSelesai && errors.waktuSelesai
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                      }`}
                    >
                      <option value="">Jam</option>
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Menit Selesai"
                      value={selesai.m}
                      onChange={(e) => setTime("waktuSelesai", selesai.h, e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, waktuSelesai: true }))}
                      className={`w-full rounded-xl border p-3 text-black/90 ${
                        touched.waktuSelesai && errors.waktuSelesai
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                      }`}
                    >
                      <option value="">Menit</option>
                      {minutes.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  {touched.waktuSelesai && errors.waktuSelesai && (
                    <p className="mt-2 text-xs text-red-600">{errors.waktuSelesai}</p>
                  )}
                </div>
              </div>

              {/* Peserta */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-black mb-2">
                  Perkiraan Jumlah Peserta <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="perkiraanPeserta"
                  value={form.perkiraanPeserta}
                  onChange={onChangeNumber}
                  onBlur={onBlur}
                  inputMode="numeric"
                  placeholder="Contoh: 150"
                  aria-invalid={touched.perkiraanPeserta && !!errors.perkiraanPeserta}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.perkiraanPeserta && errors.perkiraanPeserta
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.perkiraanPeserta && errors.perkiraanPeserta && (
                  <p className="mt-2 text-xs text-red-600">{errors.perkiraanPeserta}</p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Tombol Aksi */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold shadow"
            >
              Kembali
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full sm:w-auto px-6 md:px-8 py-3 rounded-full text-white font-bold shadow ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#198CFB] hover:bg-[#1579d6] active:scale-[0.99]"
              }`}
            >
              {submitting ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
