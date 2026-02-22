// server/src/routes/anggota.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Toleransi nama model Prisma:
 * - Anggota bisa: prisma.anggota / prisma.Anggota
 * - Unit bisa: prisma.unit / prisma.Unit
 */
const MemberModel =
  prisma.anggota ?? prisma.Anggota ?? prisma.members ?? prisma.Members;
const UnitModel =
  prisma.unit ?? prisma.Unit ?? prisma.units ?? prisma.Units;

if (!MemberModel) console.error("[ANGGOTA] Prisma model Anggota tidak ditemukan.");
if (!UnitModel) console.error("[ANGGOTA] Prisma model Unit/Units tidak ditemukan.");

/**
 * Role yang boleh mengelola anggota & unit di admin:
 * Sesuaikan kalau di DB kamu pakai nama lain.
 */
const ROLE_MANAGE = ["SUPER_ADMIN", "ADMIN"];

/**
 * GET /api/anggota
 * Query: unit_id?
 * Public
 */
router.get("/", async (req, res) => {
  try {
    const unitIdRaw = req.query.unit_id;
    const unitId = unitIdRaw != null && unitIdRaw !== "" ? Number(unitIdRaw) : null;

    const where = {};
    if (Number.isFinite(unitId)) where.unit_id = unitId;

    const rows = await MemberModel.findMany({
      where,
      orderBy: [{ unit_id: "asc" }, { nama: "asc" }],
      include: { unit: true }, // agar frontend bisa pakai r.unit?.name
    });

    res.json(rows);
  } catch (e) {
    console.error("[ANGGOTA][LIST] err:", e);
    res.status(500).json({ error: "Gagal memuat anggota" });
  }
});

/**
 * POST /api/anggota
 * Admin only (SUPER_ADMIN / ADMIN)
 * Body: { nama, jabatan, unit_id, foto_url? }
 */
router.post("/", requireAuth, allowRoles(...ROLE_MANAGE), async (req, res) => {
  try {
    const nama = String(req.body?.nama || "").trim();
    const jabatan = String(req.body?.jabatan || "").trim();
    const unit_id = Number(req.body?.unit_id);
    const foto_url =
      req.body?.foto_url != null && String(req.body.foto_url).trim() !== ""
        ? String(req.body.foto_url).trim()
        : null;

    if (!nama) return res.status(400).json({ error: "Nama wajib diisi" });
    if (!jabatan) return res.status(400).json({ error: "Jabatan wajib diisi" });
    if (!Number.isFinite(unit_id)) return res.status(400).json({ error: "unit_id tidak valid" });

    // pastikan unit ada
    const unit = await UnitModel.findUnique({ where: { id: unit_id } });
    if (!unit) return res.status(400).json({ error: "Unit tidak ditemukan" });

    const created = await MemberModel.create({
      data: { nama, jabatan, unit_id, foto_url },
      include: { unit: true },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error("[ANGGOTA][CREATE] err:", e);
    res.status(500).json({ error: e.message || "Gagal menambah anggota" });
  }
});

/**
 * PUT /api/anggota/:id
 * Admin only (SUPER_ADMIN / ADMIN)
 */
router.put("/:id", requireAuth, allowRoles(...ROLE_MANAGE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID tidak valid" });

    const data = {};

    if (req.body?.nama != null) {
      const v = String(req.body.nama).trim();
      if (!v) return res.status(400).json({ error: "Nama wajib diisi" });
      data.nama = v;
    }

    if (req.body?.jabatan != null) {
      const v = String(req.body.jabatan).trim();
      if (!v) return res.status(400).json({ error: "Jabatan wajib diisi" });
      data.jabatan = v;
    }

    if (req.body?.foto_url !== undefined) {
      data.foto_url =
        req.body.foto_url != null && String(req.body.foto_url).trim() !== ""
          ? String(req.body.foto_url).trim()
          : null;
    }

    if (req.body?.unit_id !== undefined) {
      const unit_id = Number(req.body.unit_id);
      if (!Number.isFinite(unit_id)) return res.status(400).json({ error: "unit_id tidak valid" });

      const unit = await UnitModel.findUnique({ where: { id: unit_id } });
      if (!unit) return res.status(400).json({ error: "Unit tidak ditemukan" });

      data.unit_id = unit_id;
    }

    const updated = await MemberModel.update({
      where: { id },
      data,
      include: { unit: true },
    });

    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Anggota tidak ditemukan" });
    console.error("[ANGGOTA][UPDATE] err:", e);
    res.status(500).json({ error: e.message || "Gagal mengubah anggota" });
  }
});

/**
 * DELETE /api/anggota/:id
 * Admin only (SUPER_ADMIN / ADMIN)
 */
router.delete("/:id", requireAuth, allowRoles(...ROLE_MANAGE), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID tidak valid" });

    await MemberModel.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Anggota tidak ditemukan" });
    console.error("[ANGGOTA][DELETE] err:", e);
    res.status(500).json({ error: e.message || "Gagal menghapus anggota" });
  }
});

module.exports = router;