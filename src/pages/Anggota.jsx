// src/pages/Anggota.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { RESOLVED_API_BASE, RESOLVED_API_PREFIX } from "../lib/env";

const BASE = RESOLVED_API_BASE;
const API = RESOLVED_API_PREFIX;

async function toJsonOrThrow(res, fallback = "Request gagal") {
  if (!res.ok) {
    let msg = fallback;
    try {
      const t = await res.text();
      const j = JSON.parse(t);
      msg = j?.error || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function resolveUrl(p) {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  return `${BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

async function apiListUnits() {
  const res = await fetch(`${API}/units`, { cache: "no-store" });
  return toJsonOrThrow(res, "Gagal memuat unit");
}
async function apiListAnggotaByUnitId(unitId) {
  const res = await fetch(`${API}/anggota?unit_id=${unitId}`, { cache: "no-store" });
  return toJsonOrThrow(res, "Gagal memuat anggota");
}

/** ====== SORTING: KANIT paling atas ====== */
function jabatanRank(jabatan) {
  const j = String(jabatan || "").toLowerCase();
  // kalau mau lebih ketat: gunakan /^kanit\b/
  const isKanit = j.includes("kanit") || j.includes("ka unit") || j.includes("k a n i t");
  return isKanit ? 0 : 1;
}
function sortAnggota(arr = []) {
  return (arr || [])
    .slice()
    .sort((a, b) => {
      const ra = jabatanRank(a?.jabatan);
      const rb = jabatanRank(b?.jabatan);
      if (ra !== rb) return ra - rb;

      // tie-breaker: nama A-Z
      const na = String(a?.nama || "").toLowerCase();
      const nb = String(b?.nama || "").toLowerCase();
      return na.localeCompare(nb, "id");
    });
}

export default function Anggota() {
  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [anggota, setAnggota] = useState([]);

  const [loadingUnits, setLoadingUnits] = useState(true);
  const [errorUnits, setErrorUnits] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [errorMembers, setErrorMembers] = useState("");

  const [cacheMembers, setCacheMembers] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingUnits(true);
        setErrorUnits("");
        const u = await apiListUnits();
        if (!alive) return;
        setUnits(u);
        if (u?.length) setSelectedUnitId(u[0].id);
      } catch (e) {
        if (alive) setErrorUnits(e?.message || "Gagal memuat unit");
      } finally {
        if (alive) setLoadingUnits(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUnitId) {
      setAnggota([]);
      return;
    }

    // ambil dari cache kalau ada
    if (cacheMembers[selectedUnitId]) {
      setAnggota(cacheMembers[selectedUnitId]); // sudah kita simpan dalam kondisi ter-sort
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoadingMembers(true);
        setErrorMembers("");
        const a = await apiListAnggotaByUnitId(selectedUnitId);
        if (!alive) return;

        const sorted = sortAnggota(a);
        setAnggota(sorted);
        setCacheMembers((prev) => ({ ...prev, [selectedUnitId]: sorted }));
      } catch (e) {
        if (alive) setErrorMembers(e?.message || "Gagal memuat anggota");
      } finally {
        if (alive) setLoadingMembers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedUnitId, cacheMembers]);

  const selectedUnitData = useMemo(
    () => units.find((u) => String(u.id) === String(selectedUnitId)),
    [selectedUnitId, units]
  );

  return (
    <section className="relative min-h-screen w-full bg-gray-50 pt-16">
      {/* ✅ Tambahan: isi SPACE kosong di atas (background gradient naik mentok, tanpa geser posisi konten) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 sm:h-24 bg-gradient-to-r from-black via-neutral-800 to-gray-600" />

      <Navbar />

      <div className="w-full bg-gradient-to-r from-black via-neutral-800 to-gray-600">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6 md:py-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
            Anggota Polsek
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-white/80">
            Peran &amp; Jabatan Anggota
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* ✅ Responsif: di layar kecil & tablet (md-) dropdown full width; mulai rapi kanan di lg */}
        <div className="mb-6 flex w-full items-center justify-end">
          <div className="relative w-full lg:w-auto">
            <select
              onChange={(e) => setSelectedUnitId(e.target.value)}
              value={selectedUnitId}
              disabled={loadingUnits || !!errorUnits}
              className="w-full lg:w-auto appearance-none rounded-full border border-gray-300 bg-white py-2.5 pl-4 pr-11 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingUnits && <option>Memuat unit…</option>}
              {errorUnits && <option>Gagal memuat unit</option>}
              {!loadingUnits &&
                !errorUnits &&
                units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 text-gray-700"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.1 1.02l-4.25 4.53a.75.75 0 01-1.1 0L5.21 8.25a.75.75 0 01.02-1.04z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* ✅ FIX UTAMA RESPONSIF:
            - JANGAN 3 kolom mulai sm (tablet jadi sempit)
            - Mulai 3 kolom di lg, jadi tablet (md) tetap 1 kolom / 2 kolom yang nyaman
        */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">Logo Unit</div>
            <div className="flex items-center justify-center">
              <img
                src={resolveUrl(selectedUnitData?.logo) || "/placeholder-logo.png"}
                alt="Logo unit"
                className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-logo.png";
                }}
              />
            </div>
          </div>

          <div className="min-w-0 lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-gray-700">Penjelasan Unit</div>

            {/* ✅ responsif: tinggi jangan “maksa” 40 di tablet; biarkan mengikuti konten, tetap ada batas nyaman */}
            <div className="rounded-xl border border-gray-200 p-4 text-sm leading-relaxed text-gray-700 break-words whitespace-pre-wrap">
              {loadingUnits
                ? "Memuat…"
                : errorUnits
                ? "Gagal memuat deskripsi unit."
                : selectedUnitData
                ? selectedUnitData.description
                : "Pilih unit untuk melihat deskripsi."}
            </div>
          </div>
        </div>

        {selectedUnitId ? (
          loadingMembers ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 sm:p-8 text-center text-gray-500">
              Memuat anggota…
            </div>
          ) : errorMembers ? (
            <div className="rounded-2xl border border-dashed border-red-300 p-6 sm:p-8 text-center text-red-600 break-words">
              {errorMembers}
            </div>
          ) : anggota.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 sm:p-8 text-center text-gray-500">
              Belum ada anggota untuk unit ini.
            </div>
          ) : (
            /* ✅ Responsif kartu anggota:
               - mobile: 1 kolom
               - tablet (md): 2 kolom (lebih pas dari 3)
               - desktop (lg): 3 kolom
            */
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {anggota.map((a) => (
                <div
                  key={a.id}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition hover:shadow-lg"
                >
                  {/* ✅ Ganti fixed height jadi aspect ratio agar konsisten di semua lebar layar */}
                  <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl">
                    <img
                      src={resolveUrl(a.foto_url) || "/placeholder-person.jpg"}
                      alt={a.nama}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-person.jpg";
                      }}
                    />
                    <div className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-3 sm:bottom-4">
                      <div className="rounded-lg bg-black/90 px-3 sm:px-4 py-2">
                        <div className="text-sm font-semibold leading-tight text-white break-words">
                          {a.nama}
                        </div>
                        <div className="mt-0.5 text-xs text-white/80 break-words">
                          {a.jabatan}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-6 sm:p-8 text-center text-gray-500">
            Pilih unit terlebih dahulu.
          </div>
        )}
      </div>

      <Footer />
    </section>
  );
}
