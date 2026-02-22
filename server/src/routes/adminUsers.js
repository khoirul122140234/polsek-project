// server/src/routes/adminUsers.js
const express = require("express");
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");
const {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} = require("../controllers/admin.users.controller");

const router = express.Router();

// semua endpoint di sini khusus SUPER_ADMIN
router.use(requireAuth, allowRoles("SUPER_ADMIN"));

// LIST + FILTER
router.get("/users", listUsers);

// CREATE
router.post("/users", createUser);

// UPDATE (name/email/role/isActive/nrp/pangkat/satuan)
router.patch("/users/:id", updateUser);

// RESET PASSWORD
router.patch("/users/:id/password", resetUserPassword);

// SOFT DELETE (nonaktifkan)
router.delete("/users/:id", deleteUser);

module.exports = router;