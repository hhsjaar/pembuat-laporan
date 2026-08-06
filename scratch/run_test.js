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

const realInput = fs.readFileSync(path.join(__dirname, "user_prompt_input.txt"), "utf-8");

// Extract systemPrompt from route.ts directly
const routeContent = fs.readFileSync(path.join(__dirname, "..", "app", "api", "generate-report", "route.ts"), "utf-8");

// Let's find systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI)
const marker = 'systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI)';
const startIdx = routeContent.indexOf(marker);
console.log("startIdx:", startIdx);
const endIdx = routeContent.indexOf('} else if (templateType === "rencana-kegiatan")', startIdx);
console.log("endIdx:", endIdx);

let systemPrompt = routeContent.substring(startIdx + 'systemPrompt = `'.length, endIdx);
const lastTick = systemPrompt.lastIndexOf('`');
if (lastTick !== -1) systemPrompt = systemPrompt.substring(0, lastTick);

systemPrompt = systemPrompt.replace('${calendarContext}', 'ACUAN TANGGAL: Kamis, 6 Agustus 2026');
systemPrompt = systemPrompt.replace('${currentDate}', '6 Agustus 2026');

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

Silakan buat laporan dinas resmi dengan detail faktual utuh sesuai masukan asli di atas. Masukkan hasilnya ke dalam skema JSON yang diminta.
`;

async function main() {
  console.log("Sending prompt to Gemini API...");
  try {
    const res = await geminiClient.chat.completions.create({
      model: "gemini-3.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8192,
    });
    console.log("RESPONSE RECEIVED!");
    const content = res.choices[0].message.content;
    fs.writeFileSync(path.join(__dirname, "result.json"), content);
    console.log("Wrote result.json. Length:", content.length);
    const parsed = JSON.parse(content);
    console.log("fakta_sosial_budaya content:\n", parsed.fakta_sosial_budaya);
  } catch (err) {
    console.error("Gemini API Error:", err);
  }
}

main();
