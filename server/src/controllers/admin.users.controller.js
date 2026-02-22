const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_KASIUM", "ADMIN_SPKT"];

function toInt(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanStr(v) {
  return String(v || "").trim();
}

async function countActiveSuperAdmins() {
  return prisma.user.count({
    where: { role: "SUPER_ADMIN", isActive: true },
  });
}

/**
 * GET /api/admin/users
 * Query: page, limit, q, role, isActive
 */
async function listUsers(req, res) {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
    const skip = (page - 1) * limit;

    const q = cleanStr(req.query.q);
    const role = cleanStr(req.query.role);
    const isActiveRaw = req.query.isActive;

    const where = {};

    // ✅ kunci utama: kalau "Semua Role" => batasi hanya role yang valid
    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: "Role tidak valid." });
      }
      where.role = role;
    } else {
      where.role = { in: ALLOWED_ROLES };
    }

    if (isActiveRaw !== undefined && String(isActiveRaw) !== "") {
      where.isActive = String(isActiveRaw) === "true";
    }

    // ✅ AMAN: jangan query contains ke kolom nullable tanpa guard
    // (dan hilangkan mode:"insensitive" agar aman di SQLite)
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { nrp: { not: null, contains: q } },
        { pangkat: { not: null, contains: q } },
        { satuan: { not: null, contains: q } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          nrp: true,
          pangkat: true,
          satuan: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return res.json({
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      data: users,
    });
  } catch (err) {
    console.error("[ADMIN USERS] listUsers ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      detail: err?.message ? String(err.message) : undefined, // ✅ biar kebaca error-nya di Network
    });
  }
}

/**
 * POST /api/admin/users
 */
async function createUser(req, res) {
  try {
    const meId = Number(req.user?.uid);

    const name = cleanStr(req.body?.name);
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = cleanStr(req.body?.role) || "ADMIN_SPKT";

    const nrp = req.body?.nrp ? cleanStr(req.body.nrp) : null;
    const pangkat = req.body?.pangkat ? cleanStr(req.body.pangkat) : null;
    const satuan = req.body?.satuan ? cleanStr(req.body.satuan) : null;

    const isActive = req.body?.isActive === undefined ? true : Boolean(req.body.isActive);

    if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
    if (!email) return res.status(400).json({ error: "Email wajib diisi." });
    if (!password || password.length < 6)
      return res.status(400).json({ error: "Password minimal 6 karakter." });

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid." });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email sudah digunakan." });

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        isActive,
        nrp,
        pangkat,
        satuan,
        createdById: meId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ message: "User berhasil dibuat.", data: user });
  } catch (err) {
    console.error("[ADMIN USERS] create ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * PATCH /api/admin/users/:id
 */
async function updateUser(req, res) {
  try {
    const meId = Number(req.user?.uid);
    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: "ID tidak valid." });

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) return res.status(404).json({ error: "User tidak ditemukan." });

    const data = {};

    if (req.body?.name !== undefined) {
      const v = cleanStr(req.body.name);
      if (!v) return res.status(400).json({ error: "Nama tidak boleh kosong." });
      data.name = v;
    }

    if (req.body?.email !== undefined) {
      const v = cleanEmail(req.body.email);
      if (!v) return res.status(400).json({ error: "Email tidak boleh kosong." });
      data.email = v;
    }

    if (req.body?.nrp !== undefined) data.nrp = cleanStr(req.body.nrp) || null;
    if (req.body?.pangkat !== undefined) data.pangkat = cleanStr(req.body.pangkat) || null;
    if (req.body?.satuan !== undefined) data.satuan = cleanStr(req.body.satuan) || null;

    if (req.body?.role !== undefined) {
      const newRole = cleanStr(req.body.role);
      if (!ALLOWED_ROLES.includes(newRole)) {
        return res.status(400).json({ error: "Role tidak valid." });
      }
      if (id === meId) {
        return res.status(400).json({ error: "Tidak bisa mengubah role sendiri." });
      }
      data.role = newRole;
    }

    if (req.body?.isActive !== undefined) {
      const newActive = Boolean(req.body.isActive);

      if (id === meId && newActive === false) {
        return res.status(400).json({ error: "Tidak bisa menonaktifkan diri sendiri." });
      }

      const roleAfter = data.role ?? target.role;
      if (roleAfter === "SUPER_ADMIN" && newActive === false) {
        const cnt = await countActiveSuperAdmins();
        if (cnt <= 1 && target.isActive === true) {
          return res.status(400).json({ error: "Tidak bisa menonaktifkan SUPER_ADMIN terakhir." });
        }
      }

      data.isActive = newActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ message: "User berhasil diperbarui.", data: updated });
  } catch (err) {
    console.error("[ADMIN USERS] update ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * PATCH /api/admin/users/:id/password
 */
async function resetUserPassword(req, res) {
  try {
    const id = Number(req.params.id);
    const newPassword = String(req.body?.newPassword || "");

    if (!id) return res.status(400).json({ error: "ID tidak valid." });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password baru minimal 6 karakter." });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return res.json({ message: "Password berhasil direset." });
  } catch (err) {
    console.error("[ADMIN USERS] reset password ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * DELETE /api/admin/users/:id (soft delete => isActive=false)
 */
async function deleteUser(req, res) {
  try {
    const meId = Number(req.user?.uid);
    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: "ID tidak valid." });
    if (id === meId) return res.status(400).json({ error: "Tidak bisa menonaktifkan diri sendiri." });

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true },
    });
    if (!target) return res.status(404).json({ error: "User tidak ditemukan." });

    if (target.role === "SUPER_ADMIN" && target.isActive === true) {
      const cnt = await countActiveSuperAdmins();
      if (cnt <= 1) {
        return res.status(400).json({ error: "Tidak bisa menonaktifkan SUPER_ADMIN terakhir." });
      }
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ message: "User berhasil dinonaktifkan." });
  } catch (err) {
    console.error("[ADMIN USERS] delete ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
};