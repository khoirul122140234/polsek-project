// server/src/routes/dashboard.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middlewares/auth.middlewares");

const prisma = new PrismaClient();
const router = express.Router();

/* =====================================================
   Role access
   - SUPER_ADMIN: semuanya
   - ADMIN_INTELKAM: izin
   - ADMIN_SPKT: tk + pelaporan
   - ADMIN_KASIUM: keseluruhan (rekap)
===================================================== */
function getAccessByRole(roleRaw) {
  const role = String(roleRaw || "").toUpperCase().trim();

  const all = { izin: true, tk: true, pelaporan: true, keseluruhan: true };
  if (role === "SUPER_ADMIN") return all;

  if (role === "ADMIN_INTELKAM") return { izin: true, tk: false, pelaporan: false, keseluruhan: true };
  if (role === "ADMIN_SPKT") return { izin: false, tk: true, pelaporan: true, keseluruhan: true };
  if (role === "ADMIN_KASIUM") return { izin: false, tk: false, pelaporan: false, keseluruhan: true };

  // fallback: kalau role tidak dikenal, paling aman hanya keseluruhan
  return { izin: false, tk: false, pelaporan: false, keseluruhan: true };
}

/* =====================================================
   Helpers: WIB (Asia/Jakarta) without deps
===================================================== */
const JAKARTA_OFFSET_MIN = 7 * 60;
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function getJakartaTodayRangeUtc() {
  const now = new Date();
  const shifted = new Date(now.getTime() + JAKARTA_OFFSET_MIN * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);

  const startUtc = new Date(shifted.getTime() - JAKARTA_OFFSET_MIN * 60_000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000);
  return [startUtc, endUtc];
}
function getJakartaDayRangeUtc(dayOffset = 0) {
  const [startTodayUtc] = getJakartaTodayRangeUtc();
  const startUtc = new Date(startTodayUtc.getTime() - dayOffset * 24 * 60 * 60_000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000);
  return [startUtc, endUtc];
}
const ID_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
function labelForRangeStartWib(startUtc) {
  const wib = new Date(startUtc.getTime() + JAKARTA_OFFSET_MIN * 60_000);
  const d = String(wib.getUTCDate()).padStart(2, "0");
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const dayName = ID_DAYS[wib.getUTCDay()];
  return `${dayName} ${d}/${m}`;
}

async function countLetter({ type, where = {} }) {
  return prisma.letterApplication.count({ where: { type, ...where } });
}
async function countReport({ where = {} }) {
  return prisma.onlineReport.count({ where: { ...where } });
}

/* =====================================================
   GET /api/dashboard/stats
===================================================== */
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const access = getAccessByRole(req.user?.role);
    const [startUtc, endUtc] = getJakartaTodayRangeUtc();

    // default 0
    let izinTotal = 0, izinToday = 0, izinSelesaiToday = 0;
    let tkTotal = 0, tkToday = 0, tkSelesaiToday = 0;
    let pelTotal = 0, pelToday = 0, pelSelesaiToday = 0;

    const tasks = [];

    if (access.izin) {
      tasks.push(
        countLetter({ type: "IZIN_KERAMAIAN" }).then((v) => (izinTotal = v)),
        countLetter({ type: "IZIN_KERAMAIAN", where: { createdAt: { gte: startUtc, lt: endUtc } } }).then(
          (v) => (izinToday = v)
        ),
        countLetter({ type: "IZIN_KERAMAIAN", where: { status: "SELESAI", updatedAt: { gte: startUtc, lt: endUtc } } }).then(
          (v) => (izinSelesaiToday = v)
        )
      );
    }

    if (access.tk) {
      tasks.push(
        countLetter({ type: "TANDA_KEHILANGAN" }).then((v) => (tkTotal = v)),
        countLetter({ type: "TANDA_KEHILANGAN", where: { createdAt: { gte: startUtc, lt: endUtc } } }).then(
          (v) => (tkToday = v)
        ),
        countLetter({ type: "TANDA_KEHILANGAN", where: { status: "SELESAI", updatedAt: { gte: startUtc, lt: endUtc } } }).then(
          (v) => (tkSelesaiToday = v)
        )
      );
    }

    if (access.pelaporan) {
      tasks.push(
        countReport({}).then((v) => (pelTotal = v)),
        countReport({ where: { createdAt: { gte: startUtc, lt: endUtc } } }).then((v) => (pelToday = v)),
        countReport({ where: { status: "SELESAI", updatedAt: { gte: startUtc, lt: endUtc } } }).then((v) => (pelSelesaiToday = v))
      );
    }

    await Promise.all(tasks);

    const keseluruhanTotal = izinTotal + tkTotal + pelTotal;
    const keseluruhanToday = izinToday + tkToday + pelToday;

    return res.json({
      ok: true,
      tz: "Asia/Jakarta",
      access,
      todayRangeUtc: { start: startUtc.toISOString(), end: endUtc.toISOString() },
      stats: {
        izin: { total: izinTotal, today: izinToday, selesai: izinSelesaiToday },
        tk: { total: tkTotal, today: tkToday, selesai: tkSelesaiToday },
        pelaporan: { total: pelTotal, today: pelToday, selesai: pelSelesaiToday },
        keseluruhan: { total: keseluruhanTotal, today: keseluruhanToday },
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Gagal menghitung dashboard stats" });
  }
});

/* =====================================================
   GET /api/dashboard/trends?days=7
   (points tetap ada, tapi category yg tidak boleh -> 0)
===================================================== */
router.get("/trends", requireAuth, async (req, res) => {
  try {
    const access = getAccessByRole(req.user?.role);

    const daysRaw = Number(req.query.days ?? 7);
    const days = clamp(Number.isFinite(daysRaw) ? daysRaw : 7, 1, 30);

    const offsets = Array.from({ length: days }, (_, i) => days - 1 - i);

    const points = [];
    for (const off of offsets) {
      const [startUtc, endUtc] = getJakartaDayRangeUtc(off);

      let izin = 0, tk = 0, pelaporan = 0;

      const tasks = [];
      if (access.izin) {
        tasks.push(
          countLetter({ type: "IZIN_KERAMAIAN", where: { createdAt: { gte: startUtc, lt: endUtc } } }).then((v) => (izin = v))
        );
      }
      if (access.tk) {
        tasks.push(
          countLetter({ type: "TANDA_KEHILANGAN", where: { createdAt: { gte: startUtc, lt: endUtc } } }).then((v) => (tk = v))
        );
      }
      if (access.pelaporan) {
        tasks.push(
          countReport({ where: { createdAt: { gte: startUtc, lt: endUtc } } }).then((v) => (pelaporan = v))
        );
      }

      await Promise.all(tasks);

      const total = izin + tk + pelaporan;

      points.push({
        label: labelForRangeStartWib(startUtc),
        izin,
        tk,
        pelaporan,
        total,
      });
    }

    return res.json({ ok: true, tz: "Asia/Jakarta", access, days, points });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Gagal menghitung dashboard trends" });
  }
});

/* =====================================================
   GET /api/dashboard/action-needed
   (category yg tidak boleh -> 0)
===================================================== */
router.get("/action-needed", requireAuth, async (req, res) => {
  try {
    const access = getAccessByRole(req.user?.role);
    const overdueDays = clamp(Number(req.query.overdueDays ?? 2), 1, 14);

    const now = new Date();
    const cutoff = new Date(now.getTime() - overdueDays * 24 * 60 * 60_000);

    // default 0
    let izinPending = 0, izinVerified = 0, izinRejected = 0, izinOverdue = 0;
    let tkPending = 0, tkVerified = 0, tkRejected = 0, tkOverdue = 0;
    let pelPending = 0, pelVerified = 0, pelRejected = 0, pelOverdue = 0;

    const tasks = [];

    if (access.izin) {
      tasks.push(
        countLetter({ type: "IZIN_KERAMAIAN", where: { status: "DIAJUKAN" } }).then((v) => (izinPending = v)),
        countLetter({ type: "IZIN_KERAMAIAN", where: { status: "DIVERIFIKASI" } }).then((v) => (izinVerified = v)),
        countLetter({ type: "IZIN_KERAMAIAN", where: { status: "DITOLAK" } }).then((v) => (izinRejected = v)),
        countLetter({
          type: "IZIN_KERAMAIAN",
          where: { status: { in: ["DIAJUKAN", "DIVERIFIKASI"] }, createdAt: { lt: cutoff } },
        }).then((v) => (izinOverdue = v))
      );
    }

    if (access.tk) {
      tasks.push(
        countLetter({ type: "TANDA_KEHILANGAN", where: { status: "DIAJUKAN" } }).then((v) => (tkPending = v)),
        countLetter({ type: "TANDA_KEHILANGAN", where: { status: "DIVERIFIKASI" } }).then((v) => (tkVerified = v)),
        countLetter({ type: "TANDA_KEHILANGAN", where: { status: "DITOLAK" } }).then((v) => (tkRejected = v)),
        countLetter({
          type: "TANDA_KEHILANGAN",
          where: { status: { in: ["DIAJUKAN", "DIVERIFIKASI"] }, createdAt: { lt: cutoff } },
        }).then((v) => (tkOverdue = v))
      );
    }

    if (access.pelaporan) {
      tasks.push(
        countReport({ where: { status: "BARU" } }).then((v) => (pelPending = v)),
        countReport({ where: { status: "DIPROSES" } }).then((v) => (pelVerified = v)),
        countReport({ where: { status: "DITOLAK" } }).then((v) => (pelRejected = v)),
        countReport({ where: { status: { in: ["BARU", "DIPROSES"] }, createdAt: { lt: cutoff } } }).then((v) => (pelOverdue = v))
      );
    }

    await Promise.all(tasks);

    return res.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      access,
      defs: {
        izinPending: "DIAJUKAN",
        tkPending: "DIAJUKAN",
        pelaporanPending: "BARU",
      },
      data: {
        izin: { pending: izinPending, verified: izinVerified, rejected: izinRejected, overdue: izinOverdue },
        tk: { pending: tkPending, verified: tkVerified, rejected: tkRejected, overdue: tkOverdue },
        pelaporan: { pending: pelPending, verified: pelVerified, rejected: pelRejected, overdue: pelOverdue },
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Gagal menghitung dashboard action-needed" });
  }
});

module.exports = router;
