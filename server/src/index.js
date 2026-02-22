// server/src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const prisma = require("./prisma");

const app = express();
app.set("trust proxy", true);

// =================== Security & headers ===================
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

// =================== CORS ===================
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsMw = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // Postman/curl
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
});

app.use(corsMw);

// ✅ preflight OPTIONS aman
app.use((req, res, next) => {
  if (req.method !== "OPTIONS") return next();
  return corsMw(req, res, () => res.sendStatus(204));
});

// =================== Body parsers ===================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =================== Static uploads ===================
// ✅ Root uploads: <project_root>/uploads
const uploadsRoot = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });

// penting: file lampiran, gambar, pdf bisa dibuka lewat:
// http://localhost:4000/uploads/...
app.use(
  "/uploads",
  express.static(uploadsRoot, {
    fallthrough: false,
    // setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// =================== Routes ===================
const authRoutes = require("./routes/auth");
const pushRoutes = require("./routes/push");
const leaderProfiles = require("./routes/leaderProfiles");
const uploadRoutes = require("./routes/uploads");
const unitRoutes = require("./routes/units");
const anggotaRoutes = require("./routes/anggota");
const fasilitasRoutes = require("./routes/fasilitas");
const beritaRoutes = require("./routes/berita");
const edukasiRoutes = require("./routes/edukasi");

const suratRoutes = require("./routes/surat");
const laporanRoutes = require("./routes/laporan");

const usersRoutes = require("./routes/users");
const adminUsersRoutes = require("./routes/adminUsers");

const dashboardRoutes = require("./routes/dashboard");
const rekapSuratRoutes = require("./routes/rekapSurat");

// ✅ BARU: Dokumen (CRUD Admin)
const documentsRoutes = require("./routes/documents");

// ✅ BARU (Publik Dokumen) kalau sudah kamu buat tahap 2:
const publicDocumentsRoutes = require("./routes/publicDocuments");

app.use("/api/auth", authRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/leader-profiles", leaderProfiles);
app.use("/api/uploads", uploadRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/anggota", anggotaRoutes);
app.use("/api/fasilitas", fasilitasRoutes);
app.use("/api/berita", beritaRoutes);
app.use("/api/edukasi", edukasiRoutes);

app.use("/api/surat", suratRoutes);
app.use("/api/laporan", laporanRoutes);

app.use("/api/users", usersRoutes);
app.use("/api/admin", adminUsersRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rekap-surat", rekapSuratRoutes);

// ✅ BARU: CRUD dokumen (SUPER_ADMIN)
app.use("/api/documents", documentsRoutes);

// ✅ BARU: endpoint publik dokumen
app.use("/api/public", publicDocumentsRoutes);

// =================== Healthcheck ===================
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "down", error: String(e?.message || e) });
  }
});

// =================== 404 ===================
app.use((req, res, next) => {
  if (res.headersSent) return next();
  return res.status(404).json({ error: "Not found" });
});

// =================== Error handler ===================
app.use((err, _req, res, _next) => {
  console.error("[ERR]", err);
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

// =================== Start ===================
const PORT = process.env.PORT || 4000;
console.log("[ENV] DATABASE_URL =", process.env.DATABASE_URL);
console.log("[ENV] CORS_ORIGIN =", corsOrigins.join(", "));
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📂 Serving uploads from ${uploadsRoot}`);
});

// =================== Graceful shutdown ===================
async function shutdown() {
  try {
    console.log("\nShutting down...");
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
