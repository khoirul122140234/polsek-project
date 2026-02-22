// src/layouts/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import logoPolri from "../assets/Lambang_Polri.png";

export default function AdminLayout() {
  // ✅ kontrol drawer sidebar di mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ MOBILE: Drawer Sidebar + Overlay */}
      <div className="lg:hidden">
        {/* Overlay */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />

        {/* Drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] transform bg-white shadow-2xl transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar"
        >
          <div className="h-full overflow-y-auto">
            {/* Sidebar tetap pakai komponen yang sama */}
            <Sidebar />
          </div>
        </div>
      </div>

      {/* ✅ DESKTOP: Sidebar normal */}
      <div className="hidden lg:block">
        <div className="min-h-screen flex">
          <Sidebar />
          {/* Kolom kanan: tinggi = viewport; yang scroll hanya area ini */}
          <div className="flex-1 flex flex-col h-[100dvh]">
            {/* Topbar besar, sticky, rapi */}
            <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="h-20 md:h-24 flex items-center justify-center">
                  <div className="flex items-center gap-4 md:gap-6">
                    <img
                      src={logoPolri}
                      alt="Lambang Polri"
                      className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-sm"
                    />
                    <div className="leading-tight text-center">
                      <h1 className="font-extrabold text-xl md:text-3xl tracking-tight">
                        Sistem Pelayanan Masyarakat
                      </h1>
                      <p className="text-xs md:text-base text-gray-500">
                        Polsek Tanjung Raja
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Konten: scroll hanya di sini */}
            <main className="p-4 md:p-6 overflow-y-auto flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* ✅ MOBILE LAYOUT (tanpa sidebar permanen) */}
      <div className="lg:hidden">
        <div className="flex flex-col h-[100dvh]">
          {/* Topbar mobile: ada tombol menu */}
          <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
            <div className="px-4 sm:px-6">
              <div className="h-16 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  aria-label="Buka menu"
                >
                  ☰
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={logoPolri}
                    alt="Lambang Polri"
                    className="w-10 h-10 object-contain drop-shadow-sm shrink-0"
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="font-extrabold text-base truncate">
                      Sistem Pelayanan Masyarakat
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Polsek Tanjung Raja
                    </div>
                  </div>
                </div>

                {/* spacer biar center terasa rapi */}
                <div className="w-[42px]" aria-hidden />
              </div>
            </div>
          </header>

          {/* Konten: scroll hanya di sini */}
          <main className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
