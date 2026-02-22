// src/components/admin/Sidebar.jsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { ADMIN_NAV } from "../../app/nav.admin";
import {
  FaChevronDown,
  FaChevronUp,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaSignOutAlt,
} from "react-icons/fa";
import { clearAuth, getUser } from "../../lib/auth";

function ParentItem({ item, isOpen, toggle, collapsed, compact }) {
  const Icon = item.icon;

  const handleClick = () => {
    if (collapsed) return; // saat collapsed: parent tidak bisa dibuka (biar konsisten)
    toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={item.label}
      className={`w-full flex items-center gap-3 rounded-2xl transition
        ${
          collapsed
            ? "justify-center px-3 py-3"
            : compact
            ? "px-4 py-2.5 text-base font-semibold hover:bg-gray-100"
            : "px-5 py-3 text-lg font-semibold hover:bg-gray-100"
        }
        ${!collapsed && isOpen ? "bg-gray-100" : ""}`}
    >
      {Icon ? <Icon className={`${collapsed ? "text-xl" : "text-xl shrink-0"}`} /> : null}
      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
      {!collapsed &&
        (isOpen ? <FaChevronUp className="opacity-60" /> : <FaChevronDown className="opacity-60" />)}
    </button>
  );
}

/**
 * ✅ Helper:
 * - membandingkan pathname + query tertentu (misal tab=izin|kehilangan)
 * - kalau link tidak punya query => cukup cocok pathname saja
 */
function navIsActive(to, location) {
  if (!to) return false;

  const [toPath, toSearchRaw] = String(to).split("?");
  const curPath = location.pathname;

  // path harus match (prefix match)
  if (!curPath.startsWith(toPath)) return false;

  // kalau target tidak punya query => anggap aktif berdasarkan pathname saja
  if (!toSearchRaw) return true;

  const targetQs = new URLSearchParams(toSearchRaw);
  const currentQs = new URLSearchParams(location.search || "");

  // semua key di target harus match nilainya di current
  for (const [k, v] of targetQs.entries()) {
    if (currentQs.get(k) !== v) return false;
  }
  return true;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // ===== User info dari storage (sync dengan My Profile) =====
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "user" || e.key === "token") setUser(getUser());
    };
    window.addEventListener("storage", onStorage);

    // sync saat route berubah (tab yang sama)
    setUser(getUser());

    return () => window.removeEventListener("storage", onStorage);
  }, [location.pathname, location.search]);

  const roleLabel = useMemo(() => {
    const r = user?.role || "";
    if (!r) return "Admin";
    return String(r)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [user?.role]);

  const nameLabel = useMemo(() => user?.name || "Polsek", [user?.name]);

  const avatarSrc = useMemo(() => {
    const u = user?.avatarUrl;
    if (!u) return "";
    const base = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
    return u.startsWith("http") ? u : `${base}${u}`;
  }, [user?.avatarUrl]);

  // ✅ deteksi mobile (agar sidebar lebih nyaman di drawer)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(min-width: 1024px)").matches; // lg breakpoint
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsMobile(!mq.matches);

    // init + listener
    onChange();
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // ===== collapsed state (persist) =====
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // ✅ di mobile: paksa tidak collapsed (lebih readable)
  useEffect(() => {
    if (isMobile && collapsed) setCollapsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // ✅ Filter menu berdasarkan roles untuk parent & child
  const navFiltered = useMemo(() => {
    const r = user?.role || "";

    return ADMIN_NAV
      .filter((it) => {
        if (!it.roles) return true;
        return it.roles.includes(r);
      })
      .map((it) => {
        if (!it.children) return it;

        const children = it.children.filter((c) => {
          if (!c.roles) return true;
          return c.roles.includes(r);
        });

        return { ...it, children };
      })
      .filter((it) => !it.children || it.children.length > 0);
  }, [user?.role]);

  // ===== buka otomatis parent yang punya child aktif =====
  const initialOpen = useMemo(() => {
    const opens = {};
    navFiltered.forEach((it) => {
      if (it.children) {
        opens[it.label] = it.children.some((c) => navIsActive(c.to, location));
      }
    });
    return opens;
  }, [location.pathname, location.search, navFiltered]);

  const [open, setOpen] = useState(initialOpen);
  useEffect(() => setOpen(initialOpen), [initialOpen]);

  // ===== modal konfirmasi logout =====
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmLogout = () => {
    clearAuth();
    setShowConfirm(false);
    navigate("/login-admin", { replace: true });
  };

  const activeClass = "bg-black text-white shadow-sm";

  // ✅ compact mode: tampilan lebih rapat untuk layar kecil (drawer)
  const compact = isMobile;

  const baseItem = `flex items-center gap-3 rounded-2xl transition
    ${
      collapsed
        ? "justify-center px-3 py-3"
        : compact
        ? "px-4 py-2.5 text-base font-medium hover:bg-gray-100"
        : "px-5 py-3 text-lg font-medium hover:bg-gray-100"
    }`;

  const childItem = `flex items-center gap-3 rounded-xl transition
    ${collapsed ? "hidden" : compact ? "px-4 py-2 text-sm hover:bg-gray-100" : "px-4 py-2.5 text-base hover:bg-gray-100"}`;

  return (
    <>
      <aside
        className={`
          relative shrink-0 border-r bg-white space-y-4
          transition-[width,padding] duration-300 ease-in-out
          ${isMobile ? "w-full p-4 h-full overflow-y-auto" : collapsed ? "w-20 p-2" : "w-72 p-4"}
          ${isMobile ? "" : "lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-y-auto"}
          z-30
        `}
      >
        {/* Header user + tombol toggle */}
        <div className="relative">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center py-3" : compact ? "gap-3 px-1 py-2" : "gap-3 px-2 py-3"
            }`}
          >
            {/* Avatar */}
            <div
              className={`rounded-full bg-black/90 text-white grid place-items-center overflow-hidden shrink-0
                ${compact ? "w-10 h-10" : "w-11 h-11"}`}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">👤</span>
              )}
            </div>

            {/* Nama + Role */}
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-extrabold text-gray-900 leading-tight truncate">
                  {nameLabel}
                </div>
                <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                  {roleLabel}
                </div>
              </div>
            )}
          </div>

          {/* Toggle (desktop saja) */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="absolute right-[-12px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border shadow grid place-items-center"
              aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
              title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            >
              {collapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="space-y-2">
          {navFiltered.map((item) =>
            item.children ? (
              <div key={item.label} className="space-y-1">
                <ParentItem
                  item={item}
                  collapsed={collapsed}
                  compact={compact}
                  isOpen={!!open[item.label]}
                  toggle={() => setOpen((s) => ({ ...s, [item.label]: !s[item.label] }))}
                />
                {!collapsed && open[item.label] && (
                  <div className="ml-3 space-y-1 pl-3 border-l">
                    {item.children.map((c) => {
                      const Icon = c.icon;
                      const active = navIsActive(c.to, location);
                      return (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          title={c.label}
                          className={() => `${childItem} ${active ? activeClass : ""}`}
                          end={false}
                        >
                          {Icon ? <Icon className="text-lg shrink-0" /> : null}
                          <span className="min-w-0 truncate">{c.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              (() => {
                const active = navIsActive(item.to, location);
                return (
                  <NavLink
                    key={item.to || item.label}
                    to={item.to}
                    title={item.label}
                    className={() => `${baseItem} ${active ? activeClass : ""}`}
                    end={false}
                  >
                    {item.icon ? (
                      <item.icon className={`${collapsed ? "text-xl" : "text-xl shrink-0"}`} />
                    ) : null}
                    {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                  </NavLink>
                );
              })()
            )
          )}
        </nav>

        {/* Tombol Logout */}
        <div className={`${collapsed ? "mt-2" : "mt-6"}`}>
          <button
            onClick={() => setShowConfirm(true)}
            className={`w-full ${
              collapsed ? "rounded-xl py-2" : "rounded-2xl py-3 font-semibold"
            } bg-red-600 text-white flex items-center justify-center gap-2 hover:bg-red-700 transition`}
            title="Logout"
          >
            <FaSignOutAlt />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Modal Konfirmasi Logout */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white w-[90%] max-w-md rounded-2xl shadow-xl border border-black/10 overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xl font-semibold">Konfirmasi Logout</h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700">Apakah Anda yakin ingin keluar dari dashboard?</p>
            </div>
            <div className="p-4 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
