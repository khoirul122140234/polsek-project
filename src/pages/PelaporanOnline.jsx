// src/pages/laporan/PelaporanOnline.jsx
import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBomb,
  FaSkullCrossbones,
  FaLock,
  FaAnchor,
  FaBalanceScale,
  FaShoppingCart,
  FaBox,
  FaCar,
  FaFistRaised,
  FaMoneyBillWave,
  FaBriefcase,
  FaFileInvoice,
  FaPrint,
  FaTools,
  FaHeartbeat,
  FaStop,
  FaWrench,
  FaChevronDown,
} from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import bgPelaporan from "../assets/LAPORAN.png";
import petugasPolisi from "../assets/petugas-polisi.jpg";

export default function PelaporanOnline() {
  const navigate = useNavigate();

  // ✅ Sama seperti sebelumnya:
  // Tombol "Cek status" diarahkan ke /cek-status (src/pages/CekStatus.js)
  // dengan from=laporan-online dan auto-fill dari sessionStorage.
  const handleGoToStatus = useCallback(() => {
    try {
      const code = sessionStorage.getItem("status_code_laporan") || "";

      if (code) {
        // pastikan key ini tetap tersedia untuk CekStatus.js
        sessionStorage.setItem("status_code_laporan", code);
      }

      navigate(`/cek-status?from=laporan-online`, {
        state: { from: "laporan-online", code: code || "" },
      });
    } catch {
      navigate(`/cek-status?from=laporan-online`, {
        state: { from: "laporan-online" },
      });
    }
  }, [navigate]);

  // ==== DATA KATEGORI ====
  const categories = useMemo(
    () => [
      { label: "Curas", icon: <FaBomb /> },
      { label: "Pembunuhan", icon: <FaSkullCrossbones /> },
      { label: "Penculikan", icon: <FaLock /> },
      { label: "Pembajakan", icon: <FaAnchor /> },
      { label: "Perkosaan", icon: <FaBalanceScale /> },
      { label: "Curat", icon: <FaShoppingCart /> },
      { label: "Anirat", icon: <FaBox /> },
      { label: "Curanmor", icon: <FaCar /> },
      { label: "Pengeroyokan", icon: <FaFistRaised /> },
      { label: "Penipuan", icon: <FaMoneyBillWave /> },
      { label: "Penggelapan", icon: <FaBriefcase /> },
      { label: "Penadahan", icon: <FaFileInvoice /> },
      { label: "Pemalsuan", icon: <FaPrint /> },
      { label: "Rusak Barang", icon: <FaTools /> },
      { label: "Perzinahan", icon: <FaHeartbeat /> },
      { label: "Laporan Palsu", icon: <FaStop /> },
      { label: "Lain-lain", icon: <FaWrench /> },
    ],
    []
  );

  return (
    <div className="w-full overflow-x-hidden">
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative min-h-[100dvh] flex items-center">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${bgPelaporan})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/55 via-black/30 to-transparent"
        />
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl">
            <h1 className="text-[40px] sm:text-[48px] md:text-[64px] font-extrabold leading-tight text-white">
              Sistem Layanan Masyarakat
            </h1>
            <h2 className="mt-2 text-[40px] sm:text-[48px] md:text-[64px] font-extrabold leading-tight text-white">
              Pengajuan Laporan Online
            </h2>
            <p className="mt-6 text-base sm:text-lg md:text-2xl text-white/90 max-w-2xl">
              Lapor kejadian atau kasus yang terjadi dengan cepat dan mudah. Anda
              dapat memantau status laporan kapan saja.
            </p>

            <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row sm:flex-wrap gap-4">
              <Link to="/pelaporan-online/form" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto text-base sm:text-lg md:text-xl font-semibold px-8 py-4 rounded-full shadow bg-white text-black hover:bg-white/90 transition inline-flex items-center justify-center gap-3">
                  Mulai
                  <IoIosArrowForward className="w-6 h-6" />
                </button>
              </Link>

              <button
                onClick={handleGoToStatus}
                className="w-full sm:w-auto text-base sm:text-lg md:text-xl font-semibold px-8 py-4 rounded-full border-2 border-white text-white inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/20 transition"
                type="button"
              >
                Cek status
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-black text-sm">
                  !
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ✅ URUTAN KEDUA: KATEGORI LAPORAN
      ====================================================== */}
      <section className="relative overflow-hidden bg-[#0B0B0B]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 20% 20%, rgba(248,195,1,0.18), rgba(248,195,1,0) 60%), radial-gradient(700px 450px at 85% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%)",
          }}
        />
        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white">
              Kategori Laporan
            </h3>
            <p className="mt-3 text-white/75 text-base md:text-lg">
              Daftar kategori laporan yang tersedia.
            </p>
            <div className="mt-4 flex justify-center">
              <span className="h-[3px] w-16 rounded bg-white/70" aria-hidden />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((item, i) => (
              <CategoryCard key={i} label={item.label} icon={item.icon} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              Untuk membuat laporan, klik tombol{" "}
              <b className="text-white">Mulai</b> di bagian atas.
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          ✅ URUTAN KETIGA: MENGAPA LAPORAN ONLINE?
      ====================================================== */}
      <section className="bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="bg-white rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.15)] border border-black/10 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="max-w-3xl">
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black leading-tight">
                  Mengapa Laporan Online?
                </h3>
                <p className="mt-4 text-black/80 text-base sm:text-xl md:text-2xl leading-relaxed">
                  Portal ini mempermudah warga untuk melaporkan berbagai kejadian
                  tanpa perlu datang langsung ke kantor polisi. Laporan akan
                  tercatat, terpantau jelas, dan diproses lebih cepat.
                </p>
                <p className="mt-3 text-black/70 text-sm sm:text-lg md:text-xl leading-relaxed">
                  Proses pelaporan lebih efisien dan komunikasi dengan petugas
                  menjadi lebih mudah.
                </p>

                <ul className="mt-6 space-y-4">
                  {[
                    "Proses pelaporan lebih cepat & transparan",
                    "Laporan dapat dipantau secara real-time",
                    "Komunikasi dengan petugas lebih mudah",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <FaChevronDown className="w-6 h-6 sm:w-7 sm:h-7 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-black/80 text-base sm:text-xl md:text-2xl leading-snug">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -top-6 -right-6 w-56 h-56 md:w-72 md:h-72 rounded-full blur-3xl"
                  style={{
                    background:
                      "radial-gradient(40% 40% at 50% 50%, rgba(248,195,1,0.35), rgba(248,195,1,0))",
                  }}
                />
                <img
                  src={petugasPolisi}
                  alt="Petugas polisi melayani laporan"
                  loading="lazy"
                  className="relative z-10 mx-auto w-full max-w-sm md:max-w-md rounded-3xl shadow-xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ✅ URUTAN KEEMPAT: MEKANISME PENGAJUAN
      ====================================================== */}
      <section className="bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="bg-white rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.15)] border border-black/10 p-6 md:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Mekanisme Pengajuan
              </h3>
              <span className="hidden md:inline-block text-sm text-black/60">
                Ringkasan langkah dari awal sampai izin terbit
              </span>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <Step no="1" title="Akses Menu">
                Buka portal layanan dan pilih <b>Pengajuan Laporan Online</b>.
              </Step>
              <Step no="2" title="Isi Formulir">
                Lengkapi data pemohon & detail laporan (jenis kejadian, lokasi,
                tanggal, keterangan).
              </Step>
              <Step no="3" title="Unggah Berkas">
                Lampirkan <b>foto kejadian</b>. Dokumen lain bisa ditambahkan sesuai
                kebutuhan.
              </Step>
              <Step no="4" title="Kirim & Verifikasi">
                Permohonan akan ditelaah petugas. Klarifikasi/koordinasi mungkin
                diperlukan.
              </Step>
              <Step no="5" title="Pantau Status">
                Cek status laporan dengan <b>kode unik</b> pada menu{" "}
                <b>Cek Status</b>.
              </Step>
              <Step no="6" title="Laporan Selesai">
                Setelah verifikasi, Anda menerima konfirmasi dan tindak lanjut.
              </Step>
            </div>

            <div className="mt-6 text-xs md:text-sm text-red-600 font-semibold">
              Catatan: Pastikan data benar dan bawa dokumen asli saat verifikasi.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ✅ URUTAN KELIMA: MOHON PERHATIKAN SAAT CEK STATUS
      ====================================================== */}
      <section className="bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 pb-12 md:pb-16">
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_6px_0_rgba(0,0,0,0.15)] p-6 md:p-10">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(500px 200px at 15% 0%, rgba(248,195,1,0.20), rgba(248,195,1,0) 60%), radial-gradient(380px 180px at 85% 10%, rgba(0,0,0,0.04), rgba(0,0,0,0) 55%)",
              }}
            />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="max-w-3xl">
                  <h3 className="text-3xl md:text-4xl font-extrabold text-black leading-tight">
                    Mohon Perhatikan Saat Cek Status
                  </h3>
                  <p className="mt-3 text-black/75 text-sm sm:text-base md:text-lg leading-relaxed">
                    Pada halaman <b>Cek Status</b> terdapat{" "}
                    <b>keterangan / arahan</b>. Harap baca dengan teliti dan ikuti
                    sesuai instruksi yang ditampilkan, agar proses pemeriksaan
                    status berjalan lancar.
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleGoToStatus}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-3 rounded-full border border-black/10 bg-black px-6 py-3 text-white font-semibold hover:bg-black/90 transition"
                  >
                    Buka Cek Status
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-black text-sm">
                      !
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <NoticeItem
                  title="Gunakan kode yang benar"
                  desc="Masukkan kode laporan sesuai yang Anda terima setelah pengajuan. Pastikan tidak ada spasi tambahan."
                />
                <NoticeItem
                  title="Perhatikan keterangan di halaman"
                  desc="Jika ada instruksi tambahan (mis. dokumen pendukung / klarifikasi), ikuti arahan tersebut sesuai urutan."
                />
                <NoticeItem
                  title="Jika status membutuhkan tindak lanjut"
                  desc="Apabila muncul keterangan untuk verifikasi/konfirmasi, siapkan data yang diminta dan lakukan sesuai petunjuk."
                />
              </div>

              <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 md:p-5">
                <p className="text-black/80 text-sm md:text-base leading-relaxed">
                  <b>Catatan:</b> Keterangan pada halaman Cek Status adalah acuan resmi
                  untuk langkah berikutnya. Pastikan Anda membaca hingga selesai
                  sebelum mengambil tindakan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ✅ URUTAN TERAKHIR: PERTANYAAN UMUM
      ====================================================== */}
      <section className="bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="bg-[#F8C301] rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.15)] border border-black/10 p-6 md:p-10">
            <h3 className="text-3xl md:text-4xl font-extrabold text-black">
              Pertanyaan Umum
            </h3>
            <p className="mt-2 text-black/80 max-w-2xl text-sm sm:text-base">
              Klik pertanyaan untuk melihat jawabannya.
            </p>

            <div className="mt-6 divide-y divide-black/10">
              {[
                {
                  q: "Apa itu Laporan Online?",
                  a: "Laporan online memungkinkan Anda melaporkan kejadian atau tindak kriminal tanpa harus datang ke kantor polisi.",
                },
                {
                  q: "Apa saja jenis laporan yang bisa dibuat?",
                  a: "Berbagai jenis kejadian seperti pencurian, pembunuhan, pengeroyokan, penipuan, dan lainnya.",
                },
                {
                  q: "Bagaimana cara mengajukan laporan?",
                  a: "Akses menu Pengajuan Laporan Online, isi formulir, unggah berkas, dan kirim laporan.",
                },
                {
                  q: "Apakah laporan bisa dibatalkan?",
                  a: "Bisa, selama belum diproses lebih lanjut oleh petugas.",
                },
                {
                  q: "Berapa lama proses verifikasi laporan?",
                  a: "Umumnya 1–3 hari kerja, tergantung kompleksitas laporan.",
                },
              ].map((item, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-base sm:text-lg md:text-xl font-semibold text-black select-none">
                    <span className="pr-6">{item.q}</span>
                    <span
                      aria-hidden
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-black/20 bg-white text-black transition-all duration-200 group-hover:border-black/30 group-open:bg-black group-open:text-white"
                    >
                      <FaChevronDown className="w-5 h-5 transition-transform duration-200 group-open:rotate-180" />
                    </span>
                  </summary>

                  <div className="mt-3 rounded-xl p-4 shadow transition-colors duration-200 bg-white group-open:bg-[#FFF6CC] border border-transparent group-open:border-yellow-200">
                    <p className="text-black/80 text-sm sm:text-base md:text-lg">
                      {item.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ------- Sub-komponen ------- */
function Step({ no, title, children }) {
  return (
    <div className="relative rounded-xl border border-black/10 p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white font-semibold shrink-0">
          {no}
        </span>
        <p className="text-base sm:text-lg md:text-xl font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-black/70 text-sm sm:text-base md:text-lg leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function CategoryCard({ label, icon }) {
  return (
    <div className="group h-full">
      <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 md:p-5 transition duration-200 hover:bg-white/[0.10] hover:border-white/20">
        <span
          aria-hidden
          className="absolute left-4 right-4 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-yellow-300/70 to-transparent"
        />
        <div className="flex items-center gap-3 md:gap-4">
          <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-2xl md:text-[28px]">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-white text-sm sm:text-base md:text-lg leading-tight break-words">
              {label}
            </p>
            <p className="mt-1 text-white/60 text-xs md:text-sm leading-snug">
              Kategori laporan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeItem({ title, desc }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_2px_0_rgba(0,0,0,0.06)]">
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
