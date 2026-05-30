import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import pdf from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Berkas PDF tidak ditemukan dalam unggahan." }, { status: 400 });
    }

    console.log(`Parsing PDF file: ${file.name} (${file.size} bytes)...`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the PDF using pure-JS pdf-parse v1.1.1 legacy functional API
    const pdfData = await pdf(buffer);
    
    console.log("PDF parsed successfully!");
    
    return NextResponse.json({ text: pdfData.text || "" });
  } catch (error: any) {
    console.error("PDF Parser Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekstrak teks dari berkas PDF." },
      { status: 500 }
    );
  }
}
