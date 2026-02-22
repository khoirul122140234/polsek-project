// src/pages/auth/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import { api } from "../../lib/axios";
import { setToken, setUser } from "../../lib/auth";
import logoPolri from "../../assets/Lambang_Polri.png";

function getDefaultRouteByRole(role) {
  if (role === "ADMIN_SPKT") return "/admin/pengajuan-surat?tab=kehilangan";
  if (role === "ADMIN_INTELKAM") return "/admin/pengajuan-surat?tab=izin";
  if (role === "ADMIN_KASIUM") return "/admin/rekapitulasi-surat";
  // SUPER_ADMIN & lainnya
  return "/admin/dashboard";
}

export default function LoginAdmin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // kalau dari ProtectedRoute -> kembali ke halaman asal, kalau tidak -> by role
  const from = location.state?.from || null;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      return setError("Email dan password wajib diisi");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data || {};
      if (!token) throw new Error("Token tidak diterima dari server");

      // simpan token + user
      setToken(token);
      setUser(user);

      const fallback = getDefaultRouteByRole(user?.role);
      navigate(from || fallback, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err?.code === "ERR_NETWORK" ? "Gagal terhubung ke server" : null) ||
        err?.message ||
        "Gagal login";
      setError(msg);
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden w-full max-w-4xl flex">
        {/* Panel kiri */}
        <div className="bg-gradient-to-b from-black to-gray-800 text-white p-10 w-1/2 hidden md:flex flex-col items-center justify-center">
          <img src={logoPolri} alt="Logo Polri" className="w-40 h-40 object-contain mb-6" />
          <h1 className="text-3xl font-extrabold text-center leading-snug">
            Sistem Pelayanan Masyarakat <br /> Polsek Tanjung Raja
          </h1>
        </div>

        {/* Panel kanan */}
        <div className="p-8 md:p-10 w-full md:w-1/2">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center text-base text-gray-600 hover:text-gray-800"
            >
              <FaArrowLeft className="mr-2" /> Kembali ke Beranda
            </button>
          </div>

          <h2 className="text-3xl font-bold mb-6">Masuk ke Akun Anda</h2>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                autoComplete="username"
                required
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500"
                placeholder="admin@polsek.local"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                  className="w-full p-3 pr-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white py-3 rounded-xl text-lg font-semibold"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-8 border-t pt-4 text-center">
            <p className="text-xs text-gray-500">WEBSITE RESMI POLSEK TANJUNG RAJA © 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}