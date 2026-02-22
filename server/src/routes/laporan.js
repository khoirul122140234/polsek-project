// server/src/routes/laporan.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const prisma = require("../prisma");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const router = express.Router();

/* =========================
   Upload (lampiran)
========================= */
const uploadDir = path.join(process.cwd(), "uploads", "pelaporan-online");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const base = `lampiran_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, base + ext.toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype);
    if (!ok) return cb(new Error("Tipe file harus JPG/PNG/PDF"));
    cb(null, true);
  },
});

/* =========================
   Utils
========================= */
function safeStr(v) {
  return String(v ?? "").trim();
}

function generateCode(prefix = "LPR", len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${out}`;
}

function isValidNik(nik) {
  return /^\d{16}$/.test(nik);
}
function isValidHp(hp) {
  return /^0\d{9,13}$/.test(hp);
}
function toDateOrThrow(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Tanggal tidak valid");
  return d;
}

// ✅ pembatasan wilayah (sesuai permintaan)
const KECAMATAN_ALLOWED = ["Tanjung Raja", "Sungai Pinang", "Rantau Panjang"];

/* ==========================================================
   PUBLIC: Submit Pelaporan Online
========================================================== */
router.post("/pelaporan-online", (req, res) => {
  // bungkus upload supaya error multer rapi (mis. file terlalu besar / mimetype)
  upload.single("lampiran")(req, res, async (err) => {
    try {
      if (err) {
        const msg = err?.message || "Gagal upload lampiran";
        // multer file too large
        if (String(err.code) === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Ukuran lampiran maksimal 6MB" });
        }
        return res.status(400).json({ error: msg });
      }

      const nama = safeStr(req.body.nama);
      const nik = safeStr(req.body.nik);
      const hp = safeStr(req.body.hp);

      // ✅ BARU: kecamatan (wajib & dibatasi)
      const kecamatan = safeStr(req.body.kecamatan);

      const jenis = safeStr(req.body.jenis);
      const lokasi = safeStr(req.body.lokasi);
      const tanggalStr = safeStr(req.body.tanggal);
      const jam = safeStr(req.body.jam);
      const kronologi = safeStr(req.body.kronologi);

      if (!nama) return res.status(400).json({ error: "Nama wajib diisi" });
      if (!isValidNik(nik)) return res.status(400).json({ error: "NIK harus 16 digit" });
      if (!isValidHp(hp)) return res.status(400).json({ error: "No HP tidak valid" });

      // ✅ wilayah
      if (!kecamatan) return res.status(400).json({ error: "Kecamatan wajib dipilih" });
      if (!KECAMATAN_ALLOWED.includes(kecamatan)) {
        return res.status(403).json({
          error:
            "Pengajuan hanya untuk wilayah Polsek Tanjung Raja (Kecamatan Tanjung Raja, Sungai Pinang, Rantau Panjang).",
        });
      }

      if (!jenis) return res.status(400).json({ error: "Jenis laporan wajib dipilih" });
      if (!lokasi || lokasi.length < 10) return res.status(400).json({ error: "Lokasi terlalu singkat" });
      if (!tanggalStr) return res.status(400).json({ error: "Tanggal wajib diisi" });
      if (!jam) return res.status(400).json({ error: "Jam wajib diisi" });
      if (!kronologi) return res.status(400).json({ error: "Kronologi wajib diisi" });

      const tanggal = toDateOrThrow(tanggalStr);

      let code = generateCode("LPR", 10);
      for (let i = 0; i < 10; i++) {
        const exists = await prisma.onlineReport.findUnique({ where: { code } });
        if (!exists) break;
        code = generateCode("LPR", 10);
      }

      const lampiranPath = req.file ? `/uploads/pelaporan-online/${req.file.filename}` : null;

      // ⚠️ NOTE:
      // Agar `kecamatan` bisa disimpan, model OnlineReport perlu ada field `kecamatan String?`
      // Kalau belum ada di schema, baris `kecamatan` di bawah harus dihapus sementara.
      const created = await prisma.onlineReport.create({
        data: {
          code,
          nama,
          nik,
          hp,

          // ✅ simpan kecamatan (jika sudah ada fieldnya di Prisma)
          // kecamatan,

          jenis,
          lokasi,
          tanggal,
          jam,
          kronologi,
          lampiranPath,
        },
      });

      return res.json({ ok: true, id: created.id, code: created.code, status: created.status });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Gagal submit pelaporan" });
    }
  });
});

/* ==========================================================
   PUBLIC: Cek Status
========================================================== */
router.get("/pelaporan-online/status", async (req, res) => {
  try {
    const code = safeStr(req.query.code);
    if (!code) return res.status(400).json({ error: "code wajib" });

    const row = await prisma.onlineReport.findUnique({ where: { code } });
    if (!row) return res.status(404).json({ error: "Kode tidak ditemukan" });

    return res.json({ ok: true, data: row });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Gagal cek status" });
  }
});

/* ==========================================================
   ADMIN: List
========================================================== */
router.get(
  "/admin/pelaporan-online",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_SPKT", "ADMIN_KASIUM", "ADMIN_INTELKAM"),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || "50", 10)));
      const skip = (page - 1) * limit;

      const q = safeStr(req.query.q);
      const jenis = safeStr(req.query.jenis);
      const month = safeStr(req.query.month);
      const year = safeStr(req.query.year);

      const where = {};

      if (q) {
        where.OR = [
          { code: { contains: q, mode: "insensitive" } },
          { nama: { contains: q, mode: "insensitive" } },
          { nik: { contains: q, mode: "insensitive" } },
          { hp: { contains: q, mode: "insensitive" } },
          { lokasi: { contains: q, mode: "insensitive" } },
          { kronologi: { contains: q, mode: "insensitive" } },
        ];
      }

      if (jenis) where.jenis = jenis;

      if (year || month) {
        const yy = year ? parseInt(year, 10) : new Date().getFullYear();
        const mm = month ? parseInt(month, 10) : null;

        let start, end;
        if (mm) {
          start = new Date(yy, mm - 1, 1, 0, 0, 0);
          end = new Date(yy, mm, 1, 0, 0, 0);
        } else {
          start = new Date(yy, 0, 1, 0, 0, 0);
          end = new Date(yy + 1, 0, 1, 0, 0, 0);
        }
        where.tanggal = { gte: start, lt: end };
      }

      const [total, rows] = await Promise.all([
        prisma.onlineReport.count({ where }),
        prisma.onlineReport.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      return res.json({ ok: true, page, limit, total, rows, data: rows });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Gagal ambil data admin" });
    }
  }
);

/* ==========================================================
   ADMIN: Update status
========================================================== */
router.patch(
  "/admin/pelaporan-online/:id/status",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_SPKT", "ADMIN_KASIUM", "ADMIN_INTELKAM"),
  async (req, res) => {
    try {
      const id = req.params.id;
      const status = safeStr(req.body.status);
      const statusFeedback = safeStr(req.body.statusFeedback);

      const allowed = ["BARU", "DIPROSES", "SELESAI", "DITOLAK"];
      if (!allowed.includes(status)) return res.status(400).json({ error: "Status tidak valid" });

      const updated = await prisma.onlineReport.update({
        where: { id },
        data: { status, statusFeedback },
      });

      return res.json({ ok: true, data: updated });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Gagal update status" });
    }
  }
);

/* ==========================================================
   ADMIN: Delete
========================================================== */
router.delete(
  "/admin/pelaporan-online/:id",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_SPKT", "ADMIN_KASIUM", "ADMIN_INTELKAM"),
  async (req, res) => {
    try {
      const id = req.params.id;

      const row = await prisma.onlineReport.findUnique({ where: { id } });
      if (!row) return res.status(404).json({ error: "Data tidak ditemukan" });

      if (row.lampiranPath) {
        const abs = path.join(process.cwd(), row.lampiranPath.replace(/^\//, ""));
        if (fs.existsSync(abs)) {
          try {
            fs.unlinkSync(abs);
          } catch {}
        }
      }

      await prisma.onlineReport.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Gagal hapus data" });
    }
  }
);

module.exports = router;
