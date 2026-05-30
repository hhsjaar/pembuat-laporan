import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { toFile } from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
    }

    // Convert the File object to a Buffer for reliable transfer to the OpenAI SDK
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare file for Whisper API using OpenAI's toFile utility
    const openaiFile = await toFile(buffer, file.name || "audio.mp3", {
      type: file.type || "audio/mp3",
    });

    console.log(`Transcribing audio file: ${file.name} (${file.size} bytes)...`);

    const response = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "whisper-1",
      language: "id", // Guide transcription to Indonesian language
    });

    console.log("Transcription successful!");
    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Whisper Transcription Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses transkripsi audio." },
      { status: 500 }
    );
  }
}
