// server/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

function mustEnv(name) {
  if (!process.env[name]) {
    throw new Error(`[AUTH] Missing env: ${name}`);
  }
  return process.env[name];
}

const JWT_SECRET = mustEnv("JWT_SECRET");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { token, user: { id, name, email, role, isActive } }
 */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Email tidak terdaftar." });
    }

    if (user.isActive === false) {
      return res
        .status(403)
        .json({ error: "Akun dinonaktifkan. Hubungi Super Admin." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Password salah." });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("[LOGIN] error:", err);
    return res.status(500).json({ error: "Kesalahan server." });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Return: { authenticated, user? }
 */
router.get("/me", async (req, res) => {
  try {
    const h = req.headers.authorization || "";
    const bearer = h.startsWith("Bearer ") ? h.slice(7) : null;
    const rawToken = bearer || req.cookies?.token || null;

    if (!rawToken) return res.json({ authenticated: false });

    const decoded = jwt.verify(rawToken, JWT_SECRET);
    const uid = decoded.uid ?? decoded.userId ?? decoded.id;

    if (!uid) return res.json({ authenticated: false });

    const user = await prisma.user.findUnique({
      where: { id: Number(uid) }, // ✅ FIX: Prisma Int
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) return res.json({ authenticated: false });

    if (user.isActive === false) {
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (_req, res) => {
  return res.json({ ok: true });
});

module.exports = router;