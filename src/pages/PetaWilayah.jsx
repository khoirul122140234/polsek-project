// src/pages/PetaWilayah.js
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// GANTI path & nama file di bawah dengan gambar peta milikmu,
// misalnya ../assets/peta-wilayah.png / .jpg / .webp
import petaWilayah from "../assets/peta-wilayah.jpg";

export default function PetaWilayah() {
  return (
    <section className="relative min-h-screen w-full bg-white pt-16">
      <Navbar />

      {/* Hero Section */}
      <div className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
          Peta Wilayah Polsek Tanjung Raja
        </h1>
        {/* Garis dekoratif */}
        <div className="mx-auto mt-2 h-1 w-24 bg-black rounded-full" />
        <p className="mt-3 text-sm sm:text-base md:text-lg text-gray-600">
          Informasi singkat mengenai cakupan wilayah hukum Polsek Tanjung Raja.
        </p>
      </div>

      {/* Wrapper konten */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        {/* Kartu/layer di belakang gambar */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/10">
          {/* Area gambar */}
          <figure className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="w-full bg-neutral-50 rounded-2xl ring-1 ring-black/5 grid place-items-center">
              <img
                src={petaWilayah}
                alt="Peta Wilayah"
                className="block max-h-[85vh] w-full object-contain"
                onError={(e) => {
                  // fallback jika file tidak ditemukan
                  e.currentTarget.alt =
                    "Gambar peta tidak ditemukan. Periksa path file.";
                  e.currentTarget.style.opacity = "0.5";
                }}
              />
            </div>
          </figure>
        </div>
      </div>

      <Footer />
    </section>
  );
}
