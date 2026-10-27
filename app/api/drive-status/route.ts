import { NextResponse } from "next/server";
import { getNextNomor } from "@/lib/nomorLaporan";

export const runtime = "nodejs";

// Cek cepat apakah koneksi Google Drive untuk penomoran sudah benar: buka
// /api/drive-status di browser. Sengaja hanya mengembalikan status & angka --
// tanpa nama berkas atau kredensial.
export async function GET() {
  // Waktu Indonesia (WIB) supaya pergantian bulan/tahun tidak meleset di server UTC.
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  const hasil = await getNextNomor({
    kode: "LHI",
    bulan: wib.getUTCMonth() + 1,
    tahun: wib.getUTCFullYear(),
  });

  if (!hasil.ok) {
    return NextResponse.json({ terhubung: false, alasan: hasil.alasan });
  }
  return NextResponse.json({
    terhubung: true,
    nomorTerakhirDiDrive: hasil.terakhir,
    nomorBerikutnya: hasil.nomor,
  });
}
