// src/pages/Dokumen.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { api, get } from "../lib/api";
import { RESOLVED_API_BASE } from "../lib/env";

// ✅ taruh file di: src/assets/
import pdfIcon from "../assets/icon-pdf.png";
import docIcon from "../assets/icon-doc.png";

const cn = (...a) => a.filter(Boolean).join(" ");

const resolveFileUrl = (u) => {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${s.replace(/^\//, "")}`;
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

function pick(obj, keys, fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function pickDate(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v) return v;
  }
  return "";
}

/* ✅ Ikon berdasarkan tipe file (PDF & DOC pakai gambar, bukan emoji) */
function getDocBadge(fileUrl, fileName) {
  const raw = String(fileName || fileUrl || "").toLowerCase();
  const ext = raw.split("?")[0].split("#")[0].split(".").pop() || "";

  // ✅ PDF & DOC pakai icon (gambar)
  if (ext === "pdf") return { iconType: "img", icon: "pdf", label: "PDF" };
  if (ext === "doc" || ext === "docx") return { iconType: "img", icon: "doc", label: "DOC" };

  // lainnya tetap seperti sebelumnya
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return { iconType: "emoji", emoji: "📊", label: "XLS" };
  if (ext === "ppt" || ext === "pptx") return { iconType: "emoji", emoji: "📽️", label: "PPT" };
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext))
    return { iconType: "emoji", emoji: "🖼️", label: "IMG" };
  if (ext === "zip" || ext === "rar" || ext === "7z") return { iconType: "emoji", emoji: "🗜️", label: "ZIP" };

  return { iconType: "emoji", emoji: "📄", label: (ext || "FILE").toUpperCase() };
}

function normalizeItems(res) {
  const raw = Array.isArray(res?.items)
    ? res.items
    : Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
    ? res.data
    : [];

  return raw.map((d, idx) => {
    const title = pick(d, ["title", "judul", "name", "nama"], `Dokumen ${idx + 1}`);
    const desc = pick(d, ["description", "deskripsi", "desc", "ringkasan"], "");
    const fileUrl = pick(d, ["fileUrl", "url", "link", "path"], "");
    const fileName = pick(d, ["fileName", "filename", "namaFile"], "");
    const updatedAt = pickDate(d, ["updatedAt", "updated_at", "date", "tanggal", "createdAt"]);

    return {
      id: d?.id ?? `${title}-${idx}`,
      title,
      desc,
      fileUrl,
      fileName,
      updatedAt,
    };
  });
}

export default function Dokumen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = api?.publicListDocuments ? await api.publicListDocuments() : await get("/public/documents");

        if (!alive) return;

        const items = normalizeItems(res);
        const sorted = items
          .slice()
          .sort((a, b) => new Date(b?.updatedAt || 0) - new Date(a?.updatedAt || 0));

        setRows(sorted);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message || "Gagal memuat dokumen.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = String(q || "").toLowerCase().trim();
    return (rows || []).filter((r) => {
      const hay = `${r.title} ${r.desc} ${r.fileName}`.toLowerCase();
      const okQ = !qq ? true : hay.includes(qq);
      return okQ;
    });
  }, [rows, q]);

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          {/* Header */}
          <div className="rounded-3xl bg-white border border-black/10 shadow-[0_6px_0_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="bg-gradient-to-r from-black to-gray-700 text-white px-6 sm:px-8 py-6 sm:py-7">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide">Dokumen</h1>
              <p className="mt-2 text-white/85 text-sm sm:text-base max-w-3xl">
                Dokumen tersedia untuk diunduh. Pastikan menggunakan dokumen versi terbaru.
              </p>
            </div>

            {/* Controls */}
            <div className="p-5 sm:p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-900">Cari dokumen</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ketik judul / kata kunci…"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {/* Error */}
              {err && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                  {err}
                </div>
              )}

              {/* List */}
              <div className="mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-gray-600">
                    Belum ada dokumen yang tersedia.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((r) => {
                      const url = resolveFileUrl(r.fileUrl);
                      const canDownload = !!url;
                      const badge = getDocBadge(r.fileUrl, r.fileName);

                      return (
                        <div
                          key={r.id}
                          className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="min-w-0">
                              {/* ✅ Badge tipe dokumen */}
                              <div className="inline-flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/5 text-gray-800">
                                  <span>{badge.label}</span>
                                </span>

                                {r.updatedAt ? (
                                  <span className="text-xs text-gray-500">
                                    Diperbarui: {formatDate(r.updatedAt)}
                                  </span>
                                ) : null}
                              </div>

                              <h3 className="mt-3 text-lg sm:text-xl font-extrabold text-gray-900 break-words">
                                {r.title}
                              </h3>

                              {r.desc ? (
                                <p
                                  className="mt-2 text-sm text-gray-600 leading-relaxed"
                                  style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
                                >
                                  {r.desc}
                                </p>
                              ) : null}

                              {r.fileName ? (
                                <p className="mt-2 text-xs text-gray-500 break-words">
                                  File: {r.fileName}
                                </p>
                              ) : null}
                            </div>

                            {/* ✅ Ikon besar di kanan (PDF/DOC pakai gambar) */}
                            <div className="shrink-0 self-start sm:self-auto">
                              <span
                                className={cn(
                                  "grid place-items-center rounded-2xl bg-black/5 overflow-hidden",
                                  // ✅ responsif: kecil di hp, membesar bertahap
                                  "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                                )}
                              >
                                {badge.iconType === "img" ? (
                                  <img
                                    src={badge.icon === "pdf" ? pdfIcon : docIcon}
                                    alt={`${badge.label} icon`}
                                    className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
                                    draggable={false}
                                  />
                                ) : (
                                  <span className="text-2xl">{badge.emoji}</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col sm:flex-row gap-2">
                            <a
                              href={canDownload ? url : undefined}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "w-full inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition",
                                canDownload
                                  ? "bg-black text-white hover:opacity-90"
                                  : "bg-gray-300 text-white cursor-not-allowed pointer-events-none"
                              )}
                            >
                              Download
                            </a>

                            {canDownload ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold border border-black/10 hover:bg-black/[0.03]"
                              >
                                Buka
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="w-full inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold border border-black/10 text-gray-500 cursor-not-allowed"
                                disabled
                              >
                                Link tidak tersedia
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 sm:px-5 py-4">
                <div className="font-semibold text-amber-900 text-sm sm:text-base">Catatan</div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-900/90 text-xs sm:text-sm leading-relaxed">
                  <li>
                    Halaman ini berisi kumpulan dokumen resmi yang dapat digunakan sebagai referensi, panduan, atau
                    kebutuhan administrasi.
                  </li>
                  <li>Gunakan fitur pencarian untuk menemukan dokumen berdasarkan judul, isi ringkas, atau nama file.</li>
                  <li>
                    Periksa informasi “Diperbarui” untuk memastikan kamu mengunduh versi terbaru dan sesuai ketentuan yang
                    berlaku.
                  </li>
                  <li>Gunakan tombol “Buka” untuk melihat dokumen terlebih dahulu, atau “Download” untuk menyimpan ke perangkat.</li>
                  <li>
                    Jika tombol unduh tidak aktif atau link tidak tersedia, kemungkinan dokumen sedang dalam proses
                    pembaruan atau belum dipublikasikan.
                  </li>
                  <li>
                    Apabila kamu membutuhkan dokumen tertentu namun tidak ditemukan, silakan hubungi petugas/administrator
                    untuk mendapatkan informasi lebih lanjut.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
