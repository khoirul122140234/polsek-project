// src/lib/surat/izinKeramaian.js
// Surat Izin Keramaian (Intelkam) — 3 halaman (template mengikuti contoh PDF)

import logoSuratUrl from "../../assets/logo surat.png";

const FS_BOLD = 13; // +2
const FS_NORMAL = 12; // +2

const LG_BOLD = 6.0;
const LG_NORMAL = 5.6;

// khusus CATATAN (tetap)
const FS_CAT_BOLD = 11;
const FS_CAT_NORMAL = 10;

const ID_MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];
const ID_DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export const IZIN_CONFIG = {
  kop1: "KEPOLISIAN NEGARA REPUBLIK INDONESIA",
  kop2: "RESOR OGAN ILIR",
  kop3: "SEKTOR TANJUNG RAJA",
  alamatKop: "Jln. Sultan Mahmud Badaruddin II Tanjung Raja 30661",

  // ✅ DEFAULT TTD (TANPA label/A.n)
  signerJabatan: "KEPALA KEPOLISIAN SEKTOR TANJUNG RAJA",
  signerNama: "ZAHIRIN",
  signerPangkatNrp: "AJUN KOMISARIS POLISI NRP. 75040128",

  catatanTitle: "Catatan :",
  catatanLines: [
    "Surat izin yang diterbitkan secara",
    "Elektronik / File PDF dinyatakan sah",
    "terdaftar diregister Unit Intelkam Polsek",
    "Tanjung Raja*",
  ],

  // ✅ default aman (Vite/prod)
  logoPath: logoSuratUrl,
};

function setBold(doc) {
  doc.setFont("times", "bold");
  doc.setFontSize(FS_BOLD);
}
function setNormal(doc) {
  doc.setFont("times", "normal");
  doc.setFontSize(FS_NORMAL);
}
function setCatBold(doc) {
  doc.setFont("times", "bold");
  doc.setFontSize(FS_CAT_BOLD);
}
function setCatNormal(doc) {
  doc.setFont("times", "normal");
  doc.setFontSize(FS_CAT_NORMAL);
}

function cleanStr(v) {
  return String(v ?? "").trim();
}
function upper(v) {
  const s = cleanStr(v);
  return s ? s.toUpperCase() : "";
}
function toDateSafe(x) {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatTanggalIndo(dateLike) {
  const d = toDateSafe(dateLike);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = ID_MONTHS[d.getMonth()];
  const yy = d.getFullYear();
  return `${dd} ${mm} ${yy}`;
}
function hariIndo(dateLike) {
  const d = toDateSafe(dateLike);
  if (!d) return "-";
  return ID_DAYS[d.getDay()];
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * ✅ Ambil nomor urut yang BENAR (bukan gabungan semua digit)
 * Prioritas:
 * 1) row.nomorUrut (paling aman)
 * 2) parse dari row.code dengan format "SI / xxx / ... "
 * 3) fallback: digit dari code
 * 4) fallback: digit dari id
 */
function pickLetterNoFromRow(row) {
  const fromNomorUrut = row?.nomorUrut;
  if (Number.isFinite(Number(fromNomorUrut)) && Number(fromNomorUrut) > 0) {
    return String(Number(fromNomorUrut));
  }

  const code = cleanStr(row?.code);
  if (code) {
    // coba ambil segmen setelah "SI /"
    // contoh: "SI / 287 / X / 2026 / INTELKAM" => 287
    const m = code.match(/^\s*SI\s*\/\s*([^/]+)\s*\//i);
    if (m && m[1]) {
      const seg = cleanStr(m[1]).replace(/[^\w.-]/g, "");
      if (seg) return seg;
    }

    // fallback: ambil digit (kalau memang hanya angka)
    const nums = code.replace(/[^\d]/g, "");
    if (nums) return nums;

    return code;
  }

  const id = cleanStr(row?.id);
  const nums2 = id.replace(/[^\d]/g, "");
  return nums2 || id || "000";
}

function jenisKegiatanToBentuk(jenisKegiatan) {
  const v = cleanStr(jenisKegiatan).toLowerCase();
  if (v === "hiburan") return "Hiburan";
  if (v === "olahraga") return "Olahraga";
  if (v === "keagamaan") return "Keagamaan";
  if (v === "budaya") return "Budaya/Adat";
  if (v === "lainnya") return "Lainnya";
  return jenisKegiatan ? jenisKegiatan : "-";
}

function guessSiangMalam(waktuMulai) {
  const w = cleanStr(waktuMulai);
  const hh = parseInt(w.split(":")[0] || "0", 10);
  if (!Number.isNaN(hh) && hh >= 18) return "MALAM";
  return "SIANG";
}

/* ======================================================
   ✅ BARU: Pembuat singkatan otomatis KD-... dari Nama Desa
   Contoh:
   - "Sejangko I"       -> "KD-SJK.I"
   - "Sungai Pinang"    -> "KD-SP"
   - "Tanjung Raja"     -> "KD-TR"
====================================================== */
function isRomanToken(tokUpper) {
  const t = String(tokUpper || "").trim().toUpperCase();
  return ROMAN.includes(t);
}
function desaToKodeKD(namaDesa) {
  const raw = cleanStr(namaDesa);
  if (!raw) return "";

  // Normalisasi token
  const tokens = raw
    .toUpperCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!tokens.length) return "";

  // buang kata umum (opsional aman)
  const stop = new Set(["DESA", "KELURAHAN", "DUSUN", "DS", "KEL"]);
  const main = tokens.filter((t) => !stop.has(t));

  const list = main.length ? main : tokens;

  // cari roman numeral di ujung (atau di mana pun)
  const roman = list.find((t) => isRomanToken(t)) || "";

  const words = list.filter((t) => !isRomanToken(t));

  let code = "";
  if (words.length >= 2) {
    // multi kata -> ambil huruf pertama tiap kata
    code = words.map((w) => w[0]).join("");
  } else if (words.length === 1) {
    // satu kata -> ambil 3 huruf pertama (seperti SJK)
    const w = words[0];
    code = w.slice(0, 3);
  } else {
    // kalau cuma roman (jarang), fallback
    code = "D";
  }

  // pastikan uppercase
  code = String(code || "").toUpperCase();

  // roman ditulis dengan ".I" ".II" dst (mengikuti contoh KD-SJK.I)
  const suffix = roman ? `.${roman}` : "";

  return `KD-${code}${suffix}`;
}

/**
 * ✅ Nomor surat PDF:
 * - Jika row.nomorSurat sudah ada (nomor resmi setelah SELESAI), gunakan itu.
 * - Jika belum ada, baru generate sementara dari nomorUrut + bulan romawi + tahun.
 */
export function buildIzinKeramaianData(row, options = {}) {
  const createdAt = toDateSafe(row?.createdAt) || new Date();

  const nomorSuratResmi = cleanStr(row?.nomorSurat);
  const nomorUrut = pickLetterNoFromRow(row);
  const mmRomanCreated = ROMAN[createdAt.getMonth()] || "I";
  const tahunCreated = createdAt.getFullYear();

  const nomor = nomorSuratResmi
    ? nomorSuratResmi
    : `SI / ${nomorUrut} / ${mmRomanCreated} / ${tahunCreated} / INTELKAM`;

  const tanggalKegiatan = row?.tanggal ? toDateSafe(row.tanggal) : null;
  const hari = tanggalKegiatan ? hariIndo(tanggalKegiatan) : "-";
  const tglIndo = tanggalKegiatan ? formatTanggalIndo(tanggalKegiatan) : "-";

  const jamMulai = cleanStr(row?.waktuMulai) || "-";
  const jamSelesai = cleanStr(row?.waktuSelesai) || "-";
  const siangMalam = guessSiangMalam(jamMulai);

  const organisasi = cleanStr(row?.namaOrganisasi) ? cleanStr(row.namaOrganisasi) : "-";
  const pj = cleanStr(row?.penanggungJawab) || "-";

  const tempat = cleanStr(row?.lokasi) || "-";
  const dalamRangka = cleanStr(row?.namaKegiatan) || "-";
  const bentuk = jenisKegiatanToBentuk(row?.jenisKegiatan);

  const pesertaJumlah = Number(row?.perkiraanPeserta || 0);
  const pesertaJumlahText = pesertaJumlah ? `+ ${pesertaJumlah} Orang` : "-";

  const issuedPlace = cleanStr(options?.issuedPlace) || "Tanjung Raja";

  // ✅ REALTIME: setiap generate/lihat surat, tanggal = hari ini
  const issuedDate = new Date();
  const issuedDateText = formatTanggalIndo(issuedDate);

  // ✅ REALTIME: bulan romawi + tahun untuk kebutuhan "nomor rekomendasi desa"
  const mmRomanNow = ROMAN[issuedDate.getMonth()] || "I";
  const tahunNow = issuedDate.getFullYear();

  // ✅ BARU: data rekomendasi desa (diisi admin)
  const rekomDesaNama =
    cleanStr(row?.rekomDesaNama || row?.desaRekom || row?.namaDesa || "");
  const rekomDesaNomorRaw =
    cleanStr(row?.rekomDesaNomor || row?.nomorRekomDesa || "");

  // ✅ FIX (sesuai request kamu):
  // - Singkatan KD-... dibuat otomatis dari Nama Desa.
  // - Nomor bisa kosong -> tampil spasi kosong sebelum "/ KD-..."
  const rekomDesaKode = rekomDesaNama ? desaToKodeKD(rekomDesaNama) : "";
  const nomorKosongPad = "        "; // biar terlihat ada ruang kosong (seperti contoh kamu)

  const rekomDesaNomorText = rekomDesaNama
    ? `Nomor : ${rekomDesaNomorRaw ? rekomDesaNomorRaw : nomorKosongPad} / ${rekomDesaKode} / ${mmRomanNow} / ${tahunNow}`
    : "";

  const signer = options?.signer || {};

  // ✅ TTD dari dashboard: HANYA jabatan, nama, pangkatNrp
  const signerJabatan = cleanStr(signer?.jabatan) || IZIN_CONFIG.signerJabatan;
  const signerNama = upper(signer?.nama) || upper(IZIN_CONFIG.signerNama);
  const signerPangkatNrp = cleanStr(signer?.pangkatNrp) || IZIN_CONFIG.signerPangkatNrp;

  return {
    nomor,
    organisasi,
    pj,
    hari,
    tglIndo,
    jamMulai,
    jamSelesai,
    siangMalam,
    tempat,
    bentuk,
    dalamRangka,
    pesertaText: "Masyarakat Sekitar",
    pesertaJumlahText,
    issuedPlace,
    issuedDateText,

    // ✅ BARU: rekom desa (untuk DASAR no.7)
    rekomDesaNama,
    rekomDesaNomorText,
    rekomDesaKode,

    // ✅ TTD
    signerJabatan,
    signerNama,
    signerPangkatNrp,
  };
}

/* =========================
   JUSTIFY ENGINE (manual)
========================= */

const NBSP = "\u00A0";

/* ======================================================
   BOLD PHRASE ENGINE
====================================================== */
const BOLD_PATTERNS = [
  /REMIX[\s\u00A0]*[\/／∕][\s\u00A0]*HOUSE[\s\u00A0]*MUSIK/gi,
  /\bPERJUDIAN\b/gi,
  /\bMINUMAN[\s\u00A0]+KERAS\b/gi,
  /\bNARKOBA\b/gi,
];

/* ======================================================
   ✅ UNDERLINE ENGINE (GARIS FULL 1x)
====================================================== */

function normalizeSpaces(s) {
  return String(s || "").replace(/\u00A0/g, " ");
}
function normTok(t) {
  return normalizeSpaces(String(t || "")).trim().toUpperCase();
}
function stripTrailingPunct(t) {
  return String(t || "").replace(/[.,;:!?]+$/g, "");
}

function drawUnderlineLine(doc, x1, y, x2) {
  const uy = y + 1.6; // baseline -> underline
  const prev = typeof doc.getLineWidth === "function" ? doc.getLineWidth() : null;

  doc.setLineWidth(0.35);
  doc.line(x1, uy, x2, uy);

  if (prev != null) doc.setLineWidth(prev);
}

function underlineSeqUpdate(doc, tokenText, tokenX, tokenY, tokenW, state) {
  const raw = String(tokenText || "");
  const t = normTok(raw);

  const reset = () => {
    state.step = 0;
    state.startX = null;
    state.startY = null;
  };

  if (state.step === 0) {
    if (t === "REMIX") {
      state.step = 1;
      state.startX = tokenX;
      state.startY = tokenY;
    }
    return;
  }

  if (state.step === 1) {
    if (t === "/") {
      state.step = 2;
      return;
    }
    if (t === "REMIX") {
      state.step = 1;
      state.startX = tokenX;
      state.startY = tokenY;
      return;
    }
    reset();
    return;
  }

  if (state.step === 2) {
    if (t === "HOUSE") {
      state.step = 3;
      return;
    }
    if (t === "REMIX") {
      state.step = 1;
      state.startX = tokenX;
      state.startY = tokenY;
      return;
    }
    reset();
    return;
  }

  if (state.step === 3) {
    const musikCheck = stripTrailingPunct(t) === "MUSIK";
    if (musikCheck && state.startX != null && state.startY != null) {
      const musikNoPunct = stripTrailingPunct(raw);
      const musikW = doc.getTextWidth(musikNoPunct);
      const endX = tokenX + musikW;
      drawUnderlineLine(doc, state.startX, state.startY, endX);
    }
    reset();
    return;
  }
}

/** buat frasa tertentu tidak bisa kepotong baris */
function protectBoldPhrases(text) {
  const s = String(text || "");
  return s.replace(/REMIX\s*[\/／∕]\s*HOUSE\s*MUSIK/gi, (m) => {
    return m
      .replace(/\s*[\/／∕]\s*/g, `${NBSP}/${NBSP}`)
      .replace(/[ \t\r\n]+/g, NBSP);
  });
}

/** rapikan spasi biasa, tapi JANGAN sentuh NBSP */
function collapseNormalSpacesOnly(s) {
  return String(s || "")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

/**
 * ✅ wrapGreedy sekarang SUPPORT hard break "\n"
 */
function wrapGreedy(doc, text, maxWidth) {
  const protectedText = protectBoldPhrases(text);

  const parts = String(protectedText).replace(/\r\n/g, "\n").split("\n");

  const allLines = [];
  for (let p = 0; p < parts.length; p++) {
    const t = collapseNormalSpacesOnly(parts[p]);
    if (!t) {
      allLines.push("");
      continue;
    }

    const words = t.split(" ");
    let line = "";

    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (doc.getTextWidth(normalizeSpaces(test)) <= maxWidth) {
        line = test;
      } else {
        if (line) allLines.push(line);
        line = w;
      }
    }
    if (line) allLines.push(line);
  }

  return allLines.length ? allLines : [collapseNormalSpacesOnly(protectedText) || ""];
}

function collectBoldRanges(line) {
  const s = normalizeSpaces(line);

  const ranges = [];
  for (const re of BOLD_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  if (!ranges.length) return ranges;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const [s2, e2] = ranges[i];
    const last = merged[merged.length - 1];
    if (s2 <= last[1]) last[1] = Math.max(last[1], e2);
    else merged.push([s2, e2]);
  }
  return merged;
}

function isInRanges(start, end, ranges) {
  for (const [s, e] of ranges) {
    if (start < e && end > s) return true;
  }
  return false;
}

function tokenizeWordsWithBold(line) {
  const raw = String(line || "");
  const s = normalizeSpaces(raw);
  const ranges = collectBoldRanges(s);

  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const wRaw = m[0];
    const ws = m.index;
    const we = ws + wRaw.length;

    tokens.push({
      text: normalizeSpaces(wRaw),
      bold: isInRanges(ws, we, ranges),
    });

    if (m.index === re.lastIndex) re.lastIndex++;
  }

  return tokens.length ? tokens : [{ text: "", bold: false }];
}

function setStyle(doc, isBold) {
  if (isBold) setBold(doc);
  else setNormal(doc);
}

function wordWidth(doc, w, isBold) {
  setStyle(doc, isBold);
  return doc.getTextWidth(normalizeSpaces(w));
}

function spaceWidth(doc, isBold) {
  setStyle(doc, isBold);
  const w = doc.getTextWidth(" ");
  return Math.max(1.0, w || 0);
}

function drawJustifiedTextLineRich(doc, line, x, y, width) {
  const s = collapseNormalSpacesOnly(line);
  if (!s) return;

  const tokens = tokenizeWordsWithBold(s);
  const ulState = { step: 0, startX: null, startY: null };

  if (tokens.length <= 1) {
    const t0 = tokens[0]?.text || "";
    setStyle(doc, tokens[0]?.bold);
    doc.text(t0, x, y);
    underlineSeqUpdate(doc, t0, x, y, doc.getTextWidth(t0), ulState);
    setNormal(doc);
    return;
  }

  let wordsW = 0;
  for (const t of tokens) wordsW += wordWidth(doc, t.text, t.bold);

  const gaps = tokens.length - 1;
  const gapW = (width - wordsW) / gaps;

  // ✅ kalau ruang tidak cukup untuk justify -> fallback plain
  const minGap = Math.max(0.6, spaceWidth(doc, false));
  if (!Number.isFinite(gapW) || gapW < minGap * 0.4) {
    drawPlainTextLineRich(doc, s, x, y);
    return;
  }

  let cx = x;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    setStyle(doc, t.bold);

    const tw = doc.getTextWidth(t.text);
    doc.text(t.text, cx, y);

    underlineSeqUpdate(doc, t.text, cx, y, tw, ulState);

    cx += tw;

    if (i < tokens.length - 1) {
      cx += Math.max(0.6, gapW);
    }
  }

  setNormal(doc);
}

function drawPlainTextLineRich(doc, line, x, y) {
  const s = collapseNormalSpacesOnly(line);
  if (!s) return;

  const tokens = tokenizeWordsWithBold(s);
  const ulState = { step: 0, startX: null, startY: null };

  let cx = x;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    setStyle(doc, t.bold);

    const tw = doc.getTextWidth(t.text);
    doc.text(t.text, cx, y);

    underlineSeqUpdate(doc, t.text, cx, y, tw, ulState);

    cx += tw;

    if (i < tokens.length - 1) {
      cx += spaceWidth(doc, t.bold);
    }
  }

  setNormal(doc);
}

function drawLabeledNumberedBlockJustify(doc, { labelText, items, x, y, colonX, maxWidth, itemGap = 2.2 }) {
  setBold(doc);
  doc.text(labelText, x, y);

  setBold(doc);
  doc.text(":", colonX, y);

  const startX = colonX + 6;
  const usableW = (x + maxWidth) - startX;

  setNormal(doc);

  for (let i = 0; i < items.length; i++) {
    const no = `${i + 1}.`;
    const noW = doc.getTextWidth(no) + 2;

    const textW = usableW - noW;
    const lines = wrapGreedy(doc, items[i], textW);

    doc.text(no, startX, y);

    if (lines.length === 1) {
      drawPlainTextLineRich(doc, lines[0] || "", startX + noW, y);
      y += LG_NORMAL;
    } else {
      for (let k = 0; k < lines.length; k++) {
        if (k < lines.length - 1) {
          drawJustifiedTextLineRich(doc, lines[k], startX + noW, y, textW);
        } else {
          drawPlainTextLineRich(doc, lines[k], startX + noW, y);
        }
        y += LG_NORMAL;
      }
    }

    y += itemGap;
  }

  return y;
}

/* =========================
   HALAMAN 2: key-value style
   ✅ FIX: value auto-wrap kalau panjang
========================= */
function drawKeyValueLine(doc, {
  label,
  value,
  x,
  y,
  labelW = 42,
  colonX,
  valueBold = false,
  page2LineGap = 0,
  valueMaxW,
}) {
  setNormal(doc);
  doc.text(label, x, y);

  const cx = typeof colonX === "number" ? colonX : (x + labelW);
  doc.text(":", cx, y);

  const vx = cx + 6;
  const maxW = typeof valueMaxW === "number" ? valueMaxW : 120;

  setStyle(doc, !!valueBold);

  const vStr = String(value || "-");
  const lines = wrapGreedy(doc, vStr, maxW);

  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      doc.text(normalizeSpaces(lines[i] || ""), vx, y);
    } else {
      y += (LG_NORMAL + page2LineGap);
      doc.text(normalizeSpaces(lines[i] || ""), vx, y);
    }
  }

  setNormal(doc);
  return y + (LG_NORMAL + page2LineGap);
}

async function loadImageDataUrl(pathOrUrl) {
  const res = await fetch(pathOrUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Gagal load logo: ${pathOrUrl}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/* ===== ketentuan ===== */
const KETENTUAN_SUB = [
  "Wajib menjaga keamanan dan ketertiban masyarakat didalam kegiatan dimaksud.",
  "Wajib menjaga supaya para peserta tidak melakukan kegiatan-kegiatan lain yang bertentangan ataupun menyimpang dari pada tujuan kegiatan yang dinyatakan tertulis dalam pernyataan permohonan izin.",
  "Orkes Dangdut/ Orgen Tunggal yang mengiringi dimaksud dilarang menampilkan para biduan/ penyanyi artis/ penjoget dengan pakaian minim yang menampakan aurat, memperagakan gerakan erotis diatas panggung karena hal ini tidak sesuai dengan Norma Agama dan Norma Kesopanan.",
  "Setiap pemain/ pertunjukan dilarang keras memainkan musik berirama REMIX / HOUSE MUSIK.",
  "Wajib mentaati ketentuan – ketentuan lain yang diberikan oleh pejabat setempat yang berhubungan dengan kegiatan yang dilaksanakan.",
  "Tidak menyediakan tempat PERJUDIAN, menyediakan MINUMAN KERAS dan\nNARKOBA atau sesuatu yang dapat memabukan.",
  "Tidak melakukan kegiatan yang bertentangan dengan Norma Hukum, Norma Agama, Norma Adat dan Norma Kesopanan serta melanggar hukum dan UUD 1945.",
  "Tidak melanggar atau melewati batas waktu yang telah ditentuakan sesuai dengan surat izin yang diterbitkan.",
];

const KETENTUAN_2_5 = [
  "Bilamana terdapat penyimpangan, pelanggaran ataupun laporan/ SMS dari masyarakat terhadap ketentuan surat izin. Penanggung jawab bersedia menghentikan/ menutup acara kegiatan dan apabila tidak diindahkan maka petugas Kepolisian dapat membubarkan/ menghentikan serta mengambil tindakan lain berdasarkan ketentuan hukum yang berlaku tanpa ganti rugi.",
  "Surat izin ini diberikan kepada yang berkepentingan untuk dipergunakan sebagaimana mestinya kecuali terhadap kekeliruan akan diadakan ralat seperlunya.",
  "Pelaku kegiatan/ penanggung jawab kegiatan keramaian wajib menyampaikan surat permohonan izin keramaian dari pemerintah setempat dan disampaikan kepada kesatuan Polri yang mengeluarkan izin dalam waktu selambat – lambatnya 1 (satu) Minggu sebelum pelaksanaan kegiatan.",
  "Setelah selesai pelaksanaan kegiatan, maka penanggung jawab agar melaporkan hasilnya kepada kesatuan Polri yang mengeluarkan izin dalam waktu selambat-lambatnya 1 (satu) Minggu setelah selesainya kegiatan dimaksud.",
];

function drawKetentuanSubLetters(doc, { x, y, maxWidth, fromIndex, toIndex, lineGap = 0.8, itemGap = 1.2 }) {
  setNormal(doc);
  const indentNo = 8;

  for (let i = fromIndex; i <= toIndex; i++) {
    const huruf = String.fromCharCode("a".charCodeAt(0) + i) + ".";
    const hurufW = doc.getTextWidth(huruf) + 2;

    const lines = wrapGreedy(doc, KETENTUAN_SUB[i], maxWidth - indentNo - hurufW);

    doc.text(huruf, x + indentNo, y);

    for (let k = 0; k < lines.length; k++) {
      const tx = x + indentNo + hurufW;
      const tw = maxWidth - indentNo - hurufW;

      if (k < lines.length - 1) drawJustifiedTextLineRich(doc, lines[k], tx, y, tw);
      else drawPlainTextLineRich(doc, lines[k], tx, y);

      y += (LG_NORMAL + lineGap);
    }

    y += itemGap;
  }

  return y;
}

function drawKetentuanItems2to5(doc, { x, y, maxWidth, lineGap = 0.8, itemGap = 1.6 }) {
  setNormal(doc);

  for (let i = 0; i < KETENTUAN_2_5.length; i++) {
    const no = `${i + 2}.`;
    const noW = doc.getTextWidth(no) + 2;

    const lines = wrapGreedy(doc, KETENTUAN_2_5[i], maxWidth - noW);

    doc.text(no, x, y);

    for (let k = 0; k < lines.length; k++) {
      const tx = x + noW;
      const tw = maxWidth - noW;

      if (k < lines.length - 1) drawJustifiedTextLineRich(doc, lines[k], tx, y, tw);
      else drawPlainTextLineRich(doc, lines[k], tx, y);

      y += (LG_NORMAL + lineGap);
    }

    y += itemGap;
  }

  return y;
}

/** CATATAN: gabungkan jadi paragraf lalu justify */
function drawCatatanJustified(doc, { x, y, width, lines }) {
  const paragraph = Array.isArray(lines) ? lines.join(" ").replace(/[ \t\r\n]+/g, " ").trim() : "";
  if (!paragraph) return y;

  setCatNormal(doc);
  const wrapped = wrapGreedy(doc, paragraph, width);

  for (let i = 0; i < wrapped.length; i++) {
    const line = wrapped[i];
    if (i < wrapped.length - 1) {
      const words = normalizeSpaces(line).split(" ");
      if (words.length <= 1) doc.text(normalizeSpaces(line), x, y);
      else {
        const wordsW = words.reduce((acc, w) => acc + doc.getTextWidth(w), 0);
        const gaps = words.length - 1;
        const gapW = (width - wordsW) / gaps;

        let cx = x;
        for (let k = 0; k < words.length; k++) {
          doc.text(words[k], cx, y);
          cx += doc.getTextWidth(words[k]);
          if (k < words.length - 1) cx += gapW;
        }
      }
    } else {
      doc.text(normalizeSpaces(line), x, y);
    }
    y += 4;
  }

  return y;
}

/* ======================================================
   ✅ BLOK "UNTUK KEGIATAN" (LIST 1-4)
====================================================== */
function drawNumberedAlignedKegiatanBlock(doc, {
  xNo,
  y,
  colonX,
  items,
  pageW,
  M_RIGHT,
  lineGap,
  itemGap,
}) {
  setNormal(doc);

  for (let i = 0; i < items.length; i++) {
    const no = `${i + 1}.`;
    const noW = doc.getTextWidth(no) + 2;

    doc.text(no, xNo, y);

    const labelX = xNo + noW;

    doc.text(String(items[i]?.label || ""), labelX, y);
    doc.text(":", colonX, y);

    const valueX = colonX + 6;
    const valueW = pageW - M_RIGHT - valueX;

    const valueLines = wrapGreedy(doc, String(items[i]?.value ?? "-"), valueW);

    for (let k = 0; k < valueLines.length; k++) {
      if (k === 0) {
        drawPlainTextLineRich(doc, valueLines[k], valueX, y);
      } else {
        y += (LG_NORMAL + lineGap);
        drawPlainTextLineRich(doc, valueLines[k], valueX, y);
      }
    }

    y += (LG_NORMAL + lineGap);
    y += itemGap;
  }

  return y;
}

/* =========================
   ✅ helper: garis di ATAS teks (jarak dibuat lebih renggang)
========================= */
function drawOverline(doc, x1, yText, x2) {
  const ly = yText - 5.0;
  const prev = typeof doc.getLineWidth === "function" ? doc.getLineWidth() : null;
  doc.setLineWidth(0.3);
  doc.line(x1, ly, x2, ly);
  if (prev != null) doc.setLineWidth(prev);
}

export async function generateIzinKeramaianPDFDoc(row, options = {}) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;

  const M_LEFT = 16;
  const M_RIGHT = 16;
  const centerX = pageW / 2;

  const d = buildIzinKeramaianData(row, options);

  /* =========================
     HALAMAN 1
  ========================= */

  // COPY KE ... (kanan atas) — BOLD
  {
    const boxW = 34;
    const boxH = 8;
    const boxX = pageW - M_RIGHT - boxW;
    const boxY = 10;
    doc.setLineWidth(0.3);
    doc.rect(boxX, boxY, boxW, boxH);
    setBold(doc);
    doc.text("COPY KE ...", boxX + boxW / 2, boxY + 5.6, { align: "center" });
  }

  // ✅ KOP
  setNormal(doc);
  const kopX = M_LEFT;
  const kopBlockW = 90;
  const kopCenterX = kopX + kopBlockW / 2;

  doc.text(IZIN_CONFIG.kop1, kopCenterX, 14, { align: "center" });
  doc.text(IZIN_CONFIG.kop2, kopCenterX, 18.6, { align: "center" });
  doc.text(IZIN_CONFIG.kop3, kopCenterX, 23.2, { align: "center" });

  const alamatY = 27.8;
  doc.text(IZIN_CONFIG.alamatKop, kopCenterX, alamatY, { align: "center" });

  const addrW = doc.getTextWidth(IZIN_CONFIG.alamatKop);
  const addrLeft = kopCenterX - addrW / 2;
  doc.setLineWidth(0.2);
  doc.line(addrLeft, alamatY + 1.2, addrLeft + addrW, alamatY + 1.2);

  // Logo tengah
  try {
    const logoPath = cleanStr(options?.logoPath) || IZIN_CONFIG.logoPath;
    const dataUrl = await loadImageDataUrl(logoPath);
    const logoW = 18;
    const logoH = 18;
    const logoY = 36;
    doc.addImage(dataUrl, "PNG", centerX - logoW / 2, logoY, logoW, logoH);
  } catch (_e) {}

  // Judul
  setBold(doc);
  const titleY = 58;
  const titleText = "S U R A T - I Z I N";
  doc.text(titleText, centerX, titleY, { align: "center" });

  // ✅ GARIS BAWAH JUDUL (sesuai contoh) — panjang mengikuti judul
  const titleW = doc.getTextWidth(titleText);
  doc.setLineWidth(0.3);
  doc.line(centerX - titleW / 2, titleY + 1.6, centerX + titleW / 2, titleY + 1.6);

  // ✅ Nomor DI BAWAH GARIS (sesuai contoh)
  setNormal(doc);
  const nomorY = titleY + 6.8;
  const nomorText = `Nomor : ${d.nomor}`;
  doc.text(nomorText, centerX, nomorY, { align: "center" });

  // PERTIMBANGAN + DASAR
  let y = 75;
  const COLON_X = 62;

  const pertimbangan = [
    "Bahwa telah dipenuhi segala hal yang merupakan persyaratan formal dalam permohonan izin kegiatan yang telah diajukan oleh pihak pemohon.",
    "Bahwa kegiatan yang akan dilaksanakan dipandang tidak bertentangan dengan kebijakan pemerintah daerah khususnya ditempat kegiatan dilaksanakan.",
    "Bahwa kegiatan yang akan dilaksanakan itu dimungkinkan tidak menimbulkan kerawanan kamtibmas terutama dalam lingkungan dimana tempat kegiatan dilaksanakan.",
  ];

  y = drawLabeledNumberedBlockJustify(doc, {
    labelText: "PERTIMBANGAN",
    items: pertimbangan,
    x: M_LEFT,
    y,
    colonX: COLON_X,
    maxWidth: pageW - M_LEFT - M_RIGHT,
    itemGap: 2.2,
  });

  y += 2;

  // ✅ DASAR: no.7 (FIX sesuai request kamu)
  // Format yang diinginkan:
  // "Surat permohonan Izin Keramaian Desa <NAMA> Nomor : <kosong/nomor> / KD-... / <Romawi> / <Tahun> tentang permohonan izin keramaian."
  const dasar7 = (() => {
    if (d.rekomDesaNama) {
      return `Surat permohonan Izin Keramaian Desa ${d.rekomDesaNama} ${d.rekomDesaNomorText} tentang permohonan izin keramaian.`
        .replace(/[ \t\r\n]+/g, " ")
        .trim();
    }
    // fallback jika admin belum isi desa
    return `Surat permohonan Izin Keramaian ${d.organisasi !== "-" ? d.organisasi : ""}`.trim() +
      " tentang permohonan izin keramaian.";
  })();

  const dasar = [
    "UU RI No. 2 Tahun 2002 Tentang Ketentuan pokok Kepolisian Negara republik Indonesia.",
    "UU RI No. 25 Tahun 2009 Tentang Pelayanan Publik.",
    "PP No. 60 Tahun 2017 Tentang Cara Perizinan dan Pengawasan Giat Keramaian Umum, Kegiatan masyarakat lainnya dan Pemberitahuan giat politik.",
    "Juklap Kapolri No.Pol : Juklap / 02 / XII / 1995 tanggal 29 Desember 1995 tentang perizinan dan pemberitahuan kegiatan masyarakat.",
    "Perda Kabupaten Ogan Ilir No.16 Tahun 2012 Tentang Pengaturan Operasional tempat hiburan.",
    "Kesepakatan bersama antara Pemkab Ogan Ilir, TNI, Polri, Tomas, Pengurus Orgen Tunggal dan Masyarakat Kab. Ogan Ilir Tanggal 01 Februari 2019.",
    dasar7,
  ].filter(Boolean);

  y = drawLabeledNumberedBlockJustify(doc, {
    labelText: "D A S A R",
    items: dasar,
    x: M_LEFT,
    y,
    colonX: COLON_X,
    maxWidth: pageW - M_LEFT - M_RIGHT,
    itemGap: 2.0,
  });

  // / Memberikan izin….. BOLD
  setBold(doc);
  doc.text("/ Memberikan izin…..", pageW - M_RIGHT, pageH - 12, { align: "right" });

  /* =========================
     HALAMAN 2
  ========================= */
  doc.addPage();

  const PAGE2_LINE_GAP = 1.6;
  const PAGE2_SECTION_GAP = 4.0;
  const PAGE2_ITEM_GAP = 2.4;
  const PAGE2_TOP = 22;

  y = PAGE2_TOP;

  setBold(doc);
  doc.text("M E M B E R I K A N -  I Z I N", centerX, y, { align: "center" });
  const t2w = doc.getTextWidth("M E M B E R I K A N -  I Z I N");
  doc.setLineWidth(0.3);
  doc.line(centerX - t2w / 2, y + 1.6, centerX + t2w / 2, y + 1.6);

  y += 10 + PAGE2_SECTION_GAP;

  setNormal(doc);
  doc.text("K e p a d a", M_LEFT, y);
  doc.text(":", 62, y);

  y += (LG_NORMAL + PAGE2_LINE_GAP);

  const COLON2_X = 62;
  const valueX = COLON2_X + 6;
  const valueW = pageW - M_RIGHT - valueX;

  y = drawKeyValueLine(doc, {
    label: "Nama Organisasi",
    value: d.organisasi,
    x: M_LEFT,
    y,
    colonX: COLON2_X,
    valueBold: true,
    page2LineGap: PAGE2_LINE_GAP,
    valueMaxW: valueW,
  });

  y = drawKeyValueLine(doc, {
    label: "Nama Penanggung Jawab",
    value: d.pj,
    x: M_LEFT,
    y,
    colonX: COLON2_X,
    valueBold: true,
    page2LineGap: PAGE2_LINE_GAP,
    valueMaxW: valueW,
  });

  y = drawKeyValueLine(doc, {
    label: "Waktu Kegiatan",
    value: `Hari ${d.hari} tanggal ${d.tglIndo}`,
    x: M_LEFT,
    y,
    colonX: COLON2_X,
    valueBold: false,
    page2LineGap: PAGE2_LINE_GAP,
    valueMaxW: valueW,
  });

  y = drawKeyValueLine(doc, {
    label: "Jam",
    value: `${d.jamMulai} WIB s/d ${d.jamSelesai} WIB (${d.siangMalam})`,
    x: M_LEFT,
    y,
    colonX: COLON2_X,
    valueBold: true,
    page2LineGap: PAGE2_LINE_GAP,
    valueMaxW: valueW,
  });

  setNormal(doc);
  doc.text("Tempat Kegiatan", M_LEFT, y);
  doc.text(":", COLON2_X, y);

  const tempatX = COLON2_X + 6;
  const tempatW = pageW - M_RIGHT - tempatX;
  const tempatLines = wrapGreedy(doc, d.tempat, tempatW);

  for (let i = 0; i < tempatLines.length; i++) {
    if (i < tempatLines.length - 1) drawJustifiedTextLineRich(doc, tempatLines[i], tempatX, y, tempatW);
    else drawPlainTextLineRich(doc, tempatLines[i], tempatX, y);
    y += (LG_NORMAL + PAGE2_LINE_GAP);
  }

  y += PAGE2_SECTION_GAP;

  setBold(doc);
  doc.text("Untuk Kegiatan", M_LEFT, y);
  setBold(doc);
  doc.text(":", COLON2_X, y);
  y += (LG_BOLD + PAGE2_ITEM_GAP);

  setNormal(doc);

  const kegiatanItems = [
    { label: "Bentuk / Macam", value: d.bentuk },
    { label: "Dalam Rangka", value: d.dalamRangka },
    { label: "Peserta", value: d.pesertaText },
    { label: "Jumlah Peserta", value: d.pesertaJumlahText },
  ];

  y = drawNumberedAlignedKegiatanBlock(doc, {
    xNo: M_LEFT + 10,
    y,
    colonX: COLON2_X,
    items: kegiatanItems,
    pageW,
    M_RIGHT,
    lineGap: PAGE2_LINE_GAP,
    itemGap: PAGE2_ITEM_GAP,
  });

  y += PAGE2_SECTION_GAP;

  setBold(doc);
  doc.text("Dengan Ketentuan - Ketentuan Sebagai Berikut :", M_LEFT, y);
  y += (LG_BOLD + PAGE2_ITEM_GAP);

  setNormal(doc);
  doc.text("1. Penanggung Jawab wajib mentaati Ketentuan – Ketentuan Sebagai Berikut :", M_LEFT, y);
  y += (LG_NORMAL + PAGE2_LINE_GAP);

  // a-h
  y = drawKetentuanSubLetters(doc, {
    x: M_LEFT,
    y,
    maxWidth: pageW - M_LEFT - M_RIGHT,
    fromIndex: 0,
    toIndex: 7,
    lineGap: 1.0,
    itemGap: 1.6,
  });

  setBold(doc);
  doc.text("/ 2. Bilamana terdapat…..", pageW - M_RIGHT, pageH - 12, { align: "right" });

  /* =========================
     HALAMAN 3
  ========================= */
  doc.addPage();

  y = 25;

  y = drawKetentuanItems2to5(doc, {
    x: M_LEFT,
    y,
    maxWidth: pageW - M_LEFT - M_RIGHT,
    lineGap: 0.9,
    itemGap: 2.0,
  });

  const ttdMinY = y + 6;
  const ttdY = Math.min(Math.max(ttdMinY, 155), 215);

  const TTD_SHIFT = -4;
  const ttdLeftX = 110 + TTD_SHIFT;

  const ttdColonX = ttdLeftX + 30;
  const ttdValueX = ttdColonX + 5;

  setNormal(doc);
  doc.text("Dikeluarkan di", ttdLeftX, ttdY);
  doc.text(":", ttdColonX, ttdY);
  doc.text(d.issuedPlace, ttdValueX, ttdY);

  doc.text("Pada Tanggal", ttdLeftX, ttdY + 6);
  doc.text(":", ttdColonX, ttdY + 6);
  doc.text(d.issuedDateText, ttdValueX, ttdY + 6);

  // posisi blok
  const jabatanY = ttdY + 14;
  const namaY = jabatanY + 34;
  const garisNamaY = namaY + 2;
  const pangkatY = namaY + 8;

  // ✅ lebar pangkat (untuk garis bawah nama & alignment tanda tangan)
  setBold(doc);
  const pangkatW = doc.getTextWidth(d.signerPangkatNrp);
  const centerSigX = ttdLeftX + pangkatW / 2;

  // Jabatan
  setNormal(doc);
  doc.text(d.signerJabatan, ttdLeftX, jabatanY);

  // ✅ GARIS DI ATAS JABATAN: panjang mengikuti isi JABATAN
  const jabatanW = doc.getTextWidth(d.signerJabatan);
  drawOverline(doc, ttdLeftX, jabatanY, ttdLeftX + jabatanW);

  // Nama
  setBold(doc);
  doc.text(d.signerNama, centerSigX, namaY, { align: "center" });

  // garis bawah nama: panjang sama dengan pangkatW
  doc.setLineWidth(0.3);
  doc.line(ttdLeftX, garisNamaY, ttdLeftX + pangkatW, garisNamaY);

  // Pangkat/NRP
  setBold(doc);
  doc.text(d.signerPangkatNrp, centerSigX, pangkatY, { align: "center" });

  const catX = M_LEFT;
  const catY = Math.min(pageH - 26, pangkatY + 6);

  setCatBold(doc);
  doc.text(IZIN_CONFIG.catatanTitle, catX, catY);

  const catWidth = 78;
  drawCatatanJustified(doc, {
    x: catX,
    y: catY + 7,
    width: catWidth,
    lines: IZIN_CONFIG.catatanLines,
  });

  return doc;
}

export async function generateIzinKeramaianPDF(row, options = {}) {
  const doc = await generateIzinKeramaianPDFDoc(row, options);

  const nomor = cleanStr(buildIzinKeramaianData(row, options).nomor)
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_");
  const safeName = cleanStr(row?.penanggungJawab || "pemohon")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  doc.save(`SURAT_IZIN_${safeName}_${nomor || pad2(1)}.pdf`);
}

export async function generateIzinKeramaianPDFBlobUrl(row, options = {}) {
  const doc = await generateIzinKeramaianPDFDoc(row, options);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
