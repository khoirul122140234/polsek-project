// server/src/middlewares/role.middlewares.js
const prisma = require("../prisma");


function allowedLetterTypesForRole(role) {
  if (role === "SUPER_ADMIN") return ["IZIN_KERAMAIAN", "TANDA_KEHILANGAN"];
  if (role === "ADMIN_INTELKAM") return ["IZIN_KERAMAIAN"];
  if (role === "ADMIN_SPKT") return ["TANDA_KEHILANGAN"];
  return [];
}


function normalizeIdParam(id) {
  const raw = String(id ?? "").trim();
  if (!raw) return null;
  return raw;
}


const enforceLetterTypeByQuery = () => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const type = String(req.query.type || "").trim();
  if (!type) return res.status(400).json({ error: "Query 'type' wajib diisi" });

  const supported = ["IZIN_KERAMAIAN", "TANDA_KEHILANGAN"];
  if (!supported.includes(type)) {
    return res.status(400).json({ error: "Query 'type' tidak valid" });
  }

  const allowed = allowedLetterTypesForRole(req.user.role);
  if (!allowed.includes(type)) {
    return res
      .status(403)
      .json({ error: "Forbidden: role tidak boleh akses tipe surat ini" });
  }

  req.query.type = type; // normalized
  return next();
};


const enforceLetterTypeById = () => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const id = normalizeIdParam(req.params.id);
    if (id === null) return res.status(400).json({ error: "Param 'id' wajib" });

    const row = await prisma.letterApplication.findUnique({
      where: { id }, // ✅ schema: String (cuid)
      select: { id: true, type: true },
    });

    if (!row) return res.status(404).json({ error: "Data tidak ditemukan" });

    const allowed = allowedLetterTypesForRole(req.user.role);
    if (!allowed.includes(row.type)) {
      return res
        .status(403)
        .json({ error: "Forbidden: role tidak boleh akses data ini" });
    }

    req.letterApp = row;
    return next();
  } catch (err) {
    console.error("enforceLetterTypeById error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  enforceLetterTypeByQuery,
  enforceLetterTypeById,
};