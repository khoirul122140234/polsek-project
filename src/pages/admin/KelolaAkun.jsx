// src/pages/admin/KelolaAkun.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api"; // ✅ fetch helper (return JSON langsung)

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

const ROLE_OPTIONS = [
  { value: "", label: "Semua Role" },
  { value: "SUPER_ADMIN", label: "SUPER ADMIN" },
  { value: "ADMIN_INTELKAM", label: "ADMIN INTELKAM" },
  { value: "ADMIN_KASIUM", label: "ADMIN KASIUM" },
  { value: "ADMIN_SPKT", label: "ADMIN SPKT" },
];

const ACTIVE_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

function prettyRole(role) {
  if (!role) return "—";
  return String(role).replace(/_/g, " ");
}

// helper aman untuk meta
function normalizeMeta(res, fallbackLimit = 10) {
  // backend bisa mengirim: { meta: {...}, data: [...] }
  // atau juga: { page, limit, total, totalPages, rows: [...] }
  const m = res?.meta || null;

  const page = Number(m?.page ?? res?.page ?? 1) || 1;
  const limit = Number(m?.limit ?? res?.limit ?? fallbackLimit) || fallbackLimit;
  const total = Number(m?.total ?? res?.total ?? 0) || 0;
  const totalPages = Number(m?.totalPages ?? res?.totalPages ?? 1) || 1;

  return { page, limit, total, totalPages: Math.max(1, totalPages) };
}

export default function KelolaAkun() {
  const me = useMemo(() => readUser(), []);
  const isSuperAdmin = me?.role === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const [selected, setSelected] = useState(null);

  // forms
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN_SPKT",
    nrp: "",
    pangkat: "",
    satuan: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "ADMIN_SPKT",
    nrp: "",
    pangkat: "",
    satuan: "",
    isActive: true,
  });

  const [passForm, setPassForm] = useState({ newPassword: "" });

  async function load(page = meta.page) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // ✅ api.adminListUsers() return JSON langsung
      const res = await api.adminListUsers({
        page,
        limit: meta.limit,
        q,
        role, // "" artinya semua role (tidak difilter)
        isActive, // "" artinya semua status
      });

      // ✅ support dua kemungkinan bentuk data:
      // - res.data (meta+data)
      // - res.rows (rows+total...)
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res?.rows) ? res.rows : [];

      setItems(rows);
      setMeta(normalizeMeta(res, meta.limit));
    } catch (e) {
      setError(e?.message || "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload saat filter berubah (debounce)
  useEffect(() => {
    if (!isSuperAdmin) return;
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, isActive]);

  function openCreate() {
    setError("");
    setSuccess("");
    setCreateForm({
      name: "",
      email: "",
      password: "",
      role: "ADMIN_SPKT",
      nrp: "",
      pangkat: "",
      satuan: "",
      isActive: true,
    });
    setShowCreate(true);
  }

  function openEdit(u) {
    setError("");
    setSuccess("");
    setSelected(u);
    setEditForm({
      name: u?.name || "",
      email: u?.email || "",
      role: u?.role || "ADMIN_SPKT",
      nrp: u?.nrp || "",
      pangkat: u?.pangkat || "",
      satuan: u?.satuan || "",
      isActive: !!u?.isActive,
    });
    setShowEdit(true);
  }

  function openResetPass(u) {
    setError("");
    setSuccess("");
    setSelected(u);
    setPassForm({ newPassword: "" });
    setShowResetPass(true);
  }

  function openDeactivate(u) {
    setError("");
    setSuccess("");
    setSelected(u);
    setShowDeactivate(true);
  }

  async function onCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        nrp: createForm.nrp || undefined,
        pangkat: createForm.pangkat || undefined,
        satuan: createForm.satuan || undefined,
        isActive: !!createForm.isActive,
      };

      const res = await api.adminCreateUser(payload);
      setSuccess(res?.message || "User berhasil dibuat");
      setShowCreate(false);
      await load(1);
    } catch (e2) {
      setError(e2?.message || "Gagal membuat user");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(e) {
    e.preventDefault();
    if (!selected?.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        nrp: editForm.nrp || null,
        pangkat: editForm.pangkat || null,
        satuan: editForm.satuan || null,
        isActive: !!editForm.isActive,
      };

      const res = await api.adminUpdateUser(selected.id, payload);
      setSuccess(res?.message || "User berhasil diperbarui");
      setShowEdit(false);
      await load(meta.page);
    } catch (e2) {
      setError(e2?.message || "Gagal memperbarui user");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword(e) {
    e.preventDefault();
    if (!selected?.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.adminResetUserPassword(selected.id, {
        newPassword: passForm.newPassword,
      });

      setSuccess(res?.message || "Password berhasil direset");
      setShowResetPass(false);
    } catch (e2) {
      setError(e2?.message || "Gagal reset password");
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate() {
    if (!selected?.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.adminDeactivateUser(selected.id);
      setSuccess(res?.message || "User berhasil dinonaktifkan");
      setShowDeactivate(false);
      await load(meta.page);
    } catch (e2) {
      setError(e2?.message || "Gagal menonaktifkan user");
    } finally {
      setSaving(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5">
            <div className="font-extrabold text-lg">Akses Ditolak</div>
            <div className="mt-1 text-sm">
              Halaman ini hanya untuk <b>SUPER_ADMIN</b>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ✅ responsif wrapper */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Kelola Akun
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              Tambah, edit, reset password, dan nonaktifkan akun admin.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
            disabled={loading || saving}
          >
            + Tambah Akun
          </button>
        </div>

        {(error || success) ? (
          <div className="mb-4 space-y-3">
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 whitespace-normal break-words overflow-wrap-anywhere">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 whitespace-normal break-words overflow-wrap-anywhere">
                {success}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow border border-black/5 p-5 mb-6">
          {/* ✅ grid lebih responsif */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="block text-sm font-semibold mb-1">Cari</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama / email / NRP / pangkat / satuan..."
                className="w-full p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-2xl border border-gray-300 bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
                className="w-full p-3 rounded-2xl border border-gray-300 bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                {ACTIVE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-3xl shadow border border-black/5 overflow-hidden">
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="font-bold">
              Data Akun{" "}
              <span className="text-gray-500 font-medium">({meta.total || 0})</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => load(meta.page)}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl border bg-white hover:bg-gray-50 font-semibold disabled:opacity-60"
                disabled={loading || saving}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-gray-200 rounded-2xl" />
                <div className="h-10 bg-gray-200 rounded-2xl" />
                <div className="h-10 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada data.</div>
          ) : (
            <>
              {/* ✅ MOBILE: card list */}
              <div className="p-4 space-y-3 md:hidden">
                {items.map((u) => {
                  const isMe = u?.id === me?.id;
                  return (
                    <div
                      key={u.id}
                      className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 whitespace-normal break-words overflow-wrap-anywhere">
                            {u.name}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-normal break-words overflow-wrap-anywhere">
                            {u.email}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                              {prettyRole(u.role)}
                            </span>
                            {u.isActive ? (
                              <span className="inline-flex px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                                Nonaktif
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 shrink-0 text-right">
                          <div className="font-medium">Dibuat</div>
                          <div className="whitespace-normal break-words overflow-wrap-anywhere">
                            {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                          <div className="text-xs text-gray-500 font-semibold">NRP</div>
                          <div className="text-gray-800 whitespace-normal break-words overflow-wrap-anywhere">
                            {u.nrp || "—"}
                          </div>
                        </div>
                        <div className="rounded-xl border bg-gray-50 p-3 text-sm">
                          <div className="text-xs text-gray-500 font-semibold">Satuan</div>
                          <div className="text-gray-800 whitespace-normal break-words overflow-wrap-anywhere">
                            {u.satuan || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="w-full px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                          disabled={saving}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openResetPass(u)}
                          className="w-full px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                          disabled={saving}
                        >
                          Reset
                        </button>

                        <button
                          onClick={() => openDeactivate(u)}
                          className="w-full px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60"
                          disabled={saving || isMe || !u.isActive}
                          title={isMe ? "Tidak bisa nonaktifkan diri sendiri" : "Nonaktifkan"}
                        >
                          Nonaktif
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ✅ DESKTOP/TABLET: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "200px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "240px" }} />
                  </colgroup>

                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Nama</th>
                      <th className="text-left px-5 py-3 font-semibold">Email</th>
                      <th className="text-left px-5 py-3 font-semibold">Role</th>
                      <th className="text-left px-5 py-3 font-semibold">NRP</th>
                      <th className="text-left px-5 py-3 font-semibold">Satuan</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-right px-5 py-3 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => {
                      const isMe = u?.id === me?.id;
                      return (
                        <tr key={u.id} className="border-t align-top">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-gray-900 whitespace-normal break-words overflow-wrap-anywhere">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Dibuat: {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {u.email}
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                              {prettyRole(u.role)}
                            </span>
                          </td>

                          <td className="px-5 py-3">{u.nrp || "—"}</td>

                          <td className="px-5 py-3">
                            <div className="whitespace-normal break-words overflow-wrap-anywhere">
                              {u.satuan || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            {u.isActive ? (
                              <span className="inline-flex px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <button
                                onClick={() => openEdit(u)}
                                className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                                disabled={saving}
                                title="Edit"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => openResetPass(u)}
                                className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                                disabled={saving}
                                title="Reset Password"
                              >
                                Reset
                              </button>

                              <button
                                onClick={() => openDeactivate(u)}
                                className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60"
                                disabled={saving || isMe || !u.isActive}
                                title={isMe ? "Tidak bisa nonaktifkan diri sendiri" : "Nonaktifkan"}
                              >
                                Nonaktif
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="p-4 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Halaman <b>{meta.page}</b> dari <b>{meta.totalPages || 1}</b>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => load(Math.max(1, meta.page - 1))}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold disabled:opacity-60"
                disabled={loading || saving || meta.page <= 1}
              >
                Prev
              </button>
              <button
                onClick={() => load(Math.min(meta.totalPages || 1, meta.page + 1))}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold disabled:opacity-60"
                disabled={loading || saving || meta.page >= (meta.totalPages || 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ============ MODALS ============ */}

        {/* CREATE */}
        {showCreate && (
          <Modal title="Tambah Akun" onClose={() => !saving && setShowCreate(false)}>
            <form onSubmit={onCreate} className="space-y-4">
              <Grid2>
                <Input
                  label="Nama"
                  value={createForm.name}
                  onChange={(v) => setCreateForm((s) => ({ ...s, name: v }))}
                  placeholder="Nama admin"
                />
                <Input
                  label="Email"
                  type="email"
                  value={createForm.email}
                  onChange={(v) => setCreateForm((s) => ({ ...s, email: v }))}
                  placeholder="email@contoh.com"
                />
                <Input
                  label="Password"
                  type="password"
                  value={createForm.password}
                  onChange={(v) => setCreateForm((s) => ({ ...s, password: v }))}
                  placeholder="Minimal 6 karakter"
                />
                <Select
                  label="Role"
                  value={createForm.role}
                  onChange={(v) => setCreateForm((s) => ({ ...s, role: v }))}
                  options={ROLE_OPTIONS.filter((x) => x.value !== "")}
                />
                <Input
                  label="NRP (opsional)"
                  value={createForm.nrp}
                  onChange={(v) => setCreateForm((s) => ({ ...s, nrp: v }))}
                  placeholder="123456"
                />
                <Input
                  label="Pangkat (opsional)"
                  value={createForm.pangkat}
                  onChange={(v) => setCreateForm((s) => ({ ...s, pangkat: v }))}
                  placeholder="AIPDA"
                />
                <Input
                  label="Satuan (opsional)"
                  value={createForm.satuan}
                  onChange={(v) => setCreateForm((s) => ({ ...s, satuan: v }))}
                  placeholder="SPKT / Intelkam / Kasium"
                />
                <Toggle
                  label="Aktif"
                  checked={!!createForm.isActive}
                  onChange={(v) => setCreateForm((s) => ({ ...s, isActive: v }))}
                />
              </Grid2>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT */}
        {showEdit && (
          <Modal title="Edit Akun" onClose={() => !saving && setShowEdit(false)}>
            <form onSubmit={onUpdate} className="space-y-4">
              <Grid2>
                <Input
                  label="Nama"
                  value={editForm.name}
                  onChange={(v) => setEditForm((s) => ({ ...s, name: v }))}
                  placeholder="Nama admin"
                />
                <Input
                  label="Email"
                  type="email"
                  value={editForm.email}
                  onChange={(v) => setEditForm((s) => ({ ...s, email: v }))}
                  placeholder="email@contoh.com"
                />
                <Select
                  label="Role"
                  value={editForm.role}
                  onChange={(v) => setEditForm((s) => ({ ...s, role: v }))}
                  options={ROLE_OPTIONS.filter((x) => x.value !== "")}
                />
                <Toggle
                  label="Aktif"
                  checked={!!editForm.isActive}
                  onChange={(v) => setEditForm((s) => ({ ...s, isActive: v }))}
                />
                <Input
                  label="NRP (opsional)"
                  value={editForm.nrp}
                  onChange={(v) => setEditForm((s) => ({ ...s, nrp: v }))}
                  placeholder="123456"
                />
                <Input
                  label="Pangkat (opsional)"
                  value={editForm.pangkat}
                  onChange={(v) => setEditForm((s) => ({ ...s, pangkat: v }))}
                  placeholder="AIPDA"
                />
                <Input
                  label="Satuan (opsional)"
                  value={editForm.satuan}
                  onChange={(v) => setEditForm((s) => ({ ...s, satuan: v }))}
                  placeholder="SPKT / Intelkam / Kasium"
                />
              </Grid2>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* RESET PASSWORD */}
        {showResetPass && (
          <Modal title="Reset Password" onClose={() => !saving && setShowResetPass(false)}>
            <form onSubmit={onResetPassword} className="space-y-4">
              <div className="text-sm text-gray-600 whitespace-normal break-words overflow-wrap-anywhere">
                Reset password untuk: <b>{selected?.name}</b> ({selected?.email})
              </div>

              <Input
                label="Password Baru"
                type="password"
                value={passForm.newPassword}
                onChange={(v) => setPassForm({ newPassword: v })}
                placeholder="Minimal 6 karakter"
              />

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPass(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Reset"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* DEACTIVATE */}
        {showDeactivate && (
          <Modal title="Nonaktifkan Akun" onClose={() => !saving && setShowDeactivate(false)}>
            <div className="space-y-4">
              <div className="text-gray-700 whitespace-normal break-words overflow-wrap-anywhere">
                Anda yakin ingin menonaktifkan akun:
                <div className="mt-2 p-3 rounded-2xl bg-gray-50 border">
                  <div className="font-bold">{selected?.name}</div>
                  <div className="text-sm text-gray-600">{selected?.email}</div>
                  <div className="text-xs text-gray-500 mt-1">{prettyRole(selected?.role)}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeactivate(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onDeactivate}
                  className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Memproses..." : "Nonaktifkan"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/* =================== UI Helpers =================== */

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* ✅ responsif + scroll jika konten panjang */}
      <div className="relative bg-white w-[92vw] max-w-2xl rounded-3xl shadow-xl border border-black/10 overflow-hidden">
        <div className="p-5 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm font-semibold"
          >
            Tutup
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function Grid2({ children }) {
  // ✅ 1 kolom di mobile, 2 kolom mulai sm
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 rounded-2xl border border-gray-300 bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-sm font-semibold mb-1">{label}</label>
        <div className="text-xs text-gray-500">Jika nonaktif, user tidak bisa login.</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`px-4 py-2 rounded-2xl font-semibold border transition ${
          checked
            ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        }`}
      >
        {checked ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}
