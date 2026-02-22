// server/src/middlewares/uploads.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// simpan ke <server>/uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    // nama aman (tanpa spasi)
    const safeName = `file-${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

/**
 * filter default: terima gambar saja (png/jpg/jpeg/webp)
 * Kalau kamu mau juga menerima pdf/doc, bilang nanti kita perluas.
 */
function fileFilter(_req, file, cb) {
  const ok = /image\/(png|jpeg|jpg|webp)/.test(file.mimetype);
  cb(ok ? null : new Error("Format file harus gambar (png/jpg/jpeg/webp)"), ok);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { upload };
