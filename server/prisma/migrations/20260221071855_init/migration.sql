-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_INTELKAM', 'ADMIN_KASIUM', 'ADMIN_SPKT');

-- CreateEnum
CREATE TYPE "public"."LetterType" AS ENUM ('IZIN_KERAMAIAN', 'TANDA_KEHILANGAN');

-- CreateEnum
CREATE TYPE "public"."LetterStatus" AS ENUM ('DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DITOLAK', 'SELESAI');

-- CreateEnum
CREATE TYPE "public"."OnlineReportStatus" AS ENUM ('BARU', 'DIPROSES', 'SELESAI', 'DITOLAK');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'ADMIN_SPKT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nrp" TEXT,
    "pangkat" TEXT,
    "satuan" TEXT,
    "avatarUrl" TEXT,
    "ttdJabatan" TEXT,
    "ttdNama" TEXT,
    "ttdPangkat" TEXT,
    "ttdNrp" TEXT,
    "stplkLabel" TEXT,
    "stplkJabatan" TEXT,
    "stplkNama" TEXT,
    "stplkPangkat" TEXT,
    "stplkNrp" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaderProfile" (
    "id" SERIAL NOT NULL,
    "roleKey" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LeaderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Unit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Anggota" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "foto_url" TEXT,
    "unit_id" INTEGER NOT NULL,

    CONSTRAINT "Anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Facility" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."News" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "images" JSONB,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "sharedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Education" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "image" TEXT,
    "images" JSONB,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "sharedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LetterCounter" (
    "id" SERIAL NOT NULL,
    "type" "public"."LetterType" NOT NULL,
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LetterCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LetterApplication" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."LetterType" NOT NULL,
    "status" "public"."LetterStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "statusFeedback" TEXT DEFAULT '',
    "nomorUrut" INTEGER,
    "nomorSurat" TEXT,
    "nik" TEXT NOT NULL,
    "hp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "namaOrganisasi" TEXT,
    "kecamatan" TEXT,
    "penanggungJawab" TEXT,
    "jenisKegiatan" TEXT,
    "namaKegiatan" TEXT,
    "lokasi" TEXT,
    "tanggal" TIMESTAMP(3),
    "waktuMulai" TEXT,
    "waktuSelesai" TEXT,
    "perkiraanPeserta" INTEGER,
    "ktpPath" TEXT,
    "rekomendasiDesaPath" TEXT,
    "rekomDesaNama" TEXT,
    "rekomDesaNomor" TEXT,
    "nama" TEXT,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3),
    "jenisKelamin" TEXT,
    "pekerjaan" TEXT,
    "agama" TEXT,
    "kehilanganItems" JSONB,
    "kehilanganApa" TEXT,
    "kronologi" TEXT,
    "tanggalLaporan" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OnlineReport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "public"."OnlineReportStatus" NOT NULL DEFAULT 'BARU',
    "statusFeedback" TEXT DEFAULT '',
    "nama" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "hp" TEXT NOT NULL,
    "kecamatan" TEXT,
    "jenis" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jam" TEXT NOT NULL,
    "kronologi" TEXT NOT NULL,
    "lampiranPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SuratRekap" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "noSurat" TEXT NOT NULL,
    "kepada" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "disposisiKa" TEXT,
    "paraf" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuratRekap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "subscription" JSONB NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "public"."User"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderProfile_roleKey_key" ON "public"."LeaderProfile"("roleKey");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "public"."Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "public"."News"("slug");

-- CreateIndex
CREATE INDEX "News_sharedByUserId_idx" ON "public"."News"("sharedByUserId");

-- CreateIndex
CREATE INDEX "News_date_idx" ON "public"."News"("date");

-- CreateIndex
CREATE INDEX "News_popularity_idx" ON "public"."News"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "Education_slug_key" ON "public"."Education"("slug");

-- CreateIndex
CREATE INDEX "Education_sharedByUserId_idx" ON "public"."Education"("sharedByUserId");

-- CreateIndex
CREATE INDEX "Education_date_idx" ON "public"."Education"("date");

-- CreateIndex
CREATE INDEX "Education_popularity_idx" ON "public"."Education"("popularity");

-- CreateIndex
CREATE INDEX "LetterCounter_type_year_idx" ON "public"."LetterCounter"("type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LetterCounter_type_year_key" ON "public"."LetterCounter"("type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LetterApplication_code_key" ON "public"."LetterApplication"("code");

-- CreateIndex
CREATE INDEX "LetterApplication_type_status_idx" ON "public"."LetterApplication"("type", "status");

-- CreateIndex
CREATE INDEX "LetterApplication_createdAt_idx" ON "public"."LetterApplication"("createdAt");

-- CreateIndex
CREATE INDEX "LetterApplication_nik_idx" ON "public"."LetterApplication"("nik");

-- CreateIndex
CREATE INDEX "LetterApplication_kecamatan_idx" ON "public"."LetterApplication"("kecamatan");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineReport_code_key" ON "public"."OnlineReport"("code");

-- CreateIndex
CREATE INDEX "OnlineReport_status_idx" ON "public"."OnlineReport"("status");

-- CreateIndex
CREATE INDEX "OnlineReport_createdAt_idx" ON "public"."OnlineReport"("createdAt");

-- CreateIndex
CREATE INDEX "OnlineReport_nik_idx" ON "public"."OnlineReport"("nik");

-- CreateIndex
CREATE INDEX "OnlineReport_jenis_idx" ON "public"."OnlineReport"("jenis");

-- CreateIndex
CREATE INDEX "SuratRekap_tanggal_idx" ON "public"."SuratRekap"("tanggal");

-- CreateIndex
CREATE INDEX "SuratRekap_noSurat_idx" ON "public"."SuratRekap"("noSurat");

-- CreateIndex
CREATE INDEX "SuratRekap_createdById_idx" ON "public"."SuratRekap"("createdById");

-- CreateIndex
CREATE INDEX "Document_isActive_idx" ON "public"."Document"("isActive");

-- CreateIndex
CREATE INDEX "Document_sortOrder_idx" ON "public"."Document"("sortOrder");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "public"."Document"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Anggota" ADD CONSTRAINT "Anggota_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."News" ADD CONSTRAINT "News_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Education" ADD CONSTRAINT "Education_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SuratRekap" ADD CONSTRAINT "SuratRekap_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
