// server/src/routes/uploads.js
const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");

const router = express.Router();

// ✅ simpan gambar ke <project_root>/uploads/images
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "images");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * NOTE:
 * - pakai memoryStorage supaya bisa diproses sharp dulu
 * - limit: 3MB/file, max 5 file/request
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB per file
    files: 5, // max 5 files per request
  },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/.test(file.mimetype);
    if (!ok) return cb(new Error("Format file tidak didukung (hanya JPG/PNG/WEBP)"));
    cb(null, true);
  },
});

const guessExt = (m) => (m === "image/png" ? "png" : m === "image/webp" ? "webp" : "jpg");

/**
 * Simpan 1 file:
 * - resize width 1200 (lebih bagus untuk banner)
 * - compress jpg/webp
 * - preserve ratio
 */
async function saveOne(buffer, mimetype) {
  const ext = guessExt(mimetype);

  // nama file aman + unik
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const savePath = path.join(UPLOAD_DIR, filename);

  let pipeline = sharp(buffer).rotate(); // rotate berdasarkan EXIF

  // resize hanya jika lebih besar
  pipeline = pipeline.resize({
    width: 1200,
    withoutEnlargement: true,
  });

  // output sesuai ext
  if (ext === "png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (ext === "webp") {
    pipeline = pipeline.webp({ quality: 82 });
  } else {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  }

  await pipeline.toFile(savePath);

  // ✅ URL mengikuti folder images
  const url = `/uploads/images/${filename}`;
  return { url, path: url, filename };
}

/**
 * Helper: handle error multer (limit file size, dll)
 */
function multerErrorHandler(err, _req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Ukuran file terlalu besar (maks 3MB per gambar)" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Terlalu banyak file (maks 5 gambar per upload)" });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  return res.status(400).json({ error: err.message || "Upload error" });
}

/**
 * ✅ MULTI UPLOAD (GAMBAR)
 * POST /uploads/image
 * - SUPER_ADMIN saja
 * - field name: "file"
 * - max 5 files
 */
router.post(
  "/image",
  requireAuth,
  allowRoles("SUPER_ADMIN"),
  upload.array("file", 5),
  multerErrorHandler,
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({
          error: "Minimal 1 file gambar wajib diunggah pada field 'file'",
        });
      }

      const saved = [];
      for (const f of files.slice(0, 5)) {
        const one = await saveOne(f.buffer, f.mimetype);
        saved.push(one);
      }

      const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();

      return res.json({
        url: saved[0]?.url || null,
        path: saved[0]?.path || null,
        items: saved.map((x) => ({
          ...x,
          absoluteUrl: host ? `${proto}://${host}${x.url}` : x.url,
        })),
      });
    } catch (e) {
      console.error("[upload] error:", e);
      return res.status(500).json({ error: "Gagal mengunggah gambar" });
    }
  }
);

/* =========================================================
   ✅ BARU: UPLOAD DOKUMEN (PDF/DOC/DOCX)
   POST /uploads/document
   - SUPER_ADMIN saja
   - field name: "file" (single)
   - simpan: <project_root>/uploads/docs
========================================================= */
const DOC_DIR = path.join(process.cwd(), "uploads", "docs");
fs.mkdirSync(DOC_DIR, { recursive: true });

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DOC_DIR),
    filename: (_req, file, cb) => {
      const raw = String(file.originalname || "document");
      const safe = raw.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(-140);
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}_${safe}`);
    },
  }),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!ok) {
      return cb(new Error("Format dokumen harus PDF/DOC/DOCX"), false);
    }
    cb(null, true);
  },
});

router.post(
  "/document",
  requireAuth,
  allowRoles("SUPER_ADMIN"),
  uploadDoc.single("file"),
  (err, _req, res, next) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Ukuran file terlalu besar (maks 15MB)" });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    return res.status(400).json({ error: err.message || "Upload error" });
  },
  async (req, res) => {
    try {
      const f = req.file;
      if (!f) return res.status(400).json({ error: "File dokumen wajib diunggah pada field 'file'" });

      const url = `/uploads/docs/${f.filename}`;

      const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();

      return res.json({
        url,
        path: url,
        filename: f.filename,
        originalName: f.originalname,
        mime: f.mimetype,
        size: f.size,
        absoluteUrl: host ? `${proto}://${host}${url}` : url,
      });
    } catch (e) {
      console.error("[upload-document] error:", e);
      return res.status(500).json({ error: "Gagal mengunggah dokumen" });
    }
  }
);

module.exports = router;
