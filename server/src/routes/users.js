// server/src/routes/users.js
const express = require("express");
const { requireAuth } = require("../middlewares/auth.middlewares");
const { upload } = require("../middlewares/uploads"); // wajib ada & export { upload }
const {
  me,
  updateMe,
  changeMyPassword,
  updateMyAvatar,
  deleteMyAvatar,

  // ✅ TTD IZIN (KAPOLSEK / PENANGGUNG JAWAB)
  getMyTtdProfile,
  updateMyTtdProfile,

  // ✅ STPLK (KA SPKT)
  getMyStplkProfile,
  updateMyStplkProfile,
} = require("../controllers/user.controller");

const router = express.Router();

// ✅ My Profile
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);
router.patch("/me/password", requireAuth, changeMyPassword);

// ✅ Profil TTD (KAPOLSEK / PENANGGUNG JAWAB) — untuk IZIN
router.get("/me/ttd", requireAuth, getMyTtdProfile);
router.patch("/me/ttd", requireAuth, updateMyTtdProfile);

// ✅ Profil KA SPKT (STPLK) — untuk TANDA KEHILANGAN
router.get("/me/stplk", requireAuth, getMyStplkProfile);
router.patch("/me/stplk", requireAuth, updateMyStplkProfile);

// ✅ Upload avatar (field name: "avatar")
router.patch("/me/avatar", requireAuth, upload.single("avatar"), updateMyAvatar);

// ✅ Hapus avatar
router.delete("/me/avatar", requireAuth, deleteMyAvatar);

module.exports = router;
