// server/src/middlewares/auth.middlewares.js
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

/**
 * Ambil token dari:
 * - Authorization: Bearer <token>
 * - Cookie: token
 */
function getTokenFromReq(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const bearer =
    typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : null;

  const cookieToken = req.cookies?.token || null;

  return bearer || cookieToken || null;
}

/**
 * Middleware: Wajib login
 * ✅ req.user dibuat lengkap agar cocok dengan Dashboard.jsx
 */
const requireAuth = async (req, res, next) => {
  const token = getTokenFromReq(req);

  if (!token) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="api"');
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("[AUTH] JWT_SECRET belum di-set");
    return res.status(500).json({ error: "Konfigurasi server belum lengkap." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    const uidRaw = decoded.uid ?? decoded.userId ?? decoded.id;
    const uid = Number(uidRaw);

    if (!Number.isFinite(uid) || uid <= 0) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer error="invalid_token", error_description="bad_uid"'
      );
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ select lengkap agar FE bisa simpan user lengkap
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        name: true,
        nrp: true,
        pangkat: true,
        satuan: true,
        avatarUrl: true,

        // ✅ Profil TTD (IZIN)
        ttdJabatan: true,
        ttdNama: true,
        ttdPangkat: true,
        ttdNrp: true,

        // ✅ BARU: Profil STPLK (KA SPKT)
        stplkLabel: true,
        stplkJabatan: true,
        stplkNama: true,
        stplkPangkat: true,
        stplkNrp: true,
      },
    });

    if (!user) {
      res.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.isActive === false) {
      res.setHeader(
        "WWW-Authenticate",
        'Bearer error="invalid_token", error_description="inactive_user"'
      );
      return res.status(403).json({ error: "Akun dinonaktifkan. Hubungi Super Admin." });
    }

    req.user = {
      uid: user.id,
      role: user.role,
      email: user.email ?? null,

      name: user.name ?? null,
      nrp: user.nrp ?? null,
      pangkat: user.pangkat ?? null,
      satuan: user.satuan ?? null,
      avatarUrl: user.avatarUrl ?? null,

      // ✅ Profil TTD (IZIN)
      ttdJabatan: user.ttdJabatan ?? null,
      ttdNama: user.ttdNama ?? null,
      ttdPangkat: user.ttdPangkat ?? null,
      ttdNrp: user.ttdNrp ?? null,

      // ✅ BARU: Profil STPLK (KA SPKT)
      stplkLabel: user.stplkLabel ?? null,
      stplkJabatan: user.stplkJabatan ?? null,
      stplkNama: user.stplkNama ?? null,
      stplkPangkat: user.stplkPangkat ?? null,
      stplkNrp: user.stplkNrp ?? null,

      raw: decoded,
    };

    return next();
  } catch (err) {
    const isExpired =
      err &&
      (err.name === "TokenExpiredError" ||
        String(err.message || "").toLowerCase().includes("jwt expired"));

    res.setHeader(
      "WWW-Authenticate",
      isExpired
        ? 'Bearer error="invalid_token", error_description="token_expired"'
        : 'Bearer error="invalid_token"'
    );

    return res.status(401).json({ error: "Unauthorized" });
  }
};

/**
 * Middleware: Batasi role (case-insensitive)
 */
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!roles || roles.length === 0) return next();

  const userRole = String(req.user.role || "").toUpperCase().trim();
  const allowed = roles.map((r) => String(r || "").toUpperCase().trim());

  if (!allowed.includes(userRole)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return next();
};

module.exports = { requireAuth, allowRoles };
