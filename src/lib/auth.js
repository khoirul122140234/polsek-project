// src/lib/auth.js
// Penyimpanan token + helper (konsisten localStorage / sessionStorage)

const TOKEN_KEY = "token";
const USER_KEY = "user";

/**
 * Simpan token.
 * default: localStorage
 * opsi: setToken(token, { persist: "session" }) untuk sessionStorage
 */
export function setToken(token, opts = {}) {
  const persist = opts.persist || "local"; // "local" | "session"
  try {
    if (!token) return;

    if (persist === "session") {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    } else {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Simpan user object (berguna untuk Sidebar/MyProfile)
 * user disimpan di localStorage agar mudah dibaca lintas tab.
 */
export function setUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  } catch {
    // ignore
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Logout bersih: hapus token + user
 * (jangan clear semua sessionStorage biar tidak ganggu fitur lain)
 */
export function clearAuth() {
  clearToken();
  clearUser();
}

/**
 * Header Authorization siap pakai untuk fetch
 */
export function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}

/**
 * Helper fetch dengan auth (optional)
 */
export async function authFetch(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
}