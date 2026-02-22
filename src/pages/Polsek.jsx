import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Polsek() {
  const [tab, setTab] = useState("sejarah");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="pt-20 sm:pt-24 pb-14 sm:pb-16">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
            Polsek Tanjung Raja
          </h1>
          <div className="mx-auto mt-2.5 h-1 w-20 sm:w-28 rounded-full bg-[#000000]" />
          <p className="mt-2 text-gray-600 text-xs sm:text-sm md:text-base">
            Informasi singkat mengenai sejarah dan kondisi terkini Polsek Tanjung Raja.
          </p>

          {/* Tab Button */}
          <div className="mt-7 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-6 text-sm sm:text-base md:text-lg font-semibold">
            <button
              onClick={() => setTab("sejarah")}
              className={[
                "w-full sm:w-auto px-5 sm:px-6 py-2 rounded-[30px] border transition-all duration-200",
                tab === "sejarah"
                  ? "bg-yellow-400 text-black shadow-lg scale-[1.03] border-yellow-300"
                  : "bg-white text-gray-700 border-gray-200 hover:shadow-md hover:scale-[1.03]",
              ].join(" ")}
            >
              Sejarah
            </button>
            <button
              onClick={() => setTab("sekarang")}
              className={[
                "w-full sm:w-auto px-5 sm:px-6 py-2 rounded-[30px] border transition-all duration-200",
                tab === "sekarang"
                  ? "bg-yellow-400 text-black shadow-lg scale-[1.03] border-yellow-300"
                  : "bg-white text-gray-700 border-gray-200 hover:shadow-md hover:scale-[1.03]",
              ].join(" ")}
            >
              Sekarang
            </button>
          </div>

          {/* Konten */}
          <div className="mt-8 sm:mt-10">
            <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 shadow-md bg-white p-4 sm:p-6 md:p-8 transition hover:shadow-lg">
              {tab === "sejarah" ? (
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base md:text-lg break-words">
                  Polsek Tanjung Raja telah berdiri sejak masa pemerintahan Hindia Belanda. Sebelum berada di bawah naungan Polres Ogan Ilir (OI), satuan ini merupakan hasil pemekaran dari Polres Ogan Komering Ilir (OKI) dan terus berperan sebagai garda terdepan menjaga keamanan dan ketertiban masyarakat di wilayahnya.
                </p>
              ) : (
                <p className="text-gray-700 leading-relaxed text-sm sm:text-base md:text-lg break-words whitespace-pre-line">
                  Polsek Tanjung Raja saat ini menjadi ujung tombak pemeliharaan kamtibmas di wilayah Kecamatan Tanjung Raja dan bagian dari wilayah hukum Polres Ogan Ilir. Dipimpin oleh seorang Kapolsek, instansi ini berperan dalam penegakan hukum, pelayanan masyarakat, serta pencegahan tindak kriminal untuk menciptakan kondisi yang aman dan tertib.

                  {"\n\n"}
                  Saat ini Polsek Tanjung Raja memiliki sekitar 50 personel yang terbagi dalam beberapa unit operasional dan didukung oleh staf administrasi. Wilayah hukum Polsek mencakup tiga kecamatan, yaitu Kecamatan Tanjung Raja, Kecamatan Sungai Pinang, dan Kecamatan Rantau Panjang, dengan luas wilayah mencapai ±1.550,26 km². Polsek Tanjung Raja melayani sekitar ±99.641 jiwa penduduk yang tersebar di ±45 desa/kelurahan.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
