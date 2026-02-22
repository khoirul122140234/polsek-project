// src/lib/surat/stplkKehilangan.js
import logoSuratUrl from "../../assets/logo surat.png";

const ID_MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];
const ID_DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

/** ✅ BASE GLOBAL FONT RULE (akan di-scale otomatis jika konten panjang) */
const BASE_FS_BOLD = 11;
const BASE_FS_NORMAL = 10;

/** Line gap (Times) */
const BASE_LG_BOLD = 5.2;
const BASE_LG_NORMAL = 4.8;

/** ✅ MAKSIMAL ITEM KEHILANGAN (sesuai Tahap 2: max 5) */
const MAX_KEHILANGAN_ITEMS = 5;

/* =========================
   Date helpers
========================= */
function toDateSafe(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTanggalIndo(dateStr) {
  if (!dateStr) return "-";
  const d = toDateSafe(dateStr);
  if (d) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = ID_MONTHS[d.getMonth()];
    const yy = d.getFullYear();
    return `${dd} ${mm} ${yy}`;
  }
  const [y, m, dd] = String(dateStr).slice(0, 10).split("-");
  if (!y || !m || !dd) return String(dateStr);
  return `${dd} ${ID_MONTHS[Number(m) - 1]} ${y}`;
}

export function hariIndo(dateStr) {
  const d = toDateSafe(dateStr);
  if (!d) return "-";
  return ID_DAYS[d.getDay()];
}

export function jamMenit(dateStr) {
  const d = toDateSafe(dateStr);
  if (!d) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}.${mm}`;
}

const ROMAN_MONTHS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
function romanMonthFromISO(iso) {
  const d = toDateSafe(iso) || new Date();
  const m = d.getMonth(); // 0-11
  return ROMAN_MONTHS[m] || "I";
}

/* =========================
   ✅ URL -> DataURL (untuk jsPDF addImage)
========================= */
async function urlToDataUrl(url) {
  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Konfigurasi surat (ganti sesuai Polsek kamu)
 */
export const STPLK_CONFIG = {
  polda: "KEPOLISIAN DAERAH SUMATERA SELATAN",
  polres: "RESOR OGAN ILIR",
  polsek: "SEKTOR TANJUNG RAJA",
  alamatKop: "Jln. Sultan Mahmud Badaruddin II Tanjung Raja 30661",
  model: "MODEL : C-1",

  nomorPrefix: "STPLK/C-",
  nomorSuffix: "/SPKT/SUMSEL/RES-OI/SEK TGR",

  kapolsekLabel: "A.n. KAPOLSEK TANJUNG RAJA",
  kapolsekJabatan: "P.s. KA SPKT I",
  kapolsekNama: "-",
  kapolsekPangkat: "-",

  penerimaKananTanggalTempat: "Tanjung Raja",
  penerimaKananNama: "-",
  penerimaKananPangkat: "-",

  logoDataUrl: "", // akan diisi otomatis saat generate pdf
  logoW: 18,
  logoH: 18,
};

/* =========================
   Font helpers (scaled)
========================= */
function setBold(doc, fsBold) {
  doc.setFont("times", "bold");
  doc.setFontSize(fsBold);
}
function setNormal(doc, fsNormal) {
  doc.setFont("times", "normal");
  doc.setFontSize(fsNormal);
}

/* =========================
   Helper kecil
========================= */
function cleanStr(v) {
  return String(v ?? "").trim();
}
function upperSafe(v) {
  const s = cleanStr(v);
  return s ? s.toUpperCase() : "";
}
function resolveNowISO(options = {}) {
  const optNow = options?.now;
  const d = optNow ? toDateSafe(optNow) : null;
  return (d || new Date()).toISOString();
}
function formatPangkatNrp(pangkat, nrp) {
  const p = cleanStr(pangkat);
  const n = cleanStr(nrp);
  if (p && n) return `${p} NRP. ${n}`;
  if (p && !n) return p;
  if (!p && n) return `NRP. ${n}`;
  return "";
}
function pickUserName(u) {
  return cleanStr(u?.name) || cleanStr(u?.nama) || cleanStr(u?.fullName) || "";
}
function pickUserPangkat(u) {
  return (
    cleanStr(u?.pangkat) ||
    cleanStr(u?.rank) ||
    cleanStr(u?.pangkatPolri) ||
    cleanStr(u?.pangkat_jabatan) ||
    ""
  );
}
function pickUserNrp(u) {
  return (
    cleanStr(u?.nrp) ||
    cleanStr(u?.NRP) ||
    cleanStr(u?.nomorNrp) ||
    cleanStr(u?.noNrp) ||
    ""
  );
}

function resolveReceiver(options = {}) {
  const u = options?.receiverUser || null;

  const receiverName =
    upperSafe(pickUserName(u)) || upperSafe(STPLK_CONFIG.penerimaKananNama) || "-";

  const receiverPangkat =
    cleanStr(formatPangkatNrp(pickUserPangkat(u), pickUserNrp(u))) ||
    cleanStr(STPLK_CONFIG.penerimaKananPangkat) ||
    "-";

  const tempat =
    cleanStr(options?.tempat) ||
    cleanStr(STPLK_CONFIG.penerimaKananTanggalTempat) ||
    "Tanjung Raja";

  return { receiverName, receiverPangkat, tempat };
}

function resolveSupervisor(options = {}) {
  const s = options?.supervisorUser || null;

  const label =
    cleanStr(s?.label) ||
    cleanStr(options?.supervisorLabel) ||
    cleanStr(STPLK_CONFIG.kapolsekLabel) ||
    "Mengetahui";

  const jabatan =
    cleanStr(s?.jabatan) ||
    cleanStr(options?.supervisorJabatan) ||
    cleanStr(STPLK_CONFIG.kapolsekJabatan) ||
    "";

  const supervisorName =
    upperSafe(pickUserName(s)) || upperSafe(STPLK_CONFIG.kapolsekNama) || "-";

  const supervisorPangkat =
    cleanStr(formatPangkatNrp(pickUserPangkat(s), pickUserNrp(s))) ||
    cleanStr(STPLK_CONFIG.kapolsekPangkat) ||
    "-";

  return { label, jabatan, supervisorName, supervisorPangkat };
}

/* =========================
   ✅ KEHILANGAN ITEMS (maks 5)
========================= */
function splitTextToItems(text) {
  const raw = cleanStr(text);
  if (!raw) return [];
  if (raw.includes("\n")) {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [raw];
}

function coerceItemsFromKehilanganItems(row) {
  const raw = row?.kehilanganItems;

  if (typeof raw === "string") {
    return splitTextToItems(raw).slice(0, MAX_KEHILANGAN_ITEMS);
  }

  const arr = Array.isArray(raw) ? raw : [];
  const flat = [];
  for (const it of arr) {
    if (typeof it === "string") flat.push(...splitTextToItems(it));
    else if (it != null) flat.push(...splitTextToItems(String(it)));
  }

  return flat
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, MAX_KEHILANGAN_ITEMS);
}

/**
 * ✅ WAJIB:
 * - SEMUA item diawali "1 ( Satu ) Buah"
 * - kalau item kosong -> "1 ( Satu ) Buah - A.n Pelapor."
 * - pastikan ada "A.n Pelapor."
 */
function normalizeItemLine(itemText) {
  let s = String(itemText ?? "").trim();

  if (!s) return "1 ( Satu ) Buah - A.n Pelapor.";

  s = s.replace(/\s+/g, " ").trim();

  // hapus prefix hitungan (apa pun formatnya)
  s = s.replace(/^\s*\d+\s*\(\s*[a-zA-Z]+\s*\)\s*(buah\s*)?/i, "").trim();
  s = s.replace(/^\s*buah\s+/i, "").trim();

  if (!s) return "1 ( Satu ) Buah - A.n Pelapor.";

  // pastikan awalan WAJIB sesuai ketentuan surat
  s = `1 ( Satu ) Buah ${s}`.replace(/\s+/g, " ").trim();

  const low = s.toLowerCase();
  if (!low.includes("a.n pelapor")) s = `${s} A.n Pelapor`;

  s = s.replace(/A\.n\s*Pelapor\s*\.?\s*$/i, "A.n Pelapor.");

  return s;
}

/* =========================
   ✅ Nomor Surat resolver (anti row.id)
========================= */
function resolveNomorSurat(row, options = {}) {
  // 1) kalau backend sudah set nomorSurat, pakai itu (paling benar)
  const fromRow = cleanStr(row?.nomorSurat || row?.noSurat || "");
  if (fromRow) return fromRow;

  // 2) kalau caller kasih override (misal preview), pakai itu
  const override = cleanStr(options?.nomorSuratOverride || options?.nomorSurat || "");
  if (override) return override;

  // 3) mode preview: bentuk nomor dari counter UI jika ada
  // options.previewCounter = { nextNumber, year }
  const nowISO = resolveNowISO(options);
  const roman = romanMonthFromISO(nowISO);
  const year =
    Number(options?.previewCounter?.year) ||
    (toDateSafe(nowISO)?.getFullYear() || new Date().getFullYear());
  const nextNumber = Number(options?.previewCounter?.nextNumber);

  if (Number.isFinite(nextNumber) && nextNumber > 0) {
    const noUrut = String(nextNumber).padStart(2, "0");
    return `${STPLK_CONFIG.nomorPrefix}${noUrut}/${roman}/${year}${STPLK_CONFIG.nomorSuffix}`;
  }

  // 4) fallback draft (tetap rapi)
  return `${STPLK_CONFIG.nomorPrefix}__/${roman}/${year}${STPLK_CONFIG.nomorSuffix}`;
}

export function buildSTPLKData(row, options = {}) {
  const nowISO = resolveNowISO(options);

  const hari = hariIndo(nowISO);
  const tglIndo = formatTanggalIndo(nowISO);
  const jam = jamMenit(nowISO);

  const jenisKelamin = (row?.jenisKelamin || "").toLowerCase();
  const pelaporGender = jenisKelamin === "perempuan" ? "Perempuan" : "Laki-laki";

  const receiver = resolveReceiver(options);
  const supervisor = resolveSupervisor(options);

  const rawItems = coerceItemsFromKehilanganItems(row);
  const kehilanganItems = rawItems
    .map((it) => normalizeItemLine(it))
    .filter(Boolean)
    .slice(0, MAX_KEHILANGAN_ITEMS);

  const nomorSurat = resolveNomorSurat(row, options);

  return {
    nama: row?.nama || "-",
    ttlTempat: row?.tempatLahir || "-",
    ttlTanggalIndo: formatTanggalIndo(row?.tanggalLahir),
    pekerjaan: row?.pekerjaan || "-",
    agama: row?.agama || "-",
    alamat: row?.alamat || "-",

    kehilanganItems,

    kronologi: row?.kronologi || "-",
    pelaporGender,

    hari, tglIndo, jam,
    nomorSurat,

    receiverTempat: receiver.tempat,
    receiverName: receiver.receiverName,
    receiverPangkat: receiver.receiverPangkat,

    supervisorLabel: supervisor.label,
    supervisorJabatan: supervisor.jabatan,
    supervisorName: supervisor.supervisorName,
    supervisorPangkat: supervisor.supervisorPangkat,
  };
}

/* =========================
   Helper garis strip
========================= */
function makeDashLine(count = 90) {
  return "-".repeat(Math.max(10, count));
}

function textWithTrailingDashes(doc, {
  text, x, y, rightX,
  gap = 1.2,
  dashCount = 200,
  fontSize = null,
}) {
  if (fontSize) doc.setFontSize(fontSize);
  doc.text(text, x, y);

  const textW = doc.getTextWidth(text);
  const startX = x + textW + gap;
  if (startX >= rightX - 2) return y;

  const availableW = rightX - startX;

  const dashStr = makeDashLine(dashCount);
  let dashW = doc.getTextWidth(dashStr);

  if (dashW > availableW) {
    const ratio = availableW / dashW;
    const cut = Math.max(10, Math.floor(dashStr.length * ratio));
    doc.text(makeDashLine(cut), startX, y);
    return y;
  }

  let final = dashStr;
  while (doc.getTextWidth(final) < availableW) {
    final += dashStr;
    if (final.length > 2000) break;
  }
  while (doc.getTextWidth(final) > availableW && final.length > 10) {
    final = final.slice(0, -1);
  }
  doc.text(final, startX, y);
  return y;
}

function paragraphLastLineWithDashes(doc, {
  text, x, y, maxWidth, rightX,
  lineGap,
}) {
  const lines = doc.splitTextToSize(text, maxWidth);
  if (!lines.length) return y;

  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;
    if (!isLast) {
      doc.text(lines[i], x, y);
      y += lineGap;
    } else {
      textWithTrailingDashes(doc, { text: lines[i], x, y, rightX, dashCount: 400 });
      y += lineGap;
    }
  }
  return y;
}

function dashedColonNameColon(doc, {
  nameText, leftX, rightX, y,
  sideGap = 1.2,
  dashProbe = 900,
  fsBold,
  fsNormal,
}) {
  setBold(doc, fsBold);

  const colon = ":";
  const colonW = doc.getTextWidth(colon);
  const nameW = doc.getTextWidth(nameText);
  const middleW = colonW + sideGap + nameW + sideGap + colonW;

  const totalW = rightX - leftX;
  const cx = leftX + totalW / 2;

  const midLeft = cx - middleW / 2;
  const midRight = cx + middleW / 2;

  const colonLeftX = midLeft + colonW;
  const colonRightX = midRight - colonW;

  const leftDashEnd = midLeft - 1.2;
  if (leftDashEnd > leftX + 1) {
    const avail = leftDashEnd - leftX;
    let s = makeDashLine(dashProbe);
    setNormal(doc, fsNormal);
    while (doc.getTextWidth(s) > avail && s.length > 10) s = s.slice(0, -1);
    doc.text(s, leftX, y);
  }

  setBold(doc, fsBold);
  doc.text(colon, colonLeftX, y, { align: "right" });
  doc.text(nameText, cx, y, { align: "center" });
  doc.text(colon, colonRightX, y, { align: "left" });

  const rightDashStart = midRight + 1.2;
  if (rightX > rightDashStart + 1) {
    const avail = rightX - rightDashStart;
    let s = makeDashLine(dashProbe);
    setNormal(doc, fsNormal);
    while (doc.getTextWidth(s) > avail && s.length > 10) s = s.slice(0, -1);
    doc.text(s, rightDashStart, y);
  }

  setNormal(doc, fsNormal);
}

function multiLineLastDash(doc, {
  text,
  x,
  y,
  maxWidth,
  rightX,
  lineGap,
  dashCount = 500,
}) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  if (!lines.length) return y;

  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;
    if (!isLast) {
      doc.text(lines[i], x, y);
      y += lineGap;
    } else {
      textWithTrailingDashes(doc, { text: lines[i], x, y, rightX, dashCount });
      y += lineGap;
    }
  }
  return y;
}

function bulletWrapLastDash(doc, {
  bulletPrefix = "-   ",
  valueText,
  x,
  y,
  maxWidth,
  rightX,
  lineGap,
  dashCount = 700,
}) {
  const prefix = String(bulletPrefix);
  const prefixW = doc.getTextWidth(prefix);

  const body = String(valueText || "").trim() || "-";
  const lines = doc.splitTextToSize(body, Math.max(10, maxWidth - prefixW));
  if (!lines.length) return y;

  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1;

    if (i === 0) {
      const firstLine = `${prefix}${lines[i]}`;
      if (!isLast) doc.text(firstLine, x, y);
      else textWithTrailingDashes(doc, { text: firstLine, x, y, rightX, dashCount });
    } else {
      const tx = x + prefixW;
      const line = lines[i];
      if (!isLast) doc.text(line, tx, y);
      else textWithTrailingDashes(doc, { text: line, x: tx, y, rightX, dashCount });
    }

    y += lineGap;
  }

  return y;
}

function normalizeSpaces(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function labelInlineValueWrapLastDash(doc, {
  labelText,
  valueText,
  x,
  y,
  maxWidth,
  rightX,
  lineGap,
  dashCount = 1200,
  gapAfterLabel = 2.0,
}) {
  const label = String(labelText || "");
  const value = normalizeSpaces(valueText || "-") || "-";

  const labelW = doc.getTextWidth(label);
  const startValueX = x + labelW + gapAfterLabel;

  const rightLimitX = x + maxWidth;

  const firstAvail = Math.max(10, rightLimitX - startValueX);
  const firstLines = doc.splitTextToSize(value, firstAvail);

  const firstPart = String(firstLines[0] || "").trim() || "-";

  doc.text(label, x, y);
  doc.text(firstPart, startValueX, y);

  const remaining = normalizeSpaces(firstLines.slice(1).join(" "));
  if (!remaining) {
    const firstPartW = doc.getTextWidth(firstPart);
    const dashStartX = startValueX + firstPartW + 1.2;

    if (dashStartX < rightX - 2) {
      const avail = rightX - dashStartX;
      let s = makeDashLine(dashCount);
      while (doc.getTextWidth(s) > avail && s.length > 10) s = s.slice(0, -1);
      doc.text(s, dashStartX, y);
    }

    return y + lineGap;
  }

  y += lineGap;

  let lines2 = doc.splitTextToSize(remaining, Math.max(10, maxWidth));
  lines2 = (Array.isArray(lines2) ? lines2 : [])
    .map((l) => String(l || "").trim())
    .filter(Boolean);

  for (let i = 0; i < lines2.length; i++) {
    const isLast = i === lines2.length - 1;
    const line = String(lines2[i] || "");

    if (!isLast) doc.text(line, x, y);
    else textWithTrailingDashes(doc, { text: line, x, y, rightX, dashCount });

    y += lineGap;
  }

  return y;
}

/* =========================
   CATATAN + PELAPOR
========================= */
function justifyLine(doc, line, x, y, width) {
  const words = String(line).trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    doc.text(line, x, y);
    return;
  }

  let wordsW = 0;
  for (const w of words) wordsW += doc.getTextWidth(w);

  const gaps = words.length - 1;
  const extra = Math.max(0, width - wordsW);
  const gapW = extra / gaps;

  let cursorX = x;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    doc.text(w, cursorX, y);
    cursorX += doc.getTextWidth(w);
    if (i < words.length - 1) cursorX += gapW;
  }
}

function underlineText(doc, { text, x, y, align = "left", pad = 1.2, lw = 0.25 }) {
  const t = String(text || "").trim();
  const w = doc.getTextWidth(t || "-");
  doc.setLineWidth(lw);

  if (align === "center") {
    doc.line(x - w / 2, y + pad, x + w / 2, y + pad);
  } else if (align === "right") {
    doc.line(x - w, y + pad, x, y + pad);
  } else {
    doc.line(x, y + pad, x + w, y + pad);
  }

  doc.setLineWidth(0.2);
}

function drawCatatanAndPelapor(doc, {
  xLeft,
  yTop,
  leftWidth,
  rightCenterX,
  pelaporNameUpper,
  fsBold,
  fsNormal,
  lgNormal,
  scale,
}) {
  doc.setFont("times", "bold");
  doc.setFontSize(fsBold);
  const catTitle = "CATATAN :";
  doc.text(catTitle, xLeft, yTop);

  const catW = doc.getTextWidth(catTitle);
  doc.setLineWidth(0.35);
  doc.line(xLeft, yTop + 1.2, xLeft + catW, yTop + 1.2);
  doc.setLineWidth(0.2);

  doc.setFont("times", "normal");
  doc.setFontSize(fsNormal);

  const items = [
    "LAPORAN POLISI INI DIBUAT BUKAN SEBAGAI PENGGANTI SURAT YANG HILANG, MELAINKAN HANYA UNTUK MENGURUS SURAT YANG HILANG TERSEBUT DIATAS.",
    "SEGALA BENTUK PENYALAHGUNAAN ATAS LAPORAN INI MENJADI TANGGUNG JAWAB PELAPOR.",
    "APABILA DIKEMUDIAN HARI LAPORAN YANG DIBUAT PALSU, MAKA PELAPOR DAPAT DIJERAT PERBUATAN PIDANA MEMBUAT LAPORAN PALSU SESUAI DENGAN PASAL 266 KUHP.",
    "LAPORAN KEHILANGAN INI BERLAKU 1 (SATU) BULAN SEJAK TANGGAL DIKELUARKAN."
  ];

  let y = yTop + (6.5 * (scale || 1));

  for (let i = 0; i < items.length; i++) {
    const no = `${i + 1}.`;
    const noW = doc.getTextWidth(no);
    const indent = noW + 1.0;

    const textAreaW = leftWidth - indent;
    const lines = doc.splitTextToSize(items[i], textAreaW);

    doc.text(no, xLeft, y);

    for (let k = 0; k < lines.length; k++) {
      const isLast = k === lines.length - 1;
      const lineText = String(lines[k] || "");
      const tx = xLeft + indent;

      if (!isLast && lineText.trim()) justifyLine(doc, lineText, tx, y, textAreaW);
      else doc.text(lineText, tx, y);

      y += lgNormal;
    }
  }

  // ✅ blok pelapor (kanan) — tetap rapi mengikuti skala
  const pelY = yTop + (18 * (scale || 1));
  doc.setFont("times", "bold");
  doc.setFontSize(fsBold);
  doc.text("PELAPOR", rightCenterX, pelY, { align: "center" });

  const nameY = pelY + (26 * (scale || 1));
  doc.text(pelaporNameUpper, rightCenterX, nameY, { align: "center" });
  underlineText(doc, { text: pelaporNameUpper, x: rightCenterX, y: nameY, align: "center", pad: 1.4, lw: 0.25 });

  return y; // y akhir catatan
}

/* =========================
   Auto scale (1 halaman)
========================= */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function estimateContentWeight(row) {
  const items = coerceItemsFromKehilanganItems(row);
  const itemsLen = items.join(" ").length;
  const kronoLen = String(row?.kronologi || "").length;
  // ✅ bobot ditambah sedikit karena sekarang bisa sampai 5 item
  return (itemsLen * 1.15) + (kronoLen * 1.0);
}

function pickScaleByWeight(weight) {
  // semakin panjang, semakin kecil; tetap jaga keterbacaan
  if (weight <= 200) return 1.0;
  if (weight <= 360) return 0.95;
  if (weight <= 580) return 0.90;
  if (weight <= 860) return 0.85;
  return 0.80;
}

/* =====================================================
   ✅ INTI PERUBAHAN: builder doc (tanpa save)
===================================================== */
async function createSTPLKDoc(row, options = {}) {
  const { default: jsPDF } = await import("jspdf");

  // ✅ Pastikan logoDataUrl terisi (sekali saja) — dibuat aman
  if (!STPLK_CONFIG.logoDataUrl && logoSuratUrl) {
    try {
      STPLK_CONFIG.logoDataUrl = await urlToDataUrl(logoSuratUrl);
    } catch (e) {
      console.warn("[STPLK] logo load failed, continue without logo:", e);
      STPLK_CONFIG.logoDataUrl = "";
    }
  }

  const pageW = 210;
  const pageH = 297;
  const M = 14;

  // ✅ Render dengan beberapa skala sampai “muat 1 halaman”
  const weight = estimateContentWeight(row);
  const baseScale = pickScaleByWeight(weight);
  const scales = [baseScale, 0.95, 0.90, 0.85, 0.80].filter((v, i, a) => a.indexOf(v) === i);

  let last = null;

  for (const scaleRaw of scales) {
    const scale = clamp(scaleRaw, 0.8, 1.0);

    const fsBold = Math.round(BASE_FS_BOLD * scale * 10) / 10;
    const fsNormal = Math.round(BASE_FS_NORMAL * scale * 10) / 10;

    const lgBold = BASE_LG_BOLD * scale;
    const lgNormal = BASE_LG_NORMAL * scale;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ✅ now harus bisa di-override (biar “realtime” sesuai preview)
    const nowISO = resolveNowISO(options);
    const d = buildSTPLKData(row, { ...options, now: nowISO });

    /* =========================
       KOP
    ========================= */
    const kopLeftX = M;
    const kopBoxW = 95;
    const kopCenterX = kopLeftX + kopBoxW / 2;

    const logoY = 40;
    if (STPLK_CONFIG.logoDataUrl) {
      const lw = STPLK_CONFIG.logoW || 26;
      const lh = STPLK_CONFIG.logoH || 26;
      const lx = pageW / 2 - lw / 2;
      doc.addImage(STPLK_CONFIG.logoDataUrl, "PNG", lx, logoY, lw, lh);
    }

    setBold(doc, fsBold);
    doc.text(STPLK_CONFIG.polda, kopCenterX, 18, { align: "center" });
    doc.text(STPLK_CONFIG.polres, kopCenterX, 23, { align: "center" });
    doc.text(STPLK_CONFIG.polsek, kopCenterX, 28, { align: "center" });

    setNormal(doc, fsNormal);
    const alamatY = 33;
    doc.text(STPLK_CONFIG.alamatKop, kopCenterX, alamatY, { align: "center" });

    const alamatW = doc.getTextWidth(STPLK_CONFIG.alamatKop);
    doc.setLineWidth(0.35);
    doc.line(kopCenterX - alamatW / 2, alamatY + 1.2, kopCenterX + alamatW / 2, alamatY + 1.2);
    doc.setLineWidth(0.2);

    setBold(doc, fsBold);
    doc.text(STPLK_CONFIG.model, pageW - M, 18, { align: "right" });

    /* =========================
       Judul
    ========================= */
    setBold(doc, fsBold);
    const titleY = 62;
    const title = "SURAT TANDA PENERIMAAN LAPORAN KEHILANGAN";
    doc.text(title, pageW / 2, titleY, { align: "center" });

    const titleW = doc.getTextWidth(title);
    doc.setLineWidth(0.8);
    doc.line(pageW / 2 - titleW / 2, titleY + 2.2, pageW / 2 + titleW / 2, titleY + 2.2);
    doc.setLineWidth(0.2);

    setNormal(doc, fsNormal);
    doc.text(`Nomor : ${d.nomorSurat}`, pageW / 2, titleY + 8, { align: "center" });

    /* =========================
       ISI
    ========================= */
    let y = titleY + 18;

    setNormal(doc, fsNormal);
    const parag1 =
      `----- Pada hari ini ${d.hari} tanggal ${d.tglIndo} sekira Jam ${d.jam} Wib, telah datang ke SPKT Polsek ` +
      `${STPLK_CONFIG.polsek.replace("SEKTOR ", "")} seorang ${d.pelaporGender} yang mengaku bernama :`;

    y = paragraphLastLineWithDashes(doc, {
      text: parag1,
      x: M,
      y,
      maxWidth: (pageW - 2 * M),
      rightX: pageW - M,
      lineGap: lgNormal,
    });

    y += 1;
    const namaUpper = (d.nama || "-").toUpperCase();

    dashedColonNameColon(doc, {
      nameText: namaUpper,
      leftX: M,
      rightX: pageW - M,
      y,
      fsBold,
      fsNormal,
    });

    setBold(doc, fsBold);
    const nameOnlyW = doc.getTextWidth(namaUpper);
    doc.setLineWidth(0.9);
    doc.line(pageW / 2 - nameOnlyW / 2, y + 2.2, pageW / 2 + nameOnlyW / 2, y + 2.2);
    doc.setLineWidth(0.2);

    y += 8;

    setNormal(doc, fsNormal);
    const ident1 =
      `Tempat / Tanggal Lahir : ${d.ttlTempat} / ${d.ttlTanggalIndo}, ` +
      `Pekerjaan : ${d.pekerjaan}, Agama : ${d.agama},`;

    textWithTrailingDashes(doc, { text: ident1, x: M, y, rightX: pageW - M, dashCount: 500 });
    y += lgNormal;

    const ident2 = `Alamat : ${d.alamat}`;
    textWithTrailingDashes(doc, { text: ident2, x: M, y, rightX: pageW - M, dashCount: 500 });
    y += 10 * scale;

    const menerangkan = "Menerangkan Melaporkan kehilangan barang / surat – surat berharga berupa :";
    y = multiLineLastDash(doc, {
      text: menerangkan,
      x: M,
      y,
      maxWidth: pageW - 2 * M,
      rightX: pageW - M,
      lineGap: lgNormal,
      dashCount: 500,
    });

    y += 2;

    setBold(doc, fsBold);
    const items = (Array.isArray(d.kehilanganItems) ? d.kehilanganItems : []).slice(0, MAX_KEHILANGAN_ITEMS);

    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        y = bulletWrapLastDash(doc, {
          bulletPrefix: "-   ",
          valueText: items[i],
          x: M + 6,
          y,
          maxWidth: (pageW - M) - (M + 6),
          rightX: pageW - M,
          lineGap: lgBold,
          dashCount: 900,
        });
        y += 0.2;
      }
    } else {
      y = bulletWrapLastDash(doc, {
        bulletPrefix: "-   ",
        valueText: "1 ( Satu ) Buah - A.n Pelapor.",
        x: M + 6,
        y,
        maxWidth: (pageW - M) - (M + 6),
        rightX: pageW - M,
        lineGap: lgBold,
        dashCount: 900,
      });
    }

    y += 4;

    setNormal(doc, fsNormal);
    const kronoClean = normalizeSpaces(d.kronologi || "-");
    const kronoWithDot = kronoClean.endsWith(".") ? kronoClean : `${kronoClean}.`;

    y = labelInlineValueWrapLastDash(doc, {
      labelText: "Yang diketahui hilang",
      valueText: kronoWithDot,
      x: M,
      y,
      maxWidth: pageW - 2 * M,
      rightX: pageW - M,
      lineGap: lgNormal,
      dashCount: 1200,
      gapAfterLabel: 2.0,
    });

    y += 6;

    const penutup =
      "Demikian laporan ini saya buat dengan sebenar-benarnya dan saya bubuhkan tanda tangan dibawah ini sesuai " +
      "dengan tanggal tersebut diatas.";

    setNormal(doc, fsNormal);
    y = paragraphLastLineWithDashes(doc, {
      text: penutup,
      x: M,
      y,
      maxWidth: (pageW - 2 * M),
      rightX: pageW - M,
      lineGap: lgNormal,
    });

    const colGap = 10;
    const leftColX1 = M;
    const leftColX2 = (pageW / 2) - (colGap / 2);
    const rightColX1 = (pageW / 2) + (colGap / 2);
    const rightColX2 = pageW - M;

    const leftCenterX = (leftColX1 + leftColX2) / 2;
    const rightCenterX2 = (rightColX1 + rightColX2) / 2;

    const catTop = y + lgNormal;

    const yAfterCatatan = drawCatatanAndPelapor(doc, {
      xLeft: M,
      yTop: catTop,
      leftWidth: (leftColX2 - leftColX1),
      rightCenterX: rightCenterX2,
      pelaporNameUpper: namaUpper,
      fsBold,
      fsNormal,
      lgNormal,
      scale,
    });

    // ✅ TTD block: otomatis “naik” bila area catatan makin panjang
    // dibuat sedikit lebih adaptif agar item bisa sampai 5 tetap muat 1 halaman
    const minTTD = clamp(yAfterCatatan + (4 * scale), 220, 250);
    const TTD_Y = minTTD;

    setNormal(doc, fsNormal);
    doc.text('Menerima dan membuat Laporan Polisi Model “ C ”', leftCenterX, TTD_Y, { align: "center" });
    doc.text("Mengetahui", leftCenterX, TTD_Y + (5 * scale), { align: "center" });

    setBold(doc, fsBold);
    doc.text(d.supervisorLabel || STPLK_CONFIG.kapolsekLabel, leftCenterX, TTD_Y + (10 * scale), { align: "center" });
    doc.text(d.supervisorJabatan || STPLK_CONFIG.kapolsekJabatan, leftCenterX, TTD_Y + (15 * scale), { align: "center" });

    setNormal(doc, fsNormal);
    doc.text(`${d.receiverTempat}, ${d.tglIndo}`, rightCenterX2, TTD_Y, { align: "center" });
    doc.text("Yang menerima laporan", rightCenterX2, TTD_Y + (5 * scale), { align: "center" });

    const NAME_Y = TTD_Y + (38 * scale);
    const PANGKAT_Y = TTD_Y + (43 * scale);

    setBold(doc, fsBold);
    const supName = d.supervisorName || "-";
    doc.text(supName, leftCenterX, NAME_Y, { align: "center" });
    underlineText(doc, { text: supName, x: leftCenterX, y: NAME_Y, align: "center", pad: 1.4, lw: 0.25 });
    doc.text(d.supervisorPangkat || "-", leftCenterX, PANGKAT_Y, { align: "center" });

    const recName = d.receiverName || "-";
    doc.text(recName, rightCenterX2, NAME_Y, { align: "center" });
    underlineText(doc, { text: recName, x: rightCenterX2, y: NAME_Y, align: "center", pad: 1.4, lw: 0.25 });
    doc.text(d.receiverPangkat || "-", rightCenterX2, PANGKAT_Y, { align: "center" });

    // ✅ cek aman 1 halaman (bottom safe)
    const bottomSafe = pageH - M;
    const fits = (TTD_Y + (50 * scale)) <= bottomSafe;

    last = { doc, data: d };
    if (fits) return last;
  }

  return last;
}

/* =====================================================
   ✅ PREVIEW: return blob URL untuk iframe
===================================================== */
export async function generateSTPLKPDFBlobUrl(row, options = {}) {
  const out = await createSTPLKDoc(row, options);
  const doc = out?.doc;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return url;
}

/* =====================================================
   ✅ DOWNLOAD: pakai doc.save
===================================================== */
export async function generateSTPLKPDF(row, options = {}) {
  const out = await createSTPLKDoc(row, options);
  const doc = out?.doc;

  const nomor = cleanStr(row?.nomorSurat || out?.data?.nomorSurat || "");
  const safeNomor = nomor
    ? nomor.replace(/[^\w-]+/g, "_").slice(0, 60)
    : "";

  const safeName = (row?.nama || "pelapor")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  // ✅ jangan pakai row.id (anti row.id)
  const fallbackStamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const tail = safeNomor ? `_${safeNomor}` : `_${fallbackStamp}`;

  doc.save(`STPLK_${safeName}${tail}.pdf`);
}
