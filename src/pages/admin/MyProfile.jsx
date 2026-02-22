// src/pages/admin/MyProfile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/axios";

/**
 * UPDATE:
 * - Setelah profile tersimpan / avatar terupload / avatar dihapus:
 *   trigger event "user_updated" agar Dashboard/Sidebar langsung ikut berubah.
 * - Modal Ganti Password punya tombol lihat/sembunyikan password.
 * - Tombol di box Catatan tidak ada (aksi hanya di header).
 * - Sidebar tidak dirender di sini.
 * - ✅ Tambah: Hapus Foto Profil (DELETE /users/me/avatar)
 */

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    localStorage.setItem("user", JSON.stringify(user));
    window.dispatchEvent(new Event("user_updated"));
  } catch {}
}

export default function MyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(() => getStoredUser());
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    nrp: "",
    pangkat: "",
    satuan: "",
    avatarUrl: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // modal password
  const [showPassModal, setShowPassModal] = useState(false);
  const [passForm, setPassForm] = useState({ oldPassword: "", newPassword: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // show/hide password
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // modal hapus avatar
  const [showDeleteAvatar, setShowDeleteAvatar] = useState(false);

  const fileRef = useRef(null);

  const hasAvatar = !!(form.avatarUrl || user?.avatarUrl);

  const avatarSrc = useMemo(() => {
    const u = form.avatarUrl || user?.avatarUrl;
    if (!u) return "";
    const base = (process.env.REACT_APP_API_URL || "http://localhost:4000").replace(/\/$/, "");
    return u.startsWith("http") ? u : `${base}${u}`;
  }, [form.avatarUrl, user?.avatarUrl]);

  // load profile dari server
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const res = await api.get("/users/me");
        const u = res.data?.user;
        if (!alive) return;

        setUser(u);
        setStoredUser(u);

        setForm({
          name: u?.name || "",
          email: u?.email || "",
          role: u?.role || "",
          nrp: u?.nrp || "",
          pangkat: u?.pangkat || "",
          satuan: u?.satuan || "",
          avatarUrl: u?.avatarUrl || "",
        });
      } catch (e) {
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Gagal memuat profil";
        if (alive) setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  async function onSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        nrp: form.nrp,
        pangkat: form.pangkat,
        satuan: form.satuan,
      };

      const res = await api.patch("/users/me", payload);
      const u = res.data?.user;

      setUser(u);
      setStoredUser(u);

      setForm((s) => ({ ...s, avatarUrl: u?.avatarUrl || s.avatarUrl }));
      setSuccess(res.data?.message || "Profil berhasil diperbarui");
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Gagal menyimpan profil";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onUploadAvatar(file) {
    if (!file) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await api.patch("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const u = res.data?.user;
      setUser(u);
      setStoredUser(u);

      setForm((s) => ({ ...s, avatarUrl: u?.avatarUrl || "" }));
      setSuccess(res.data?.message || "Foto profil berhasil diperbarui");
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Gagal upload foto profil";
      setError(msg);
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDeleteAvatar() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.delete("/users/me/avatar");
      const u = res.data?.user;

      setUser(u);
      setStoredUser(u);

      setForm((s) => ({ ...s, avatarUrl: "" }));
      setSuccess(res.data?.message || "Foto profil berhasil dihapus");
      setShowDeleteAvatar(false);
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Gagal menghapus foto profil";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPassLoading(true);
    setPassError("");
    setPassSuccess("");

    try {
      const res = await api.patch("/users/me/password", passForm);
      setPassSuccess(res.data?.message || "Password berhasil diubah");
      setPassForm({ oldPassword: "", newPassword: "" });

      setShowOldPass(false);
      setShowNewPass(false);

      setTimeout(() => setShowPassModal(false), 600);
    } catch (e2) {
      const msg =
        e2?.response?.data?.error ||
        e2?.response?.data?.message ||
        e2?.message ||
        "Gagal mengubah password";
      setPassError(msg);
    } finally {
      setPassLoading(false);
    }
  }

  function onReset() {
    const u = user || getStoredUser() || {};
    setForm({
      name: u?.name || "",
      email: u?.email || "",
      role: u?.role || "",
      nrp: u?.nrp || "",
      pangkat: u?.pangkat || "",
      satuan: u?.satuan || "",
      avatarUrl: u?.avatarUrl || "",
    });
    setError("");
    setSuccess("");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ✅ responsif padding + max width */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            My Profile
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Anda bisa mengubah data profil.{" "}
            <span className="font-semibold">Role tidak dapat diubah.</span>
          </p>
        </div>

        {(error || success) && !loading ? (
          <div className="mb-6 space-y-3">
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

        {loading ? (
          <div className="bg-white rounded-3xl shadow border border-black/5 p-6 md:p-8">
            <div className="animate-pulse space-y-5">
              <div className="h-6 w-1/2 sm:w-1/3 bg-gray-200 rounded" />
              <div className="h-24 bg-gray-200 rounded-2xl" />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="h-12 bg-gray-200 rounded-2xl" />
                <div className="h-12 bg-gray-200 rounded-2xl" />
                <div className="h-12 bg-gray-200 rounded-2xl" />
                <div className="h-12 bg-gray-200 rounded-2xl" />
              </div>
              <div className="h-12 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => onUploadAvatar(e.target.files?.[0])}
            />

            <div className="bg-white rounded-3xl shadow border border-black/5 overflow-hidden">
              <div className="p-6 md:p-8 bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white">
                {/* ✅ header responsif: stack di mobile, rapi di desktop */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 overflow-hidden ring-4 ring-white/20 grid place-items-center shrink-0">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">👤</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight whitespace-normal break-words overflow-wrap-anywhere">
                        {form.name || "—"}
                      </div>
                      <div className="text-white/80 whitespace-normal break-words overflow-wrap-anywhere">
                        {form.email || "—"}
                      </div>
                      <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-white/10 text-sm max-w-full">
                        <span className="truncate">
                          Role: <span className="font-semibold ml-1">{form.role || "—"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ✅ tombol: full di mobile, inline di atas sm */}
                  <div className="lg:ml-auto grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full px-4 py-2.5 rounded-2xl bg-white text-black font-semibold hover:bg-gray-100 disabled:opacity-60"
                      disabled={saving}
                    >
                      Ubah Foto
                    </button>

                    {hasAvatar ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteAvatar(true)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                        disabled={saving}
                      >
                        Hapus Foto
                      </button>
                    ) : (
                      <div className="hidden sm:block" />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowPassModal(true);
                        setPassError("");
                        setPassSuccess("");
                        setShowOldPass(false);
                        setShowNewPass(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-2xl bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                      disabled={saving}
                    >
                      Ganti Password
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8">
                    <div className="mb-4">
                      <div className="text-lg font-bold">Informasi Akun</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Perbarui data akun Anda. Role dikunci sesuai akun login.
                      </div>
                    </div>

                    <form onSubmit={onSaveProfile} className="space-y-5">
                      {/* ✅ 1 kolom di mobile, 2 kolom mulai md */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          label="Nama"
                          value={form.name}
                          onChange={(v) => setForm((s) => ({ ...s, name: v }))}
                          placeholder="Nama lengkap"
                        />
                        <Field
                          label="Email"
                          type="email"
                          value={form.email}
                          onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                          placeholder="email@contoh.com"
                        />
                        <Field
                          label="NRP / NIP (opsional)"
                          value={form.nrp}
                          onChange={(v) => setForm((s) => ({ ...s, nrp: v }))}
                          placeholder="Contoh: 123456"
                        />
                        <Field
                          label="Pangkat (opsional)"
                          value={form.pangkat}
                          onChange={(v) => setForm((s) => ({ ...s, pangkat: v }))}
                          placeholder="Contoh: IPDA"
                        />
                        <Field
                          label="Satuan (opsional)"
                          value={form.satuan}
                          onChange={(v) => setForm((s) => ({ ...s, satuan: v }))}
                          placeholder="Contoh: Polsek Tanjung Raja"
                        />
                        <Field label="Role (tidak bisa diubah)" value={form.role} readOnly />
                      </div>

                      {/* ✅ tombol responsif */}
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={onReset}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border bg-white hover:bg-gray-50 font-semibold disabled:opacity-60"
                          disabled={saving}
                        >
                          Reset
                        </button>

                        <button
                          type="submit"
                          disabled={saving}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
                        >
                          {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="rounded-3xl border bg-gray-50 p-5 md:p-6">
                      <div className="font-bold text-lg">Catatan</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Beberapa informasi penting untuk penggunaan akun.
                      </p>

                      <ul className="mt-4 space-y-2 text-sm text-gray-700">
                        <li className="flex gap-2">
                          <span className="mt-[2px]">•</span>
                          <span>Role tidak dapat diubah dari halaman ini.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-[2px]">•</span>
                          <span>Foto profil maksimal 2MB (png/jpg/jpeg/webp).</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-[2px]">•</span>
                          <span>Jika token kadaluarsa, Anda akan diminta login ulang.</span>
                        </li>
                      </ul>

                      <div className="mt-5 rounded-2xl bg-white border p-4">
                        <div className="text-sm text-gray-600">
                          Gunakan tombol <span className="font-semibold">Ubah Foto</span>,{" "}
                          <span className="font-semibold">Hapus Foto</span>, atau{" "}
                          <span className="font-semibold">Ganti Password</span> di bagian atas kartu profil
                          untuk melakukan perubahan.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Konfirmasi Hapus Foto */}
              {showDeleteAvatar && (
                <div
                  className="fixed inset-0 z-50 grid place-items-center p-4"
                  role="dialog"
                  aria-modal="true"
                >
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => !saving && setShowDeleteAvatar(false)}
                  />
                  <div className="relative bg-white w-[92vw] max-w-md rounded-3xl shadow-xl border border-black/10 overflow-hidden">
                    <div className="p-5 border-b">
                      <h3 className="text-lg sm:text-xl font-semibold">Hapus Foto Profil</h3>
                    </div>
                    <div className="p-5">
                      <p className="text-gray-700">
                        Anda yakin ingin menghapus foto profil? Foto akan kembali ke ikon default.
                      </p>
                    </div>
                    <div className="p-4 border-t flex flex-col sm:flex-row gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDeleteAvatar(false)}
                        className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                        disabled={saving}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteAvatar}
                        className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                        disabled={saving}
                      >
                        {saving ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Ganti Password */}
        {showPassModal && (
          <div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPassModal(false)} />
            <div className="relative bg-white w-[92vw] max-w-md rounded-3xl shadow-xl border border-black/10 overflow-hidden">
              <div className="p-5 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg sm:text-xl font-semibold">Ganti Password</h3>
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm font-semibold"
                >
                  Tutup
                </button>
              </div>

              <form onSubmit={onChangePassword} className="p-5 space-y-4 max-h-[75vh] overflow-auto">
                <PasswordField
                  label="Password Lama"
                  value={passForm.oldPassword}
                  onChange={(v) => setPassForm((s) => ({ ...s, oldPassword: v }))}
                  placeholder="••••••••"
                  show={showOldPass}
                  setShow={setShowOldPass}
                />

                <PasswordField
                  label="Password Baru"
                  value={passForm.newPassword}
                  onChange={(v) => setPassForm((s) => ({ ...s, newPassword: v }))}
                  placeholder="Minimal 6 karakter"
                  show={showNewPass}
                  setShow={setShowNewPass}
                />

                {passError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 whitespace-normal break-words overflow-wrap-anywhere">
                    {passError}
                  </div>
                ) : null}
                {passSuccess ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 whitespace-normal break-words overflow-wrap-anywhere">
                    {passSuccess}
                  </div>
                ) : null}

                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPassModal(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-2xl border hover:bg-gray-50 font-semibold"
                    disabled={passLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-yellow-500 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
                  >
                    {passLoading ? "Memproses..." : "Ubah"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange = () => {}, placeholder, type = "text", readOnly = false }) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition ${
          readOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        }`}
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, show, setShow }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 pr-28 sm:pr-32 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold"
          aria-label={show ? "Sembunyikan password" : "Lihat password"}
        >
          {show ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
    </div>
  );
}
