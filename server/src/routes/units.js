// server/src/routes/units.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const prisma = new PrismaClient();
const router = express.Router();

// Ambil model Unit dari Prisma client (toleran nama model)
const UnitModel =
  prisma.unit ?? prisma.Unit ?? prisma.units ?? prisma.Units;

if (!UnitModel) {
  console.error("[UNITS] Prisma model `Unit` tidak ditemukan. Cek schema.prisma Anda.");
}

/**
 * Role yang boleh kelola unit (samakan dengan anggota)
 * + fallback lowercase untuk jaga-jaga kalau data role di DB berbeda case
 */
const ROLE_MANAGE = ["SUPER_ADMIN", "ADMIN"];
const ROLE_MANAGE_FALLBACK = [
  ...ROLE_MANAGE,
  ...ROLE_MANAGE.map((r) => r.toLowerCase()), // "super_admin", "admin"
];

/**
 * GET /api/units
 * Public: daftar unit
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await UnitModel.findMany({ orderBy: { name: "asc" } });
    res.json(rows);
  } catch (e) {
    console.error("[UNITS][LIST] err:", e);
    res.status(500).json({ error: "Gagal memuat unit" });
  }
});

/**
 * POST /api/units
 * Admin only: buat unit baru
 * Body: { name, logo?, description? }
 */
router.post("/", requireAuth, allowRoles(...ROLE_MANAGE_FALLBACK), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const logo = req.body?.logo ? String(req.body.logo).trim() : null;
    const description = req.body?.description ? String(req.body.description).trim() : null;

    if (!name) return res.status(400).json({ error: "Nama unit wajib diisi" });

    const created = await UnitModel.create({
      data: { name, logo, description },
    });

    res.status(201).json(created);
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Unit sudah ada" });
    }
    console.error("[UNITS][CREATE] err:", e);
    res.status(500).json({ error: e.message || "Gagal menambah unit" });
  }
});

/**
 * PUT /api/units/:id
 * Admin only: update sebagian field
 */
router.put("/:id", requireAuth, allowRoles(...ROLE_MANAGE_FALLBACK), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID tidak valid" });

    const data = {};
    if (req.body?.name != null) {
      const v = String(req.body.name).trim();
      if (!v) return res.status(400).json({ error: "Nama unit wajib diisi" });
      data.name = v;
    }
    if (req.body?.logo !== undefined) data.logo = req.body.logo ? String(req.body.logo).trim() : null;
    if (req.body?.description !== undefined) data.description = req.body.description ? String(req.body.description).trim() : null;

    const updated = await UnitModel.update({ where: { id }, data });
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Unit tidak ditemukan" });
    if (e?.code === "P2002") return res.status(409).json({ error: "Nama unit telah dipakai" });
    console.error("[UNITS][UPDATE] err:", e);
    res.status(500).json({ error: e.message || "Gagal mengubah unit" });
  }
});

/**
 * DELETE /api/units/:id
 * Admin only
 */
router.delete("/:id", requireAuth, allowRoles(...ROLE_MANAGE_FALLBACK), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID tidak valid" });

    await UnitModel.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Unit tidak ditemukan" });
    console.error("[UNITS][DELETE] err:", e);
    res.status(500).json({ error: e.message || "Gagal menghapus unit" });
  }
});

module.exports = router;