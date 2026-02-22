// src/App.jsx
import React from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";

// Publik
import Beranda from "./pages/Beranda";
import Struktur from "./pages/Struktur";
import Kapolsek from "./pages/Kapolsek";
import Anggota from "./pages/Anggota";
import Fasilitas from "./pages/Fasilitas";
import Polsek from "./pages/Polsek";
import PetaWilayah from "./pages/PetaWilayah";
import Dokumen from "./pages/Dokumen";


// Berita & Edukasi (Publik)
import Berita, { BeritaDetail } from "./pages/Berita";
import Edukasi, { EdukasiDetail } from "./pages/Edukasi";

// Layanan (Publik)
import StatusLaporanPage from "./pages/layanan/StatusCodePage";
import PengajuanIzin from "./pages/layanan/PengajuanIzin";
import PengajuanIzinForm from "./pages/layanan/PengajuanIzinForm";
import PengajuanTandaKehilangan from "./pages/layanan/PengajuanTandaKehilangan";
import PengajuanTandaKehilanganForm from "./pages/layanan/PengajuanTandaKehilanganForm";

// Pelaporan (Publik)
import PelaporanOnline from "./pages/PelaporanOnline";
import PelaporanOnlineForm from "./pages/PelaporanOnlineForm";

// Cek Status
import CekStatus from "./pages/CekStatus";
import CekStatusHasil from "./pages/CekStatusHasil";

// Login (Admin)
import LoginAdmin from "./pages/auth/Login";

// ===== Admin =====
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import PengajuanSurat from "./pages/admin/PengajuanSurat";
import RekapitulasiSurat from "./pages/admin/RekapitulasiSurat";
import PelaporanOnlineAdmin from "./pages/admin/PelaporanOnlineAdmin";

// Manajemen Profil
import KapolsekAdmin from "./pages/admin/KapolsekAdmin";
import AnggotaAdmin from "./pages/admin/AnggotaAdmin";
import FasilitasAdmin from "./pages/admin/FasilitasAdmin";

// Konten (Admin)
import BeritaAdmin from "./pages/admin/BeritaAdmin";
import EdukasiAdmin from "./pages/admin/EdukasiAdmin";

import MyProfile from "./pages/admin/MyProfile";
import KelolaAkun from "./pages/admin/KelolaAkun";
import Forbidden from "./pages/admin/Forbidden";

// ✅ BARU: Dokumen Admin
import DokumenAdmin from "./pages/admin/DokumenAdmin";

// Guard
import ProtectedRoute from "./routes/ProtectedRoute";
import RequireRole from "./routes/RequireRole";

/**
 * Helper redirect yang mempertahankan query (?code=...)
 * dan mengirim state { from } ke halaman tujuan.
 */
function RedirectWithQuery({ to, from }) {
  const loc = useLocation();
  const search = loc.search || "";

  // Pastikan query punya from juga (biar CekStatusHasil bisa infer)
  const params = new URLSearchParams(search);
  if (from && !params.get("from")) params.set("from", from);

  const nextTo = `${to}?${params.toString()}`;

  return <Navigate to={nextTo} replace state={{ from }} />;
}

function App() {
  return (
    <Routes>
      {/* =======================
          PUBLIK
      ======================= */}
      <Route path="/" element={<Beranda />} />
      <Route path="/struktur" element={<Struktur />} />
      <Route path="/kapolsek" element={<Kapolsek />} />
      <Route path="/anggota" element={<Anggota />} />
      <Route path="/fasilitas" element={<Fasilitas />} />
      <Route path="/polsek" element={<Polsek />} />
      <Route path="/peta-wilayah" element={<PetaWilayah />} />

      <Route path="/berita" element={<Berita />} />
      <Route path="/berita/:slug" element={<BeritaDetail />} />
      <Route path="/edukasi" element={<Edukasi />} />
      <Route path="/edukasi/:slug" element={<EdukasiDetail />} />
      <Route path="/dokumen" element={<Dokumen />} />


      {/* =======================
          LAYANAN (PUBLIK)
      ======================= */}
      {/* Halaman tampil kode (StatusCodePage) */}
      <Route path="/status-laporan" element={<StatusLaporanPage />} />
      <Route path="/status-code" element={<StatusLaporanPage />} />

      <Route path="/pengajuan-izin" element={<PengajuanIzin />} />
      <Route path="/pengajuan-izin/form" element={<PengajuanIzinForm />} />

      {/* ✅ Setelah submit izin, arahkan ke halaman tampil kode */}
      <Route
        path="/pengajuan-izin/status"
        element={<RedirectWithQuery to="/status-code" from="izin" />}
      />

      <Route path="/pengajuan-tanda-kehilangan" element={<PengajuanTandaKehilangan />} />
      <Route path="/pengajuan-tanda-kehilangan/form" element={<PengajuanTandaKehilanganForm />} />

      {/* ✅ Setelah submit kehilangan, arahkan ke halaman tampil kode */}
      <Route
        path="/pengajuan-tanda-kehilangan/status"
        element={<RedirectWithQuery to="/status-code" from="kehilangan" />}
      />

      {/* =======================
          PELAPORAN (PUBLIK)
      ======================= */}
      <Route path="/pelaporan-online" element={<PelaporanOnline />} />
      <Route path="/pelaporan-online/form" element={<PelaporanOnlineForm />} />

      {/* ✅ Support URL yang dipakai StatusCodePage.jsx: /laporan-online/status?code=... */}
      <Route
        path="/laporan-online/status"
        element={<RedirectWithQuery to="/cek-status" from="laporan" />}
      />

      {/* =======================
          CEK STATUS
      ======================= */}
      <Route path="/cek-status" element={<CekStatus />} />
      <Route path="/cek-status/hasil" element={<CekStatusHasil />} />

      {/* =======================
          LOGIN ADMIN
      ======================= */}
      <Route path="/login-admin" element={<LoginAdmin />} />

      {/* =======================
          ADMIN (PROTECTED BY TOKEN)
      ======================= */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Semua role boleh akses dashboard */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* 403 */}
          <Route path="forbidden" element={<Forbidden />} />

          {/* Pengajuan Surat: SUPER_ADMIN, ADMIN_INTELKAM, ADMIN_SPKT */}
          <Route element={<RequireRole roles={["SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"]} />}>
            <Route path="pengajuan-surat" element={<PengajuanSurat />} />
          </Route>

          {/* Pelaporan Online: SUPER_ADMIN, ADMIN_SPKT */}
          <Route element={<RequireRole roles={["SUPER_ADMIN", "ADMIN_SPKT"]} />}>
            <Route path="pelaporan-online" element={<PelaporanOnlineAdmin />} />
          </Route>

          {/* Rekap: SUPER_ADMIN, ADMIN_KASIUM */}
          <Route element={<RequireRole roles={["SUPER_ADMIN", "ADMIN_KASIUM"]} />}>
            <Route path="rekapitulasi-surat" element={<RekapitulasiSurat />} />
          </Route>

          {/* ✅ BARU: Dokumen Admin: SUPER_ADMIN */}
          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="dokumen" element={<DokumenAdmin />} />
          </Route>

          {/* Manajemen Profil: SUPER_ADMIN */}
          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="profil" element={<Navigate to="manajemen-profil/kapolsek" replace />} />
            <Route path="manajemen-profil">
              <Route index element={<Navigate to="kapolsek" replace />} />
              <Route path="kapolsek" element={<KapolsekAdmin />} />
              <Route path="anggota" element={<AnggotaAdmin />} />
              <Route path="fasilitas" element={<FasilitasAdmin />} />
            </Route>
          </Route>

          {/* My Profile: semua role */}
          <Route path="my-profile" element={<MyProfile />} />

          {/* Kelola Akun: SUPER_ADMIN */}
          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="kelola-akun" element={<KelolaAkun />} />
          </Route>

          {/* Konten: SUPER_ADMIN */}
          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="berita" element={<BeritaAdmin />} />
            <Route path="edukasi" element={<EdukasiAdmin />} />
          </Route>
        </Route>
      </Route>

      {/* =======================
          FALLBACK
      ======================= */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
