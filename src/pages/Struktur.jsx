// src/pages/Struktur.js
import React, { useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/* ---------- Kartu jabatan tanpa LAYER ---------- */
const Box = React.forwardRef(
  ({ title, color, subtitle, className = "", tight = false }, ref) => {
    const head = {
      red: "bg-red-600 text-white",
      blue: "bg-blue-600 text-white",
      green: "bg-emerald-600 text-white",
      lime: "bg-lime-600 text-black",
      amber: "bg-amber-400 text-black",
      slate: "bg-slate-800 text-white",
    }[color || "slate"];

    return (
      <div ref={ref} className={["inline-block", className].join(" ")}>
        {/* Hanya kotak putih tanpa layer belakang */}
        <div className="relative rounded-xl bg-white border border-slate-300/90 shadow-sm overflow-hidden min-w-[160px] text-center">
          <div className={["px-3 py-2 text-[13px] font-extrabold tracking-wide", head].join(" ")}>
            {title}
          </div>
          <div className={["bg-white", tight ? "py-2" : "py-3"].join(" ")}>
            {subtitle ? (
              <div className="text-[12px] font-medium text-slate-600">{subtitle}</div>
            ) : (
              <div className="h-3" />
            )}
          </div>
        </div>
      </div>
    );
  }
);
Box.displayName = "Box";

/* ---------- Kartu grup (wadah parent + anak) ---------- */
function GroupCard({ title, children, className = "", full = false }) {
  return (
    <div className={["relative", full ? "h-full" : "h-auto", className].join(" ")}>
      <div className={["relative h-full rounded-2xl bg-white border border-slate-200 shadow-md p-5", full ? "h-full" : "h-auto"].join(" ")}>
        {title && (
          <div className="mb-4">
            <h3 className="text-sm font-extrabold tracking-wide text-slate-800">{title}</h3>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default function Struktur() {
  // refs disimpan untuk fleksibilitas ke depan
  const rKapolsek = useRef(null);
  const rWakapolsek = useRef(null);

  const rProvost = useRef(null);
  const rKasiUmum = useRef(null);
  const rSPKT = useRef(null);
  const rKaA = useRef(null);
  const rKaB = useRef(null);
  const rKaC = useRef(null);

  const rKasihumas = useRef(null);

  const rIntelkam = useRef(null);
  const rReskrim = useRef(null);
  const rBinmas = useRef(null);
  const rSamapta = useRef(null);
  const rLantas = useRef(null);

  const rKaposLeft = useRef(null);
  const rKaposRight = useRef(null);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="pt-24 pb-16">
        {/* Judul */}
        <section className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="mt-1 text-3xl md:text-4xl font-black text-slate-900">
            STRUKTUR ORGANISASI POLSEK TANJUNG RAJA
          </h1>
          <div className="mx-auto mt-2.5 h-1 w-28 rounded-full bg-[#000000]" />
        </section>

        <section className="mt-10">
          <div className="relative max-w-6xl mx-auto px-6 space-y-10">
            {/* ====== GRUP: Pimpinan (Kapolsek + Wakapolsek) ====== */}
            <GroupCard title="PIMPINAN">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Box
                  ref={rKapolsek}
                  title="KAPOLSEK"
                  color="red"
                  subtitle="Pimpinan Utama"
                  className="w-[240px]"
                />
                <Box
                  ref={rWakapolsek}
                  title="WAKAPOLSEK"
                  color="red"
                  subtitle="Wakil Pimpinan"
                  className="w-[240px]"
                />
              </div>
            </GroupCard>

            {/* ====== GRID 2 kolom: kiri (Umum & SPKT), kanan (Humas) ====== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:items-start">
              {/* Kiri: Grup UMUM + SPKT & Anak → full height supaya rapi */}
              <GroupCard title="BAGIAN UMUM & SPKT" full className="md:self-stretch">
                <div className="flex flex-col items-center gap-6">
                  <Box
                    ref={rProvost}
                    title="KANIT PROVOST"
                    color="blue"
                    className="w-[220px]"
                    subtitle="Disiplin internal"
                  />

                  {/* Subgrup: Kasi Umum + SPKT */}
                  <div className="w-full">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                      <Box
                        ref={rKasiUmum}
                        title="KASI UMUM"
                        color="green"
                        className="w-[220px]"
                        subtitle="Administrasi & Umum"
                      />
                      <Box
                        ref={rSPKT}
                        title="SPKT"
                        color="lime"
                        className="w-[180px]"
                        subtitle="Pelayanan 24 jam"
                      />
                    </div>

                    {/* Anak SPKT (diperkecil) */}
                    <div className="mt-5">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 text-xs font-bold tracking-wide text-slate-700">
                          ANAK SPKT
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-items-center">
                          <Box
                            ref={rKaA}
                            title="KA SPKT A"
                            color="slate"
                            className="w-[140px] sm:w-[150px]"
                            tight
                          />
                          <Box
                            ref={rKaB}
                            title="KA SPKT B"
                            color="slate"
                            className="w-[140px] sm:w-[150px]"
                            tight
                          />
                          <Box
                            ref={rKaC}
                            title="KA SPKT C"
                            color="slate"
                            className="w-[140px] sm:w-[150px]"
                            tight
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GroupCard>

              {/* Kanan: HUMAS — compact agar tidak ada ruang kosong besar */}
              <GroupCard title="HUMAS" className="md:mt-[8px] h-auto">
                <div className="flex justify-center">
                  <Box
                    ref={rKasihumas}
                    title="KASIHUMAS"
                    color="green"
                    className="w-[200px]"
                    subtitle="Informasi Publik"
                  />
                </div>
              </GroupCard>
            </div>

            {/* ====== KANIT ====== */}
            <GroupCard title="JAJARAN KANIT">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 justify-items-center">
                <Box ref={rIntelkam} title="KANIT INTELKAM" color="amber" subtitle="Intelijen Keamanan" />
                <Box ref={rReskrim} title="KANIT RESKRIM" color="amber" subtitle="Reserse Kriminal" />
                <Box ref={rBinmas} title="KANIT BINMAS" color="amber" subtitle="Pembinaan Masyarakat" />
                <Box ref={rSamapta} title="KANIT SAMAPTA" color="amber" subtitle="Patroli & Pengamanan" />
                <Box ref={rLantas} title="KANIT LANTAS" color="amber" subtitle="Lalu Lintas" />
              </div>
            </GroupCard>

            {/* ====== Kapospol ====== */}
            <GroupCard title="KAPOSPOL">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-items-center max-w-3xl mx-auto">
                <Box
                  ref={rKaposLeft}
                  title="KAPOSPOL SUNGAI PINANG"
                  color="lime"
                  className="w-[300px]"
                  subtitle="Wilayah Sungai Pinang"
                />
                <Box
                  ref={rKaposRight}
                  title="KAPOSPOL RANTAU PANJANG"
                  color="lime"
                  className="w-[300px]"
                  subtitle="Wilayah Rantau Panjang"
                />
              </div>
            </GroupCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
