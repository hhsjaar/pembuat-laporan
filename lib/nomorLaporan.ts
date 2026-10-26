// Penomoran surat/laporan otomatis: nomor berikutnya = nomor terakhir yang
// tertulis di berkas laporan terbaru pada folder Google Drive + 1.
// Contoh: "R/LHI/298/X/REN.4.1.1./2026/Intelkam" -> berikutnya 299.
//
// Urutan dihitung per tahun (angka lanjut terus antarbulan, hanya bagian
// bulan romawi yang mengikuti tanggal laporan). Tahun baru -> mulai dari 1.

import { isDriveConfigured, listRecentFiles, readFileText, type DriveFile } from "./googleDrive";

// Baru LHI yang formatnya pasti (dari contoh nomor asli). Jenis lain (LHK, LI,
// INFOSUS) baru boleh ditambahkan di sini setelah format nomor aslinya dikonfirmasi.
export type KodeNomor = "LHI";

/** Penulisan segmen "REN.4.1.1." per jenis. */
const REN: Record<KodeNomor, string> = {
  LHI: "REN.4.1.1.",
};

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const SCAN_FILE_LIMIT = 12;

export interface NomorTerbaca {
  urutan: number;
  tahun: number;
}

export type HasilNomor =
  | { ok: true; nomor: string; urutan: number; terakhir: number | null; berkas: string | null }
  | { ok: false; alasan: string };

/** Semua nomor berformat "R/<KODE>/<urutan>/<romawi>/<REN...>/<tahun>" dalam teks. */
export function cariNomor(teks: string, kode: KodeNomor): NomorTerbaca[] {
  const re = new RegExp(
    String.raw`R\s*\/\s*${kode}\s*\/\s*(\d{1,5})\s*\/\s*[IVX]{1,4}\s*\/\s*[A-Za-z0-9.\s]{3,20}?\s*\/\s*(\d{4})\b`,
    "gi"
  );
  const hasil: NomorTerbaca[] = [];
  for (const m of teks.matchAll(re)) hasil.push({ urutan: Number(m[1]), tahun: Number(m[2]) });
  return hasil;
}

/** Urutan terakhir untuk tahun tertentu, atau 0 jika baru ada nomor tahun-tahun sebelumnya. null = tak bisa disimpulkan. */
export function urutanTerakhir(ditemukan: NomorTerbaca[], tahun: number): number | null {
  const tahunIni = ditemukan.filter(n => n.tahun === tahun);
  if (tahunIni.length > 0) return Math.max(...tahunIni.map(n => n.urutan));
  if (ditemukan.length > 0 && ditemukan.every(n => n.tahun < tahun)) return 0; // tahun baru
  return null;
}

export function formatNomor(kode: KodeNomor, urutan: number, bulan: number, tahun: number): string {
  return `R/${kode}/${urutan}/${ROMAWI[bulan - 1]}/${REN[kode]}/${tahun}/Intelkam`;
}

function folderIdUntuk(kode: KodeNomor): string | null {
  return process.env[`GOOGLE_DRIVE_FOLDER_ID_${kode}`]?.trim() || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null;
}

export interface DriveDeps {
  isConfigured: () => boolean;
  list: (folderId: string, limit: number) => Promise<DriveFile[]>;
  read: (file: DriveFile) => Promise<string>;
}

const defaultDeps: DriveDeps = { isConfigured: isDriveConfigured, list: listRecentFiles, read: readFileText };

export async function getNextNomor(
  opts: { kode: KodeNomor; bulan: number; tahun: number },
  deps: DriveDeps = defaultDeps
): Promise<HasilNomor> {
  const { kode, bulan, tahun } = opts;
  if (!deps.isConfigured()) return { ok: false, alasan: "Google Drive belum terhubung (GOOGLE_SERVICE_ACCOUNT_JSON belum diatur)." };
  const folderId = folderIdUntuk(kode);
  if (!folderId) return { ok: false, alasan: `ID folder Drive belum diatur (GOOGLE_DRIVE_FOLDER_ID_${kode} atau GOOGLE_DRIVE_FOLDER_ID).` };

  try {
    const files = await deps.list(folderId, SCAN_FILE_LIMIT);
    if (files.length === 0) return { ok: false, alasan: "Folder Drive kosong atau belum dibagikan ke service account." };

    // Baca paralel; satu berkas gagal dibaca tidak boleh menggagalkan semuanya.
    const dibaca = await Promise.all(
      files.map(async file => {
        const teks = await deps.read(file).catch(() => "");
        return { file, nomor: [...cariNomor(file.name, kode), ...cariNomor(teks, kode)] };
      })
    );

    const semua = dibaca.flatMap(d => d.nomor);
    const terakhir = urutanTerakhir(semua, tahun);
    if (terakhir === null) {
      return { ok: false, alasan: `Tidak ditemukan nomor ${kode} tahun ${tahun} pada ${files.length} berkas terbaru di Drive.` };
    }

    const urutan = terakhir + 1;
    const sumber = dibaca.find(d => d.nomor.some(n => n.tahun === tahun && n.urutan === terakhir));
    return {
      ok: true,
      nomor: formatNomor(kode, urutan, bulan, tahun),
      urutan,
      terakhir: terakhir || null,
      berkas: sumber?.file.name ?? null,
    };
  } catch (err: any) {
    return { ok: false, alasan: err?.message || "Gagal membaca Google Drive." };
  }
}
