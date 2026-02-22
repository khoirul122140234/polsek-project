// src/pages/admin/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardBody } from "../../components/ui/Card";
import { api } from "../../lib/api";

/* =========================
   Helpers
========================= */
function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function fmtTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
function cn(...a) {
  return a.filter(Boolean).join(" ");
}

/* =========================
   Role access (FRONTEND)
   Samakan dengan backend
========================= */
function getAccessByRole(roleRaw) {
  const role = String(roleRaw || "").toUpperCase().trim();
  const all = { izin: true, tk: true, pelaporan: true, keseluruhan: true };
  if (role === "SUPER_ADMIN") return all;

  if (role === "ADMIN_INTELKAM") return { izin: true, tk: false, pelaporan: false, keseluruhan: true };
  if (role === "ADMIN_SPKT") return { izin: false, tk: true, pelaporan: true, keseluruhan: true };
  if (role === "ADMIN_KASIUM") return { izin: false, tk: false, pelaporan: false, keseluruhan: true };

  return { izin: false, tk: false, pelaporan: false, keseluruhan: true };
}

/* =========================
   Small UI atoms (lebih modern)
========================= */
function Badge({ children, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        "border border-white/15 bg-white/10 text-white backdrop-blur",
        className
      )}
    >
      {children}
    </span>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        "border border-white/15 bg-white/10 text-white/95 backdrop-blur",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * SectionHeader (klik judul untuk detail)
 * (sesuai permintaan: hapus semua tulisan "Ringkasan cepat • klik untuk detail" + badge hint)
 */
function SectionHeader({ title, right, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl px-5 py-4",
        "bg-gradient-to-r from-black via-gray-900 to-black",
        "border border-black/20 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]",
        clickable ? "cursor-pointer hover:opacity-[0.98] active:opacity-[0.95]" : ""
      )}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      {/* ✅ RESPONSIF: judul + right stack di mobile */}
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[15px] font-extrabold tracking-tight truncate text-white">{title}</div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function StatusPill({ online, label }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold",
        "border backdrop-blur",
        online
          ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
          : "bg-rose-50/80 border-rose-200 text-rose-800"
      )}
      title={online ? "Terhubung ke server" : "Gagal refresh terakhir / server tidak terjangkau"}
    >
      <span className={cn("inline-block w-2.5 h-2.5 rounded-full", online ? "bg-emerald-600" : "bg-rose-600")} />
      {label}
    </span>
  );
}

/* =========================
   Modal Detail (lebih elegan)
========================= */
function DetailModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
          {/* ✅ RESPONSIF: header modal stack di mobile */}
          <div className="px-5 py-4 border-b bg-gradient-to-r from-gray-50 to-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">{title || "Detail"}</div>
              <div className="text-xs text-gray-500 mt-1">
                Klik luar / tekan <b>ESC</b> untuk menutup.
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "w-full sm:w-auto shrink-0 rounded-2xl px-3 py-2 text-xs font-extrabold",
                "border bg-white hover:bg-gray-50",
                "shadow-sm hover:shadow transition"
              )}
            >
              Tutup
            </button>
          </div>

          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================
   Tiles (lebih modern)
========================= */
function StatTile({ label, value, sub, icon }) {
  const n = Number(value);
  const isNumeric = Number.isFinite(n);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-white",
        "border-gray-200/80 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.7)]",
        "hover:shadow-[0_18px_50px_-28px_rgba(0,0,0,0.75)] transition"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-black via-gray-500 to-black opacity-70" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-black/5 blur-3xl group-hover:bg-black/10 transition" />

      <CardBody className="px-5 py-4 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
              <span className="text-[11px] font-extrabold text-gray-700">{label}</span>
            </div>

            <div className={cn("font-extrabold leading-none mt-3 tracking-tight", isNumeric ? "text-3xl" : "text-xl")}>
              {String(value)}
            </div>

            {sub ? <div className="text-xs text-gray-500 mt-2 leading-relaxed">{sub}</div> : null}
          </div>

          <div
            className={cn(
              "w-12 h-12 rounded-2xl grid place-items-center shrink-0",
              "border border-gray-200 bg-gradient-to-br from-white to-gray-50",
              "shadow-sm group-hover:shadow-md transition"
            )}
          >
            <span className="text-lg">{icon || "★"}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function ProgressRow({ label, value, total }) {
  const v = Math.max(0, toNum(value, 0));
  const t = Math.max(0, toNum(total, 0));
  const pct = t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0;

  return (
    <div className="space-y-2">
      {/* ✅ RESPONSIF: stack di mobile */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
        <div className="text-gray-800 font-semibold">{label}</div>
        <div className="text-gray-600">
          <span className="font-extrabold text-gray-900">{v}</span>
          <span className="text-gray-400"> / </span>
          {t} <span className="text-gray-400">({pct}%)</span>
        </div>
      </div>

      <div className="h-2.5 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-black via-gray-700 to-black" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* =========================
   Profile card
========================= */
function ProfileCard({ user, lastUpdated, isOnline, tzLabel }) {
  const name = user?.name || "—";
  const email = user?.email || "—";
  const nrp = user?.nrp || "—";
  const pangkat = user?.pangkat || "—";
  const satuan = user?.satuan || "—";

  const roleLabel = useMemo(() => {
    const r = user?.role || "";
    if (!r) return "Admin";
    return String(r)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [user?.role]);

  const avatarSrc = useMemo(() => {
    const u = user?.avatarUrl;
    if (!u) return "";
    const base = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
    return u.startsWith("http") ? u : `${base}${u}`;
  }, [user?.avatarUrl]);

  const initials = useMemo(() => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "A";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <Card className="rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <div className="px-6 md:px-8 py-6 md:py-7 bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white/10 ring-4 ring-white/20 grid place-items-center shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl md:text-3xl font-extrabold">{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-extrabold tracking-tight truncate">{name}</div>
              <div className="text-white/80 text-sm md:text-base mt-1 truncate">{email}</div>

              {/* ✅ RESPONSIF: badge wrap */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>
                  <span className="opacity-80">Role:</span> {roleLabel}
                </Badge>
                <Badge>
                  <span className="opacity-80">NRP:</span> {nrp}
                </Badge>
                <Badge>
                  <span className="opacity-80">Pangkat:</span> {pangkat}
                </Badge>
              </div>
            </div>
          </div>

          {/* ✅ RESPONSIF: box kanan full width di mobile */}
          <div className="lg:ml-auto w-full lg:w-auto">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:p-5 backdrop-blur">
              <div className="text-sm text-white/70 font-semibold">Satuan</div>
              <div className="text-base md:text-lg font-bold mt-1 break-words">{satuan}</div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Pill>Auto 8s</Pill>
                <Pill>
                  Update: <span className="font-extrabold ml-1">{lastUpdated || "—"}</span>
                </Pill>
                <Pill>{tzLabel}</Pill>
                <span className="ml-0">
                  <StatusPill online={isOnline} label={isOnline ? "Online" : "Offline"} />
                </span>
              </div>

              <div className="text-xs text-white/70 mt-3">Data mengikuti backend (otomatis diperbarui).</div>
            </div>
          </div>
        </div>
      </div>

      <CardBody className="px-6 md:px-8 py-5 md:py-6">
        {/* ✅ RESPONSIF: stack di mobile */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold">Ringkasan Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">Tampilan menyesuaikan hak akses (role) admin.</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              Status:{" "}
              <span className={isOnline ? "text-emerald-700" : "text-rose-700"}>
                {isOnline ? "Aktif" : "Gangguan"}
              </span>
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* =========================
   Main
========================= */
export default function Dashboard() {
  const [user, setUser] = useState(() => readUser());

  // ✅ akses role
  const access = useMemo(() => getAccessByRole(user?.role), [user?.role]);
  const roleNow = String(user?.role || "").toUpperCase().trim();
  const isKasium = roleNow === "ADMIN_KASIUM";

  const [stats, setStats] = useState({
    pelaporan: { total: 0, today: 0, selesai: 0 },
    izin: { total: 0, today: 0, selesai: 0 },
    tk: { total: 0, today: 0, selesai: 0 },
    keseluruhan: { total: 0, today: 0 },
  });

  const [actionNeeded, setActionNeeded] = useState({
    izin: { pending: 0, verified: 0, rejected: 0 },
    tk: { pending: 0, verified: 0, rejected: 0 },
    pelaporan: { pending: 0, verified: 0, rejected: 0 },
    updatedAt: "",
    defs: {
      izinPending: "DIAJUKAN",
      tkPending: "DIAJUKAN",
      pelaporanPending: "BARU",
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [detail, setDetail] = useState({ open: false, title: "", key: "" });

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user") setUser(readUser());
      if (e.key === "token" && !e.newValue) setUser(null);
    };
    const onUserUpdated = () => setUser(readUser());

    window.addEventListener("storage", onStorage);
    window.addEventListener("user_updated", onUserUpdated);
    setUser(readUser());

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("user_updated", onUserUpdated);
    };
  }, []);

  async function fetchAll() {
    try {
      setError("");

      const resStats = await api.get("/dashboard/stats", {
        headers: { "Cache-Control": "no-cache" },
      });

      const s = resStats?.stats;
      if (!s) throw new Error(resStats?.error || "Response stats kosong");

      // action-needed (opsional)
      try {
        const resNeed = await api.get("/dashboard/action-needed", {
          headers: { "Cache-Control": "no-cache" },
        });

        if (resNeed?.ok && resNeed?.data) {
          const d = resNeed.data;
          setActionNeeded((prev) => ({
            ...prev,
            izin: {
              pending: toNum(d?.izin?.pending, 0),
              verified: toNum(d?.izin?.verified, 0),
              rejected: toNum(d?.izin?.rejected, 0),
            },
            tk: {
              pending: toNum(d?.tk?.pending, 0),
              verified: toNum(d?.tk?.verified, 0),
              rejected: toNum(d?.tk?.rejected, 0),
            },
            pelaporan: {
              pending: toNum(d?.pelaporan?.pending, 0),
              verified: toNum(d?.pelaporan?.verified, 0),
              rejected: toNum(d?.pelaporan?.rejected, 0),
            },
            updatedAt: resNeed?.updatedAt ? String(resNeed.updatedAt) : "",
            defs: {
              ...prev.defs,
              izinPending: String(resNeed?.defs?.izinPending || prev.defs.izinPending),
              tkPending: String(resNeed?.defs?.tkPending || prev.defs.tkPending),
              pelaporanPending: String(resNeed?.defs?.pelaporanPending || prev.defs.pelaporanPending),
            },
          }));
        }
      } catch {
        // optional
      }

      setStats({
        pelaporan: {
          total: toNum(s.pelaporan?.total, 0),
          today: toNum(s.pelaporan?.today, 0),
          selesai: toNum(s.pelaporan?.selesai, 0),
        },
        izin: {
          total: toNum(s.izin?.total, 0),
          today: toNum(s.izin?.today, 0),
          selesai: toNum(s.izin?.selesai, 0),
        },
        tk: {
          total: toNum(s.tk?.total, 0),
          today: toNum(s.tk?.today, 0),
          selesai: toNum(s.tk?.selesai, 0),
        },
        keseluruhan: {
          total: toNum(s.keseluruhan?.total, 0),
          today: toNum(s.keseluruhan?.today, 0),
        },
      });

      setLastUpdated(fmtTime(new Date()));
      setLoading(false);
      setIsOnline(true);
    } catch (e) {
      setLoading(false);
      setError(e?.message || "Gagal memuat dashboard");
      setIsOnline(false);
    }
  }

  useEffect(() => {
    // ✅ KHUSUS ADMIN_KASIUM: tidak perlu fetch & tidak tampil konten statistik
    if (isKasium) {
      setLoading(false);
      setError("");
      setIsOnline(true);
      setLastUpdated(fmtTime(new Date()));
      return;
    }

    let mounted = true;
    let intervalId = null;

    const run = async () => {
      if (!mounted) return;
      await fetchAll();
    };

    run();
    intervalId = window.setInterval(run, 8000);

    const onFocus = () => run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKasium]);

  const pendingExplain = useMemo(() => {
    return {
      izin: actionNeeded?.defs?.izinPending || "DIAJUKAN",
      tk: actionNeeded?.defs?.tkPending || "DIAJUKAN",
      pelaporan: actionNeeded?.defs?.pelaporanPending || "BARU",
    };
  }, [actionNeeded]);

  // ✅ total action hanya dari yang boleh dilihat
  const actionTotals = useMemo(() => {
    const izin = actionNeeded?.izin || {};
    const tk = actionNeeded?.tk || {};
    const pel = actionNeeded?.pelaporan || {};

    const pending =
      (access.izin ? toNum(izin.pending, 0) : 0) +
      (access.tk ? toNum(tk.pending, 0) : 0) +
      (access.pelaporan ? toNum(pel.pending, 0) : 0);

    const verified =
      (access.izin ? toNum(izin.verified, 0) : 0) +
      (access.tk ? toNum(tk.verified, 0) : 0) +
      (access.pelaporan ? toNum(pel.verified, 0) : 0);

    const rejected =
      (access.izin ? toNum(izin.rejected, 0) : 0) +
      (access.tk ? toNum(tk.rejected, 0) : 0) +
      (access.pelaporan ? toNum(pel.rejected, 0) : 0);

    return { pending, verified, rejected };
  }, [actionNeeded, access]);

  const openDetail = (key, title) => setDetail({ open: true, key, title });
  const closeDetail = () => setDetail({ open: false, key: "", title: "" });

  const categoryMeta = useMemo(() => {
    return {
      izin: {
        title: "Surat Izin Keramaian",
        total: stats.izin.total,
        today: stats.izin.today,
        selesai: stats.izin.selesai,
        pending: toNum(actionNeeded?.izin?.pending, 0),
        verified: toNum(actionNeeded?.izin?.verified, 0),
        rejected: toNum(actionNeeded?.izin?.rejected, 0),
        statusAwal: pendingExplain.izin,
      },
      tk: {
        title: "Surat Tanda Kehilangan",
        total: stats.tk.total,
        today: stats.tk.today,
        selesai: stats.tk.selesai,
        pending: toNum(actionNeeded?.tk?.pending, 0),
        verified: toNum(actionNeeded?.tk?.verified, 0),
        rejected: toNum(actionNeeded?.tk?.rejected, 0),
        statusAwal: pendingExplain.tk,
      },
      pelaporan: {
        title: "Pelaporan Online",
        total: stats.pelaporan.total,
        today: stats.pelaporan.today,
        selesai: stats.pelaporan.selesai,
        pending: toNum(actionNeeded?.pelaporan?.pending, 0),
        verified: toNum(actionNeeded?.pelaporan?.verified, 0),
        rejected: toNum(actionNeeded?.pelaporan?.rejected, 0),
        statusAwal: pendingExplain.pelaporan,
      },
      keseluruhan: {
        title: "Keseluruhan (Surat + Pelaporan)",
        total: stats.keseluruhan.total,
        today: stats.keseluruhan.today,
      },
    };
  }, [stats, actionNeeded, pendingExplain]);

  const renderDetail = () => {
    const k = detail.key;

    // ✅ RESPONSIF: table bisa discroll di mobile & tidak memaksa layout melebar
    const Table = ({ rows }) => (
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="min-w-[720px] w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[220px]">Kategori</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[90px]">Total</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[120px]">Masuk Hari Ini</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[130px]">Selesai Hari Ini</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[100px]">Menunggu</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[100px]">Diproses</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[90px]">Ditolak</th>
              <th className="px-4 py-3 text-xs font-extrabold text-gray-600 w-[140px]">Status Awal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50/60 align-top">
                <td className="px-4 py-3 font-extrabold text-gray-900">
                  <div className="whitespace-normal break-words overflow-wrap-anywhere">{r.title}</div>
                </td>
                <td className="px-4 py-3">{r.total ?? "-"}</td>
                <td className="px-4 py-3">{r.today ?? "-"}</td>
                <td className="px-4 py-3">{r.selesai ?? "-"}</td>
                <td className="px-4 py-3">{r.pending ?? "-"}</td>
                <td className="px-4 py-3">{r.verified ?? "-"}</td>
                <td className="px-4 py-3">{r.rejected ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="whitespace-normal break-words overflow-wrap-anywhere">{r.statusAwal ?? "-"}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // ✅ rows hanya yang diizinkan
    const visibleRows = [access.izin ? categoryMeta.izin : null, access.tk ? categoryMeta.tk : null, access.pelaporan ? categoryMeta.pelaporan : null].filter(Boolean);

    if (k === "menunggu_total") {
      return (
        <div className="space-y-4">
          {/* ✅ RESPONSIF: 1 kolom di mobile, 2 di sm, 3 di md */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-3xl border bg-gradient-to-b from-gray-50 to-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-800">Total Menunggu</div>
              <div className="text-3xl font-extrabold mt-2">{actionTotals.pending}</div>
              <div className="text-xs text-gray-600 mt-2">Menyesuaikan role admin.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Diproses</div>
              <div className="text-3xl font-extrabold mt-2">{actionTotals.verified}</div>
              <div className="text-xs text-gray-600 mt-2">Menyesuaikan role admin.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Ditolak</div>
              <div className="text-3xl font-extrabold mt-2">{actionTotals.rejected}</div>
              <div className="text-xs text-gray-600 mt-2">Menyesuaikan role admin.</div>
            </div>
          </div>

          <Table rows={visibleRows} />
        </div>
      );
    }

    if (k === "selesai_hari_ini") {
      const sumSelesai =
        (access.izin ? toNum(stats.izin.selesai, 0) : 0) +
        (access.tk ? toNum(stats.tk.selesai, 0) : 0) +
        (access.pelaporan ? toNum(stats.pelaporan.selesai, 0) : 0);

      return (
        <div className="space-y-4">
          {/* ✅ RESPONSIF */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-3xl border bg-gradient-to-b from-gray-50 to-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-800">Total Selesai Hari Ini</div>
              <div className="text-4xl font-extrabold mt-2">{sumSelesai}</div>
              <div className="text-xs text-gray-600 mt-2">Menyesuaikan role admin.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Update</div>
              <div className="text-3xl font-extrabold mt-2">{lastUpdated || "—"}</div>
              <div className="text-xs text-gray-600 mt-2">Waktu pembaruan terakhir.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Catatan</div>
              <div className="text-xs text-gray-600 mt-2 leading-relaxed">Hanya kategori yang sesuai role.</div>
            </div>
          </div>

          <Table rows={visibleRows} />
        </div>
      );
    }

    if (k?.startsWith("cat:")) {
      const catKey = k.split(":")[1];

      // ✅ blok akses detail
      if (catKey === "izin" && !access.izin) return <div className="text-sm">Tidak ada akses.</div>;
      if (catKey === "tk" && !access.tk) return <div className="text-sm">Tidak ada akses.</div>;
      if (catKey === "pelaporan" && !access.pelaporan) return <div className="text-sm">Tidak ada akses.</div>;

      const r = categoryMeta[catKey];
      if (!r) return null;

      if (catKey === "keseluruhan") {
        return (
          <div className="space-y-4">
            {/* ✅ RESPONSIF */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="rounded-3xl border bg-gradient-to-b from-gray-50 to-white p-5 shadow-sm">
                <div className="text-xs font-extrabold text-gray-800">Jumlah Total</div>
                <div className="text-4xl font-extrabold mt-2">{r.total}</div>
                <div className="text-xs text-gray-600 mt-2">Total semua data yang masuk.</div>
              </div>
              <div className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="text-xs font-extrabold text-gray-900">Masuk Hari Ini</div>
                <div className="text-4xl font-extrabold mt-2">{r.today}</div>
                <div className="text-xs text-gray-600 mt-2">Data yang masuk pada hari ini.</div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          {/* ✅ RESPONSIF */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-3xl border bg-gradient-to-b from-gray-50 to-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-800">Total</div>
              <div className="text-3xl font-extrabold mt-2">{r.total}</div>
              <div className="text-xs text-gray-600 mt-2">Jumlah keseluruhan.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Masuk Hari Ini</div>
              <div className="text-3xl font-extrabold mt-2">{r.today}</div>
              <div className="text-xs text-gray-600 mt-2">Yang baru masuk hari ini.</div>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold text-gray-900">Selesai Hari Ini</div>
              <div className="text-3xl font-extrabold mt-2">{r.selesai}</div>
              <div className="text-xs text-gray-600 mt-2">Yang selesai hari ini.</div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="text-sm font-extrabold text-gray-900">Status</div>
            <div className="text-xs text-gray-600 mt-1">
              Menunggu = belum diproses • Diproses = sedang/ sudah diproses • Ditolak = tidak disetujui
            </div>

            {/* ✅ RESPONSIF */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4">
              <div className="rounded-3xl border bg-gradient-to-b from-gray-50 to-white p-5">
                <div className="text-xs font-extrabold text-gray-800">Menunggu</div>
                <div className="text-3xl font-extrabold mt-2">{r.pending}</div>
              </div>
              <div className="rounded-3xl border bg-white p-5">
                <div className="text-xs font-extrabold text-gray-900">Diproses</div>
                <div className="text-3xl font-extrabold mt-2">{r.verified}</div>
              </div>
              <div className="rounded-3xl border bg-white p-5">
                <div className="text-xs font-extrabold text-gray-900">Ditolak</div>
                <div className="text-3xl font-extrabold mt-2">{r.rejected}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-black/5 blur-3xl" />
      </div>

      {/* ✅ RESPONSIF WRAPPER: padding supaya enak di semua device */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-7">
        <ProfileCard user={user} lastUpdated={lastUpdated} isOnline={isOnline} tzLabel="Asia/Jakarta (WIB)" />

        {/* ✅ KHUSUS ADMIN_KASIUM: tampilkan IDENTITAS SAJA (tanpa isi dashboard lain) */}
        {isKasium ? null : (
          <>
            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/80 text-rose-700 px-5 py-4 text-sm flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="font-extrabold">Gagal memuat data</div>
                  <div className="mt-1 break-words">{error}</div>
                  <div className="text-xs text-rose-600/80 mt-2">
                    Pastikan layanan bisa diakses & akun admin masih aktif.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchAll();
                  }}
                  className="w-full sm:w-auto shrink-0 rounded-2xl bg-black text-white px-4 py-2 text-xs font-extrabold shadow-sm hover:shadow-md transition"
                >
                  Coba lagi
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-3xl border bg-white/80 backdrop-blur px-5 py-4 text-sm text-gray-600 shadow-sm">
                Memuat statistik dashboard...
              </div>
            ) : null}

            {/* ===== CATEGORY SECTIONS (SESUI ROLE) ===== */}
            {/* ✅ RESPONSIF: 1 kolom di mobile, 2 kolom di lg */}
            <div className="grid gap-7 grid-cols-1 lg:grid-cols-2">
              {access.izin ? (
                <div className="space-y-4">
                  <SectionHeader
                    title="Surat Izin Keramaian"
                    onClick={() => openDetail("cat:izin", "Detail Surat Izin Keramaian")}
                  />
                  {/* ✅ RESPONSIF TILE: 1 kolom mobile, 2 sm, 4 lg */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Total Pengajuan" value={stats.izin.total} sub="Jumlah keseluruhan" icon="📄" />
                    <StatTile label="Masuk Hari Ini" value={stats.izin.today} sub="Yang masuk hari ini" icon="⏱️" />
                    <StatTile label="Selesai Hari Ini" value={stats.izin.selesai} sub="Yang selesai hari ini" icon="✅" />
                    <StatTile
                      label="Menunggu Diproses"
                      value={toNum(actionNeeded?.izin?.pending, 0)}
                      sub="Yang belum diproses"
                      icon="🕒"
                    />
                  </div>
                </div>
              ) : null}

              {access.tk ? (
                <div className="space-y-4">
                  <SectionHeader
                    title="Surat Tanda Kehilangan"
                    onClick={() => openDetail("cat:tk", "Detail Surat Tanda Kehilangan")}
                  />
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Total Pengajuan" value={stats.tk.total} sub="Jumlah keseluruhan" icon="🧾" />
                    <StatTile label="Masuk Hari Ini" value={stats.tk.today} sub="Yang masuk hari ini" icon="⏱️" />
                    <StatTile label="Selesai Hari Ini" value={stats.tk.selesai} sub="Yang selesai hari ini" icon="✅" />
                    <StatTile
                      label="Menunggu Diproses"
                      value={toNum(actionNeeded?.tk?.pending, 0)}
                      sub="Yang belum diproses"
                      icon="🕒"
                    />
                  </div>
                </div>
              ) : null}

              {access.pelaporan ? (
                <div className="space-y-4 lg:col-span-2">
                  <SectionHeader
                    title="Pelaporan"
                    onClick={() => openDetail("cat:pelaporan", "Detail Pelaporan Online")}
                  />
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile label="Total Laporan" value={stats.pelaporan.total} sub="Jumlah keseluruhan" icon="🗂️" />
                    <StatTile label="Masuk Hari Ini" value={stats.pelaporan.today} sub="Yang masuk hari ini" icon="⏱️" />
                    <StatTile label="Selesai Hari Ini" value={stats.pelaporan.selesai} sub="Yang selesai hari ini" icon="✅" />
                    <StatTile label="Menunggu Diproses" value={actionTotals.pending} sub="Total yang belum diproses" icon="🕒" />
                  </div>

                  <div className="flex justify-start sm:justify-end">
                    <button
                      onClick={() => openDetail("menunggu_total", "Detail Menunggu Diproses")}
                      className={cn(
                        "w-full sm:w-auto text-xs font-extrabold rounded-2xl px-4 py-2",
                        "border bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition"
                      )}
                      title="Buka detail menunggu diproses"
                    >
                      Lihat detail Menunggu Diproses
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ===== RINGKASAN KESELURUHAN (SELALU BOLEH) ===== */}
            {access.keseluruhan ? (
              <div className="space-y-4">
                <SectionHeader title="Ringkasan Keseluruhan" />
                <div className="max-w-5xl mx-auto">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <StatTile
                      label="Jumlah Total Pengajuan"
                      value={stats.keseluruhan.total}
                      sub="Gabungan surat + pelaporan"
                      icon="📌"
                    />
                    <StatTile
                      label="Jumlah Masuk Hari Ini"
                      value={stats.keseluruhan.today}
                      sub="Gabungan yang masuk hari ini"
                      icon="🗓️"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* ===== Selesai Hari Ini hanya kalau ada kategori selain keseluruhan ===== */}
            {access.izin || access.tk || access.pelaporan ? (
              <div className="grid gap-7 grid-cols-1 lg:grid-cols-2">
                <div className="space-y-4">
                  <SectionHeader
                    title="Selesai Hari Ini"
                    onClick={() => openDetail("selesai_hari_ini", "Detail Selesai Hari Ini")}
                  />
                  <Card className="rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
                      <div className="text-sm font-extrabold">Ringkasan Selesai Hari Ini</div>
                      <div className="text-xs text-gray-500 mt-1">Menampilkan sesuai role admin.</div>
                    </div>
                    <div className="px-6 py-5 space-y-4">
                      {access.izin ? <ProgressRow label="Izin Keramaian" value={stats.izin.selesai} total={stats.izin.today} /> : null}
                      {access.tk ? <ProgressRow label="Tanda Kehilangan" value={stats.tk.selesai} total={stats.tk.today} /> : null}
                      {access.pelaporan ? (
                        <ProgressRow label="Pelaporan Online" value={stats.pelaporan.selesai} total={stats.pelaporan.today} />
                      ) : null}
                    </div>
                  </Card>
                </div>

                <div className="space-y-4">
                  <SectionHeader title="Catatan" />
                  <Card className="rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                    {/* ✅ RESPONSIF: header card stack */}
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-gray-900">Panduan Membaca Angka</div>
                        <div className="text-xs text-gray-500 mt-1">Menyesuaikan kategori yang terlihat.</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 grid place-items-center text-gray-700 shrink-0 shadow-sm">
                        📝
                      </div>
                    </div>

                    <CardBody className="px-6 py-5 space-y-4">
                      <div className="rounded-3xl border bg-white p-5">
                        <div className="text-sm font-extrabold text-gray-900">Arti kolom/angka</div>
                        <ul className="mt-2 text-xs text-gray-700 space-y-2 leading-relaxed list-disc pl-5">
                          <li>
                            <b>Total</b>: jumlah semua data pada bagian tersebut.
                          </li>
                          <li>
                            <b>Masuk Hari Ini</b>: data yang baru dibuat hari ini.
                          </li>
                          <li>
                            <b>Menunggu Diproses</b>: data yang belum dikerjakan/ditangani.
                          </li>
                          <li>
                            <b>Selesai Hari Ini</b>: data yang sudah beres hari ini.
                          </li>
                          <li>
                            <b>Ditolak</b>: data yang tidak bisa dilanjutkan.
                          </li>
                        </ul>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            ) : null}

            <DetailModal open={detail.open} title={detail.title} onClose={closeDetail}>
              {renderDetail()}
            </DetailModal>
          </>
        )}
      </div>
    </div>
  );
}
