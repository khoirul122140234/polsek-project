// server/src/routes/publicDocuments.js
const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

function absUrl(req, p) {
  const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  if (!host) return p;
  return `${proto}://${host}${p.startsWith("/") ? p : `/${p}`}`;
}

function s(v) {
  return String(v ?? "").trim();
}

/**
 * GET /api/public/documents
 * Query:
 * - q
 * - category
 */
router.get("/documents", async (req, res) => {
  try {
    const q = s(req.query.q);
    const category = s(req.query.category);

    const where = {
      isActive: true,
      ...(category
        ? {
            category: { contains: category, mode: "insensitive" },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { fileName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await prisma.document.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        fileUrl: true,
        fileName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category || "Umum",
      description: r.description || "",
      fileUrl: r.fileUrl || "",
      fileName: r.fileName || "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      absoluteUrl: r.fileUrl ? absUrl(req, r.fileUrl) : "",
    }));

    return res.json({ items });
  } catch (e) {
    console.error("[publicDocuments] error:", e);
    return res.status(500).json({ error: "Gagal memuat dokumen" });
  }
});

module.exports = router;
