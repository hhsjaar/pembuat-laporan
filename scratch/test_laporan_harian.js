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
const routeContent = fs.readFileSync(path.join(__dirname, "..", "app", "api", "generate-report", "route.ts"), "utf-8");

// Extract systemPrompt for laporan-harian
const marker = 'systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Situasi (LHS)';
let startIdx = routeContent.indexOf(marker);
if (startIdx === -1) {
  startIdx = routeContent.indexOf('systemPrompt = `Anda adalah asisten AI profesional');
}
console.log("laporan-harian startIdx:", startIdx);

async function testLaporanHarian() {
  // Let's get systemPrompt for laporan-harian from route.ts
  const endIdx = routeContent.indexOf('} else if (templateType === "laporan-harian-intelijen")', startIdx);
  console.log("endIdx:", endIdx);

  let systemPrompt = routeContent.substring(startIdx + 'systemPrompt = `'.length, endIdx);
  const lastTick = systemPrompt.lastIndexOf('`');
  if (lastTick !== -1) systemPrompt = systemPrompt.substring(0, lastTick);

  systemPrompt = systemPrompt.replace('${calendarContext}', 'ACUAN TANGGAL: Kamis, 6 Agustus 2026');
  systemPrompt = systemPrompt.replace('${currentDate}', '6 Agustus 2026');

  const userPrompt = `
Template Laporan yang Dipilih: laporan-harian

MASUKAN DARI USER (KATA KUNCI & RINCIANNYA):
1. Hasil Transkrip Rekaman Suara / Sambutan: "(Tidak ada)"
2. Hasil Analisa Gambar Rundown Acara: "(Tidak ada)"
3. Teks Ekstraksi dari Guidebook PDF Panduan Acara: "(Tidak ada)"
4. Catatan Teks Tambahan:
"${realInput}"
5. Instruksi / Preferensi Khusus untuk AI: "(Tidak ada)"
`;

  console.log("Testing templateType=laporan-harian...");
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

  const content = res.choices[0].message.content;
  const parsed = JSON.parse(content);
  console.log("LAPORAN HARIAN RESULT isi_laporan snippet:");
  const sosbudIdx = parsed.isi_laporan.indexOf("*C. Sosial Budaya:*");
  const ekonomiIdx = parsed.isi_laporan.indexOf("*D. Sosial Keamanan:*");
  if (sosbudIdx !== -1) {
    console.log(parsed.isi_laporan.substring(sosbudIdx, ekonomiIdx !== -1 ? ekonomiIdx : sosbudIdx + 2000));
  } else {
    console.log(parsed.isi_laporan.substring(0, 1500));
  }
}

testLaporanHarian();
