// src/pages/admin/KapolsekAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "../../components/ui/Card";
import { Pencil, X, Check, AlertTriangle } from "lucide-react";
import { api } from "../../lib/api";
import { RESOLVED_API_BASE } from "../../lib/env";

// Samakan dengan halaman publik
const API_BASE = RESOLVED_API_BASE;

const resolveImageUrl = (u) => {
  if (!u) return "/placeholder-person.jpg";
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;
};

const ellipsis = (s, n = 60) =>
  !s ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s;

/* =========================
   Modal Edit
========================= */
function EditModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial || { peran: "kapolsek", nama: "", jabatan: "", pesan: "", bio: "", fotoUrl: "" }
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = initial || {
      peran: "kapolsek",
      nama: "",
      jabatan: "",
      pesan: "",
      bio: "",
      fotoUrl: "",
    };
    setForm(init);
    setFile(null);
    setPreview(init?.fotoUrl ? resolveImageUrl(init.fotoUrl) : "");
  }, [initial, open]);

  useEffect(() => {
    // cleanup object url
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!open) return null;

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const validate = () => {
    if (!form.nama?.trim()) return "Nama wajib diisi.";
    if (!form.jabatan?.trim()) return "Jabatan wajib diisi.";
    if (!form.pesan?.trim()) return "Pesan wajib diisi.";
    if (!form.bio?.trim()) return "Biografi wajib diisi.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      // jika user memilih file baru → upload dulu untuk dapat URL
      let fotoUrl = form.fotoUrl || "";
      if (file) {
        const { url } = await api.uploadImage(file); // { url: "/uploads/xxx.jpg" }
        fotoUrl = url;
      }

      await onSave({ ...form, fotoUrl });
    } catch (e) {
      alert(e?.message || "Gagal mengunggah/menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200">
        {/* ✅ responsif: header modal stack di mobile */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">
            Edit {form.peran === "kapolsek" ? "Kapolsek" : "Wakapolsek"}
          </h3>
          <button
            onClick={onClose}
            className="text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center justify-center gap-1"
            disabled={saving}
          >
            <X className="h-4 w-4" /> Tutup
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Peran</label>
            <select
              name="peran"
              value={form.peran}
              onChange={onChange}
              disabled={saving}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="kapolsek">Kapolsek</option>
              <option value="wakapolsek">Wakapolsek</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Nama</label>
            <input
              name="nama"
              value={form.nama}
              onChange={onChange}
              disabled={saving}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Jabatan</label>
            <input
              name="jabatan"
              value={form.jabatan}
              onChange={onChange}
              disabled={saving}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Pesan</label>
            <input
              name="pesan"
              value={form.pesan}
              onChange={onChange}
              disabled={saving}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Biografi</label>
            <textarea
              name="bio"
              rows={4}
              value={form.bio}
              onChange={onChange}
              disabled={saving}
              className="w-full border rounded-xl p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Upload file gambar */}
          <div className="md:col-span-2">
            <label className="text-sm font-semibold">Foto</label>

            {/* ✅ responsif: jadi kolom di mobile, baris di md */}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <div className="shrink-0">
                <img
                  src={preview || resolveImageUrl(form.fotoUrl)}
                  alt="Preview"
                  className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200"
                  onError={(e) => (e.currentTarget.src = "/placeholder-person.jpg")}
                />
              </div>

              <div className="grow min-w-0">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={onPickFile}
                  disabled={saving}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-black file:text-white hover:file:bg-black/90 border rounded-xl p-1"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Format: JPG/PNG/WEBP, maksimal ~3 MB (mengikuti validasi server).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ responsif: tombol full width di mobile */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 sm:w-auto"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Halaman Admin
========================= */
export default function KapolsekAdmin() {
  const [store, setStore] = useState({ kapolsek: null, wakapolsek: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setErr("");
    try {
      const j = await api.getProfiles(); // GET /leader-profiles
      setStore(j);
    } catch (e) {
      setErr(e?.message || "Gagal memuat data profil. Pastikan server API berjalan & CORS sesuai.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const rows = useMemo(() => {
    // tampilkan 2 baris tetap (agar bisa langsung edit walau data kosong)
    const kap = store.kapolsek
      ? { id: "kapolsek", peran: "kapolsek", ...store.kapolsek }
      : { id: "kapolsek", peran: "kapolsek", nama: "", jabatan: "", pesan: "", bio: "", fotoUrl: "" };

    const wak = store.wakapolsek
      ? { id: "wakapolsek", peran: "wakapolsek", ...store.wakapolsek }
      : { id: "wakapolsek", peran: "wakapolsek", nama: "", jabatan: "", pesan: "", bio: "", fotoUrl: "" };

    return [kap, wak];
  }, [store]);

  const handleEdit = (row) => {
    setEditing({ peran: row.peran, ...row });
    setOpen(true);
  };

  const saveRow = async (form) => {
    try {
      const payload = {
        nama: form.nama,
        jabatan: form.jabatan,
        pesan: form.pesan,
        bio: form.bio,
        fotoUrl: form.fotoUrl || "",
      };

      // PUT /leader-profiles/:roleKey
      await api.updateProfile(form.peran, payload);

      setOpen(false);
      setEditing(null);
      await fetchProfiles();
    } catch (e) {
      // ✅ tampilkan pesan asli dari server (Forbidden, Unauthorized, dsb)
      alert(e?.message || "Gagal menyimpan perubahan.");
      throw e;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ✅ wrapper responsif */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-black text-white shadow-lg p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Manajemen Profil — Kapolsek
              </h1>
              <p className="text-white/80 text-sm sm:text-base">
                Kelola data Kapolsek dan Wakapolsek yang tampil di halaman publik.
              </p>
            </div>
          </div>
        </div>

        {/* Error global */}
        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div className="text-sm whitespace-normal break-words overflow-wrap-anywhere">{err}</div>
          </div>
        )}

        {/* =========================
            MOBILE VIEW (cards) ✅
           ========================= */}
        <Card className="border border-slate-200 rounded-2xl overflow-hidden">
          <CardBody>
            {loading ? (
              <div className="p-6">
                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-4" />
                <div className="h-10 w-full bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                {/* ✅ cards untuk < md */}
                <div className="space-y-3 md:hidden">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={resolveImageUrl(r.fotoUrl)}
                          alt={r.nama || r.peran}
                          className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                          onError={(e) => (e.currentTarget.src = "/placeholder-person.jpg")}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {r.peran}
                          </div>
                          <div className="mt-1 font-semibold whitespace-normal break-words overflow-wrap-anywhere">
                            {r.nama || "—"}
                          </div>
                          <div className="text-sm text-slate-600 whitespace-normal break-words overflow-wrap-anywhere">
                            {r.jabatan || "—"}
                          </div>
                          <div className="mt-2 text-sm text-slate-700 whitespace-normal break-words overflow-wrap-anywhere">
                            {ellipsis(r.pesan || "", 120) || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <button
                          className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl text-white font-medium active:scale-[.99] transition bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleEdit(r)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ✅ table untuk >= md */}
                <div className="hidden md:block overflow-x-auto rounded-2xl ring-1 ring-slate-200 bg-white/80 backdrop-blur">
                  {/* ✅ fixed layout + colgroup biar stabil & teks wrap */}
                  <table className="min-w-[900px] w-full text-sm" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "120px" }} />
                      <col style={{ width: "220px" }} />
                      <col style={{ width: "220px" }} />
                      <col style={{ width: "auto" }} />
                      <col style={{ width: "120px" }} />
                      <col style={{ width: "170px" }} />
                    </colgroup>

                    <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur">
                      <tr className="text-slate-700">
                        {["Peran", "Nama", "Jabatan", "Pesan", "Foto", "Aksi"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-slate-50/70 align-top">
                          <td className="px-3 py-2 capitalize">{r.peran}</td>

                          <td className="px-3 py-2">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {r.nama || "—"}
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {r.jabatan || "—"}
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {ellipsis(r.pesan || "", 48) || "—"}
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={resolveImageUrl(r.fotoUrl)}
                                alt={r.nama || r.peran}
                                className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder-person.jpg";
                                }}
                              />
                            </div>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex gap-2 flex-wrap justify-end">
                              <button
                                className="min-w-[120px] inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-medium active:scale-[.99] transition bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => handleEdit(r)}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Modal */}
        <EditModal
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSave={saveRow}
          initial={editing ? { ...editing } : null}
        />
      </div>
    </div>
  );
}
