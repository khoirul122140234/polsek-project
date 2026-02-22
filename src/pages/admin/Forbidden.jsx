// src/pages/admin/Forbidden.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Forbidden() {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">403 — Akses Ditolak</h1>
        <p className="mt-2 text-gray-600">
          Anda tidak memiliki izin untuk membuka halaman ini.
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 p-4 border text-sm text-gray-700">
          <div className="font-semibold">Halaman yang diminta:</div>
          <div className="mt-1 break-all">{loc.state?.from || "(tidak diketahui)"}</div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => nav("/admin/dashboard", { replace: true })}
            className="px-4 py-2 rounded-xl bg-black text-white font-semibold"
          >
            Ke Dashboard
          </button>
          <button
            onClick={() => nav(-1)}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}