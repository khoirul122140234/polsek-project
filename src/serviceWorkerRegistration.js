// src/serviceWorkerRegistration.js

// --- Register Service Worker (Vite: path absolut ke /public) ---
export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("[SW] registered:", reg.scope))
        .catch((err) => console.error("[SW] register failed:", err));
    });
  }
}

// --- helper konversi base64 (VAPID) ---
const urlBase64ToUint8Array = (base64) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const str = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(str);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

// --- util: tentukan URL endpoint subscribe ---
// ✅ Aman kalau apiBase:
// - "http://localhost:4000"  -> /api/push/subscribe
// - "http://localhost:4000/api" -> /push/subscribe (tanpa double /api)
function resolveSubscribeUrl(apiBase) {
  const base = (apiBase || process.env.REACT_APP_API_URL || "").trim();

  // lewat proxy Vite (kalau tidak set base)
  if (!base) return "/api/push/subscribe";

  const clean = base.replace(/\/+$/, "");
  const hasApiSuffix = /\/api$/i.test(clean);

  return hasApiSuffix ? `${clean}/push/subscribe` : `${clean}/api/push/subscribe`;
}

// --- util: pastikan sudah ter-subscribe; jika belum -> subscribe ---
async function ensureSubscribed(vapidPublicKey, apiBase = "") {
  if (!vapidPublicKey) throw new Error("VAPID public key kosong/undefined");

  const reg = await navigator.serviceWorker.ready;

  // ✅ Cek dukungan push manager
  if (!reg.pushManager) throw new Error("Browser tidak mendukung PushManager");

  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    console.log("[push] new subscription created");
  } else {
    console.log("[push] existing subscription found");
  }

  const url = resolveSubscribeUrl(apiBase);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sub),
  });

  // ✅ kalau gagal, tampilkan response text biar kelihatan masalahnya
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subscribe POST failed: ${res.status} ${txt}`);
  }

  console.log("[push] subscription saved to server:", url);
  return sub;
}

// --- API manual (kalau mau panggil sendiri dari UI) ---
export async function enablePushNotifications(vapidPublicKey, apiBase = "") {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Izin notifikasi ditolak");
  return ensureSubscribed(vapidPublicKey, apiBase);
}

// --- Auto: minta izin saat interaksi pertama; jika sudah granted -> langsung subscribe ---
export function askNotificationOnFirstInteraction(vapidPublicKey, apiBase = "") {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

  // Jika sudah granted, langsung pastikan subscription (tanpa menunggu gesture)
  if (Notification.permission === "granted") {
    ensureSubscribed(vapidPublicKey, apiBase).catch((e) =>
      console.error("[push] ensure error:", e)
    );
    return;
  }

  // Kalau user pernah ditanya (localStorage flag) & status bukan default, tidak usah nanya lagi
  const asked = localStorage.getItem("notifAsked") === "1";
  if (Notification.permission !== "default" && asked) return;

  const once = async () => {
    try {
      const perm = await Notification.requestPermission();
      localStorage.setItem("notifAsked", "1");

      if (perm === "granted") {
        await ensureSubscribed(vapidPublicKey, apiBase);
        console.log("[push] subscribed");
      } else {
        console.log("[push] permission:", perm);
      }
    } catch (e) {
      console.error("[push] ask failed:", e);
    } finally {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      window.removeEventListener("touchstart", once);
      window.removeEventListener("scroll", once, { passive: true });
    }
  };

  // gesture pertama (men-trigger permission chip)
  window.addEventListener("pointerdown", once, { once: true });
  window.addEventListener("keydown", once, { once: true });
  window.addEventListener("touchstart", once, { once: true });
  window.addEventListener("scroll", once, { once: true, passive: true });
}