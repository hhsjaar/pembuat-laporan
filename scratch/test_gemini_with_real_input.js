const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Read real input from laphar/referensi-laphar5.txt
const realInput = fs.readFileSync(path.join(__dirname, "..", "laphar", "referensi-laphar5.txt"), "utf-8");

async function testCall() {
  const calendarContext = `
=========================================
PENTING: ACUAN KALENDER & HARI LIBUR NASIONAL TAHUN 2026 (Wajib presisi 100%):
- Hari ini adalah hari Jum'at, tanggal 29 Mei 2026.
=========================================`;

  // Read prompt from app/api/generate-report/route.ts
  const routeContent = fs.readFileSync(path.join(__dirname, "..", "app", "api", "generate-report", "route.ts"), "utf-8");
  
  // Extract systemPrompt for laporan-harian-intelijen
  // We will search for: systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI)...
  const startIndex = routeContent.indexOf("systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI)");
  let systemPrompt = "";
  if (startIndex !== -1) {
    const endIndex = routeContent.indexOf("} else if (templateType === \"rencana-kegiatan\")", startIndex);
    systemPrompt = routeContent.substring(startIndex, endIndex);
    // remove systemPrompt = ` and the trailing backtick/semicolon/braces
    systemPrompt = systemPrompt.replace("systemPrompt = `", "");
    const lastBacktick = systemPrompt.lastIndexOf("`");
    if (lastBacktick !== -1) {
      systemPrompt = systemPrompt.substring(0, lastBacktick);
    }
    // replace variables
    systemPrompt = systemPrompt.replace("${calendarContext}", calendarContext);
    systemPrompt = systemPrompt.replace("${currentDate}", "29 Mei 2026");
  } else {
    console.error("Could not find systemPrompt in route.ts");
    return;
  }

  const userPrompt = `
Template Laporan yang Dipilih: laporan-harian-intelijen

MASUKAN DARI USER (KATA KUNCI & RINCIANNYA):
1. Hasil Transkrip Rekaman Suara / Sambutan:
"(Tidak ada unggahan suara)"

2. Hasil Analisa Gambar Rundown Acara:
"(Tidak ada unggahan gambar rundown)"

3. Teks Ekstraksi dari Guidebook PDF Panduan Acara:
"(Tidak ada unggahan PDF guidebook)"

4. Catatan Teks Tambahan:
"${realInput}"

5. Instruksi / Preferensi Khusus untuk AI (Arahkan Fokus Laporan):
"(Tidak ada instruksi khusus)"
`;

  try {
    console.log("Calling Gemini API with real referensi-laphar5.txt...");
    const completion = await geminiClient.chat.completions.create({
      model: "gemini-3.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    console.log("Response received:");
    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error("Error calling Gemini API:", err);
  }
}

testCall();
