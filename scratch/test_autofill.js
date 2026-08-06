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

// Extract systemPrompt for laporan-harian-autofill
const marker = 'systemPrompt = `Anda adalah asisten AI profesional untuk ekstraksi data formulir kepolisian Polsek Tembalang berbahasa Indonesia.';
const startIdx = routeContent.indexOf(marker);
console.log("autofill startIdx:", startIdx);
const endIdx = routeContent.indexOf('systemPrompt = `Anda adalah asisten AI profesional pembuat laporan dinas resmi dan korporat', startIdx);
console.log("autofill endIdx:", endIdx);

async function testScope(scope) {
  let scopeInstructions = "";
  let jsonSchema = "";
  if (scope === "sosbud") {
    scopeInstructions = `Fokus HANYA pada informasi kegiatan Sosial Budaya (keagamaan, kemasyarakatan, aksi sosial, kuliah umum, dll.) di wilayah hukum Polsek Tembalang. Ekstrak SELURUH topik/kegiatan yang ada di masukan pengguna tanpa ada yang terlewat. Jika terdapat lebih dari 1 topik/kegiatan, WAJIB memberikan penomoran urut (1. ..., 2. ..., 3. ..., dst) untuk masing-masing topik. Tiru gaya bahasa referensi resmi kepolisian. Jika tidak ada informasi sosial budaya sama sekali, gunakan default 'Tidak ada hal yang dapat dilaporkan'.`;
    jsonSchema = `{\n  "sosbud": "..."\n}`;
  } else {
    scopeInstructions = `Ekstrak seluruh informasi laporan harian secara lengkap.`;
    jsonSchema = `{\n  "hari": "...", "tanggal": "...", "waktu": "...", "politik": "...", "sosbud": "..."\n}`;
  }

  let sysPrompt = `Anda adalah asisten AI profesional untuk ekstraksi data formulir kepolisian Polsek Tembalang berbahasa Indonesia.
Tugas Anda adalah membaca input transkrip suara pimpinan, hasil analisa foto lapangan, atau catatan pengguna, lalu mengekstrak informasi tersebut ke dalam skema JSON formulir Laporan Harian Situasi (LHS) secara lengkap.

${scopeInstructions}

ACUAN TANGGAL: Kamis, 6 Agustus 2026

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
${jsonSchema}

PENTING - ATURAN FORMAT JSON:
1. JANGAN PERNAH menggunakan enter atau baris baru fisik di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`;

  const userPrompt = `
Template Laporan yang Dipilih: laporan-harian-autofill

MASUKAN DARI USER (KATA KUNCI & RINCIANNYA):
1. Hasil Transkrip Rekaman Suara / Sambutan: "(Tidak ada)"
2. Hasil Analisa Gambar Rundown Acara: "(Tidak ada)"
3. Teks Ekstraksi dari Guidebook PDF Panduan Acara: "(Tidak ada)"
4. Catatan Teks Tambahan:
"${realInput}"
5. Instruksi / Preferensi Khusus untuk AI: "(Tidak ada)"
`;

  console.log(`Testing scope=${scope}...`);
  const res = await geminiClient.chat.completions.create({
    model: "gemini-3.5-flash",
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 8192,
  });

  const content = res.choices[0].message.content;
  console.log(`SCOPE ${scope} RESULT:`);
  console.log(content);
}

async function main() {
  await testScope("sosbud");
  await testScope("all");
}

main();
