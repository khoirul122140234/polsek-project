// server/src/routes/surat.js
const express = require("express");
const router = express.Router();

const upload = require("../utils/upload");
const generateCode = require("../utils/generateCode");

// ✅ pakai singleton prisma
const prisma = require("../prisma");

// ✅ Auth + Role Guards
const { requireAuth, allowRoles } = require("../middlewares/auth.middlewares");
const {
  enforceLetterTypeByQuery,
  enforceLetterTypeById,
} = require("../middlewares/role.middlewares");

// ✅ BARU: util push notify (tidak mengubah logic lain)
const { sendPushToAll } = require("../utils/pushNotify");

/* =========================== Helpers =========================== */

// ✅ WILAYAH POLSEK TANJUNG RAJA (3 KECAMATAN)
const OPSI_KECAMATAN = ["Tanjung Raja", "Sungai Pinang", "Rantau Panjang"];

// ✅ GANTI LIMIT DI SINI (dulu 3)
const MAX_KEHI_ITEMS = 5;

function parseKehiItems(raw) {
  if (raw == null) return null;

  let arr = null;

  if (Array.isArray(raw)) {
    arr = raw;
  } else {
    const s = String(raw).trim();
    if (!s) return null;

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const j = JSON.parse(s);
        if (Array.isArray(j)) arr = j;
      } catch {}
    }

    if (!arr) {
      arr = s.split(",");
    }
  }

  return arr
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, MAX_KEHI_ITEMS);
}

function normalizeKehiItemsOrThrow(b) {
  const items = parseKehiItems(b.kehilanganItems);

  // kalau tidak ada items, fallback ke kehilanganApa (legacy)
  const legacy = String(b.kehilanganApa ?? "").trim();

  const finalItems = (items && items.length ? items : legacy ? [legacy] : []).slice(
    0,
    MAX_KEHI_ITEMS
  );

  // bersihkan + validasi
  const cleaned = finalItems
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .slice(0, MAX_KEHI_ITEMS);

  if (!cleaned.length) {
    throw new Error(
      `Barang/Dokumen yang hilang wajib diisi (minimal 1, maksimal ${MAX_KEHI_ITEMS}).`
    );
  }
  if (cleaned.length > MAX_KEHI_ITEMS) {
    throw new Error(`Maksimal ${MAX_KEHI_ITEMS} barang/dokumen yang hilang.`);
  }

  // gabungan string untuk legacy/search
  const joined = cleaned.join(", ");

  return { items: cleaned, joined };
}

// ✅ ROMAWI BULAN realtime
const ROMAN_MONTHS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

function getNowParts() {
  const now = new Date();
  const monthIdx = now.getMonth(); // 0-11
  const year = now.getFullYear();
  const romanMonth = ROMAN_MONTHS[monthIdx];
  return { now, monthIdx, year, romanMonth };
}

// ✅ Format nomor urut jadi C-01, C-02, ... C-10 dst (untuk STPLK)
function fmtC(n) {
  const num = Number(n);
  const safe = Number.isFinite(num) && num > 0 ? num : 1;
  return String(safe).padStart(2, "0");
}

/**
 * ✅ Generate nomor STPLK dengan Counter (anti-loncat)
 * - nomor dibuat saat admin set status SELESAI
 * - counter per tahun (reset otomatis tiap tahun)
 * - bisa diubah lewat endpoint admin
 */
async function allocateStplkNumberTx(tx, { yearOverride } = {}) {
  const { year, romanMonth } = (() => {
    const p = getNowParts();
    return { year: yearOverride ?? p.year, romanMonth: p.romanMonth };
  })();

  const counter =
    (await tx.letterCounter.findUnique({
      where: {
        type_year: { type: "TANDA_KEHILANGAN", year },
      },
    })) ||
    (await tx.letterCounter.create({
      data: {
        type: "TANDA_KEHILANGAN",
        year,
        nextNumber: 1,
      },
    }));

  const nomorUrut = counter.nextNumber;

  await tx.letterCounter.update({
    where: { id: counter.id },
    data: { nextNumber: nomorUrut + 1 },
  });

  const nomorSurat =
    `STPLK/C-${fmtC(nomorUrut)}/${romanMonth}/${year}/SPKT/SUMSEL/RES-OI/SEK TGR`;

  return { nomorUrut, nomorSurat, year, romanMonth };
}

/**
 * ✅ BARU: Generate nomor IZIN Keramaian (anti-loncat)
 * Format: SI / <urut> / <bulan romawi> / <tahun> / INTELKAM
 * - dibuat saat admin set status SELESAI
 * - counter per tahun (reset otomatis tiap tahun)
 * - nextNumber bisa di-set (mulai dari berapa)
 */
async function allocateIzinNumberTx(tx, { yearOverride } = {}) {
  const { year, romanMonth } = (() => {
    const p = getNowParts();
    return { year: yearOverride ?? p.year, romanMonth: p.romanMonth };
  })();

  const counter =
    (await tx.letterCounter.findUnique({
      where: { type_year: { type: "IZIN_KERAMAIAN", year } },
    })) ||
    (await tx.letterCounter.create({
      data: { type: "IZIN_KERAMAIAN", year, nextNumber: 1 },
    }));

  const nomorUrut = counter.nextNumber;

  await tx.letterCounter.update({
    where: { id: counter.id },
    data: { nextNumber: nomorUrut + 1 },
  });

  // ✅ sesuai contoh kamu: "SI / 287 / X / 2025 / INTELKAM"
  const nomorSurat = `SI / ${nomorUrut} / ${romanMonth} / ${year} / INTELKAM`;

  return { nomorUrut, nomorSurat, year, romanMonth };
}

/* ========================================================================
   POST /api/surat/izin  (buat pengajuan baru, multipart/form-data)
======================================================================== */
router.post(
  "/izin",
  upload.fields([
    { name: "ktp", maxCount: 1 },
    { name: "rekomendasiDesa", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const b = req.body;

      const required = [
        // ✅ BARU
        "kecamatan",

        "penanggungJawab",
        "nik",
        "hp",
        "alamat",
        "jenisKegiatan",
        "namaKegiatan",
        "lokasi",
        "tanggal",
        "waktuMulai",
        "waktuSelesai",
        "perkiraanPeserta",
      ];

      for (const k of required) {
        if (!b[k] || String(b[k]).trim() === "") {
          return res.status(400).json({ error: `Field ${k} wajib diisi` });
        }
      }

      // ✅ Validasi keras wilayah (3 kecamatan saja)
      const kecamatan = String(b.kecamatan || "").trim();
      if (!OPSI_KECAMATAN.includes(kecamatan)) {
        return res.status(400).json({
          error:
            "Kecamatan di luar cakupan wilayah Polsek Tanjung Raja. Pengajuan hanya untuk: Tanjung Raja, Sungai Pinang, Rantau Panjang.",
        });
      }

      const namaOrganisasi =
        b.namaOrganisasi && String(b.namaOrganisasi).trim() !== ""
          ? String(b.namaOrganisasi).trim()
          : null;

      if (!/^\d{16}$/.test(b.nik))
        return res.status(400).json({ error: "NIK harus 16 digit" });
      if (!/^0\d{9,13}$/.test(b.hp))
        return res.status(400).json({ error: "Nomor HP tidak valid" });
      if (Number(b.perkiraanPeserta) <= 0)
        return res.status(400).json({ error: "Perkiraan peserta harus > 0" });
      if (b.waktuSelesai <= b.waktuMulai)
        return res.status(400).json({ error: "Waktu selesai harus setelah mulai" });

      const ktp = req.files?.ktp?.[0]?.filename || null;
      const rekom = req.files?.rekomendasiDesa?.[0]?.filename || null;
      const code = generateCode("IZN");

      const created = await prisma.letterApplication.create({
        data: {
          code,
          type: "IZIN_KERAMAIAN",
          status: "DIAJUKAN",

          // ✅ nomorSurat & nomorUrut sengaja NULL dulu (anti loncat)

          namaOrganisasi,

          // ✅ BARU: simpan kecamatan
          kecamatan,

          penanggungJawab: b.penanggungJawab,
          nik: b.nik,
          hp: b.hp,
          alamat: b.alamat,
          jenisKegiatan: b.jenisKegiatan,
          namaKegiatan: b.namaKegiatan,
          lokasi: b.lokasi,
          tanggal: new Date(b.tanggal),
          waktuMulai: b.waktuMulai,
          waktuSelesai: b.waktuSelesai,
          perkiraanPeserta: Number(b.perkiraanPeserta),
          ktpPath: ktp,
          rekomendasiDesaPath: rekom,

          // ✅ BARU: default null, diisi dari ADMIN setelah cek berkas asli
          rekomDesaNama: null,
          rekomDesaNomor: null,

          statusFeedback: "",
        },
      });

      return res.json({
        message: "Pengajuan izin berhasil disimpan",
        code: created.code,
        id: created.id,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal menyimpan pengajuan izin" });
    }
  }
);

/* ========================================================================
   POST /api/surat/kehilangan  (buat pengajuan tanda kehilangan)
======================================================================== */
router.post("/kehilangan", async (req, res) => {
  try {
    const b = req.body || {};

    const required = [
      // ✅ BARU
      "kecamatan",

      "nama",
      "tempatLahir",
      "tanggalLahir",
      "jenisKelamin",
      "nik",
      "hp",
      "pekerjaan",
      "agama",
      "alamat",
      "kronologi",
    ];

    for (const k of required) {
      if (!b[k] || String(b[k]).trim() === "") {
        return res.status(400).json({ error: `Field ${k} wajib diisi` });
      }
    }

    // ✅ Validasi keras wilayah (3 kecamatan saja)
    const kecamatan = String(b.kecamatan || "").trim();
    if (!OPSI_KECAMATAN.includes(kecamatan)) {
      return res.status(400).json({
        error:
          "Kecamatan di luar cakupan wilayah Polsek Tanjung Raja. Pengajuan hanya untuk: Tanjung Raja, Sungai Pinang, Rantau Panjang.",
      });
    }

    let kehi;
    try {
      kehi = normalizeKehiItemsOrThrow(b);
    } catch (e) {
      return res.status(400).json({ error: String(e?.message || e) });
    }

    if (kehi.items.length > MAX_KEHI_ITEMS) {
      return res.status(400).json({
        error: `Maksimal ${MAX_KEHI_ITEMS} barang/dokumen yang hilang.`,
      });
    }

    if (!/^\d{16}$/.test(b.nik))
      return res.status(400).json({ error: "NIK harus 16 digit" });
    if (!/^0\d{9,13}$/.test(b.hp))
      return res.status(400).json({ error: "Nomor HP tidak valid" });
    if (!["Laki-laki", "Perempuan"].includes(b.jenisKelamin)) {
      return res.status(400).json({ error: "Jenis kelamin tidak valid" });
    }
    if (String(b.kronologi).trim().length < 10) {
      return res.status(400).json({ error: "Kronologi minimal 10 karakter" });
    }

    const code = generateCode("KLH");

    const created = await prisma.letterApplication.create({
      data: {
        code,
        type: "TANDA_KEHILANGAN",
        status: "DIAJUKAN",
        statusFeedback: "",

        // ✅ nomorSurat & nomorUrut sengaja NULL dulu (anti loncat)

        // ✅ BARU: simpan kecamatan
        kecamatan,

        nik: b.nik,
        hp: b.hp,
        alamat: b.alamat,

        nama: b.nama,
        tempatLahir: b.tempatLahir,
        tanggalLahir: new Date(b.tanggalLahir),
        jenisKelamin: b.jenisKelamin,
        pekerjaan: b.pekerjaan,
        agama: b.agama,

        kehilanganItems: kehi.items,
        kehilanganApa: kehi.joined,

        kronologi: b.kronologi,
        tanggalLaporan: b.tanggalLaporan ? new Date(b.tanggalLaporan) : new Date(),
      },
    });

    return res.json({
      message: "Pengajuan tanda kehilangan berhasil disimpan",
      code: created.code,
      id: created.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gagal menyimpan pengajuan tanda kehilangan" });
  }
});

/* ========================================================================
   GET /api/surat/status/:code  (publik cek status) – no-cache
======================================================================== */
router.get("/status/:code", async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || String(code).trim().length < 6) {
      return res.status(400).json({ error: "Kode tidak valid" });
    }

    const row = await prisma.letterApplication.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        type: true,
        status: true,
        statusFeedback: true,
        createdAt: true,
        updatedAt: true,

        nomorUrut: true,
        nomorSurat: true,

        nik: true,
        hp: true,
        alamat: true,

        // ✅ BARU: wilayah (izin & kehilangan)
        kecamatan: true,

        // IZIN
        namaOrganisasi: true,
        penanggungJawab: true,
        namaKegiatan: true,
        jenisKegiatan: true,
        lokasi: true,
        tanggal: true,
        waktuMulai: true,
        waktuSelesai: true,
        perkiraanPeserta: true,
        ktpPath: true,
        rekomendasiDesaPath: true,

        // ✅ BARU (izin)
        rekomDesaNama: true,
        rekomDesaNomor: true,

        // KEHILANGAN
        nama: true,
        tempatLahir: true,
        tanggalLahir: true,
        jenisKelamin: true,
        pekerjaan: true,
        agama: true,
        kehilanganItems: true,
        kehilanganApa: true,
        kronologi: true,
        tanggalLaporan: true,
      },
    });

    if (!row) return res.status(404).json({ error: "Kode tidak ditemukan" });

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    return res.json({ data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gagal mengambil status" });
  }
});

/* ========================================================================
   ======================= ADMIN SECTION ==================================
======================================================================== */

/**
 * ✅ STPLK COUNTER
 */
router.get(
  "/admin/stplk-counter",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_SPKT"),
  async (req, res) => {
    try {
      const y = req.query.year ? Number(req.query.year) : getNowParts().year;
      const year = Number.isFinite(y) && y > 2000 ? y : getNowParts().year;

      const row =
        (await prisma.letterCounter.findUnique({
          where: { type_year: { type: "TANDA_KEHILANGAN", year } },
        })) ||
        (await prisma.letterCounter.create({
          data: { type: "TANDA_KEHILANGAN", year, nextNumber: 1 },
        }));

      return res.json({
        type: row.type,
        year: row.year,
        nextNumber: row.nextNumber,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal mengambil counter STPLK" });
    }
  }
);

router.put(
  "/admin/stplk-counter",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_SPKT"),
  async (req, res) => {
    try {
      const b = req.body || {};
      const y = b.year ? Number(b.year) : getNowParts().year;
      const year = Number.isFinite(y) && y > 2000 ? y : getNowParts().year;

      const nn = Number(b.nextNumber);
      if (!Number.isFinite(nn) || nn < 1) {
        return res.status(400).json({ error: "nextNumber harus angka >= 1" });
      }

      const updated = await prisma.letterCounter.upsert({
        where: { type_year: { type: "TANDA_KEHILANGAN", year } },
        create: { type: "TANDA_KEHILANGAN", year, nextNumber: nn },
        update: { nextNumber: nn },
      });

      return res.json({
        message: "Counter STPLK diperbarui",
        type: updated.type,
        year: updated.year,
        nextNumber: updated.nextNumber,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal memperbarui counter STPLK" });
    }
  }
);

/**
 * ✅ BARU: IZIN COUNTER (TEMPAT SET "MULAI DARI NOMOR BERAPA")
 * Role: SUPER_ADMIN & ADMIN_INTELKAM
 */
router.get(
  "/admin/izin-counter",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM"),
  async (req, res) => {
    try {
      const y = req.query.year ? Number(req.query.year) : getNowParts().year;
      const year = Number.isFinite(y) && y > 2000 ? y : getNowParts().year;

      const row =
        (await prisma.letterCounter.findUnique({
          where: { type_year: { type: "IZIN_KERAMAIAN", year } },
        })) ||
        (await prisma.letterCounter.create({
          data: { type: "IZIN_KERAMAIAN", year, nextNumber: 1 },
        }));

      return res.json({
        type: row.type,
        year: row.year,
        nextNumber: row.nextNumber,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal mengambil counter IZIN" });
    }
  }
);

router.put(
  "/admin/izin-counter",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM"),
  async (req, res) => {
    try {
      const b = req.body || {};
      const y = b.year ? Number(b.year) : getNowParts().year;
      const year = Number.isFinite(y) && y > 2000 ? y : getNowParts().year;

      const nn = Number(b.nextNumber);
      if (!Number.isFinite(nn) || nn < 1) {
        return res.status(400).json({ error: "nextNumber harus angka >= 1" });
      }

      const updated = await prisma.letterCounter.upsert({
        where: { type_year: { type: "IZIN_KERAMAIAN", year } },
        create: { type: "IZIN_KERAMAIAN", year, nextNumber: nn },
        update: { nextNumber: nn },
      });

      return res.json({
        message: "Counter IZIN diperbarui",
        type: updated.type,
        year: updated.year,
        nextNumber: updated.nextNumber,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal memperbarui counter IZIN" });
    }
  }
);

/* ========================================================================
   GET /api/surat/admin/pengajuan-surat
======================================================================== */
router.get(
  "/admin/pengajuan-surat",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"),
  enforceLetterTypeByQuery(),
  async (req, res) => {
    try {
      const { page = "1", limit = "10", q = "", type, status } = req.query;

      let OR = undefined;
      if (q && String(q).trim() !== "") {
        const qq = String(q).trim();

        if (type === "TANDA_KEHILANGAN") {
          OR = [
            { code: { contains: qq, mode: "insensitive" } },
            { nama: { contains: qq, mode: "insensitive" } },
            { nik: { contains: qq, mode: "insensitive" } },
            { kehilanganApa: { contains: qq, mode: "insensitive" } },
            { alamat: { contains: qq, mode: "insensitive" } },
            { nomorSurat: { contains: qq, mode: "insensitive" } },
            { kecamatan: { contains: qq, mode: "insensitive" } },
          ];
        } else {
          OR = [
            { code: { contains: qq, mode: "insensitive" } },
            { namaOrganisasi: { contains: qq, mode: "insensitive" } },
            { penanggungJawab: { contains: qq, mode: "insensitive" } },
            { namaKegiatan: { contains: qq, mode: "insensitive" } },
            { lokasi: { contains: qq, mode: "insensitive" } },
            { nomorSurat: { contains: qq, mode: "insensitive" } },
            { kecamatan: { contains: qq, mode: "insensitive" } },
            { rekomDesaNama: { contains: qq, mode: "insensitive" } },
            { rekomDesaNomor: { contains: qq, mode: "insensitive" } },
          ];
        }
      }

      const where = {
        type,
        ...(status ? { status } : {}),
        ...(OR ? { OR } : {}),
      };

      const skip = (Number(page) - 1) * Number(limit);

      const [rows, total] = await Promise.all([
        prisma.letterApplication.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.letterApplication.count({ where }),
      ]);

      return res.json({
        rows,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal mengambil data pengajuan surat" });
    }
  }
);

/* ========================================================================
   PATCH /api/surat/admin/pengajuan-surat/:id/status
   ✅ BARU: kirim push saat status berubah
======================================================================== */
router.patch(
  "/admin/pengajuan-surat/:id/status",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"),
  enforceLetterTypeById(),
  async (req, res) => {
    try {
      const { id } = req.params;

      let { status, statusFeedback, feedback } = req.body;
      statusFeedback = (statusFeedback ?? feedback ?? "").toString();

      const labelToEnum = {
        "Menunggu Verifikasi": "DIAJUKAN",
        Proses: "DIVERIFIKASI",
        Diterima: "SELESAI",
        Ditolak: "DITOLAK",
      };
      status = labelToEnum[status] || status;

      const allowed = ["DIAJUKAN", "DIVERIFIKASI", "DITOLAK", "SELESAI"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Status tidak valid" });
      }

      // ✅ ambil info lama untuk pembanding + ambil code untuk URL notifikasi
      const before = await prisma.letterApplication.findUnique({
        where: { id },
        select: { id: true, type: true, code: true, status: true, nomorSurat: true, nomorUrut: true },
      });
      if (!before) return res.status(404).json({ error: "Data tidak ditemukan" });

      // kalau status tidak berubah, tetap update feedback saja (tetap kirim notif? → tidak)
      const statusChanged = before.status !== status;

      // URL tujuan untuk cek status (front-end)
      // ✅ kalau kamu punya route FE lain, ubah 1 baris ini saja
      const targetUrl = `/cek-status?code=${encodeURIComponent(before.code)}`;

      // ✅ 1) Kehilangan => buat nomor STPLK saat SELESAI (jika belum ada)
      if (before.type === "TANDA_KEHILANGAN" && status === "SELESAI" && !before.nomorSurat) {
        const result = await prisma.$transaction(async (tx) => {
          const nomor = await allocateStplkNumberTx(tx);

          const updated = await tx.letterApplication.update({
            where: { id },
            data: {
              status,
              statusFeedback,
              nomorUrut: nomor.nomorUrut,
              nomorSurat: nomor.nomorSurat,
            },
          });

          return { updated, nomor };
        });

        // ✅ KIRIM PUSH (non-blocking ringan)
        if (statusChanged) {
          sendPushToAll({
            title: "Status Pengajuan Berubah",
            body: `Kode ${before.code}: ${before.status} → ${status}`,
            url: targetUrl,
          }).catch((e) => console.error("[pushNotify] error:", e));
        }

        return res.json({
          message: "Status diperbarui + nomor STPLK dibuat",
          row: result.updated,
          nomor: result.nomor,
        });
      }

      // ✅ 2) IZIN => buat nomor SI saat SELESAI (jika belum ada)
      if (before.type === "IZIN_KERAMAIAN" && status === "SELESAI" && !before.nomorSurat) {
        const result = await prisma.$transaction(async (tx) => {
          const nomor = await allocateIzinNumberTx(tx);

          const updated = await tx.letterApplication.update({
            where: { id },
            data: {
              status,
              statusFeedback,
              nomorUrut: nomor.nomorUrut,
              nomorSurat: nomor.nomorSurat,
            },
          });

          return { updated, nomor };
        });

        // ✅ KIRIM PUSH
        if (statusChanged) {
          sendPushToAll({
            title: "Status Pengajuan Berubah",
            body: `Kode ${before.code}: ${before.status} → ${status}`,
            url: targetUrl,
          }).catch((e) => console.error("[pushNotify] error:", e));
        }

        return res.json({
          message: "Status diperbarui + nomor IZIN dibuat",
          row: result.updated,
          nomor: result.nomor,
        });
      }

      // default update
      const updated = await prisma.letterApplication.update({
        where: { id },
        data: { status, statusFeedback },
      });

      // ✅ KIRIM PUSH (hanya jika status benar-benar berubah)
      if (statusChanged) {
        sendPushToAll({
          title: "Status Pengajuan Berubah",
          body: `Kode ${before.code}: ${before.status} → ${status}`,
          url: targetUrl,
        }).catch((e) => console.error("[pushNotify] error:", e));
      }

      return res.json({ message: "Status diperbarui", row: updated });
    } catch (err) {
      console.error(err);
      if (String(err?.code).includes("P2025"))
        return res.status(404).json({ error: "Data tidak ditemukan" });
      return res.status(500).json({ error: "Gagal memperbarui status" });
    }
  }
);

/* ========================================================================
   PUT /api/surat/admin/pengajuan-surat/:id
======================================================================== */
router.put(
  "/admin/pengajuan-surat/:id",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"),
  enforceLetterTypeById(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const b = req.body || {};

      const current =
        req.letterApp ||
        (await prisma.letterApplication.findUnique({
          where: { id },
          select: { id: true, type: true },
        }));

      if (!current) return res.status(404).json({ error: "Data tidak ditemukan" });

      if (current.type === "IZIN_KERAMAIAN") {
        const required = [
          "penanggungJawab",
          "nik",
          "hp",
          "alamat",
          "namaKegiatan",
          "lokasi",
          "waktuMulai",
          "waktuSelesai",
        ];
        for (const k of required) {
          if (!b[k] || String(b[k]).trim() === "")
            return res.status(400).json({ error: `Field ${k} wajib diisi` });
        }

        if (!/^\d{16}$/.test(b.nik))
          return res.status(400).json({ error: "NIK harus 16 digit" });
        if (!/^0\d{9,13}$/.test(b.hp))
          return res.status(400).json({ error: "Nomor HP tidak valid" });
        if (Number(b.perkiraanPeserta ?? 1) <= 0)
          return res.status(400).json({ error: "Perkiraan peserta harus > 0" });
        if (b.waktuSelesai <= b.waktuMulai)
          return res.status(400).json({ error: "Waktu selesai harus setelah mulai" });

        const tanggal = b.tanggal ? new Date(b.tanggal) : undefined;

        const namaOrganisasi =
          Object.prototype.hasOwnProperty.call(b, "namaOrganisasi")
            ? String(b.namaOrganisasi || "").trim() || null
            : undefined;

        const rekomDesaNama =
          Object.prototype.hasOwnProperty.call(b, "rekomDesaNama")
            ? String(b.rekomDesaNama || "").trim() || null
            : undefined;

        const rekomDesaNomor =
          Object.prototype.hasOwnProperty.call(b, "rekomDesaNomor")
            ? String(b.rekomDesaNomor || "").trim() || null
            : undefined;

        const kecamatan =
          Object.prototype.hasOwnProperty.call(b, "kecamatan")
            ? String(b.kecamatan || "").trim() || null
            : undefined;

        if (kecamatan !== undefined && kecamatan !== null && !OPSI_KECAMATAN.includes(kecamatan)) {
          return res.status(400).json({
            error:
              "Kecamatan di luar cakupan wilayah Polsek Tanjung Raja. Pengajuan hanya untuk: Tanjung Raja, Sungai Pinang, Rantau Panjang.",
          });
        }

        const dataUpdate = {
          nik: b.nik,
          hp: b.hp,
          alamat: b.alamat,
          ...(namaOrganisasi !== undefined ? { namaOrganisasi } : {}),
          ...(kecamatan !== undefined ? { kecamatan } : {}),
          penanggungJawab: b.penanggungJawab,
          jenisKegiatan: b.jenisKegiatan ?? null,
          namaKegiatan: b.namaKegiatan,
          lokasi: b.lokasi,
          ...(tanggal ? { tanggal } : {}),
          waktuMulai: b.waktuMulai,
          waktuSelesai: b.waktuSelesai,
          perkiraanPeserta: Number(b.perkiraanPeserta ?? 0),
          ...(rekomDesaNama !== undefined ? { rekomDesaNama } : {}),
          ...(rekomDesaNomor !== undefined ? { rekomDesaNomor } : {}),
          statusFeedback: b.statusFeedback ?? "",
        };

        const updated = await prisma.letterApplication.update({
          where: { id },
          data: dataUpdate,
        });

        return res.json({ message: "Pengajuan diperbarui", row: updated });
      }

      if (current.type === "TANDA_KEHILANGAN") {
        const required = [
          "nama",
          "tempatLahir",
          "tanggalLahir",
          "jenisKelamin",
          "nik",
          "hp",
          "pekerjaan",
          "agama",
          "alamat",
          "kronologi",
        ];
        for (const k of required) {
          if (!b[k] || String(b[k]).trim() === "")
            return res.status(400).json({ error: `Field ${k} wajib diisi` });
        }

        let kehi;
        try {
          kehi = normalizeKehiItemsOrThrow(b);
        } catch (e) {
          return res.status(400).json({ error: String(e?.message || e) });
        }

        if (kehi.items.length > MAX_KEHI_ITEMS) {
          return res.status(400).json({
            error: `Maksimal ${MAX_KEHI_ITEMS} barang/dokumen yang hilang.`,
          });
        }

        if (!/^\d{16}$/.test(b.nik))
          return res.status(400).json({ error: "NIK harus 16 digit" });
        if (!/^0\d{9,13}$/.test(b.hp))
          return res.status(400).json({ error: "Nomor HP tidak valid" });
        if (!["Laki-laki", "Perempuan"].includes(b.jenisKelamin))
          return res.status(400).json({ error: "Jenis kelamin tidak valid" });
        if (String(b.kronologi).trim().length < 10)
          return res.status(400).json({ error: "Kronologi minimal 10 karakter" });

        const kecamatan =
          Object.prototype.hasOwnProperty.call(b, "kecamatan")
            ? String(b.kecamatan || "").trim() || null
            : undefined;

        if (kecamatan !== undefined && kecamatan !== null && !OPSI_KECAMATAN.includes(kecamatan)) {
          return res.status(400).json({
            error:
              "Kecamatan di luar cakupan wilayah Polsek Tanjung Raja. Pengajuan hanya untuk: Tanjung Raja, Sungai Pinang, Rantau Panjang.",
          });
        }

        const updated = await prisma.letterApplication.update({
          where: { id },
          data: {
            ...(kecamatan !== undefined ? { kecamatan } : {}),
            nik: b.nik,
            hp: b.hp,
            alamat: b.alamat,
            nama: b.nama,
            tempatLahir: b.tempatLahir,
            tanggalLahir: new Date(b.tanggalLahir),
            jenisKelamin: b.jenisKelamin,
            pekerjaan: b.pekerjaan,
            agama: b.agama,
            kehilanganItems: kehi.items,
            kehilanganApa: kehi.joined,
            kronologi: b.kronologi,
            ...(b.tanggalLaporan ? { tanggalLaporan: new Date(b.tanggalLaporan) } : {}),
            statusFeedback: b.statusFeedback ?? "",
          },
        });

        return res.json({ message: "Pengajuan diperbarui", row: updated });
      }

      return res.status(400).json({ error: "Tipe surat tidak didukung untuk edit" });
    } catch (err) {
      console.error(err);
      if (String(err?.code).includes("P2025"))
        return res.status(404).json({ error: "Data tidak ditemukan" });
      return res.status(500).json({ error: "Gagal memperbarui pengajuan" });
    }
  }
);

/* ========================================================================
   DELETE /api/surat/admin/pengajuan-surat/:id
======================================================================== */
router.delete(
  "/admin/pengajuan-surat/:id",
  requireAuth,
  allowRoles("SUPER_ADMIN", "ADMIN_INTELKAM", "ADMIN_SPKT"),
  enforceLetterTypeById(),
  async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.letterApplication.delete({ where: { id } });

      return res.json({ message: "Pengajuan dihapus" });
    } catch (err) {
      console.error(err);
      if (String(err?.code).includes("P2025"))
        return res.status(404).json({ error: "Data tidak ditemukan" });
      return res.status(500).json({ error: "Gagal menghapus pengajuan" });
    }
  }
);

module.exports = router;