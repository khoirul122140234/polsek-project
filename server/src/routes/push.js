// server/src/routes/push.js
const express = require("express");
const webpush = require("web-push");
const prisma = require("../prisma");

const router = express.Router();

// --- VAPID keys dari ENV ---
const VAPID_PUBLIC = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.warn("[push] VAPID keys belum diisi di .env. Web Push tidak akan berfungsi.");
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

router.use(express.json());

function normalizeSubscription(sub) {
  if (!sub || !sub.endpoint) return null;
  return { endpoint: String(sub.endpoint), subscription: sub };
}

// ✅ GET /api/push/public-key
router.get("/public-key", (_req, res) => {
  if (!VAPID_PUBLIC) return res.status(500).json({ error: "VAPID public key not set" });
  return res.json({ publicKey: VAPID_PUBLIC });
});

// POST /api/push/subscribe
router.post("/subscribe", async (req, res) => {
  try {
    const norm = normalizeSubscription(req.body);
    if (!norm) return res.status(400).json({ error: "invalid subscription" });

    await prisma.pushSubscription.upsert({
      where: { endpoint: norm.endpoint },
      create: { endpoint: norm.endpoint, subscription: norm.subscription },
      update: { subscription: norm.subscription },
    });

    const count = await prisma.pushSubscription.count();
    return res.status(201).json({ ok: true, count });
  } catch (e) {
    console.error("[push] subscribe error:", e);
    return res.status(500).json({ error: e?.message || "subscribe failed" });
  }
});

// DELETE /api/push/unsubscribe { endpoint }
router.delete("/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint required" });

    const ep = String(endpoint);
    const existed = await prisma.pushSubscription.findUnique({ where: { endpoint: ep } });

    if (!existed) {
      const count = await prisma.pushSubscription.count();
      return res.json({ ok: true, removed: false, count });
    }

    await prisma.pushSubscription.delete({ where: { endpoint: ep } });
    const count = await prisma.pushSubscription.count();
    return res.json({ ok: true, removed: true, count });
  } catch (e) {
    console.error("[push] unsubscribe error:", e);
    return res.status(500).json({ error: e?.message || "unsubscribe failed" });
  }
});

// GET /api/push/debug
router.get("/debug", async (_req, res) => {
  try {
    const subs = await prisma.pushSubscription.findMany({
      select: { endpoint: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const count = await prisma.pushSubscription.count();
    return res.json({
      count,
      endpoints: subs.map((s) => String(s.endpoint).slice(0, 30) + "..."),
      latest: subs[0]?.updatedAt || null,
    });
  } catch (e) {
    console.error("[push] debug error:", e);
    return res.status(500).json({ error: e?.message || "debug failed" });
  }
});

// POST /api/push/send
router.post("/send", async (req, res) => {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return res.status(500).json({ error: "VAPID keys not set" });
    }

    const { title = "Test", body = "Push from server", url = "/", endpoint } = req.body || {};
    const payload = JSON.stringify({ title, body, url });

    const targets = endpoint
      ? await prisma.pushSubscription.findMany({
          where: { endpoint: String(endpoint) },
          select: { endpoint: true, subscription: true },
        })
      : await prisma.pushSubscription.findMany({
          select: { endpoint: true, subscription: true },
        });

    const results = [];
    let sent = 0;

    for (const row of targets) {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sent++;
        results.push({ endpoint: row.endpoint, ok: true });
      } catch (e) {
        const status = e?.statusCode;
        results.push({ endpoint: row.endpoint, ok: false, error: String(status || e) });

        // hapus subscription invalid
        if (status === 404 || status === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { endpoint: row.endpoint } });
          } catch (_) {}
        }
      }
    }

    const totalSubscriptions = await prisma.pushSubscription.count();
    return res.json({ sent, totalSubscriptions, results });
  } catch (e) {
    console.error("[push] send error:", e);
    return res.status(500).json({ error: e?.message || "send failed" });
  }
});

module.exports = router;