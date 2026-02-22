// server/src/routes/berita.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

/* ===================== Helpers ===================== */
const MAX_IMAGES = 5;

const toInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));

/** Normalisasi array images agar selalu array string (maks 5) */
const sanitizeImages = (value) => {
  let arr = [];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string") {
    // support kiriman string dipisah koma (kalau ada)
    arr = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    arr = [];
  }

  return arr
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, MAX_IMAGES); // ✅ WAS 3, NOW 5
};

/** Pastikan response selalu punya images (array) dan image (pertama) */
const normalizeRow = (row) => {
  if (!row) return row;

  const images = Array.isArray(row.images)
    ? row.images.filter((s) => typeof s === "string" && s.trim()).slice(0, MAX_IMAGES)
    : [];

  return { ...row, images, image: row.image || images[0] || null };
};

const noStore = (res) => res.set("Cache-Control", "no-store");

/* ===================== List & Detail ===================== */
/**
 * GET /api/berita
 * Query:
 *  - q        : string (search judul/slug/excerpt)
 *  - month    : 1..12
 *  - year     : YYYY
 *  - sort     : 'terbaru' | 'populer' (default: terbaru)
 *  - page     : default 1
 *  - limit    : default 50
 */
router.get("/", async (req, res) => {
  const { q = "", month, year, sort = "terbaru", page = "1", limit = "50" } = req.query;

  const take = clamp(toInt(limit, 50), 1, 200);
  const pageNum = Math.max(toInt(page, 1), 1);
  const skip = (pageNum - 1) * take;

  const m = toInt(month, 0);
  const y = toInt(year, 0);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: String(q), mode: "insensitive" } },
              { slug: { contains: String(q), mode: "insensitive" } },
              { excerpt: { contains: String(q), mode: "insensitive" } },
            ],
          }
        : {},
      m && y
        ? { date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } }
        : y
        ? { date: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } }
        : {},
    ],
  };

  // Populer: popularity -> viewCount -> shareCount -> date -> id
  const orderBy =
    String(sort).toLowerCase() === "populer"
      ? [
          { popularity: "desc" },
          { viewCount: "desc" },
          { shareCount: "desc" },
          { date: "desc" },
          { id: "desc" },
        ]
      : [{ date: "desc" }, { id: "desc" }];

  try {
    const [rawItems, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          slug: true,
          title: true,
          date: true,
          image: true,
          images: true,
          excerpt: true,
          popularity: true,
          viewCount: true,
          shareCount: true,
          sharedBy: { select: { id: true, name: true, email: true } },
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.news.count({ where }),
    ]);

    const items = rawItems.map(normalizeRow);
    res.json({
      items,
      page: pageNum,
      limit: take,
      total,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  } catch (e) {
    console.error("GET /berita error", e);
    res.status(500).json({ error: "Gagal memuat data berita" });
  }
});

/** GET /api/berita/id/:id */
router.get("/id/:id", async (req, res) => {
  const id = toInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });
  try {
    const row = await prisma.news.findUnique({
      where: { id },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(normalizeRow(row));
  } catch (e) {
    console.error("GET /berita/id/:id error", e);
    res.status(500).json({ error: "Gagal memuat detail berita" });
  }
});

/** GET /api/berita/:slug */
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const row = await prisma.news.findUnique({
      where: { slug },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(normalizeRow(row));
  } catch (e) {
    console.error("GET /berita/:slug error", e);
    res.status(500).json({ error: "Gagal memuat detail berita" });
  }
});

/* ===================== Mutasi (SUPER ADMIN saja) ===================== */
/** POST /api/berita */
router.post("/", requireAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  try {
    const { title, slug, date, image, images, excerpt, content, popularity } = req.body || {};
    const must = { title, slug, date, excerpt, content };

    for (const [k, v] of Object.entries(must)) {
      if (!v || typeof v !== "string" || !v.trim()) {
        return res.status(400).json({ error: `${k} wajib diisi` });
      }
    }
    if (!isIsoDate(date)) return res.status(400).json({ error: "Format tanggal tidak valid" });

    const imagesArr = sanitizeImages(images);
    const firstImage = (imagesArr[0] || image || null) ?? null;

    const created = await prisma.news.create({
      data: {
        title: String(title).trim(),
        slug: String(slug).trim().toLowerCase(),
        date: new Date(date),
        image: firstImage ? String(firstImage) : null,
        images: imagesArr, // ✅ sekarang bisa sampai 5
        excerpt: String(excerpt).trim(),
        content: String(content).trim(),
        popularity: typeof popularity === "number" ? popularity : toInt(popularity, 0),
        viewCount: 0,
        shareCount: 0,
        sharedByUserId: null,
      },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(normalizeRow(created));
  } catch (e) {
    console.error("POST /berita error", e);
    if (e?.code === "P2002") return res.status(409).json({ error: "Slug sudah digunakan" });
    res.status(500).json({ error: "Gagal menyimpan berita" });
  }
});

/** PUT /api/berita/:id */
router.put("/:id", requireAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  const id = toInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });

  const { title, slug, date, image, images, excerpt, content, popularity } = req.body || {};
  const must = { title, slug, date, excerpt, content };

  for (const [k, v] of Object.entries(must)) {
    if (!v || typeof v !== "string" || !v.trim()) {
      return res.status(400).json({ error: `${k} wajib diisi` });
    }
  }
  if (!isIsoDate(date)) return res.status(400).json({ error: "Format tanggal tidak valid" });

  try {
    const imagesArr = sanitizeImages(images);
    const firstImage = (imagesArr[0] || image || null) ?? null;

    const updated = await prisma.news.update({
      where: { id },
      data: {
        title: String(title).trim(),
        slug: String(slug).trim().toLowerCase(),
        date: new Date(date),
        image: firstImage ? String(firstImage) : null,
        images: imagesArr, // ✅ sekarang bisa sampai 5
        excerpt: String(excerpt).trim(),
        content: String(content).trim(),
        popularity: typeof popularity === "number" ? popularity : toInt(popularity, 0),
      },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });

    res.json(normalizeRow(updated));
  } catch (e) {
    console.error("PUT /berita/:id error", e);
    if (e?.code === "P2002") return res.status(409).json({ error: "Slug sudah digunakan" });
    if (e?.code === "P2025") return res.status(404).json({ error: "Berita tidak ditemukan" });
    res.status(500).json({ error: "Gagal memperbarui berita" });
  }
});

/** DELETE /api/berita/:id */
router.delete("/:id", requireAuth, allowRoles("SUPER_ADMIN"), async (req, res) => {
  const id = toInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });
  try {
    await prisma.news.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /berita/:id error", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Berita tidak ditemukan" });
    res.status(500).json({ error: "Gagal menghapus berita" });
  }
});

/* ===================== Counters ===================== */
/** POST /api/berita/:slug/view (publik) */
router.post("/:slug/view", async (req, res) => {
  const { slug } = req.params;
  try {
    const updated = await prisma.news.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
      select: { id: true, slug: true, viewCount: true },
    });
    noStore(res);
    res.json(updated);
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    console.error("POST /berita/:slug/view error", e);
    res.status(500).json({ error: "Gagal update view" });
  }
});

/**
 * POST /api/berita/:slug/share (publik)
 * - Jika ada user (mis. lewat middleware auth global), simpan sharedByUserId.
 * - Jika tidak ada user, tetap increment shareCount.
 */
router.post("/:slug/share", async (req, res) => {
  const { slug } = req.params;
  try {
    const updated = await prisma.news.update({
      where: { slug },
      data: {
        shareCount: { increment: 1 },
        ...(req.user?.uid ? { sharedByUserId: req.user.uid } : {}),
      },
      include: { sharedBy: { select: { id: true, name: true, email: true } } },
    });
    noStore(res);
    res.json(normalizeRow(updated));
  } catch (e) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    console.error("POST /berita/:slug/share error", e);
    res.status(500).json({ error: "Gagal update share" });
  }
});

/** ALIAS: POST /api/berita/:slug/share-public (publik, backward-compat) */
router.post("/:slug/share-public", async (req, res) => {
  req.url = req.url.replace("/share-public", "/share");
  return router.handle(req, res);
});

module.exports = router;