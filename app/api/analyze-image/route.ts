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

    console.log(`Analyzing ${files.length} rundown images using Gemini...`);

    // Prepare content array for Gemini vision request
    const contentParts: any[] = [
      {
        type: "text",
        text: `Minta tolong analisis gambar Rundown / Jadwal Acara / Agenda Acara yang terlampir ini dalam bahasa Indonesia yang formal.
Mohon ekstrak dan susun secara detail, terperinci, dan kronologis:
1. Jadwal waktu/timestamps spesifik (jam pelaksanaan setiap sesi).
2. Nama kegiatan atau sesi acara secara lengkap.
3. Nama pembicara (speaker), narasumber, moderator, atau penanggung jawab sesi jika tercantum.
4. Lokasi spesifik ruang/tempat acara jika disebutkan.
5. Aturan khusus atau instruksi pengamanan/tertib yang tertera pada agenda tersebut.

Berikan hasil analisis ekstraksi jadwal yang sangat padat, runtut, terstruktur sesuai urutan waktu acara, dan profesional untuk dijadikan fakta dasar dalam laporan resmi.`,
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
      model: "gemini-2.5-flash",
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
