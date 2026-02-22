// server/src/controllers/user.controller.js
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Helper aman ambil userId dari middleware auth
 * - Middleware kamu nyimpen: req.user.uid
 * - Tapi kita dukung juga: req.user.id (jaga-jaga)
 */
function getUserId(req) {
  return req.user?.uid ?? req.user?.id ?? null;
}

// helper trim
function s(v) {
  return String(v ?? "").trim();
}
function onlyDigits(v) {
  return s(v).replace(/[^\d]/g, "");
}
function isValidNrp(v) {
  const x = onlyDigits(v);
  return x.length >= 5 && x.length <= 20;
}

// ==============================
// DEFAULTS (STPLK)
// ==============================
const STPLK_DEFAULT = {
  label: "A.n. KAPOLSEK TANJUNG RAJA",
  jabatan: "P.s. KA SPKT I",
};

/**
 * Normalize output STPLK:
 * - label/jabatan: kalau kosong -> default (biar UI tidak blank)
 * - nama/pangkat/nrp: kalau kosong -> ""
 */
function shapeStplkProfile(u) {
  return {
    label: s(u?.stplkLabel) || STPLK_DEFAULT.label,
    jabatan: s(u?.stplkJabatan) || STPLK_DEFAULT.jabatan,
    nama: s(u?.stplkNama) || "",
    pangkat: s(u?.stplkPangkat) || "",
    nrp: s(u?.stplkNrp) || "",
  };
}

// GET /api/users/me
async function me(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        avatarUrl: true,

        // ✅ PROFIL TTD (KAPOLSEK / PENANGGUNG JAWAB) — IZIN
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,

        // ✅ PROFIL STPLK (KA SPKT)
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ user });
  } catch (e) {
    console.error("[ME] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/users/me
async function updateMe(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // ❌ role tidak boleh diubah
    if (req.body?.role !== undefined) {
      return res.status(400).json({ error: "Role tidak boleh diubah." });
    }

    // ✅ profil biasa (bukan TTD / STPLK)
    const allowed = ["name", "email", "nrp", "pangkat", "satuan"];
    const data = {};

    for (const k of allowed) {
      if (req.body?.[k] !== undefined) data[k] = req.body[k];
    }

    if (data.email) data.email = String(data.email).trim().toLowerCase();
    if (data.name) data.name = String(data.name).trim();

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        avatarUrl: true,

        // ✅ PROFIL TTD IZIN
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,

        // ✅ PROFIL STPLK
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,

        updatedAt: true,
      },
    });

    return res.json({ message: "Profil berhasil diperbarui", user: updated });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(400).json({ error: "Email sudah digunakan." });
    }
    console.error("[UPDATE ME] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// ✅ GET /api/users/me/ttd  (IZIN - KAPOLSEK / PENANGGUNG JAWAB)
async function getMyTtdProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,
      },
    });

    return res.json({
      ttd: {
        jabatan: user?.ttdJabatan || "",
        nama: user?.ttdNama || "",
        pangkat: user?.ttdPangkat || "",
        nrp: user?.ttdNrp || "",
      },
    });
  } catch (e) {
    console.error("[GET TTD] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// ✅ PATCH /api/users/me/ttd (IZIN - KAPOLSEK / PENANGGUNG JAWAB)
async function updateMyTtdProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const jabatan = s(req.body?.jabatan);
    const nama = s(req.body?.nama);
    const pangkat = s(req.body?.pangkat);
    const nrp = onlyDigits(req.body?.nrp);

    const anyFilled = Boolean(jabatan || nama || pangkat || nrp);
    if (anyFilled) {
      if (!jabatan) return res.status(400).json({ error: "Jabatan wajib diisi." });
      if (!nama) return res.status(400).json({ error: "Nama wajib diisi." });
      if (!pangkat) return res.status(400).json({ error: "Pangkat wajib diisi." });
      if (!nrp) return res.status(400).json({ error: "NRP wajib diisi." });
      if (!isValidNrp(nrp)) return res.status(400).json({ error: "NRP tidak valid." });
    }

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        ttdJabatan: anyFilled ? jabatan : null,
        ttdNama: anyFilled ? nama : null,
        ttdPangkat: anyFilled ? pangkat : null,
        ttdNrp: anyFilled ? nrp : null,
      },
      select: {
        id: true,
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: "Profil TTD berhasil diperbarui",
      ttd: {
        jabatan: updated.ttdJabatan || "",
        nama: updated.ttdNama || "",
        pangkat: updated.ttdPangkat || "",
        nrp: updated.ttdNrp || "",
      },
    });
  } catch (e) {
    console.error("[UPDATE TTD] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// =====================================================
// ✅ STPLK (KA SPKT) — GET/PATCH /api/users/me/stplk
// =====================================================

// ✅ GET /api/users/me/stplk
async function getMyStplkProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,
      },
    });

    return res.json({ stplk: shapeStplkProfile(user) });
  } catch (e) {
    console.error("[GET STPLK] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// ✅ PATCH /api/users/me/stplk
async function updateMyStplkProfile(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const label = s(req.body?.label);
    const jabatan = s(req.body?.jabatan);
    const nama = s(req.body?.nama);
    const pangkat = s(req.body?.pangkat);
    const nrp = onlyDigits(req.body?.nrp);

    // jika request body kosong -> reset semua null
    const anyProvided = Boolean(label || jabatan || nama || pangkat || nrp);

    if (anyProvided) {
      if (!nama) return res.status(400).json({ error: "Nama KA SPKT wajib diisi." });
      if (!pangkat) return res.status(400).json({ error: "Pangkat wajib diisi." });
      if (!nrp) return res.status(400).json({ error: "NRP wajib diisi." });
      if (!isValidNrp(nrp)) return res.status(400).json({ error: "NRP tidak valid." });
    }

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        stplkLabel: anyProvided ? (label || STPLK_DEFAULT.label) : null,
        stplkJabatan: anyProvided ? (jabatan || STPLK_DEFAULT.jabatan) : null,
        stplkNama: anyProvided ? nama : null,
        stplkPangkat: anyProvided ? pangkat : null,
        stplkNrp: anyProvided ? nrp : null,
      },
      select: {
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: "Profil KA SPKT (STPLK) berhasil diperbarui",
      stplk: shapeStplkProfile(updated),
    });
  } catch (e) {
    console.error("[UPDATE STPLK] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/users/me/password
async function changeMyPassword(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword dan newPassword wajib diisi" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Password baru minimal 6 karakter" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, password: true },
    });
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ error: "Password lama salah" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: Number(userId) },
      data: { password: hashed },
    });

    return res.json({ message: "Password berhasil diubah" });
  } catch (e) {
    console.error("[CHANGE PASS] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// PATCH /api/users/me/avatar
async function updateMyAvatar(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file) return res.status(400).json({ error: "File avatar wajib diupload" });

    const avatarUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        avatarUrl: true,

        // ✅ PROFIL TTD IZIN
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,

        // ✅ PROFIL STPLK
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,

        updatedAt: true,
      },
    });

    return res.json({ message: "Avatar berhasil diperbarui", user: updated });
  } catch (e) {
    console.error("[AVATAR] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

// DELETE /api/users/me/avatar
async function deleteMyAvatar(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existing = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { avatarUrl: true },
    });

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        avatarUrl: true,

        // ✅ PROFIL TTD IZIN
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,

        // ✅ PROFIL STPLK
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,

        updatedAt: true,
      },
    });

    const url = existing?.avatarUrl || "";
    if (url && url.startsWith("/uploads/")) {
      const filename = url.replace("/uploads/", "");
      const filePath = path.join(process.cwd(), "uploads", filename);
      fs.promises.unlink(filePath).catch(() => {});
    }

    return res.json({ message: "Foto profil berhasil dihapus", user: updated });
  } catch (e) {
    console.error("[DELETE AVATAR] err:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  me,
  updateMe,
  changeMyPassword,
  updateMyAvatar,
  deleteMyAvatar,

  // ✅ TTD IZIN
  getMyTtdProfile,
  updateMyTtdProfile,

  // ✅ STPLK (KA SPKT)
  getMyStplkProfile,
  updateMyStplkProfile,
};
