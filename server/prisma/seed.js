// server/prisma/seed.js
require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  try {
    const rawEmail = process.env.SEED_ADMIN_EMAIL || "superadmin@polsek.local";
    const email = String(rawEmail).trim().toLowerCase();

    const pass = String(process.env.SEED_ADMIN_PASS || "superadmin123");
    const name = String(process.env.SEED_ADMIN_NAME || "Super Admin").trim();

    if (!email || !email.includes("@")) {
      throw new Error(
        `SEED_ADMIN_EMAIL tidak valid. Diterima: "${rawEmail}". Contoh valid: superadmin@polsek.local`
      );
    }
    if (!pass || pass.length < 6) {
      throw new Error(
        "SEED_ADMIN_PASS tidak valid. Minimal 6 karakter (disarankan 8+)."
      );
    }
    if (!name) {
      throw new Error("SEED_ADMIN_NAME tidak boleh kosong.");
    }

    // 10-12 sudah cukup untuk dev; 12 masih aman
    const hashed = await bcrypt.hash(pass, 12);

    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        password: hashed,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
      create: {
        name,
        email,
        password: hashed,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("✅ Super Admin siap digunakan:");
    console.table([admin]);
    console.log("🔑 Login credentials:");
    console.log(`   email    : ${email}`);
    console.log(`   password : ${pass}`);
  } catch (e) {
    console.error("❌ Seed error:", e?.message || e);
    if (e?.stack) console.error(e.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();