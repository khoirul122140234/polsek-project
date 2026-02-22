// src/components/Navbar.js
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const cn = (...a) => a.filter(Boolean).join(" ");

/** Garis kuning via pseudo-element (nempel pas di bawah TEKS) */
const underlineYellow = [
  "relative",
  "after:content-['']",
  "after:absolute",
  "after:left-0",
  "after:-bottom-1",
  "after:h-0.5",
  "after:w-full",
  "after:bg-[#F8C301]",
  "after:rounded",
].join(" ");

/** Link dengan detection aktif + underline kuning */
const ActiveLink = ({ to, children, onClick, exact = false, className = "" }) => {
  const location = useLocation();
  const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "block w-full py-1 whitespace-nowrap transition-colors hover:text-gray-700",
        isActive ? "text-gray-900" : "text-gray-800",
        className
      )}
    >
      <span className={cn("inline-block", isActive && underlineYellow)}>{children}</span>
    </Link>
  );
};

/** Cek apakah path sekarang mulai dengan salah satu prefix anak */
const useSectionActive = (prefixes = []) => {
  const location = useLocation();
  return prefixes.some((p) => location.pathname.startsWith(p));
};

/** Class untuk parent: stabil via border-b (tanpa ::after) */
const parentClasses = (active) =>
  cn(
    "inline-flex items-center gap-1 py-1 whitespace-nowrap hover:text-gray-700",
    "border-b-2",
    active ? "text-gray-900 border-[#F8C301]" : "text-gray-800 border-transparent"
  );

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'tentang' | 'artikel' | 'layanan' | null
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const mobilePanelRef = useRef(null);

  const toggleDropdown = (name) => setOpenDropdown((prev) => (prev === name ? null : name));
  const closeMobile = () => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  };

  // floating style berubah saat scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // tutup panel mobile saat ganti halaman
  useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // close mobile jika klik di luar panel
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDown = (e) => {
      const el = mobilePanelRef.current;
      if (!el) return;
      if (!el.contains(e.target)) closeMobile();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [isMenuOpen]);

  // prefix anak untuk status aktif parent
  const tentangPrefixes = [
    "/polsek",
    "/struktur",
    "/kapolsek",
    "/anggota",
    "/fasilitas",
    "/peta-wilayah",
    "/dokumen", // ✅ baru
  ];
  const artikelPrefixes = ["/berita", "/edukasi"];
  const layananPrefixes = ["/pengajuan-tanda-kehilangan", "/pengajuan-izin"];

  const isTentangActive = useSectionActive(tentangPrefixes);
  const isArtikelActive = useSectionActive(artikelPrefixes);
  const isLayananActive = useSectionActive(layananPrefixes);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      {/* WRAPPER FLOATING */}
      <div className="pointer-events-auto mx-auto max-w-7xl px-3 sm:px-4 pt-3">
        <div
          className={cn(
            "w-full rounded-full border transition-all duration-300",
            "bg-white/80 backdrop-blur-md",
            scrolled ? "shadow-md border-gray-200" : "shadow-sm border-gray-100"
          )}
        >
          {/* BAR UTAMA */}
          <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
            {/* Kiri */}
            <div className="flex items-center gap-3 min-w-0">
              <img src="/Lambang_Polri.png" alt="Polsek Logo" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
              <Link
                to="/"
                className="font-semibold text-base sm:text-lg text-gray-900 hover:text-gray-700 truncate"
                onClick={closeMobile}
              >
                Polsek Tanjung Raja
              </Link>
            </div>

            {/* MENU DESKTOP */}
            <div className="hidden lg:flex items-center gap-5 xl:gap-6">
              <ActiveLink to="/" exact onClick={closeMobile} className="inline-flex w-auto">
                Beranda
              </ActiveLink>

              {/* TENTANG */}
              <div className="relative group">
                <button className={parentClasses(isTentangActive)} aria-haspopup="true" aria-expanded="false" type="button">
                  Tentang <span className="ml-1 text-xs opacity-70">▾</span>
                </button>

                <div className="absolute left-0 right-0 top-full h-2 invisible group-hover:visible" />
                <ul
                  className={cn(
                    "absolute top-full left-0 mt-0 w-56 rounded-2xl shadow-lg py-2",
                    "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition",
                    "bg-white border border-gray-100"
                  )}
                  role="menu"
                >
                  <li><ActiveLink to="/polsek" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Polsek</ActiveLink></li>
                  <li><ActiveLink to="/struktur" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Struktur</ActiveLink></li>
                  <li><ActiveLink to="/kapolsek" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Kapolsek</ActiveLink></li>
                  <li><ActiveLink to="/anggota" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Anggota</ActiveLink></li>
                  <li><ActiveLink to="/fasilitas" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Fasilitas</ActiveLink></li>
                  <li><ActiveLink to="/peta-wilayah" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Peta Wilayah</ActiveLink></li>

                  {/* ✅ BARU: Dokumen */}
                  <li><ActiveLink to="/dokumen" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Dokumen</ActiveLink></li>
                </ul>
              </div>

              {/* ARTIKEL */}
              <div className="relative group">
                <button className={parentClasses(isArtikelActive)} aria-haspopup="true" aria-expanded="false" type="button">
                  Artikel <span className="ml-1 text-xs opacity-70">▾</span>
                </button>

                <div className="absolute left-0 right-0 top-full h-2 invisible group-hover:visible" />
                <ul
                  className={cn(
                    "absolute top-full left-0 mt-0 w-56 rounded-2xl shadow-lg py-2",
                    "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition",
                    "bg-white border border-gray-100"
                  )}
                  role="menu"
                >
                  <li><ActiveLink to="/berita" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Berita</ActiveLink></li>
                  <li><ActiveLink to="/edukasi" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">Edukasi</ActiveLink></li>
                </ul>
              </div>

              {/* LAYANAN */}
              <div className="relative group">
                <button className={parentClasses(isLayananActive)} aria-haspopup="true" aria-expanded="false" type="button">
                  Layanan <span className="ml-1 text-xs opacity-70">▾</span>
                </button>

                <div className="absolute left-0 right-0 top-full h-2 invisible group-hover:visible" />
                <ul
                  className={cn(
                    "absolute top-full left-0 mt-0 w-72 rounded-2xl shadow-lg py-2",
                    "invisible opacity-0 group-hover:visible group-hover:opacity-100 transition",
                    "bg-white border border-gray-100"
                  )}
                  role="menu"
                >
                  <li>
                    <ActiveLink to="/pengajuan-tanda-kehilangan" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">
                      Pengajuan Surat Tanda Kehilangan
                    </ActiveLink>
                  </li>
                  <li>
                    <ActiveLink to="/pengajuan-izin" onClick={closeMobile} className="px-4 py-2 hover:text-gray-900">
                      Pengajuan Surat Izin Keramaian
                    </ActiveLink>
                  </li>
                </ul>
              </div>

              <ActiveLink to="/pelaporan-online" onClick={closeMobile} className="inline-flex w-auto">
                Pelaporan Online
              </ActiveLink>

              <ActiveLink to="/cek-status" onClick={closeMobile} className="inline-flex w-auto">
                Cek Status
              </ActiveLink>

              <Link
                to="/login-admin"
                className="ml-2 inline-flex whitespace-nowrap items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-800"
                onClick={closeMobile}
              >
                <span>Login Admin</span>
              </Link>
            </div>

            {/* HAMBURGER */}
            <button
              className="lg:hidden inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/60 hover:bg-white px-3 py-2 text-gray-800"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              type="button"
            >
              <span className="text-lg">{isMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>

          {/* MOBILE PANEL */}
          <div
            id="mobile-menu"
            ref={mobilePanelRef}
            className={cn(
              "lg:hidden overflow-hidden transition-all duration-300",
              isMenuOpen ? "max-h-[80vh] border-t border-gray-100" : "max-h-0"
            )}
          >
            <div className="px-4 sm:px-6 py-4 bg-white/90">
              <ul className="flex flex-col text-gray-800">
                <li>
                  <ActiveLink to="/" exact onClick={closeMobile} className="py-3 border-b border-gray-100">
                    Beranda
                  </ActiveLink>
                </li>

                {/* TENTANG */}
                <li className="py-1">
                  <button
                    className={cn(
                      "w-full flex items-center justify-between py-3 border-b-2 border-gray-100 hover:text-gray-900",
                      isTentangActive ? "text-gray-900 border-[#F8C301]" : "text-gray-800 border-transparent"
                    )}
                    onClick={() => toggleDropdown("tentang")}
                    aria-expanded={openDropdown === "tentang"}
                    type="button"
                  >
                    <span>Tentang</span>
                    <span className="text-xs">{openDropdown === "tentang" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "tentang" && (
                    <ul className="mt-2 pl-4 pb-3 flex flex-col gap-1">
                      <li><ActiveLink to="/polsek" onClick={closeMobile} className="py-2">Polsek</ActiveLink></li>
                      <li><ActiveLink to="/struktur" onClick={closeMobile} className="py-2">Struktur</ActiveLink></li>
                      <li><ActiveLink to="/kapolsek" onClick={closeMobile} className="py-2">Kapolsek</ActiveLink></li>
                      <li><ActiveLink to="/anggota" onClick={closeMobile} className="py-2">Anggota</ActiveLink></li>
                      <li><ActiveLink to="/fasilitas" onClick={closeMobile} className="py-2">Fasilitas</ActiveLink></li>
                      <li><ActiveLink to="/peta-wilayah" onClick={closeMobile} className="py-2">Peta Wilayah</ActiveLink></li>

                      {/* ✅ BARU: Dokumen */}
                      <li><ActiveLink to="/dokumen" onClick={closeMobile} className="py-2">Dokumen</ActiveLink></li>
                    </ul>
                  )}
                </li>

                {/* ARTIKEL */}
                <li className="py-1">
                  <button
                    className={cn(
                      "w-full flex items-center justify-between py-3 border-b-2 border-gray-100 hover:text-gray-900",
                      isArtikelActive ? "text-gray-900 border-[#F8C301]" : "text-gray-800 border-transparent"
                    )}
                    onClick={() => toggleDropdown("artikel")}
                    aria-expanded={openDropdown === "artikel"}
                    type="button"
                  >
                    <span>Artikel</span>
                    <span className="text-xs">{openDropdown === "artikel" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "artikel" && (
                    <ul className="mt-2 pl-4 pb-3 flex flex-col gap-1">
                      <li><ActiveLink to="/berita" onClick={closeMobile} className="py-2">Berita</ActiveLink></li>
                      <li><ActiveLink to="/edukasi" onClick={closeMobile} className="py-2">Edukasi</ActiveLink></li>
                    </ul>
                  )}
                </li>

                {/* LAYANAN */}
                <li className="py-1">
                  <button
                    className={cn(
                      "w-full flex items-center justify-between py-3 border-b-2 border-gray-100 hover:text-gray-900",
                      isLayananActive ? "text-gray-900 border-[#F8C301]" : "text-gray-800 border-transparent"
                    )}
                    onClick={() => toggleDropdown("layanan")}
                    aria-expanded={openDropdown === "layanan"}
                    type="button"
                  >
                    <span>Layanan</span>
                    <span className="text-xs">{openDropdown === "layanan" ? "▲" : "▼"}</span>
                  </button>

                  {openDropdown === "layanan" && (
                    <ul className="mt-2 pl-4 pb-3 flex flex-col gap-1">
                      <li>
                        <ActiveLink to="/pengajuan-tanda-kehilangan" onClick={closeMobile} className="py-2">
                          Pengajuan Surat Tanda Kehilangan
                        </ActiveLink>
                      </li>
                      <li>
                        <ActiveLink to="/pengajuan-izin" onClick={closeMobile} className="py-2">
                          Pengajuan Surat Izin Keramaian
                        </ActiveLink>
                      </li>
                    </ul>
                  )}
                </li>

                <li>
                  <ActiveLink to="/pelaporan-online" onClick={closeMobile} className="py-3 border-b border-gray-100">
                    Pelaporan Online
                  </ActiveLink>
                </li>

                <li>
                  <ActiveLink to="/cek-status" onClick={closeMobile} className="py-3 border-b border-gray-100">
                    Cek Status
                  </ActiveLink>
                </li>

                <li className="pt-3">
                  <Link
                    to="/login-admin"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-800"
                    onClick={closeMobile}
                  >
                    <span>Login Admin</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          {/* END MOBILE PANEL */}
        </div>
      </div>
    </nav>
  );
}
