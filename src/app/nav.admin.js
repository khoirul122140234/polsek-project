// src/app/nav.admin.js
import {
  FaTachometerAlt,
  FaFileAlt,
  FaExclamationTriangle,
  FaClipboardList,
  FaUserShield,
  FaUserTie,
  FaUsers,
  FaBuilding,
  FaNewspaper,
  FaGraduationCap,
  FaUserCog,
  FaIdBadge,
} from "react-icons/fa";

/**
 * roles:
 * - SUPER_ADMIN
 * - ADMIN_INTELKAM
 * - ADMIN_KASIUM
 * - ADMIN_SPKT
 *
 * Catatan:
 * - Jika item TIDAK punya "roles", berarti tampil untuk semua role (default).
 * - Untuk parent dengan children, roles bisa dipasang di child saja.
 */

export const ADMIN_NAV = [
  // Dashboard semua boleh (kalau kamu mau batasi, tinggal tambah roles)
  { label: "Dashboard", to: "/admin/dashboard", icon: FaTachometerAlt },

  /**
   * Pengajuan Surat kita pecah jadi 2 menu child,
   * supaya Intelkam & SPKT hanya lihat bagian masing-masing.
   */
  {
    label: "Pengajuan Surat",
    icon: FaFileAlt,
    children: [
      {
        label: "Izin Keramaian",
        to: "/admin/pengajuan-surat?tab=izin",
        icon: FaFileAlt,
        roles: ["SUPER_ADMIN", "ADMIN_INTELKAM"],
      },
      {
        label: "Tanda Kehilangan",
        to: "/admin/pengajuan-surat?tab=kehilangan",
        icon: FaFileAlt,
        roles: ["SUPER_ADMIN", "ADMIN_SPKT"],
      },
    ],
  },

  // Pelaporan Online khusus SPKT + Super Admin
  {
    label: "Pelaporan Online",
    to: "/admin/pelaporan-online",
    icon: FaExclamationTriangle,
    roles: ["SUPER_ADMIN", "ADMIN_SPKT"],
  },

  // Rekap khusus KASIUM + Super Admin
  {
    label: "Rekapitulasi",
    to: "/admin/rekapitulasi-surat",
    icon: FaClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN_KASIUM"],
  },

  // ✅ BARU: Dokumen (kelola dokumen publik) — SUPER_ADMIN saja
  {
    label: "Dokumen",
    to: "/admin/dokumen",
    icon: FaFileAlt,
    roles: ["SUPER_ADMIN"],
  },

  // Manajemen Profil (anggap hanya Super Admin, tapi bisa kamu buka ke semua)
  {
    label: "Manajemen Profil",
    icon: FaUserShield,
    roles: ["SUPER_ADMIN"],
    children: [
      { label: "Kapolsek", to: "/admin/manajemen-profil/kapolsek", icon: FaUserTie },
      { label: "Anggota", to: "/admin/manajemen-profil/anggota", icon: FaUsers },
      { label: "Fasilitas", to: "/admin/manajemen-profil/fasilitas", icon: FaBuilding },
    ],
  },

  // Berita & Edukasi (anggap Super Admin saja; kalau mau semua admin boleh, hapus roles)
  { label: "Berita", to: "/admin/berita", icon: FaNewspaper, roles: ["SUPER_ADMIN"] },
  { label: "Edukasi", to: "/admin/edukasi", icon: FaGraduationCap, roles: ["SUPER_ADMIN"] },

  // Kelola Akun hanya Super Admin
  { label: "Kelola Akun", to: "/admin/kelola-akun", icon: FaUserCog, roles: ["SUPER_ADMIN"] },

  // Profil akun yang login (semua role)
  { label: "My Profile", to: "/admin/my-profile", icon: FaIdBadge },
];
