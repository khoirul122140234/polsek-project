// src/components/Footer.js
import React from "react";
// npm i react-icons
import { FaTiktok, FaFacebookF, FaYoutube } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

export default function Footer() {
  return (
    <footer className="bg-[#F8C301] text-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* TOP BAR: Developed by (responsif, tidak absolute lagi) */}
        <div className="pt-4 sm:pt-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs sm:text-sm md:text-base font-normal text-center sm:text-right">
              Developed by{" "}
              <a
                href="https://www.instagram.com/khoirulrijalwicaksono/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-black hover:text-blue-700 transition-colors break-words"
              >
                Khoirul Rijal Wicaksono
              </a>
            </p>
          </div>
        </div>

        {/* MAIN */}
        <div className="py-7 sm:py-8">
          {/* mobile: 1 kolom | lg: 2 kolom */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            {/* LEFT: Logo + Identitas */}
            <div className="w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                <img
                  src="/lambang-polri.png"
                  alt="Lambang Polri"
                  className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 shrink-0"
                  loading="lazy"
                />

                <div className="min-w-0 text-center sm:text-left">
                  <h2 className="font-extrabold tracking-tight leading-tight text-xl sm:text-2xl lg:text-4xl">
                    POLSEK TANJUNG RAJA
                  </h2>

                  {/* max width bertahap biar enak dibaca di semua layar */}
                  <p className="mt-1 text-xs sm:text-sm md:text-base leading-snug mx-auto sm:mx-0 max-w-xs sm:max-w-md lg:max-w-xl break-words">
                    Jl. Tj. Raja Selatan, Tj. Raja Bar., Kec. Tj. Raja, Kabupaten
                    Ogan Ilir, Sumatera Selatan 30967
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Sosial Media */}
            <div className="w-full flex flex-col items-center lg:items-end gap-3 lg:gap-4">
              <p className="font-semibold text-base sm:text-lg">Sosial Media</p>

              {/* ✅ Link dimasukkan DI DALAM ikon (tanpa buat tempat baru) */}
              <div className="flex flex-wrap justify-center lg:justify-end gap-3 sm:gap-4">
                <a
                  href="https://www.tiktok.com/@polsektanjungraja1"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok polsektanjungraja1"
                  title="TikTok: @polsektanjungraja1"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <FaTiktok className="text-xl sm:text-2xl md:text-3xl text-black" />
                </a>

                <a
                  href="https://www.facebook.com/people/Polsek-Tanjung-Raja/100092595707946/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Polsek Tanjung Raja"
                  title="Facebook: Polsek Tanjung Raja"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <FaFacebookF className="text-xl sm:text-2xl md:text-3xl text-black" />
                </a>

                <a
                  href="https://www.instagram.com/polisi_tanjungraja/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram polisi_tanjungraja"
                  title="Instagram: polisi_tanjungraja"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <RiInstagramFill className="text-xl sm:text-2xl md:text-3xl text-black" />
                </a>

                <a
                  href="https://www.youtube.com/@PolsekTanjungRaja"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube PolsekTanjungRaja"
                  title="YouTube: @PolsekTanjungRaja"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <FaYoutube className="text-xl sm:text-2xl md:text-3xl text-black" />
                </a>

                {/* ✅ SnackVideo (SVG hitam) */}
                <a
                  href="https://sck.io/u/@polsektanjungr/brV4Zqdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SnackVideo Polsek Tanjung Raja"
                  title="SnackVideo"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-black"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {/* clapperboard sederhana */}
                    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5V8H3V6.5z" />
                    <path d="M3 9h18v10.5A2.5 2.5 0 0 1 18.5 22h-13A2.5 2.5 0 0 1 3 19.5V9z" />
                    {/* garis papan */}
                    <path
                      d="M6.2 4.2 9 8M10.8 4.2 13.6 8M15.4 4.2 18.2 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>

                {/* ✅ Helo (SVG tangan hitam) */}
                <a
                  href="https://s.helo-app.com/al/URmcNsUSQR"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Helo Polsek Tanjung Raja"
                  title="Helo"
                  className="inline-flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/10 hover:bg-black/15 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-black"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {/* ikon tangan sederhana */}
                    <path d="M8.5 11.3V6.8a1.3 1.3 0 0 1 2.6 0v4.5h.8V5.9a1.3 1.3 0 0 1 2.6 0v5.4h.8V7.2a1.3 1.3 0 0 1 2.6 0v7.1c0 3.9-2.7 6.7-6.6 6.7H9.7c-2.2 0-4-1.8-4-4v-3.2a1.3 1.3 0 0 1 2.6 0v.5h.2z" />
                  </svg>
                </a>
              </div>

              <p className="text-sm sm:text-base text-center lg:text-right">Call Center: 110</p>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="mt-6 sm:mt-8 border-t border-black/80 pt-3 sm:pt-4">
            <p className="font-semibold text-xs sm:text-sm md:text-base text-center sm:text-left">
              WEBSITE RESMI POLSEK TANJUNG RAJA © 2025
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}