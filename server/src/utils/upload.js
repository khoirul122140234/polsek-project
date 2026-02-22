// server/src/utils/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Simpan file ke <project_root>/uploads/surat
const uploadDir = path.join(process.cwd(), "uploads", "surat");

// pastikan folder ada
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || "file")
      .replace(/[^a-zA-Z0-9_.-]/g, "_")
      .slice(-120); // biar tidak kepanjangan
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Tipe file tidak didukung. Gunakan JPG/PNG/PDF"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // maksimal 5 file per request (kalau pakai .array di route)
  },
});
