// src/pages/Beranda.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import lambangPolri from "../assets/Lambang_Polri.png";
import heroBuilding from "../assets/polsek-image.png";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// Video
import profilVideo from "../assets/profil-polsek.mp4";
import profilPoster from "../assets/profil-poster.jpg";

// ✅ berita
import { get } from "../lib/api";
import { RESOLVED_API_BASE } from "../lib/env";

/* ==========================
   Utils Berita (ringan, lokal)
========================== */
const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-wide.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso || "-";
  }
}

/** Ambil maksimal 5 url gambar: prioritas row.images (array), fallback row.image */
function getImages(row) {
  let arr = [];
  if (Array.isArray(row?.images)) {
    arr = row.images.filter((s) => typeof s === "string" && s.trim());
  }
  if (arr.length === 0 && row?.image) arr = [row.image];
  return arr.slice(0, 5);
}

const Beranda = () => {
  const navigate = useNavigate();

  // ==========================
  // ✅ PWA INSTALL BUTTON STATE
  // ==========================
  const deferredPromptRef = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // cek apakah sudah jalan sebagai PWA
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
        window.navigator?.standalone === true;
      setIsInstalled(Boolean(isStandalone));
      if (isStandalone) setCanInstall(false);
    };

    checkInstalled();

    const onBeforeInstallPrompt = (e) => {
      // Chrome/Edge: tahan prompt, tampilkan tombol manual
      e.preventDefault();
      deferredPromptRef.current = e;
      if (!isInstalled) setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // beberapa browser bisa berubah display-mode setelah install
    const media = window.matchMedia?.("(display-mode: standalone)");
    const onMediaChange = () => checkInstalled();
    media?.addEventListener?.("change", onMediaChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      media?.removeEventListener?.("change", onMediaChange);
    };
  }, [isInstalled]);

  const handleInstallClick = useCallback(async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;

    // munculkan prompt install
    promptEvent.prompt();

    try {
      const choice = await promptEvent.userChoice;
      // reset event (sesuai best practice)
      deferredPromptRef.current = null;
      setCanInstall(false);

      // kalau diterima, status akan dikunci oleh event "appinstalled"
      // kalau ditolak, tombol akan hilang (biar tidak spam)
      if (choice?.outcome !== "accepted") {
        // tetap allow muncul lagi kalau browser memicu beforeinstallprompt lagi
      }
    } catch {
      deferredPromptRef.current = null;
      setCanInstall(false);
    }
  }, []);

  // ====== DATA YANG MUDAH DIEDIT ======
  const SERVICE_HOURS = [
    { hari: "Senin - Jumat", jam: "08.00 - 16.00 WIB" },
    { hari: "Sabtu", jam: "Tutup" },
    { hari: "Darurat (Pengaduan & Kehilangan)", jam: "24 Jam (Hotline)" },
  ];

  const CONTACT_INFO = {
    hotline: "110",
    telp: "-",
    email: "sektanjungrajaresoganilir.sumsel@polri.go.id",
    whatsapp: "https://wa.me/6289661473519?text=Halo%20Polsek%20Tanjung%20Raja",
  };

  // ====== STATE KHUSUS UNTUK INFO LAYANAN (jangan bentrok dgn state lain) ======
  const [infoTab, setInfoTab] = useState("waktu"); // 'waktu' | 'kontak' | 'lokasi'

  // Query alamat untuk Google Maps (sudah di-encode)
  const encodedAddress =
    "MQ5F%2BVG3%2C%20Jl.%20Tj.%20Raja%20Selatan%2C%20Tj.%20Raja%20Bar.%2C%20Kec.%20Tj.%20Raja%2C%20Kabupaten%20Ogan%20Ilir%2C%20Sumatera%20Selatan%2030967";

  const mapsEmbedSrc = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
  const mapsOpenLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const mapsDirectionsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

  // ====== STATE UNTUK TAB/SLIDER INFO LAYANAN ======
  const [activeTab, setActiveTab] = useState(0); // 0: Waktu, 1: Kontak, 2: Lokasi
  const slideRefs = [useRef(null), useRef(null), useRef(null)];
  const scrollAreaRef = useRef(null);

  // sinkronkan activeTab saat user menggeser kartu (mobile)
  useEffect(() => {
    const area = scrollAreaRef.current;
    if (!area) return;

    const onScroll = () => {
      const { scrollLeft, offsetWidth } = area;
      const idx = Math.round(scrollLeft / offsetWidth);
      if (idx !== activeTab) setActiveTab(idx);
    };

    area.addEventListener("scroll", onScroll, { passive: true });
    return () => area.removeEventListener("scroll", onScroll);
  }, [activeTab]);

  
  /* ==========================
     ✅ Cuplikan Berita (Beranda)
  ========================== */
  const [newsRows, setNewsRows] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsErr, setNewsErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setNewsLoading(true);
        setNewsErr("");
        const res = await get("/berita");
        if (!alive) return;

        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        // urutkan terbaru
        const sorted = items
          .slice()
          .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));

        setNewsRows(sorted);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setNewsErr(e?.message || "Gagal memuat cuplikan berita.");
        setNewsRows([]);
      } finally {
        if (alive) setNewsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const newsPreview = useMemo(() => {
    // tampilkan 4 berita terbaru
    return (newsRows || []).slice(0, 4);
  }, [newsRows]);

  const NewsPreviewCard = ({ post }) => {
    const img = getImages(post)[0] || "/placeholder-wide.jpg";
    return (
      <button
        type="button"
        onClick={() => post?.slug && navigate(`/berita/${post.slug}`)}
        className="group text-left flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 hover:shadow-lg transition-shadow"
      >
        <div className="relative aspect-[16/10] w-full">
          <img
            src={resolveImageUrl(img)}
            alt={post?.title || "Berita"}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
            onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
            loading="lazy"
          />
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600">{formatDate(post?.date)}</p>
          <h3 className="mt-2 line-clamp-2 text-base sm:text-lg font-extrabold leading-snug text-gray-900">
            {post?.title || "-"}
          </h3>
          {post?.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm text-gray-700">{post.excerpt}</p>
          ) : (
            <p className="mt-2 line-clamp-3 text-sm text-gray-500">
              Baca ringkasan berita terbaru dari Polsek.
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
            Selengkapnya
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </button>
    );
  };

  /* ==========================
     ✅ Cuplikan Edukasi (Beranda)
  ========================== */
  const [eduRows, setEduRows] = useState([]);
  const [eduLoading, setEduLoading] = useState(true);
  const [eduErr, setEduErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setEduLoading(true);
        setEduErr("");
        const res = await get("/edukasi");
        if (!alive) return;

        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        // urutkan terbaru
        const sorted = items
          .slice()
          .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));

        setEduRows(sorted);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setEduErr(e?.message || "Gagal memuat cuplikan edukasi.");
        setEduRows([]);
      } finally {
        if (alive) setEduLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const eduPreview = useMemo(() => {
    // tampilkan 4 edukasi terbaru
    return (eduRows || []).slice(0, 4);
  }, [eduRows]);

  const EduPreviewCard = ({ post }) => {
    const img = getImages(post)[0] || "/placeholder-wide.jpg";
    return (
      <button
        type="button"
        onClick={() => post?.slug && navigate(`/edukasi/${post.slug}`)}
        className="group text-left flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 hover:shadow-lg transition-shadow"
      >
        <div className="relative aspect-[16/10] w-full">
          <img
            src={resolveImageUrl(img)}
            alt={post?.title || "Edukasi"}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
            onError={(e) => (e.currentTarget.src = "/placeholder-wide.jpg")}
            loading="lazy"
          />
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600">{formatDate(post?.date)}</p>
          <h3 className="mt-2 line-clamp-2 text-base sm:text-lg font-extrabold leading-snug text-gray-900">
            {post?.title || "-"}
          </h3>
          {post?.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm text-gray-700">{post.excerpt}</p>
          ) : (
            <p className="mt-2 line-clamp-3 text-sm text-gray-500">
              Baca edukasi keamanan & informasi untuk masyarakat.
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
            Selengkapnya
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white">
      {/* NAVBAR */}
      <Navbar />

      {/* WRAPPER: jarak antar section dipadatkan */}
      <main className="space-y-12 md:space-y-16 lg:space-y-20">
        {/* HERO FULL-SCREEN (desktop) */}
        <section className="w-full min-h-[calc(100vh-64px)] pt-24 lg:pt-28 flex items-center scroll-mt-24 md:scroll-mt-32">
          {/* Full-bleed container dengan padding responsif */}
          <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-28">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-10 items-center">
              {/* KIRI: lambang + judul + kutipan + tombol install + garis kuning */}
              <div className="order-2 xl:order-1">
                <div className="flex items-center gap-3 sm:gap-4">
                  <img
                    src={lambangPolri}
                    alt="Lambang Polri"
                    className="w-14 h-14 sm:w-16 sm:h-16"
                    loading="lazy"
                  />
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-black">
                    Polsek Tanjung Raja
                  </h1>
                </div>

                <p className="mt-3 text-sm sm:text-base md:text-lg leading-relaxed text-black max-w-xl">
                  “Polisi sektor Tanjung Raja berkomitmen untuk menjadi institusi yang tangguh
                  dan terpercaya dalam menjaga keamanan, dengan fokus pada pelayanan yang cepat,
                  tepat, dan profesional, demi menciptakan lingkungan yang aman dan sejahtera
                  bagi masyarakat”
                </p>

                {/* ✅ BUTTON INSTALL PWA: tepat di bawah tulisan/quote */}
                {canInstall && !isInstalled && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <path d="M12 16l4-5h-3V4h-2v7H8l4 5z" />
                        <path d="M20 18H4v2h16v-2z" />
                      </svg>
                      Install Aplikasi
                    </button>
                    <p className="mt-2 text-xs sm:text-sm text-gray-600 max-w-xl">
                      Pasang aplikasi Polsek Tanjung Raja agar lebih cepat diakses dari layar utama.
                    </p>
                  </div>
                )}

                {/* garis kuning pendek, ujung membulat */}
                <div className="mt-4 h-1 w-40 bg-[#F8C301] rounded-full" />
              </div>

              {/* KANAN: foto gedung membulat, skala mengikuti tinggi layar */}
              <div className="order-1 xl:order-2">
                <div className="w-full h-[34vh] sm:h-[46vh] md:h-[52vh] lg:h-[60vh] xl:h-[64vh] 2xl:h-[70vh]">
                  <img
                    src={heroBuilding}
                    alt="Gedung Polsek Tanjung Raja"
                    className="w-full h-full rounded-3xl shadow-md object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VIDEO LAYANAN SPKT */}
        <section id="video-spkt" className="py-10 md:py-14 bg-white scroll-mt-24 md:scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Heading: judul + garis di bawah */}
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
                Video
              </h2>
              {/* Garis tepat di bawah judul */}
              <div className="mx-auto mt-2 h-0.5 w-28 bg-black/80 rounded" />
            </div>

            {/* Layout 2 kolom: kiri video, kanan penjelasan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
              {/* Kiri: Video */}
              <div className="relative overflow-hidden rounded-2xl shadow-xl">
                <div className="aspect-video bg-black">
                  <video
                    className="w-full h-full"
                    controls
                    preload="metadata"
                    poster={profilPoster}
                    playsInline
                    aria-label="Video Layanan SPKT"
                  >
                    <source src={profilVideo} type="video/mp4" />
                  </video>
                </div>
              </div>

              {/* Kanan: Penjelasan singkat */}
              <div className="flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Layanan SPKT
                </h3>
                <p className="mt-2 text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                  Cuplikan ringkas mengenai layanan di SPKT dan gambaran alur pelayanan.
                </p>

                <div className="mt-5">
                  <a
                    href={profilVideo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-900 transition"
                  >
                    Tonton Penuh
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ✅ CUPLIKAN BERITA */}
        <section id="cuplikan-berita" className="py-10 md:py-14 bg-white scroll-mt-24 md:scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
                  Berita Terbaru
                </h2>
                <div className="mt-2.5 h-1 w-28 rounded-full bg-black mx-auto md:mx-0" />
                <p className="mt-3 text-gray-600 text-base md:text-lg">
                  Kilas singkat kegiatan & informasi terbaru dari Polsek.
                </p>
              </div>

              <button
                onClick={() => navigate("/berita")}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-900 shadow hover:bg-yellow-300"
              >
                Lihat Semua Berita
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {newsErr && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {newsErr}
              </div>
            )}

            {newsLoading ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-200" />
                ))}
              </div>
            ) : newsPreview.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-black/10 bg-white p-8 text-center text-gray-600">
                Belum ada berita untuk ditampilkan.
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {newsPreview.map((post) => (
                  <NewsPreviewCard key={post?.id || post?.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ✅ CUPLIKAN EDUKASI (di bawah Berita) */}
        <section id="cuplikan-edukasi" className="py-10 md:py-14 bg-white scroll-mt-24 md:scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
                  Edukasi Terbaru
                </h2>
                <div className="mt-2.5 h-1 w-28 rounded-full bg-black mx-auto md:mx-0" />
                <p className="mt-3 text-gray-600 text-base md:text-lg">
                  Informasi edukasi hukum & keamanan untuk masyarakat.
                </p>
              </div>

              <button
                onClick={() => navigate("/edukasi")}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 py-3 text-sm font-semibold text-gray-900 shadow hover:bg-yellow-300"
              >
                Lihat Semua Edukasi
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M4.5 12a.75.75 0 0 1 .75-.75h12.19l-2.72-2.72a.75.75 0 0 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06l2.72-2.72H5.25A.75.75 0 0 1 4.5 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {eduErr && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                {eduErr}
              </div>
            )}

            {eduLoading ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-200" />
                ))}
              </div>
            ) : eduPreview.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-black/10 bg-white p-8 text-center text-gray-600">
                Belum ada edukasi untuk ditampilkan.
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {eduPreview.map((post) => (
                  <EduPreviewCard key={post?.id || post?.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FITUR UTAMA */}
        <section id="fitur-utama" className="py-10 md:py-14 bg-[#FAF2DE] scroll-mt-24 md:scroll-mt-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
                Fitur Utama
              </h2>
              <div className="mx-auto mt-2.5 h-1 w-28 rounded-full bg-[#000000]" />
              <p className="mt-3 text-base md:text-xl text-gray-700 leading-relaxed">
                Website menawarkan berbagai fitur untuk memudahkan proses pelayanan masyarakat
                di lingkungan Sektor Tanjung Raja.
              </p>
            </div>

            <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* Card 1 */}
              <article className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/90 grid place-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 fill-white">
                      <path d="M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM12 11a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm0 8a1.25 1.25 0 110-2.5A1.25 1.25 0 0112 19z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">Pelaporan Online</h3>
                    <p className="mt-2 text-sm md:text-lg text-gray-600 leading-relaxed">
                      Laporkan kejadian atau pelanggaran, unggah bukti, dan dapatkan nomor laporan
                      untuk pantau perkembangan secara berkala.
                    </p>
                  </div>
                </div>
              </article>

              {/* Card 2 */}
              <article className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/90 grid place-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 fill-white">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zM8 9h4v2H8V9z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">Pengajuan Surat</h3>
                    <p className="mt-2 text-sm md:text-lg text-gray-600 leading-relaxed">
                      Ajukan surat resmi secara online dengan mengisi formulir yang diperlukan untuk verifikasi.
                    </p>
                  </div>
                </div>
              </article>

              {/* Card 3 */}
              <article className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/90 grid place-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 fill-white">
                      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">Profil Terintegrasi Polsek</h3>
                    <p className="mt-2 text-sm md:text-lg text-gray-600 leading-relaxed">
                      Informasi lengkap tentang Polsek: Kapolsek, struktur, fasilitas, berita
                      kegiatan, serta materi Edukasi Masyarakat.
                    </p>
                  </div>
                </div>
              </article>

              {/* Card 4 */}
              <article className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/90 grid place-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 fill-white">
                      <path d="M10 2a8 8 0 105.3 14.1l4.3 4.3 1.4-1.4-4.3-4.3A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-900">Cek Status</h3>
                    <p className="mt-2 text-sm md:text-lg text-gray-600 leading-relaxed">
                      Pantau status laporan dan pengajuan surat dengan memasukkan nomor laporan/pengajuan.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* INFO LAYANAN (Modern & Elegan) */}
        <section
          id="info-layanan"
          className="relative py-10 md:py-14 bg-white scroll-mt-24 md:scroll-mt-32"
        >
          <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(60%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Heading */}
            <div className="text-center mb-8 md:mb-10">
              <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                Info Layanan
              </h2>
              <div className="mx-auto mt-2.5 h-1 w-28 rounded-full bg-[#000000]" />
              <p className="mt-3 text-gray-600 text-base md:text-lg">
                Jam operasional, saluran kontak, sampai titik lokasi—dirangkum dalam satu tempat yang nyaman dilihat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {/* MENU SAMPING (desktop) */}
              <aside className="hidden md:block">
                <nav className="bg-white/80 backdrop-blur-xl rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                  {[
                    {
                      key: "waktu",
                      label: "Waktu Pelayanan",
                      desc: "Jam operasional loket & darurat",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path
                            d="M12 8v5l3 3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      ),
                    },
                    {
                      key: "kontak",
                      label: "Informasi Kontak",
                      desc: "Hotline, telp, email & WA",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path
                            d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0  0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L9.1 11.1a16 16 0 0 0 4.8 4.8l1.46-1.26a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                    },
                    {
                      key: "lokasi",
                      label: "Lokasi",
                      desc: "Peta & rute menuju kantor",
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5">
                          <path
                            d="M9 20l-5.447-2.724A2 2 0 0 1 2 15.447V5.553A2 2 0 0 1 3.553 3.106L9 6l6-3 5.447 2.724A2 2 0 0 1 21 8.553v9.894A2 2 0 0 1 19.447 21.894L15 19l-6 3z"
                            fill="currentColor"
                          />
                        </svg>
                      ),
                    },
                  ].map((m) => {
                    const active = infoTab === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setInfoTab(m.key)}
                        className={[
                          "group w-full text-left px-5 py-4 relative flex items-start gap-3 border-b border-black/5 last:border-b-0",
                          active ? "bg-[#FFF5D1]" : "hover:bg-black/[0.02]",
                        ].join(" ")}
                      >
                        {/* strip indikator */}
                        <span
                          className={[
                            "absolute left-0 top-0 h-full w-1 transition-all",
                            active ? "bg-[#F8C301]" : "bg-transparent group-hover:bg-black/10",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "inline-grid place-items-center rounded-xl size-9 shrink-0",
                            active ? "bg-[#F8C301] text-black" : "bg-black/5 text-gray-700 group-hover:bg-black/10",
                          ].join(" ")}
                        >
                          {m.icon}
                        </span>
                        <span>
                          <div className="font-semibold text-gray-900">{m.label}</div>
                          <div className="text-sm text-gray-500">{m.desc}</div>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* MOBILE TABS */}
              <div className="md:hidden">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { key: "waktu", label: "Waktu" },
                    { key: "kontak", label: "Kontak" },
                    { key: "lokasi", label: "Lokasi" },
                  ].map((t) => {
                    const active = infoTab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setInfoTab(t.key)}
                        className={[
                          "px-4 py-2 rounded-full border text-sm whitespace-nowrap transition",
                          active
                            ? "bg-[#F8C301] border-[#F8C301] text-black shadow-sm"
                            : "bg-white/70 border-black/10 text-gray-700",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KONTEN */}
              <div className="md:col-span-2">
                <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-white/80 backdrop-blur-xl shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)]">
                  {/* aksen gradien halus */}
                  <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#F8C301]/20 blur-3xl" />
                  <div className="p-5 sm:p-7 lg:p-8">
                    {/* WAKTU */}
                    {infoTab === "waktu" && (
                      <div className="animate-[fadeIn_.4s_ease]">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Waktu Pelayanan</h3>
                        <p className="mt-2 text-gray-600">Jam layanan loket & kanal darurat yang selalu siaga.</p>

                        <div className="mt-5 grid gap-4">
                          {SERVICE_HOURS.map((row) => (
                            <div
                              key={row.hari}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-5 py-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-3">
                                <span className="grid place-items-center rounded-xl size-9 bg-black/90 text-white shrink-0">
                                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                                    <path
                                      d="M20 7.5V6a2 2 0 0 0-2-2h-1.5M4 7.5V6a2 2 0 0 1 2-2h1.5M20 16.5V18a2 2 0 0 1-2 2h-1.5M4 16.5V18a2 2 0 0 0 2 2h1.5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      fill="none"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </span>
                                <div>
                                  <div className="font-semibold text-gray-900">{row.hari}</div>
                                  <div className="text-sm text-gray-500">Operasional</div>
                                </div>
                              </div>
                              <div className="sm:text-right">
                                <div className="font-semibold text-gray-900">{row.jam}</div>
                                <div className="text-xs text-gray-500">WIB</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KONTAK */}
                    {infoTab === "kontak" && (
                      <div className="animate-[fadeIn_.4s_ease]">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Informasi Kontak</h3>
                        <p className="mt-2 text-gray-600">Hubungi kami lewat saluran resmi di bawah ini.</p>

                        <div className="mt-5 grid gap-4">
                          {/* Hotline */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid place-items-center rounded-xl size-9 bg-black/90 text-white shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path
                                    d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.5-.36 9.6 9.6 0 0 0 3 .48 1.5 1.5 0 0 1 1.5 1.5V20a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.62-3.3A19.8 19.8 0 0 1 2 6.18 2 2 0 0 1 4 4h3.1a1.5 1.5 0 0 1 1.5 1.5 9.6 9.6 0 0 0 .48 3 1.5 1.5 0 0 1-.36 1.5l-2.12 2.8z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900">Hotline Layanan 24 Jam</div>
                                <div className="text-sm text-gray-500 break-words">{CONTACT_INFO.hotline}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`tel:${CONTACT_INFO.hotline.replace(/\s|\+/g, "")}`}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-900"
                              >
                                Telepon
                              </a>
                              <button
                                onClick={() => navigator.clipboard?.writeText(CONTACT_INFO.hotline)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/[0.03]"
                              >
                                Salin
                              </button>
                            </div>
                          </div>

                          {/* Telepon */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid place-items-center rounded-xl size-9 bg-black/90 text-white shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path
                                    d="M2 6h20M2 12h20M2 18h20"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900">Telepon</div>
                                <div className="text-sm text-gray-500 break-words">{CONTACT_INFO.telp}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`tel:${CONTACT_INFO.telp.replace(/\s|\(|\)|-/g, "")}`}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-900"
                              >
                                Telepon
                              </a>
                              <button
                                onClick={() => navigator.clipboard?.writeText(CONTACT_INFO.telp)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/[0.03]"
                              >
                                Salin
                              </button>
                            </div>
                          </div>

                          {/* Email */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid place-items-center rounded-xl size-9 bg-black/90 text-white shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="2" />
                                  <path d="M22 6l-10 7L2 6" fill="none" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900">Email</div>
                                <div className="text-sm text-gray-500 break-words">{CONTACT_INFO.email}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`mailto:${CONTACT_INFO.email}`}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-900"
                              >
                                Kirim Email
                              </a>
                              <button
                                onClick={() => navigator.clipboard?.writeText(CONTACT_INFO.email)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/[0.03]"
                              >
                                Salin
                              </button>
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid place-items-center rounded-xl size-9 bg-black/90 text-white shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                  <path
                                    d="M20 11.5A8.5 8.5 0 1 1 11.5 3 8.5 8.5 0 0 1 20 11.5z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  />
                                  <path
                                    d="M8.5 8.5c.5 2 2.5 4 4.5 4.5l1.5-1.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900">WhatsApp</div>
                                <div className="text-sm text-gray-500">Balasan cepat via WA resmi</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={CONTACT_INFO.whatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#25D366] text-black text-sm font-semibold hover:opacity-90"
                              >
                                Chat WhatsApp
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LOKASI */}
                    {infoTab === "lokasi" && (
                      <div className="animate-[fadeIn_.4s_ease]">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Lokasi</h3>
                        <p className="mt-2 text-gray-600">
                          MQ5F+VG3, Jl. Tj. Raja Selatan, Tj. Raja Bar., Kec. Tj. Raja, Kabupaten Ogan Ilir, Sumatera Selatan 30967
                        </p>

                        <div className="mt-5 rounded-2xl overflow-hidden border border-black/5 bg-white/70">
                          <div className="aspect-video">
                            <iframe
                              src={mapsEmbedSrc}
                              className="w-full h-full border-0"
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title="Lokasi Polsek Tanjung Raja"
                            />
                          </div>
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <a
                              href={mapsOpenLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-900"
                            >
                              Buka di Google Maps
                            </a>
                            <a
                              href={mapsDirectionsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/[0.03]"
                            >
                              Rute ke Lokasi
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* /KONTEN */}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
};

export default Beranda;
