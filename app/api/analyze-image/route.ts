import { NextRequest, NextResponse } from "next/server";
import { geminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Gambar tidak ditemukan dalam unggahan." }, { status: 400 });
    }

    console.log(`Analyzing ${files.length} document/rundown images using Gemini...`);

    // Prepare content array for Gemini vision request
    const contentParts: any[] = [
      {
        type: "text",
        text: `Minta tolong analisis seluruh gambar dokumen terlampir yang berisi Rundown, Jadwal Acara, Potongan Detail Acara, Informasi Latar Belakang, maupun dokumen pendukung lainnya dalam bahasa Indonesia yang formal.
Mohon lakukan analisis mendalam dan lakukan ekstraksi detail terperinci:
1. Jadwal & Rundown Acara: Waktu/timestamps pelaksanaan, nama sesi, pembicara, narasumber, moderator, atau penanggung jawab, dan lokasi ruang/tempat acara jika tercantum.
2. Latar Belakang & Detail Acara: Informasi konteks acara, tujuan, sejarah singkat, kepengurusan panitia, latar belakang organisasi, atau profil tokoh penting yang relevan.
3. Aturan & Ketentuan Khusus: Segala aturan keamanan, petunjuk teknis pelaksanaan, body checking, barang terlarang, atau tata tertib acara.
4. Fakta Tambahan: Informasi penting lainnya yang dapat dijadikan bahan fakta dasar penyusunan laporan intelkam resmi.

Berikan hasil analisis ekstraksi yang sangat detail, padat, runtut, terstruktur, dan profesional. Kelompokkan berdasarkan kategori informasi yang Anda temukan agar mudah dibaca dan dijadikan dasar penyusunan laporan.`,
      },
    ];

    // Process each file into base64 format
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";

      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`,
        },
      });
    }

    const response = await geminiClient.chat.completions.create({
      model: "gemini-3.5-flash",
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      max_tokens: 1200,
    });

    const analysis = response.choices[0].message.content || "Tidak ada hasil analisis.";
    console.log("Rundown vision analysis completed successfully via Gemini!");

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Rundown Vision Analysis API Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan analisis rundown gambar dengan AI." },
      { status: 500 }
    );
  }
}
