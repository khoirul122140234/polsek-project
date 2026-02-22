// server/src/utils/pushNotify.js
const webpush = require("web-push");
const prisma = require("../prisma");

const VAPID_PUBLIC = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidReady = true;
  return true;
}

/**
 * Kirim push ke semua subscriber yang tersimpan.
 * - auto hapus endpoint invalid (404/410)
 */
async function sendPushToAll({ title, body, url }) {
  if (!ensureVapid()) {
    console.warn("[pushNotify] VAPID belum siap. Skip send.");
    return { ok: false, skipped: true, reason: "VAPID keys not set" };
  }

  const payload = JSON.stringify({ title, body, url });

  const subs = await prisma.pushSubscription.findMany({
    select: { endpoint: true, subscription: true },
  });

  let sent = 0;
  let failed = 0;

  for (const row of subs) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent++;
    } catch (e) {
      failed++;
      const status = e?.statusCode;
      // hapus subscription invalid
      if (status === 404 || status === 410) {
        try {
          await prisma.pushSubscription.delete({ where: { endpoint: row.endpoint } });
        } catch (_) {}
      }
    }
  }

  return { ok: true, sent, failed, total: subs.length };
}

module.exports = { sendPushToAll };