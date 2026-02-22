// src/pages/layanan/PengajuanTandaKehilanganForm.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { api } from "../../lib/api"; // ✅ helper API

const MAX_KEHI_ITEMS = 5;

// ✅ Wilayah Polsek Tanjung Raja
const OPSI_KECAMATAN = ["Tanjung Raja", "Sungai Pinang", "Rantau Panjang"];

// ✅ Normalizer untuk API wrapper (axios-like / fetch-like)
function unwrapApi(res) {
  if (res && typeof res === "object" && "data" in res) return res.data;
  return res;
}

// Reusable FormField — menerima prop "touched"
const FormField = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  type = "text",
  placeholder,
}) => {
  const showError = touched && !!error;
  return (
    <div>
      <label className="block text-sm font-semibold text-black mb-2">
        {label} <span className="text-red-600">*</span>
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={showError}
        className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
          showError
            ? "border-red-500 ring-2 ring-red-100"
            : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
        }`}
      />
      {showError && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
};

function coerceItems(v) {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((x) => String(x || "").trim());
}

export default function PengajuanTandaKehilanganForm() {
  const initial = useMemo(
    () => ({
      // ✅ BARU
      kecamatan: "",

      nama: "",
      tempatLahir: "",
      tanggalLahir: "",
      jenisKelamin: "",
      nik: "",
      hp: "",
      pekerjaan: "",
      agama: "",
      alamat: "",
      kronologi: "",

      // ✅ DINAMIS: mulai 1 item
      kehilanganItems: [""],
    }),
    []
  );

  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const required = {
    // ✅ BARU
    kecamatan: true,

    nama: true,
    tempatLahir: true,
    tanggalLahir: true,
    jenisKelamin: true,
    nik: true,
    hp: true,
    pekerjaan: true,
    agama: true,
    alamat: true,
    kronologi: true,

    // ✅ minimal 1 item terisi
    kehilanganItems: true,
  };

  const errors = useMemo(() => {
    const e = {};

    // ✅ BARU: validasi kecamatan
    if (required.kecamatan && !form.kecamatan) e.kecamatan = "Kecamatan wajib dipilih.";
    if (form.kecamatan && !OPSI_KECAMATAN.includes(form.kecamatan)) {
      e.kecamatan = "Kecamatan di luar cakupan Polsek Tanjung Raja.";
    }

    if (required.nama && !form.nama.trim()) e.nama = "Nama wajib diisi.";
    if (required.tempatLahir && !form.tempatLahir.trim())
      e.tempatLahir = "Tempat lahir wajib diisi.";
    if (required.tanggalLahir && !form.tanggalLahir)
      e.tanggalLahir = "Tanggal lahir wajib diisi.";
    if (required.jenisKelamin && !form.jenisKelamin)
      e.jenisKelamin = "Jenis kelamin wajib dipilih.";
    if (required.nik && !/^\d{16}$/.test(form.nik))
      e.nik = "NIK harus 16 digit angka.";
    if (required.hp && !/^0\d{9,13}$/.test(form.hp))
      e.hp = "Nomor HP tidak valid (diawali 0, 10–14 digit).";
    if (required.pekerjaan && !form.pekerjaan.trim())
      e.pekerjaan = "Pekerjaan wajib diisi.";
    if (required.agama && !form.agama) e.agama = "Agama wajib dipilih.";
    if (required.alamat && !form.alamat.trim())
      e.alamat = "Alamat wajib diisi.";

    const cleanedItems = coerceItems(form.kehilanganItems)
      .map((x) => x.trim())
      .filter(Boolean);

    if (required.kehilanganItems && cleanedItems.length === 0) {
      e.kehilanganItems = "Tuliskan minimal 1 barang/dokumen yang hilang.";
    }

    if (cleanedItems.length > MAX_KEHI_ITEMS) {
      e.kehilanganItems = `Maksimal ${MAX_KEHI_ITEMS} item.`;
    }

    if (required.kronologi && form.kronologi.trim().length < 10)
      e.kronologi = "Kronologi minimal 10 karakter.";

    return e;
  }, [form]);

  const onChangeText = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
  };

  // ✅ handler kehilanganItems DINAMIS
  const onChangeKehilanganItem = (idx) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      next[idx] = val;
      return { ...f, kehilanganItems: next };
    });
  };

  const onBlurKehilanganItem = () => {
    setTouched((t) => ({ ...t, kehilanganItems: true }));
  };

  const addKehilanganItem = () => {
    setForm((f) => {
      const next = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      if (next.length >= MAX_KEHI_ITEMS) return f;
      return { ...f, kehilanganItems: [...next, ""] };
    });
    setTouched((t) => ({ ...t, kehilanganItems: true }));
  };

  const removeKehilanganItem = (idx) => {
    setForm((f) => {
      const arr = Array.isArray(f.kehilanganItems) ? [...f.kehilanganItems] : [""];
      const next = arr.filter((_, i) => i !== idx);
      // minimal 1 field tetap ada
      return { ...f, kehilanganItems: next.length ? next : [""] };
    });
    setTouched((t) => ({ ...t, kehilanganItems: true }));
  };

  // ✅ SUBMIT: kirim ke backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(required).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const cleanedItems = coerceItems(form.kehilanganItems)
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, MAX_KEHI_ITEMS);

      // ✅ compat lama: gabungan untuk kehilanganApa
      const kehilanganApaCompat = cleanedItems.join(", ");

      const payload = {
        // ✅ BARU
        kecamatan: form.kecamatan,

        nama: form.nama.trim(),
        tempatLahir: form.tempatLahir.trim(),
        tanggalLahir: form.tanggalLahir, // "YYYY-MM-DD"
        jenisKelamin: form.jenisKelamin,
        nik: form.nik,
        hp: form.hp,
        pekerjaan: form.pekerjaan.trim(),
        agama: form.agama,
        alamat: form.alamat.trim(),

        // ✅ DINAMIS (maks 5)
        kehilanganItems: cleanedItems,

        // ✅ compat lama
        kehilanganApa: kehilanganApaCompat,

        kronologi: form.kronologi.trim(),
      };

      const res = await api.post("/surat/kehilangan", payload);
      const out = unwrapApi(res);

      const code = out?.code || out?.data?.code;
      if (!code) throw new Error(out?.error || "Kode pengajuan tidak diterima dari server");

      sessionStorage.setItem("status_code_tanda_kehilangan", code);

      navigate(`/status-laporan?code=${encodeURIComponent(code)}`, {
        state: { code, from: "pengajuan-tanda-kehilangan" },
      });

      setSent(true);
      setTimeout(() => setSent(false), 3000);
      setForm(initial);
      setTouched({});
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        "Gagal mengirim pengajuan";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const items = Array.isArray(form.kehilanganItems) ? form.kehilanganItems : [""];
  const itemsCount = items.length;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between overflow-x-hidden">
      <Navbar />

      <div className="w-full max-w-[920px] mx-auto bg-white rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] px-4 sm:px-6 md:px-10 py-6 md:py-10 mt-20 sm:mt-24 mb-16 sm:mb-24">
        <header>
          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-extrabold text-black leading-tight">
            Formulir Pengajuan Surat Tanda Kehilangan
          </h1>
          <p className="mt-2 text-sm sm:text-base text-black/60">
            Lengkapi data di bawah ini dengan benar untuk mempermudah proses verifikasi.
          </p>

          {/* ✅ BARU: Kebijakan wilayah */}
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900 leading-relaxed">
              <b>Kebijakan Wilayah:</b> Layanan ini hanya untuk masyarakat dalam cakupan wilayah{" "}
              <b>Polsek Tanjung Raja</b> yaitu Kecamatan{" "}
              <b>Tanjung Raja</b>, <b>Sungai Pinang</b>, dan <b>Rantau Panjang</b>.{" "}
              Pengajuan di luar wilayah tersebut <b>tidak dapat diproses</b>.
            </p>
          </div>
        </header>

        {sent && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm">
            Data terkirim. Mengalihkan ke halaman status…
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          <fieldset className="border border-black/10 rounded-xl p-4 md:p-5">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Data Diri Pemohon
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
                  onChange={(e) => {
                    setForm((f) => ({ ...f, kecamatan: e.target.value }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, kecamatan: true }))}
                  aria-invalid={touched.kecamatan && !!errors.kecamatan}
                  className={`w-full rounded-xl border p-3 text-black/90 ${
                    touched.kecamatan && errors.kecamatan
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                >
                  <option value="">Pilih Kecamatan</option>
                  {OPSI_KECAMATAN.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                {touched.kecamatan && errors.kecamatan && (
                  <p className="mt-2 text-xs text-red-600">{errors.kecamatan}</p>
                )}
              </div>

              <FormField
                label="Nama Lengkap"
                name="nama"
                value={form.nama}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.nama}
                touched={touched.nama}
                placeholder="Masukkan nama sesuai KTP"
              />

              <FormField
                label="Tempat Lahir"
                name="tempatLahir"
                value={form.tempatLahir}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.tempatLahir}
                touched={touched.tempatLahir}
                placeholder="Contoh: Tanjung Raja"
              />

              <FormField
                label="Tanggal Lahir"
                name="tanggalLahir"
                value={form.tanggalLahir}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.tanggalLahir}
                touched={touched.tanggalLahir}
                type="date"
              />

              {/* Jenis Kelamin */}
              <div className="md:col-span-2">
                <span className="block text-sm font-semibold text-black mb-2">
                  Jenis Kelamin <span className="text-red-600">*</span>
                </span>
                <div
                  className={`flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 rounded-xl border p-3 ${
                    touched.jenisKelamin && errors.jenisKelamin
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus-within:border-black/60 focus-within:ring-2 focus-within:ring-black/10"
                  }`}
                  role="radiogroup"
                  aria-invalid={touched.jenisKelamin && !!errors.jenisKelamin}
                >
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jenisKelamin"
                      value="Laki-laki"
                      checked={form.jenisKelamin === "Laki-laki"}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, jenisKelamin: e.target.value }));
                        setTouched((t) => ({ ...t, jenisKelamin: true }));
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, jenisKelamin: true }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-black/90">Laki-laki</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="jenisKelamin"
                      value="Perempuan"
                      checked={form.jenisKelamin === "Perempuan"}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, jenisKelamin: e.target.value }));
                        setTouched((t) => ({ ...t, jenisKelamin: true }));
                      }}
                      onBlur={() => setTouched((t) => ({ ...t, jenisKelamin: true }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-black/90">Perempuan</span>
                  </label>
                </div>
                {touched.jenisKelamin && errors.jenisKelamin && (
                  <p className="mt-2 text-xs text-red-600">{errors.jenisKelamin}</p>
                )}
              </div>

              <FormField
                label="Nomor Induk Kependudukan (NIK)"
                name="nik"
                value={form.nik}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.nik}
                touched={touched.nik}
                type="text"
                placeholder="16 digit angka sesuai KTP"
              />

              <FormField
                label="Nomor HP/WhatsApp"
                name="hp"
                value={form.hp}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.hp}
                touched={touched.hp}
                type="tel"
                placeholder="Contoh: 081234567890"
              />

              <FormField
                label="Pekerjaan"
                name="pekerjaan"
                value={form.pekerjaan}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.pekerjaan}
                touched={touched.pekerjaan}
                placeholder="Contoh: Karyawan Swasta"
              />

              {/* Agama */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Agama <span className="text-red-600">*</span>
                </label>
                <select
                  name="agama"
                  value={form.agama}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  aria-invalid={touched.agama && !!errors.agama}
                  className={`w-full rounded-xl border p-3 text-black/90 ${
                    touched.agama && errors.agama
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
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
                {touched.agama && errors.agama && (
                  <p className="mt-2 text-xs text-red-600">{errors.agama}</p>
                )}
              </div>

              <FormField
                label="Alamat / Tempat Tinggal"
                name="alamat"
                value={form.alamat}
                onChange={onChangeText}
                onBlur={onBlur}
                error={errors.alamat}
                touched={touched.alamat}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kabupaten/kota"
              />
            </div>
          </fieldset>

          {/* ====== DETAIL KEHILANGAN ====== */}
          <fieldset className="border border-black/10 rounded-xl p-4 md:p-5">
            <legend className="px-3 text-lg md:text-xl font-bold text-black bg-white">
              Detail Kehilangan
            </legend>

            <div className="mt-4 grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Barang/Dokumen yang Hilang <span className="text-red-600">*</span>
                </label>

                <div
                  className={`rounded-xl border p-4 ${
                    touched.kehilanganItems && errors.kehilanganItems
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus-within:border-black/60 focus-within:ring-2 focus-within:ring-black/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <p className="text-xs md:text-sm text-black/60 leading-relaxed">
                      Tambahkan item sesuai kebutuhan. Minimal <b>1</b> item wajib diisi. Maksimal{" "}
                      <b>{MAX_KEHI_ITEMS}</b> item.
                    </p>

                    <div className="text-xs text-black/60 shrink-0">
                      Total: <b>{itemsCount}</b> / {MAX_KEHI_ITEMS}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {items.map((val, i) => {
                      const disableRemove = i === 0 && itemsCount === 1;
                      return (
                        <div key={i} className="rounded-xl border border-black/10 bg-white p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="text-xs font-semibold text-black/70">
                              Item {i + 1} {i === 0 ? "(wajib minimal isi 1)" : "(opsional)"}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeKehilanganItem(i)}
                              disabled={disableRemove}
                              className={`w-full sm:w-auto px-3 py-1 rounded-lg text-xs font-bold ${
                                disableRemove
                                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700 text-white"
                              }`}
                              title="Hapus item"
                            >
                              Hapus
                            </button>
                          </div>

                          <textarea
                            value={val ?? ""}
                            onChange={onChangeKehilanganItem(i)}
                            onBlur={onBlurKehilanganItem}
                            rows={3}
                            placeholder={
                              i === 0
                                ? "Contoh: Kartu Tanda Penduduk (E-KTP) Dengan NIK: 1610xxxxxxxxxxxx."
                                : "Contoh: Buku tabungan Bank BRI Dengan No Rek: xxxx xxxx xxxx xxxx."
                            }
                            className="w-full rounded-xl border border-black/20 p-4 text-[15px] md:text-base leading-relaxed text-black/90 placeholder-black/40 focus:border-black/40 focus:ring-2 focus:ring-black/10"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      type="button"
                      onClick={addKehilanganItem}
                      disabled={itemsCount >= MAX_KEHI_ITEMS}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl font-bold active:scale-[0.99] ${
                        itemsCount >= MAX_KEHI_ITEMS
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : "bg-black text-white hover:bg-black/90"
                      }`}
                    >
                      + Tambah Item
                    </button>

                    <div className="text-xs text-black/60">
                      {itemsCount >= MAX_KEHI_ITEMS ? (
                        <span>
                          Batas maksimal <b>{MAX_KEHI_ITEMS}</b> item tercapai.
                        </span>
                      ) : (
                        <span>
                          Kamu masih bisa tambah <b>{MAX_KEHI_ITEMS - itemsCount}</b> item lagi.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {touched.kehilanganItems && errors.kehilanganItems && (
                  <p className="mt-2 text-xs text-red-600">{errors.kehilanganItems}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Kronologi Kejadian <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="kronologi"
                  value={form.kronologi}
                  onChange={onChangeText}
                  onBlur={onBlur}
                  rows={4}
                  placeholder='WAJIB tulis kronologi dengan format: hari–tanggal–jam–lokasi–keterangan kejadian. Contoh: "pada hari Rabu Tanggal 13 Juni 2025, Sekira Jam 14.00 Wib, kehilangan ataupun tercecer di seputaran Rumah Yang Beralamat di Desa Tanjung Temiang Kec. Tanjung Raja  Kab. Ogan Ilir"'
                  aria-invalid={touched.kronologi && !!errors.kronologi}
                  className={`w-full rounded-xl border p-3 text-black/90 placeholder-black/40 ${
                    touched.kronologi && errors.kronologi
                      ? "border-red-500 ring-2 ring-red-100"
                      : "border-black/30 focus:border-black/60 focus:ring-2 focus:ring-black/10"
                  }`}
                />
                {touched.kronologi && errors.kronologi && (
                  <p className="mt-2 text-xs text-red-600">{errors.kronologi}</p>
                )}

                <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-3">
                  <p className="text-xs md:text-sm text-black/70 leading-relaxed">
                    <b>WAJIB:</b> Penulisan kronologi harus jelas dan <b>harus seperti format contoh</b>{" "}
                    (hari–tanggal–jam–lokasi–kejadian), agar sesuai dengan format surat.
                    <br />
                    <b>Contoh penulisan yang benar:</b>{" "}
                    <span className="italic">
                      "pada hari Rabu Tanggal 13 Juni 2025, Sekira Jam 14.00 Wib, kehilangan ataupun
                      tercecer di seputaran Rumah Yang Beralamat di Desa Tanjung Temiang Kec. Tanjung
                      Raja Kab. Ogan Ilir"
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </fieldset>

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
              disabled={loading}
              className={`w-full sm:w-auto px-6 md:px-8 py-3 rounded-full text-white font-bold shadow ${
                loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-[#198CFB] hover:bg-[#1579d6] active:scale-[0.99]"
              }`}
            >
              {loading ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}
