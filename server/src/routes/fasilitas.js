// server/src/routes/fasilitas.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

// ====== PUBLIC ======
// GET list (optional ?q=, ?limit=, ?offset=)
router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const take = Math.min(Number(req.query.limit) || 1000, 1000);
  const skip = Math.max(Number(req.query.offset) || 0, 0);

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const rows = await prisma.facility.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take,
    skip,
  });

  res.json(rows);
});

// GET detail
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.facility.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// ====== ADMIN ======
// ✅ FIX Forbidden: role harus cocok dengan role di DB (mis: SUPER_ADMIN, ADMIN_INTELKAM, ADMIN_SPKT, dst)
const guard = [
  requireAuth,
  allowRoles(
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR",
    "ADMIN_INTELKAM",
    "ADMIN_SPKT"
  ),
];

// CREATE
router.post("/", guard, async (req, res) => {
  const { title, description, image } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title wajib diisi" });
  if (!description?.trim()) return res.status(400).json({ error: "description wajib diisi" });

  const maxOrder = await prisma.facility.aggregate({
    _max: { sortOrder: true },
  });

  const created = await prisma.facility.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      image: image ? String(image).trim() : null,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
  });

  res.json(created);
});

// UPDATE
router.put("/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, image, sortOrder } = req.body || {};

  for (const [k, v] of Object.entries({ title, description })) {
    if (!v || typeof v !== "string" || !v.trim()) {
      return res.status(400).json({ error: `${k} wajib diisi` });
    }
  }

  try {
    const updated = await prisma.facility.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        image: image ? String(image).trim() : null,
        ...(typeof sortOrder === "number" ? { sortOrder } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

// DELETE
router.delete("/:id", guard, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.facility.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: "Not found" });
  }
});

module.exports = router;