// src/pages/admin/DokumenAdmin.jsx
import React, { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import { api } from "../../lib/api";
import { RESOLVED_API_BASE } from "../../lib/env";

const cn = (...a) => a.filter(Boolean).join(" ");

function absUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${RESOLVED_API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso || "-";
  }
}

const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95";

export default function DokumenAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ Live search
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const fileRef = useRef(null);
  const titleRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileName: "",
    sortOrder: 0,
    isActive: true,
  });

  // ✅ Abort controller untuk cancel request saat user mengetik cepat
  const abortRef = useRef(null);

  function getErrMsg(e) {
    if (!e) return "Gagal memuat dokumen.";
    if (typeof e === "string") return e;
    if (e?.name === "AbortError") return ""; // dibatalkan -> jangan tampilkan error
    return e?.message || "Gagal memuat dokumen.";
  }

  const fetchRows = async (opts = {}) => {
    const nextQ = opts.q ?? q;

    // cancel request sebelumnya
    try {
      abortRef.current?.abort?.();
    } catch {}
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setLoading(true);
      setErr("");

      // ✅ sekarang: tidak ada includeInactive (fitur nonaktifkan dihapus)
      const res = await api.get("/documents", {
        params: {
          q: nextQ || undefined,
        },
        signal: ctrl.signal,
      });

      const items = Array.isArray(res?.items) ? res.items : [];
      setRows(items);
    } catch (e) {
      const msg = getErrMsg(e);
      if (msg) {
        console.error(e);
        setErr(msg);
        setRows([]);
      }
    } finally {
      // kalau request dibatalkan, jangan ubah state loading jadi "false" dari request lama
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchRows({ q: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Live search (debounce + aman karena abort request lama)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchRows({ q });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ✅ fokus judul saat modal dibuka
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      try {
        titleRef.current?.focus?.();
      } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      fileUrl: "",
      fileName: "",
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
    setTimeout(() => {
      if (fileRef.current) fileRef.current.value = "";
    }, 0);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row?.title || "",
      description: row?.description || "",
      fileUrl: row?.fileUrl || "",
      fileName: row?.fileName || "",
      sortOrder: Number(row?.sortOrder || 0),
      isActive: row?.isActive !== false,
    });
    setOpen(true);
    setTimeout(() => {
      if (fileRef.current) fileRef.current.value = "";
    }, 0);
  };

  const closeModal = () => {
    setOpen(false);
    setSaving(false);
    setUploading(false);
    setEditing(null);
  };

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onUploadFile = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setErr("");
      const up = await api.uploadDocument(file);
      const url = up?.url || up?.path || "";
      const name = up?.originalName || form.fileName || file.name || "";
      onChange("fileUrl", url);
      onChange("fileName", name);
    } catch (e) {
      console.error(e);
      setErr(getErrMsg(e) || "Gagal upload dokumen.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setErr("Judul dokumen wajib diisi.");
      return;
    }
    if (!form.fileUrl.trim()) {
      setErr("File dokumen wajib diupload atau diisi link fileUrl.");
      return;
    }

    try {
      setSaving(true);
      setErr("");

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        fileUrl: form.fileUrl.trim(),
        fileName: form.fileName.trim() || null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: !!form.isActive,
      };

      if (editing?.id) {
        await api.adminUpdateDocument(editing.id, payload);
      } else {
        await api.adminCreateDocument(payload);
      }

      closeModal();
      await fetchRows();
    } catch (e) {
      console.error(e);
      setErr(getErrMsg(e) || "Gagal menyimpan dokumen.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ HAPUS PERMANEN + popup konfirmasi
  const remove = async (row) => {
    const ok = window.confirm(
      `Yakin ingin menghapus PERMANEN dokumen ini?\n\n"${row?.title || "-"}"\n\nAksi ini tidak dapat dibatalkan.`
    );
    if (!ok) return;

    try {
      setErr("");
      // memakai endpoint yang sama seperti sebelumnya (nama fungsi tidak diubah)
      await api.adminDeleteDocument(row.id);
      await fetchRows();
    } catch (e) {
      console.error(e);
      setErr(getErrMsg(e) || "Gagal menghapus dokumen.");
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Dokumen</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Kelola dokumen yang tampil pada halaman publik (Tentang → Dokumen).
                </p>
              </div>

              <button
                type="button"
                onClick={openCreate}
                className={cn(btnBase, "bg-black text-white hover:bg-gray-900 w-full sm:w-auto")}
              >
                + Tambah Dokumen
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-10 min-w-0">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari judul / deskripsi..."
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Pencarian berjalan otomatis saat kamu mengetik.
                </div>
              </div>

              <div className="lg:col-span-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className={cn(btnBase, "w-full border border-black/10 hover:bg-black/[0.03]")}
                >
                  Reset
                </button>
              </div>
            </div>

            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {/* =========================
                MOBILE VIEW (Cards)
                ========================= */}
            <div className="md:hidden">
              {loading ? (
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-center text-sm text-gray-600">
                  Memuat dokumen...
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white px-4 py-8 text-center text-sm text-gray-600">
                  Belum ada dokumen.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {rows.map((r) => {
                    const active = r?.isActive !== false;
                    const file = absUrl(r?.fileUrl);
                    return (
                      <div key={r.id} className="rounded-2xl border border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold text-gray-900 break-words">{r.title}</div>
                            {r.description ? (
                              <div className="text-xs text-gray-600 mt-1 break-words">
                                {r.description}
                              </div>
                            ) : null}
                          </div>

                          <span
                            className={cn(
                              "shrink-0 inline-flex px-3 py-1 rounded-full text-[11px] font-semibold",
                              active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {active ? "AKTIF" : "NONAKTIF"}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                          <div className="rounded-xl border border-black/10 px-3 py-2">
                            <div className="text-[11px] text-gray-500">Update</div>
                            <div className="text-gray-800 break-words">{fmtDate(r.updatedAt)}</div>
                          </div>

                          <div className="rounded-xl border border-black/10 px-3 py-2">
                            <div className="text-[11px] text-gray-500">Urutan</div>
                            <div className="text-gray-800">{Number(r.sortOrder || 0)}</div>
                          </div>

                          <div className="rounded-xl border border-black/10 px-3 py-2">
                            <div className="text-[11px] text-gray-500">File</div>
                            {r.fileUrl ? (
                              <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 hover:underline break-words"
                              >
                                {r.fileName || r.fileUrl}
                              </a>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>

                        {/* ✅ PERBAIKAN AKSI MOBILE: rapi 2 kolom + tombol hapus full lebar */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className={cn(
                              btnBase,
                              "w-full border border-black/10 hover:bg-black/[0.03] min-h-[44px]"
                            )}
                          >
                            Edit
                          </button>

                          <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              btnBase,
                              "w-full bg-[#198CFB] text-white hover:bg-blue-600 min-h-[44px]"
                            )}
                          >
                            Download
                          </a>

                          <button
                            type="button"
                            onClick={() => remove(r)}
                            className={cn(
                              btnBase,
                              "col-span-2 w-full bg-red-600 text-white hover:bg-red-700 min-h-[44px]"
                            )}
                          >
                            Hapus Permanen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =========================
                DESKTOP/TABLE VIEW
                ========================= */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-black/10">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="text-left px-4 py-3">Judul</th>
                    <th className="text-left px-4 py-3">File</th>
                    <th className="text-left px-4 py-3">Urutan</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Aksi</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-600">
                        Memuat dokumen...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-gray-600">
                        Belum ada dokumen.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const active = r?.isActive !== false;
                      const file = absUrl(r?.fileUrl);
                      return (
                        <tr key={r.id} className="border-t border-black/5">
                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-gray-900 break-words whitespace-normal">
                              {r.title}
                            </div>
                            {r.description ? (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2 break-words whitespace-normal">
                                {r.description}
                              </div>
                            ) : null}
                            <div className="text-[11px] text-gray-500 mt-2">
                              Update: {fmtDate(r.updatedAt)}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            {r.fileUrl ? (
                              <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 hover:underline break-all"
                              >
                                {r.fileName || r.fileUrl}
                              </a>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">{Number(r.sortOrder || 0)}</td>

                          <td className="px-4 py-3 align-top">
                            <span
                              className={cn(
                                "inline-flex px-3 py-1 rounded-full text-xs font-semibold",
                                active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                              )}
                            >
                              {active ? "AKTIF" : "NONAKTIF"}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-top text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(r)}
                                className={cn(btnBase, "border border-black/10 hover:bg-black/[0.03]")}
                              >
                                Edit
                              </button>
                              <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(btnBase, "bg-[#198CFB] text-white hover:bg-blue-600")}
                              >
                                Download
                              </a>
                              {/* ✅ GANTI: Hapus Permanen (pakai confirm) */}
                              <button
                                type="button"
                                onClick={() => remove(r)}
                                className={cn(btnBase, "bg-red-600 text-white hover:bg-red-700")}
                              >
                                Hapus Permanen
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-500">
              Catatan: tombol “Hapus Permanen” akan menghapus dokumen dari sistem dan tidak dapat dibatalkan.
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Modal tetap seperti punyamu (tidak diubah) */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div
            className={cn(
              "relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-black/10",
              "max-h-[90vh] overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-black/10 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-gray-900">
                  {editing ? "Edit Dokumen" : "Tambah Dokumen"}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Upload file (PDF/DOC/DOCX) atau isi fileUrl jika sudah ada.
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className={cn(btnBase, "border border-black/10 hover:bg-black/[0.03] shrink-0")}
              >
                Tutup
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-800">Judul</label>
                  <input
                    ref={titleRef}
                    value={form.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="Contoh: SOP Pelayanan SPKT"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Urutan (sortOrder)</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => onChange("sortOrder", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-800">Deskripsi</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => onChange("description", e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="Deskripsi singkat dokumen..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-800">Upload File Dokumen</label>
                  <div className="mt-1 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => onUploadFile(e.target.files?.[0])}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white"
                      disabled={uploading}
                    />
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {uploading ? "Mengunggah..." : "PDF/DOC/DOCX (maks 15MB)"}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-800">fileUrl</label>
                  <input
                    value={form.fileUrl}
                    onChange={(e) => onChange("fileUrl", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="/uploads/docs/nama-file.pdf"
                  />
                  {form.fileUrl ? (
                    <a
                      href={absUrl(form.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 hover:underline mt-2 inline-block break-all"
                    >
                      Preview/Download: {absUrl(form.fileUrl)}
                    </a>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-800">fileName (opsional)</label>
                  <input
                    value={form.fileName}
                    onChange={(e) => onChange("fileName", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/20"
                    placeholder="Contoh: sop-spkt.pdf"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={!!form.isActive}
                    onChange={(e) => onChange("isActive", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Aktif (tampil di publik)
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 bg-white px-5 py-4 border-t border-black/10 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className={cn(btnBase, "border border-black/10 hover:bg-black/[0.03]")}
                disabled={saving || uploading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                className={cn(
                  btnBase,
                  "bg-black text-white hover:bg-gray-900",
                  (saving || uploading) && "opacity-70 cursor-not-allowed"
                )}
                disabled={saving || uploading}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
