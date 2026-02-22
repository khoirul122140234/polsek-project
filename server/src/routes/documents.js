// server/src/routes/documents.js
const express = require("express");
const prisma = require("../prisma");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const router = express.Router();

function s(v) {
  return String(v ?? "").trim();
}
function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function toBool(v, fallback = false) {
  if (v === true || v === false) return v;
  const x = String(v ?? "").toLowerCase().trim();
  if (["1", "true", "yes", "y"].includes(x)) return true;
  if (["0", "false", "no", "n"].includes(x)) return false;
  return fallback;
}

/**
 * ✅ Prisma SQLite (dan beberapa provider) TIDAK support:
 * { contains: "...", mode: "insensitive" }
 * Maka kita normalisasikan ke contains biasa.
 */
function containsSafe(val) {
  const q = s(val);
  if (!q) return undefined;
  return { contains: q };
}

/**
 * =========================
 * PUBLIC
 * GET /api/documents/public
 * Query:
 * - q
 * - category
 * hanya tampilkan isActive=true
 * =========================
 */
router.get("/public", async (req, res) => {
  try {
    const q = s(req.query.q);
    const category = s(req.query.category);

    const where = {
      isActive: true,
      ...(category
        ? {
            category: containsSafe(category),
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: containsSafe(q) },
              { description: containsSafe(q) },
              { category: containsSafe(q) },
              { fileName: containsSafe(q) },
            ].filter(Boolean),
          }
        : {}),
    };

    const items = await prisma.document.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ items });
  } catch (e) {
    console.error("[documents] public list error:", e);
    return res.status(500).json({ error: "Gagal memuat dokumen" });
  }
});

/**
 * =========================
 * ADMIN ONLY
 * Semua endpoint di bawah ini BUTUH SUPER_ADMIN
 * =========================
 */
router.use(requireAuth, allowRoles("SUPER_ADMIN"));

/**
 * GET /api/documents
 */
router.get("/", async (req, res) => {
  try {
    const q = s(req.query.q);
    const category = s(req.query.category);
    const includeInactive = toBool(req.query.includeInactive, false);

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category: containsSafe(category) } : {}),
      ...(q
        ? {
            OR: [
              { title: containsSafe(q) },
              { description: containsSafe(q) },
              { category: containsSafe(q) },
              { fileName: containsSafe(q) },
              { fileUrl: containsSafe(q) },
            ].filter(Boolean),
          }
        : {}),
    };

    const items = await prisma.document.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ items });
  } catch (e) {
    console.error("[documents] admin list error:", e);
    return res.status(500).json({ error: "Gagal memuat dokumen" });
  }
});

/**
 * POST /api/documents
 */
router.post("/", async (req, res) => {
  try {
    const title = s(req.body?.title);
    const fileUrl = s(req.body?.fileUrl);

    if (!title) return res.status(400).json({ error: "title wajib diisi" });
    if (!fileUrl) return res.status(400).json({ error: "fileUrl wajib diisi" });

    const data = {
      title,
      category: s(req.body?.category) || null,
      description: s(req.body?.description) || null,
      fileUrl,
      fileName: s(req.body?.fileName) || null,
      sortOrder: toInt(req.body?.sortOrder, 0),
      isActive: toBool(req.body?.isActive, true),
    };

    const created = await prisma.document.create({ data });
    return res.json({ item: created });
  } catch (e) {
    console.error("[documents] create error:", e);
    return res.status(500).json({ error: "Gagal membuat dokumen" });
  }
});

/**
 * PATCH /api/documents/:id
 * ✅ id diperlakukan sebagai STRING (cuid/uuid) agar aman.
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = s(req.params.id);
    if (!id) return res.status(400).json({ error: "Param id wajib" });

    const exists = await prisma.document.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Dokumen tidak ditemukan" });

    const data = {};
    if (req.body?.title !== undefined) data.title = s(req.body.title);
    if (req.body?.category !== undefined) data.category = s(req.body.category) || null;
    if (req.body?.description !== undefined) data.description = s(req.body.description) || null;
    if (req.body?.fileUrl !== undefined) data.fileUrl = s(req.body.fileUrl);
    if (req.body?.fileName !== undefined) data.fileName = s(req.body.fileName) || null;
    if (req.body?.sortOrder !== undefined) data.sortOrder = toInt(req.body.sortOrder, 0);
    if (req.body?.isActive !== undefined) data.isActive = toBool(req.body.isActive, true);

    if (data.title !== undefined && !data.title) {
      return res.status(400).json({ error: "title tidak boleh kosong" });
    }
    if (data.fileUrl !== undefined && !data.fileUrl) {
      return res.status(400).json({ error: "fileUrl tidak boleh kosong" });
    }

    const updated = await prisma.document.update({ where: { id }, data });
    return res.json({ item: updated });
  } catch (e) {
    console.error("[documents] update error:", e);
    return res.status(500).json({ error: "Gagal mengubah dokumen" });
  }
});

/**
 * DELETE /api/documents/:id  (soft delete -> isActive=false)
 * ✅ id STRING
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = s(req.params.id);
    if (!id) return res.status(400).json({ error: "Param id wajib" });

    const exists = await prisma.document.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Dokumen tidak ditemukan" });

    await prisma.document.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("[documents] delete error:", e);
    return res.status(500).json({ error: "Gagal menghapus dokumen" });
  }
});

module.exports = router;
