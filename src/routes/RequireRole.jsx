// src/routes/RequireRole.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/axios";
import { getToken, getUser, setUser, clearAuth } from "../lib/auth";

export default function RequireRole({ roles = [] }) {
  const location = useLocation();
  const token = getToken();
  const [checking, setChecking] = React.useState(true);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      try {
        if (!token) {
          if (!alive) return;
          setAllowed(false);
          setChecking(false);
          return;
        }

        // kalau roles kosong => bebas
        if (!roles || roles.length === 0) {
          if (!alive) return;
          setAllowed(true);
          setChecking(false);
          return;
        }

        // cek role dari cache dulu
        const u = getUser();
        if (u?.role) {
          if (!alive) return;
          setAllowed(roles.includes(u.role));
          setChecking(false);
          return;
        }

        // fallback: ambil dari backend
        const res = await api.get("/auth/me");
        const data = res?.data || {};
        if (!data.authenticated || !data.user) {
          clearAuth();
          if (!alive) return;
          setAllowed(false);
          setChecking(false);
          return;
        }

        setUser(data.user);
        if (!alive) return;
        setAllowed(roles.includes(data.user.role));
        setChecking(false);
      } catch (e) {
        clearAuth();
        if (!alive) return;
        setAllowed(false);
        setChecking(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [token, roles]);

  if (!token) {
    return (
      <Navigate
        to="/login-admin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (checking) return null;

  if (!allowed) {
    return <Navigate to="/admin/forbidden" replace />;
  }

  return <Outlet />;
}