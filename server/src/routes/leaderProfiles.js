// server/src/routes/leader-profiles.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Role yang boleh edit profil pimpinan
 * (samakan dengan sistem role kamu di DB)
 *
 * - SUPER_ADMIN pasti boleh
 * - ADMIN (kalau ada)
 * - ADMIN_INTELKAM / ADMIN_SPKT (kalau admin dibagi per unit)
 *
 * + fallback lowercase & tanpa underscore untuk jaga-jaga data lama
 */
const ROLE_MANAGE = ["SUPER_ADMIN", "ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"];
const ROLE_MANAGE_FALLBACK = Array.from(
  new Set([
    ...ROLE_MANAGE,
    ...ROLE_MANAGE.map((r) => r.toLowerCase()),
    ...ROLE_MANAGE.map((r) => r.replace(/_/g, "")), // SUPERADMIN, ADMININTELKAM, ...
    ...ROLE_MANAGE.map((r) => r.replace(/_/g, "").toLowerCase()),
  ])
);

/**
 * GET /api/leader-profiles
 * Public: semua profil (kapolsek & wakapolsek)
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.leaderProfile.findMany();
    res.json({
      kapolsek: rows.find((r) => r.roleKey === "kapolsek") || null,
      wakapolsek: rows.find((r) => r.roleKey === "wakapolsek") || null,
    });
  } catch (e) {
    console.error("[leaderProfiles][list] err:", e);
    res.status(500).json({ error: "Gagal memuat profil" });
  }
});

/**
 * GET /api/leader-profiles/:roleKey
 * Public: satu profil
 */
router.get("/:roleKey", async (req, res) => {
  try {
    const roleKey = String(req.params.roleKey || "").trim();
    const row = await prisma.leaderProfile.findUnique({ where: { roleKey } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("[leaderProfiles][get] err:", e);
    res.status(500).json({ error: "Gagal memuat profil" });
  }
});

/**
 * PUT /api/leader-profiles/:roleKey
 * Admin: create if missing, update if exists
 */
router.put(
  "/:roleKey",
  requireAuth,
  allowRoles(...ROLE_MANAGE_FALLBACK),
  async (req, res) => {
    const roleKey = String(req.params.roleKey || "").trim();

    // batasi roleKey biar tidak sembarang key masuk DB
    const allowedKeys = ["kapolsek", "wakapolsek"];
    if (!allowedKeys.includes(roleKey)) {
      return res.status(400).json({ error: "roleKey tidak valid" });
    }

    const { nama, jabatan, pesan, bio, fotoUrl } = req.body || {};

    // validasi wajib
    for (const [k, v] of Object.entries({ nama, jabatan, pesan, bio })) {
      if (!v || typeof v !== "string" || !v.trim()) {
        return res.status(400).json({ error: `${k} wajib diisi` });
      }
    }

    try {
      const saved = await prisma.leaderProfile.upsert({
        where: { roleKey },
        update: {
          nama: nama.trim(),
          jabatan: jabatan.trim(),
          pesan: pesan.trim(),
          bio: bio.trim(),
          fotoUrl: fotoUrl ? String(fotoUrl).trim() : null,
          updatedBy: req.user?.uid ?? null,
        },
        create: {
          roleKey,
          nama: nama.trim(),
          jabatan: jabatan.trim(),
          pesan: pesan.trim(),
          bio: bio.trim(),
          fotoUrl: fotoUrl ? String(fotoUrl).trim() : null,
          updatedBy: req.user?.uid ?? null,
        },
      });

      res.json(saved);
    } catch (e) {
      console.error("[leaderProfiles][upsert] err:", e);
      res.status(500).json({ error: "Gagal menyimpan profil" });
    }
  }
);

module.exports = router;