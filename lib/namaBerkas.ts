// Penamaan berkas laporan yang mengikuti pola berkas sebelumnya di Google Drive.
// Contoh: Drive berisi "LAPHAR 25102026" -> laporan tanggal 27 Okt 2026 disimpan
// sebagai "LAPHAR 27102026.docx". Polanya (pemisah setelah awalan, pemisah
// tanggal, tahun 2/4 digit, atau berbasis perihal) DIPELAJARI dari berkas
// terbaru dengan awalan yang sama -- bukan ditulis mati.

import { cariBerkasByNama, isDriveConfigured, type DriveFile } from "./googleDrive";

/** Awalan nama berkas tiap templateType. */
export const AWALAN_BERKAS: Record<string, string> = {
  "rencana-kegiatan": "REN",
  "laporan-harian-intelijen": "LAPHAR",
  "laporan-informasi": "LI",
  "laporan-harian-khusus": "LAPHARSUS",
  infosus: "INFOSUS",
};

export interface Tgl {
  d: number;
  m: number;
  y: number;
}

export interface BentukNama {
  /** Awalan persis seperti tertulis di contoh (huruf besar/kecilnya dipertahankan). */
  awalan: string;
  /** Pemisah antara awalan dan isi: " ", "-", " - ", "" ... */
  sep: string;
  /** null = nama berbasis perihal (tanpa tanggal). */
  tanggal: { pemisah: string; tahun4: boolean } | null;
}

// dd mm yy(yy) dengan pemisah opsional yang konsisten: 25102026, 251026, 25-10-2026, 25.10.26
const TANGGAL_RE = /(?<!\d)(\d{2})([-._]?)(\d{2})\2(\d{4}|\d{2})(?!\d)/;
const EKSTENSI_RE = /\.(docx?|pdf|txt|xlsx?|gdoc)$/i;

const dua = (n: number) => String(n).padStart(2, "0");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function sanitizePerihal(teks?: string): string {
  if (!teks) return "tanpa-perihal";
  return teks.replace(/[\/\\:*?"<>|]/g, "_").trim() || "tanpa-perihal";
}

/** Pelajari bentuk nama dari satu contoh berkas. null jika tak diawali `awalan`. */
export function pelajariBentuk(namaBerkas: string, awalan: string): BentukNama | null {
  const tanpaExt = namaBerkas.replace(EKSTENSI_RE, "").trim();
  const m = tanpaExt.match(new RegExp(`^(${esc(awalan)})(?![A-Za-z])([\\s._-]*)(.*)$`, "i"));
  if (!m) return null;

  const t = m[3].match(TANGGAL_RE);
  const valid = t && Number(t[1]) >= 1 && Number(t[1]) <= 31 && Number(t[3]) >= 1 && Number(t[3]) <= 12;
  return {
    awalan: m[1],
    sep: m[2],
    tanggal: valid ? { pemisah: t[2], tahun4: t[4].length === 4 } : null,
  };
}

/** Bentuk yang paling sering dipakai di antara contoh (seri -> yang lebih baru). */
export function pilihBentuk(contoh: BentukNama[]): BentukNama | null {
  const hitung = new Map<string, { bentuk: BentukNama; n: number }>();
  for (const b of contoh) {
    const kunci = JSON.stringify([b.sep, b.tanggal]);
    const ada = hitung.get(kunci);
    if (ada) ada.n++;
    else hitung.set(kunci, { bentuk: b, n: 1 });
  }
  let terbaik: { bentuk: BentukNama; n: number } | null = null;
  for (const kandidat of hitung.values()) if (!terbaik || kandidat.n > terbaik.n) terbaik = kandidat;
  return terbaik?.bentuk ?? null;
}

/** Susun nama baru dari bentuk hasil belajar. null jika bahan yang dibutuhkan tak ada. */
export function susunNama(
  bentuk: BentukNama,
  bahan: { tanggal?: Tgl | null; perihal?: string; ext: string }
): string | null {
  let isi: string;
  if (bentuk.tanggal) {
    if (!bahan.tanggal) return null;
    const { d, m, y } = bahan.tanggal;
    const p = bentuk.tanggal.pemisah;
    const tahun = bentuk.tanggal.tahun4 ? String(y) : String(y).slice(-2);
    isi = `${dua(d)}${p}${dua(m)}${p}${tahun}`;
  } else {
    if (!bahan.perihal) return null; // contoh berbasis perihal tapi perihal tak tersedia
    isi = sanitizePerihal(bahan.perihal);
  }
  return `${bentuk.awalan}${bentuk.sep}${isi}.${bahan.ext}`;
}

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { bentuk: BentukNama | null; kedaluwarsa: number }>();

export interface DriveNamaDeps {
  isConfigured: () => boolean;
  cari: (awalan: string) => Promise<DriveFile[]>;
}
const defaultDeps: DriveNamaDeps = { isConfigured: isDriveConfigured, cari: awalan => cariBerkasByNama(awalan) };

async function bentukDariDrive(awalan: string, deps: DriveNamaDeps): Promise<BentukNama | null> {
  const hit = cache.get(awalan);
  if (hit && hit.kedaluwarsa > Date.now()) return hit.bentuk;

  const berkas = await deps.cari(awalan); // sudah urut terbaru dulu
  const contoh = berkas.map(f => pelajariBentuk(f.name, awalan)).filter((b): b is BentukNama => b !== null);
  const bentuk = pilihBentuk(contoh);
  cache.set(awalan, { bentuk, kedaluwarsa: Date.now() + CACHE_MS });
  return bentuk;
}

/** Nama berkas mengikuti Drive, atau null (Drive tak terhubung / tak ada contoh / gagal). */
export async function namaMengikutiDrive(
  opts: { templateType: string; ext: string; tanggal?: Tgl | null; perihal?: string },
  deps: DriveNamaDeps = defaultDeps
): Promise<string | null> {
  const awalan = AWALAN_BERKAS[opts.templateType];
  if (!awalan || !deps.isConfigured()) return null;
  try {
    const bentuk = await bentukDariDrive(awalan, deps);
    return bentuk ? susunNama(bentuk, opts) : null;
  } catch (err) {
    console.error("namaMengikutiDrive gagal:", err);
    return null;
  }
}

export function _kosongkanCacheNama() {
  cache.clear();
}
