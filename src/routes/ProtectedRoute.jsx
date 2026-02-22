// src/routes/ProtectedRoute.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/axios";
import { getToken, getUser, setUser, clearAuth } from "../lib/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const token = getToken();

  const from = useMemo(
    () => location.pathname + location.search,
    [location.pathname, location.search]
  );

  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const [netError, setNetError] = useState("");

  // anti double-call StrictMode
  const lastCheckedTokenRef = useRef(null);

  const runCheck = async () => {
    setChecking(true);
    setNetError("");

    try {
      // kalau tidak ada token => tidak login
      if (!token) {
        setOk(false);
        setChecking(false);
        return;
      }

      // optional: kalau sudah ada user tersimpan, boleh "optimistic allow"
      const cached = getUser();
      if (cached?.role) {
        setOk(true);
      }

      // ✅ PENTING: pakai endpoint yang sudah kamu punya
      const res = await api.get("/auth/me");
      const data = res?.data || {};

      if (!data.authenticated || !data.user) {
        clearAuth();
        setOk(false);
        setChecking(false);
        return;
      }

      // sync user terbaru
      setUser(data.user);
      setOk(true);
      setChecking(false);
    } catch (e) {
      // kalau backend balas 401/403 axios interceptor sudah clearAuth
      // di sini tangani network/down
      console.error("[ProtectedRoute] auth/me failed:", e);
      setOk(false);
      setChecking(false);
      setNetError("Gagal terhubung ke server. Pastikan backend menyala di http://localhost:4000");
    }
  };

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setOk(false);
      setNetError("");
      lastCheckedTokenRef.current = null;
      return;
    }

    if (lastCheckedTokenRef.current === token) {
      setChecking(false);
      return;
    }
    lastCheckedTokenRef.current = token;

    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // belum login
  if (!token) {
    return <Navigate to="/login-admin" replace state={{ from }} />;
  }

  // loading
  if (checking) {
    return (
      <div className="min-h-[50vh] grid place-items-center p-6">
        <div className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <span className="text-sm text-gray-700">Memverifikasi sesi...</span>
        </div>
      </div>
    );
  }

  // network error (backend mati)
  if (netError) {
    return (
      <div className="min-h-[50vh] grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-gray-900">Tidak bisa memverifikasi sesi</div>
          <p className="mt-2 text-sm text-gray-700">{netError}</p>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              onClick={() => {
                lastCheckedTokenRef.current = null;
                runCheck();
              }}
              className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900"
            >
              Coba lagi
            </button>
            <button
              onClick={() => {
                clearAuth();
                window.location.replace("/login-admin");
              }}
              className="px-4 py-2 rounded-xl border hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // token ada tapi invalid
  if (!ok) {
    return <Navigate to="/login-admin" replace state={{ from }} />;
  }

  return <Outlet />;
}