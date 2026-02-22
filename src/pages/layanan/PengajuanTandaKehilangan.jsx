// src/pages/layanan/PengajuanTandaKehilangan.jsx
import React, { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";

// BACKGROUND hero
import bgPengajuan from "../../assets/Pengajuan.png";

// GAMBAR HERO (kanan judul)
import heroFormImage from "../../assets/hero-form-tk.png";

// Gambar di section kartu bawah
import petugasPolisi from "../../assets/petugas-polisi.jpg";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PengajuanTandaKehilangan() {
  const navigate = useNavigate();

  // ✅ Arahkan tombol "Cek status" ke halaman: /cek-status (src/pages/CekStatus.js)
  // dan bawa konteks layanan + simpan kode terakhir agar otomatis terisi.
  const handleGoToStatus = useCallback(() => {
    try {
      // support key lama & baru
      const code =
        sessionStorage.getItem("status_code_kehilangan") ||
        sessionStorage.getItem("status_code_tanda_kehilangan") ||
        "";

      if (code) {
        // simpan ke key yang dipakai CekStatus.js (biar auto-fill)
        sessionStorage.setItem("status_code_kehilangan", code);
      }

      navigate(`/cek-status?from=pengajuan-tanda-kehilangan`, {
        state: { from: "pengajuan-tanda-kehilangan", code: code || "" },
      });
    } catch {
      navigate(`/cek-status?from=pengajuan-tanda-kehilangan`, {
        state: { from: "pengajuan-tanda-kehilangan" },
      });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen w-full font-sans flex flex-col bg-white overflow-x-hidden">
      <Navbar />

      {/* ===================== HERO (1) ===================== */}
      <section className="relative isolate pt-20 sm:pt-24">
        {/* background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${bgPengajuan})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        {/* overlay tipis */}
        <div className="absolute inset-0 -z-10 bg-white/10" aria-hidden />

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* tinggi hero biar presisi + center */}
          <div className="min-h-[calc(100dvh-6.5rem)] flex items-center py-10 sm:py-12 lg:py-0">
            <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
              {/* LEFT */}
              <div className="max-w-2xl">
                <h1 className="text-[32px] sm:text-[52px] lg:text-[64px] font-extrabold leading-[1.08] sm:leading-[1.05] text-black">
                  Sistem Layanan Masyarakat
                </h1>
                <h2 className="mt-4 sm:mt-5 text-[32px] sm:text-[52px] lg:text-[64px] font-extrabold leading-[1.08] sm:leading-[1.05] text-black">
                  Pengajuan Surat Tanda Kehilangan
                </h2>

                <p className="mt-6 sm:mt-7 text-base sm:text-lg lg:text-xl text-black/90 leading-relaxed max-w-xl">
                  Ajukan surat tanda kehilangan untuk barang atau dokumen Anda secara cepat,
                  transparan, dan bisa dipantau statusnya kapan saja.
                </p>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link
                    to="/pengajuan-tanda-kehilangan/form"
                    className="w-full sm:w-auto"
                  >
                    <button
                      className="w-full sm:w-auto text-base sm:text-lg font-semibold px-8 sm:px-10 py-3.5 sm:py-4 rounded-full shadow bg-white text-black hover:bg-white/90 transition inline-flex items-center justify-center gap-3"
                      type="button"
                    >
                      Mulai Pengajuan
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>

                  <button
                    onClick={handleGoToStatus}
                    className="w-full sm:w-auto text-base sm:text-lg font-semibold px-8 sm:px-10 py-3.5 sm:py-4 rounded-full border border-black/10 bg-[#F8C301] text-black inline-flex items-center justify-center gap-3 hover:brightness-95 transition"
                    type="button"
                  >
                    Cek status
                    <span
                      aria-hidden
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-black text-white text-xs"
                    >
                      !
                    </span>
                  </button>
                </div>
              </div>

              {/* RIGHT (kotak putih diperkecil + posisi seperti contoh) */}
              <div className="w-full">
                <div className="mx-auto lg:ml-auto w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[460px]">
                  <div className="relative">
                    {/* shadow bawah */}
                    <div
                      className="absolute -bottom-4 left-8 right-8 h-6 rounded-[18px] bg-black/15 blur-md"
                      aria-hidden
                    />
                    {/* outer card */}
                    <div className="relative rounded-[28px] bg-white/95 ring-1 ring-black/10 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.35)] p-4 sm:p-6">
                      {/* inner frame */}
                      <div className="rounded-2xl bg-white overflow-hidden ring-1 ring-black/5">
                        <div className="p-3 sm:p-4">
                          <img
                            src={heroFormImage}
                            alt="Pratinjau Form Pengajuan Surat Tanda Kehilangan"
                            className="block w-full h-[260px] xs:h-[280px] sm:h-[340px] lg:h-[360px] object-contain bg-white"
                            onError={(e) => {
                              e.currentTarget.alt =
                                "Gambar form tidak ditemukan. Periksa path impor gambar.";
                              e.currentTarget.style.opacity = "0.6";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-black/70 px-2">
                    Pratinjau form • Isi data sesuai KTP agar proses verifikasi lancar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* divider halus */}
        <div
          className="h-10 w-full bg-gradient-to-b from-transparent to-white"
          aria-hidden
        />
      </section>

      {/* ===================== CONTENT ===================== */}
      <main className="flex-1">
        {/* =====================================================
            (2) CATATAN PENTING  ✅ DIPINDAH KE NOMOR 2
        ====================================================== */}
        <section className="bg-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 lg:pt-14 pb-10 sm:pb-12 lg:pb-16">
            <div className="bg-[#FFF6CC] rounded-2xl border border-yellow-300 shadow-[0_6px_0_rgba(0,0,0,0.12)] p-5 sm:p-8 lg:p-10">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
                Catatan Penting
              </h3>

              <ol className="mt-4 space-y-3 sm:space-y-4 list-decimal list-inside text-black/85 text-sm sm:text-base lg:text-lg leading-relaxed">
                <li>
                  Laporan polisi ini bukanlah pengganti dokumen yang hilang, melainkan bukti pendukung
                  untuk proses pengurusan dokumen baru pada instansi berwenang.
                </li>
                <li>
                  Segala bentuk penyalahgunaan atas laporan ini sepenuhnya menjadi tanggung jawab pelapor.
                </li>
                <li>
                  Apabila di kemudian hari terbukti laporan ini palsu, pelapor dapat dikenakan pidana
                  membuat laporan palsu sesuai Pasal 266 KUHP.
                </li>
                <li>
                  Laporan kehilangan berlaku selama <b>1 (satu) bulan</b> sejak tanggal diterbitkan.
                </li>
              </ol>

              <div className="mt-6 rounded-xl bg-white/80 border border-yellow-200 p-4 shadow-sm">
                <p className="text-xs sm:text-sm lg:text-base text-black/80 leading-relaxed">
                  Dengan mengajukan permohonan, Anda dianggap telah membaca, memahami, dan menyetujui
                  ketentuan di atas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            (3) MENGAPA AJUKAN... (tetap)
        ====================================================== */}
        <section className="bg-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
            <div className="bg-white rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] p-5 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
                <div className="max-w-3xl">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black leading-tight">
                    Mengapa Ajukan Surat Tanda Kehilangan Secara Online?
                  </h3>

                  <p className="mt-4 text-black/80 text-base sm:text-lg lg:text-xl leading-relaxed">
                    Portal ini mempermudah Anda untuk mengurus Surat Tanda Kehilangan barang seperti
                    KTP, SIM, STNK, atau barang lainnya. Prosesnya cepat, tanpa antre, dan bisa dipantau
                    statusnya setiap saat.
                  </p>

                  <p className="mt-3 text-black/70 text-sm sm:text-base lg:text-lg leading-relaxed">
                    Dokumen yang hilang dapat diproses secara mudah, dengan persyaratan yang jelas dan
                    progres yang transparan.
                  </p>

                  <ul className="mt-6 space-y-3 sm:space-y-4">
                    {[
                      "Proses yang cepat & mudah",
                      "Berkas terarsip dan mudah dilacak",
                      "Kode unik untuk cek status real-time",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
                        <span className="text-black/80 text-base sm:text-lg lg:text-xl leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative">
                  <div
                    aria-hidden
                    className="absolute -top-6 -right-6 w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-3xl"
                    style={{
                      background:
                        "radial-gradient(40% 40% at 50% 50%, rgba(248,195,1,0.35), rgba(248,195,1,0))",
                    }}
                  />
                  <img
                    src={petugasPolisi}
                    alt="Petugas polisi melayani perizinan"
                    loading="lazy"
                    className="relative z-10 mx-auto w-full max-w-sm sm:max-w-md rounded-3xl shadow-xl object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            (4) MEKANISME PENGAJUAN (tetap)
        ====================================================== */}
        <section className="bg-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
            <div className="bg-white rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] p-5 sm:p-8 lg:p-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                  Mekanisme Pengajuan
                </h3>
                <span className="text-xs sm:text-sm text-black/60">
                  Ringkasan langkah dari awal sampai surat terbit
                </span>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                <Step no="1" title="Akses Menu">
                  Buka portal layanan dan pilih <b>Pengajuan Surat Tanda Kehilangan</b>.
                </Step>
                <Step no="2" title="Isi Data Diri (wajib)">
                  Lengkapi data pemohon sesuai form.
                </Step>
                <Step no="3" title="Detail Kehilangan (wajib)">
                  Isi informasi pokok terkait kehilangan sesuai form.
                </Step>
                <Step no="4" title="Kirim & Verifikasi">
                  Kirim permohonan untuk ditelaah petugas.
                </Step>
                <Step no="5" title="Pantau Status">
                  Gunakan <b>kode status</b> untuk memantau progres. Siapkan dokumen asli bila diminta.
                </Step>
                <Step no="6" title="Surat Terbit">
                  Ambil <b>Surat Tanda Kehilangan</b> setelah disetujui.
                </Step>
              </div>

              <div className="mt-6 text-xs sm:text-sm text-red-600 font-semibold">
                Catatan: Pastikan data wajib benar agar dapat diproses. Dokumen pendukung dapat diminta
                saat verifikasi.
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            (5) MOHON PERHATIKAN SAAT PERIKSA CEK STATUS ✅ DIPINDAH SETELAH MEKANISME
        ====================================================== */}
        <section className="bg-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12 lg:pb-16">
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_6px_0_rgba(0,0,0,0.15)] p-5 sm:p-8 lg:p-10">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(520px 220px at 12% 0%, rgba(248,195,1,0.20), rgba(248,195,1,0) 60%), radial-gradient(420px 200px at 88% 10%, rgba(0,0,0,0.04), rgba(0,0,0,0) 55%)",
                }}
              />
              <div className="relative">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div className="max-w-3xl">
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black leading-tight">
                      Mohon Perhatikan Saat Periksa Cek Status
                    </h3>
                    <p className="mt-3 text-black/80 text-sm sm:text-base lg:text-lg leading-relaxed">
                      Di halaman <b>Cek Status</b> terdapat <b>keterangan / arahan</b> dari
                      petugas. Mohon <b>baca dengan teliti</b> dan <b>ikuti instruksi tersebut </b>
                      sesuai yang tampil, karena arahan itu menjadi panduan untuk langkah selanjutnya.
                    </p>
                  </div>

                  <div className="shrink-0 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={handleGoToStatus}
                      className="w-full lg:w-auto inline-flex items-center justify-center gap-3 rounded-full border border-black/10 bg-black px-6 py-3 text-white font-semibold hover:bg-black/90 transition"
                    >
                      Buka Cek Status
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-black text-xs">
                        !
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <NoticeItem
                    title="Periksa bagian keterangan"
                    desc="Pastikan Anda melihat bagian keterangan pada hasil cek status. Di sana tertulis arahan yang harus dilakukan (jika ada)."
                  />
                  <NoticeItem
                    title="Ikuti arahan sesuai urutan"
                    desc="Jika diminta membawa dokumen, konfirmasi data, atau datang ke Polsek, lakukan sesuai instruksi yang tertera agar proses tidak tertunda."
                  />
                  <NoticeItem
                    title="Siapkan data pendukung"
                    desc="Simpan kode pengajuan dan siapkan dokumen yang disebutkan pada keterangan. Ini membantu verifikasi lebih cepat."
                  />
                </div>

                <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm lg:text-base text-black/80 leading-relaxed">
                    <b>Catatan:</b> Keterangan pada halaman Cek Status dapat berubah mengikuti proses
                    verifikasi. Jika diminta <b>“Segera datang ke Polsek”</b>, pastikan membawa
                    persyaratan yang tertera pada keterangan tersebut.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            (6) PERTANYAAN UMUM (terakhir)
        ====================================================== */}
        <section className="bg-transparent">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
            <div className="bg-[#F8C301] rounded-2xl border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.15)] p-5 sm:p-8 lg:p-10">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black">
                Pertanyaan Umum
              </h3>
              <p className="mt-2 text-black/80 max-w-2xl text-sm sm:text-base">
                Klik pertanyaan untuk melihat jawabannya.
              </p>

              <div className="mt-6 divide-y divide-black/10">
                {[
                  {
                    q: "Apa itu Surat Tanda Kehilangan?",
                    a: "Surat keterangan resmi dari kepolisian yang menyatakan seseorang kehilangan barang atau dokumen tertentu untuk kebutuhan administrasi penggantian/pelaporan.",
                  },
                  {
                    q: "Data apa saja yang diisi di form?",
                    a: "Nama, Tempat/Tanggal Lahir, Jenis Kelamin, NIK, Nomor HP/WhatsApp, Pekerjaan, Agama, Alamat, Barang/Dokumen yang hilang, dan Kronologi kejadian.",
                  },
                  {
                    q: "Dokumen apa yang perlu disiapkan?",
                    a: "KTP pemohon (wajib) dan dokumen pendukung bila ada. Dokumen asli akan dicek saat verifikasi.",
                  },
                  {
                    q: "Berapa lama prosesnya?",
                    a: "1–3 hari kerja setelah berkas lengkap dan verifikasi selesai.",
                  },
                  {
                    q: "Bagaimana cara cek status pengajuan?",
                    a: "Gunakan kode unik yang ditampilkan setelah pengajuan (format KLH-YYYY-XXXXXX) pada menu Cek Status.",
                  },
                ].map((item, i) => (
                  <details key={i} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-base sm:text-lg font-semibold text-black select-none">
                      <span className="pr-6">{item.q}</span>
                      <span
                        aria-hidden
                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-black/20 bg-white text-black transition-all duration-200 group-hover:border-black/30 group-open:bg-black group-open:text-white"
                      >
                        <ChevronDown className="w-5 h-5 transition-transform duration-200 group-open:rotate-180" />
                      </span>
                    </summary>

                    <div className="mt-3 rounded-xl p-4 shadow transition-colors duration-200 bg-white group-open:bg-[#FFF6CC] border border-transparent group-open:border-yellow-200">
                      <p className="text-black/80 text-sm sm:text-base lg:text-lg leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ---------- Sub-komponen kecil ---------- */
function Step({ no, title, children }) {
  return (
    <div className="relative rounded-2xl border border-black/10 p-5 sm:p-6 bg-white">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white font-semibold shrink-0">
          {no}
        </span>
        <p className="text-base sm:text-lg font-semibold text-black">{title}</p>
      </div>
      <p className="mt-2 text-black/70 text-sm sm:text-base leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function NoticeItem({ title, desc }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white font-bold shrink-0"
        >
          !
        </span>
        <div>
          <p className="text-base sm:text-lg font-extrabold text-black leading-tight">
            {title}
          </p>
          <p className="mt-1 text-black/70 text-sm sm:text-base leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}
