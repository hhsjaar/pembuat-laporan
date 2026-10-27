import { NextRequest, NextResponse } from "next/server";
import { namaMengikutiDrive, type Tgl } from "@/lib/namaBerkas";

export const runtime = "nodejs";

const EXT_DIIZINKAN = new Set(["docx", "pdf", "txt"]);

// Usulan nama berkas yang mengikuti pola berkas sebelumnya di Google Drive.
// Mengembalikan { nama: null } kalau Drive belum terhubung / tidak ada contoh --
// pemanggil lalu memakai nama bawaannya sendiri.
export async function POST(req: NextRequest) {
  try {
    const { templateType, ext, tanggal, perihal } = await req.json();

    if (typeof templateType !== "string" || !EXT_DIIZINKAN.has(ext)) {
      return NextResponse.json({ error: "templateType/ext tidak valid." }, { status: 400 });
    }

    let tgl: Tgl | null = null;
    const m = typeof tanggal === "string" ? tanggal.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (m) tgl = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };

    const nama = await namaMengikutiDrive({
      templateType,
      ext,
      tanggal: tgl,
      perihal: typeof perihal === "string" ? perihal : undefined,
    });
    return NextResponse.json({ nama });
  } catch (error: any) {
    return NextResponse.json({ nama: null, error: error?.message }, { status: 200 });
  }
}
