import { NextRequest, NextResponse } from "next/server";
import { geminiClient } from "@/lib/gemini";
import { buildWaSystemPrompt, isWaTemplate, renderLaporanWa } from "@/lib/laporanWa";

export const runtime = "nodejs";

const MAX_INPUT_CHARS = 60000;

function parseJsonObject(text: string): Record<string, any> {
  try {
    return JSON.parse(text);
  } catch {
    // Model kadang membungkus JSON dengan teks/penanda kode: ambil objek terluar.
    const awal = text.indexOf("{");
    const akhir = text.lastIndexOf("}");
    if (awal >= 0 && akhir > awal) return JSON.parse(text.slice(awal, akhir + 1));
    throw new Error("Respons AI bukan JSON yang valid.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { templateType, userInput } = await req.json();

    if (!isWaTemplate(templateType)) {
      return NextResponse.json({ error: "Jenis laporan WhatsApp tidak dikenali." }, { status: 400 });
    }
    const input = typeof userInput === "string" ? userInput.trim() : "";
    if (!input) {
      return NextResponse.json({ error: "Teks masukan kosong. Tempel teks kejadian terlebih dahulu." }, { status: 400 });
    }

    const now = new Date();
    const hariIni = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    let response;
    let delay = 2000;
    const retries = 3;
    for (let i = 0; i < retries; i++) {
      try {
        response = await geminiClient.chat.completions.create({
          model: "gemini-3.5-flash",
          messages: [
            { role: "system", content: buildWaSystemPrompt(templateType, hariIni) },
            { role: "user", content: `TEKS MASUKAN PENGGUNA:\n"""\n${input.slice(0, MAX_INPUT_CHARS)}\n"""` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 8192,
        });
        break;
      } catch (err: any) {
        if (err.status === 429 && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }

    const content = response?.choices[0]?.message?.content;
    if (!content) throw new Error("Gagal menerima respons dari Gemini API.");

    const data = parseJsonObject(content);
    return NextResponse.json({ text: renderLaporanWa(templateType, data, now) });
  } catch (err: any) {
    console.error("[generate-wa] error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyusun laporan WhatsApp." }, { status: 500 });
  }
}
