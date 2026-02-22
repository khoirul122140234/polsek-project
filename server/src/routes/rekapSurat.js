// server/src/routes/rekapSurat.js
const express = require("express");
const prisma = require("../prisma");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const router = express.Router();

/* =========================
   Utils
========================= */
function parseDateOnlyToUTC(dateStr) {
  // FE kirim "YYYY-MM-DD"
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // simpan sebagai UTC 00:00:00 agar konsisten
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
}

function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

/* =========================
   Auth + Roles
   Rekap biasanya ADMIN_KASIUM
========================= */
router.use(requireAuth, allowRoles("ADMIN_KASIUM", "SUPER_ADMIN"));

/* =========================
   GET /api/rekap-surat
   Query opsional:
   - bulan=01..12
   - tahun=2026
   - kepada=...
   - q=search (noSurat/perihal/kepada)
========================= */
router.get("/", async (req, res) => {
  try {
    const bulan = safeTrim(req.query.bulan);
    const tahun = safeTrim(req.query.tahun);
    const kepada = safeTrim(req.query.kepada);
    const q = safeTrim(req.query.q);

    const where = {};

    // filter kepada
    if (kepada) where.kepada = kepada;

    // filter bulan/tahun (tanggal DateTime)
    // Kita buat range [start, end)
    if (tahun) {
      const y = Number(tahun);
      if (!Number.isFinite(y) || y < 1900 || y > 3000) {
        return badRequest(res, "Query 'tahun' tidak valid.");
      }
      if (bulan) {
        const m = Number(bulan);
        if (!Number.isFinite(m) || m < 1 || m > 12) {
          return badRequest(res, "Query 'bulan' tidak valid.");
        }
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        where.tanggal = { gte: start, lt: end };
      } else {
        const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0));
        where.tanggal = { gte: start, lt: end };
      }
    }

    // search sederhana
    if (q) {
      where.OR = [
        { noSurat: { contains: q, mode: "insensitive" } },
        { kepada: { contains: q, mode: "insensitive" } },
        { perihal: { contains: q, mode: "insensitive" } },
        { disposisiKa: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.suratRekap.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { id: "desc" }],
      select: {
        id: true,
        tanggal: true,
        noSurat: true,
        kepada: true,
        perihal: true,
        disposisiKa: true,
        paraf: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ data: rows });
  } catch (e) {
    console.error("[rekap-surat][GET]", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =========================
   POST /api/rekap-surat
   Body:
   { tanggal:"YYYY-MM-DD", noSurat, kepada, perihal, disposisiKa? }
========================= */
router.post("/", async (req, res) => {
  try {
    const tanggalRaw = req.body?.tanggal;
    const noSurat = safeTrim(req.body?.noSurat);
    const kepada = safeTrim(req.body?.kepada);
    const perihal = safeTrim(req.body?.perihal);
    const disposisiKa = safeTrim(req.body?.disposisiKa);

    const tanggal = parseDateOnlyToUTC(tanggalRaw);
    if (!tanggal) return badRequest(res, "Field 'tanggal' wajib format YYYY-MM-DD.");
    if (!noSurat) return badRequest(res, "Field 'noSurat' wajib diisi.");
    if (!kepada) return badRequest(res, "Field 'kepada' wajib diisi.");
    if (!perihal) return badRequest(res, "Field 'perihal' wajib diisi.");

    const createdById = Number(req.user?.uid) || null;

    const created = await prisma.suratRekap.create({
      data: {
        tanggal,
        noSurat,
        kepada,
        perihal,
        disposisiKa: disposisiKa || null,
        paraf: null,
        createdById,
      },
      select: {
        id: true,
        tanggal: true,
        noSurat: true,
        kepada: true,
        perihal: true,
        disposisiKa: true,
        paraf: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ data: created });
  } catch (e) {
    console.error("[rekap-surat][POST]", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =========================
   PATCH /api/rekap-surat/:id
   Body boleh sebagian:
   { tanggal?, noSurat?, kepada?, perihal?, disposisiKa? }
========================= */
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return badRequest(res, "Param id tidak valid.");

    const payload = {};
    if (req.body?.tanggal !== undefined) {
      const d = parseDateOnlyToUTC(req.body.tanggal);
      if (!d) return badRequest(res, "Field 'tanggal' wajib format YYYY-MM-DD.");
      payload.tanggal = d;
    }
    if (req.body?.noSurat !== undefined) {
      const v = safeTrim(req.body.noSurat);
      if (!v) return badRequest(res, "Field 'noSurat' tidak boleh kosong.");
      payload.noSurat = v;
    }
    if (req.body?.kepada !== undefined) {
      const v = safeTrim(req.body.kepada);
      if (!v) return badRequest(res, "Field 'kepada' tidak boleh kosong.");
      payload.kepada = v;
    }
    if (req.body?.perihal !== undefined) {
      const v = safeTrim(req.body.perihal);
      if (!v) return badRequest(res, "Field 'perihal' tidak boleh kosong.");
      payload.perihal = v;
    }
    if (req.body?.disposisiKa !== undefined) {
      const v = safeTrim(req.body.disposisiKa);
      payload.disposisiKa = v ? v : null;
    }

    if (Object.keys(payload).length === 0) {
      return badRequest(res, "Tidak ada field yang diubah.");
    }

    const updated = await prisma.suratRekap.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        tanggal: true,
        noSurat: true,
        kepada: true,
        perihal: true,
        disposisiKa: true,
        paraf: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ data: updated });
  } catch (e) {
    // record tidak ada
    if (String(e?.code || "") === "P2025") {
      return res.status(404).json({ error: "Data tidak ditemukan." });
    }
    console.error("[rekap-surat][PATCH]", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* =========================
   DELETE /api/rekap-surat/:id
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return badRequest(res, "Param id tidak valid.");

    await prisma.suratRekap.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    if (String(e?.code || "") === "P2025") {
      return res.status(404).json({ error: "Data tidak ditemukan." });
    }
    console.error("[rekap-surat][DELETE]", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
