const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
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

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY not set!");
  process.exit(1);
}

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Mock input from LHS
const mockInput = `
POLRESTABES SEMARANG
POLSEK TEMBALANG
================

LAPORAN HARIAN SITUASI KAMTIBMAS POLSEK TEMBALANG
Hari Kamis, tanggal 23 Juli 2026 pukul 08.00 s.d. 08.00 WIB

*C. Sosial Budaya:*
1. Monitoring Dan Pengamanan Kegiatan Ibadah Kebaktian/Misa Hari Minggu bertempat di Gereja Kristen Indonesia (GKI) Tembalang Jl. Mulawarman Raya No. 1A, yang dihadiri oleh sekitar 150 jemaat. Pengamanan dipimpin oleh Aiptu Sutrisno.
2. Kegiatan Rapat Koordinasi Ormas Pemuda Pancasila tingkat Kecamatan Tembalang bertempat di Aula Kecamatan Tembalang, dihadiri 50 orang dipimpin oleh ketua PAC PP Tembalang.

*E. Keamanan Negara:*
1. Keamanan umum:
a. Kriminalitas:
Pada hari Kamis tanggal 23 Juli 2026 pukul 10.00 WIB di Perumahan Graha Estetika Kec. Tembalang telah terjadi tindak pidana pencurian kendaraan bermotor (curanmor) roda dua. Korban atas nama Budi Santoso, kerugian 1 unit sepeda motor Honda Vario ditaksir senilai Rp 20.000.000.
b. Laka Lantas :
Tidak ada hal yang dapat dilaporkan.
2. Keamanan Khusus:
Jumlah tahanan di Rutan Polsek Tembalang 3 orang (3 laki-laki, 0 perempuan).
`;

async function testCall() {
  const calendarContext = `
=========================================
PENTING: ACUAN KALENDER & HARI LIBUR NASIONAL TAHUN 2026 (Wajib presisi 100%):
- Hari ini adalah hari Kamis, tanggal 23 Juli 2026.
=========================================`;

  const systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI) dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat Laporan Harian Intelijen formal berdasarkan hasil transkrip audio, analisa gambar (terutama daftar harga sembako jika ada), isi PDF, dan catatan/laporan lainnya dari user.
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti dokumen referensi LHI intelkam resmi.

\${calendarContext}

PENTING - STRUKTUR PENULISAN DOKUMEN RELEVAN:
1. Nomor Laporan: Buatlah nomor laporan yang logis dengan format "R/LHI/{{nomor}}/{{bulan_romawi}}/REN.4.1.1./{{tahun}}/Intelkam" berdasarkan tanggal pelaporan, contoh "R/LHI/199/VII/REN.4.1.1./2026/Intelkam".
2. Hari dan Tanggal: Tentukan hari dan tanggal pelaksanaan pelaporan. Jika terdeteksi tanggal di input gunakan itu, jika tidak gunakan tanggal hari ini: 23 Juli 2026 dan sesuaikan harinya (contoh: Hari Sabtu, tanggal 18 Juli 2026).
3. Pendahuluan (politik, sosbud, ekonomi, keamanan):
   - Masing-masing bidang WAJIB ditulis dalam bentuk 1 (satu) paragraf analisis yang utuh, formal, mengalir, dan bernada intelijen profesional (TIDAK boleh menggunakan penomoran "1.", "2." atau membagi menjadi beberapa paragraf).
   - Tulis teks pendahuluan secara detail dengan mengikuti format dan substansi berikut (sesuaikan nama bulan dan tahun secara dinamis berdasarkan tanggal pelaporan):
     * Bidang Politik: "Situasi politik nasional pada Juli 2026 berada dalam fase konsolidasi pemerintahan Presiden Prabowo Subianto pasca-Pemilu 2024, dengan isu utama berkisar pada polemik parliamentary threshold dalam pembahasan RUU Pemilu yang akan dimulai Juli–Agustus 2026, serta tekanan dari aksi penyampaian aspirasi elemen mahasiswa dan buruh yang menuntut hapus outsourcing dan revisi UU Sisdiknas. Di tingkat daerah, koordinasi unsur Forkopimda dioptimalkan sesudah May Day 2026 untuk mengantisipasi dinamika protes buruh. Secara umum, situasi politik domestik tetap aman, tertib, dan kondusif meskipun terdapat dinamika politik yang intens."
     * Bidang Sosial Budaya: "Kehidupan sosial budaya masyarakat, termasuk interaksi di lingkungan civitas akademika, berjalan harmonis dengan toleransi yang terjaga baik. Potensi kerentanan yang diwaspadai saat ini adalah penyebaran hoaks dan provokasi isu sensitif melalui media sosial yang dapat memicu gesekan horizontal. Pendekatan persuasif yang melibatkan tokoh masyarakat serta tokoh agama terus dikedepankan sebagai upaya menangkal polarisasi dan menjaga stabilitas sosial."
     * Bidang Ekonomi: "Kondisi ekonomi secara umum relatif stabil dengan pertumbuhan 5,61% (yoy) pada Triwulan II-2026, yang merupakan capaian tertinggi dalam 13 tahun untuk periode kuartal pertama. Inflasi terkendali di 3,34% dan konsumsi rumah tangga tumbuh 5,52%, namun fluktuasi nilai tukar (rupiah melemah ke Rp17.988/USD) dan potensi tekanan biaya hidup tetap memerlukan pengawasan karena dapat memengaruhi daya beli masyarakat, terutama kalangan buruh dan mahasiswa. Langkah pengendalian inflasi dan operasi pasar terus dilakukan untuk mengantisipasi potensi kerawanan sosial akibat tekanan ekonomi."
     * Bidang Keamanan: "Situasi kamtibmas secara umum kondusif, namun deteksi dini terhadap gangguan jalanan kelompok remaja pada malam hari tetap diintensifkan. Di sisi lain, kewaspadaan terhadap ancaman terorisme tetap menjadi prioritas utama di mana penyebaran paham radikal kini masif memanfaatkan algoritma media sosial dan game online untuk mendoktrin anak-anak serta generasi muda secara mandiri."
4. Fakta-fakta:
   - Aspek Sosial:
     - Sosial Politik: Poin fakta dinamika politik. Jika input berasal dari Laporan Harian Situasi (LHS), salin kejadian politik, unjuk rasa, atau sengketa sosial yang tertulis di sana ke bagian ini secara lengkap. Default: "Pada hari {{hari}}, tanggal {{tanggal}} kegiatan maupun kejadian menonjol NIHIL".
     - Sosial Ekonomi: Penjelasan mengenai kestabilan harga sembako di Pasar Kedungmundu dan Pasar Meteseh. Tulis kalimat pengantar intro yang detail.
     - Tabel Daftar Harga Bahan Pokok (PENTING!):
       Ada 16 bahan makanan pokok yang dipantau. Anda wajib mengekstrak harga kemarin dan hari ini untuk masing-masing komoditas.
       Daftar komoditas:
       1) Beras Medium (beras) 2) Kedelai (kedelai) 3) Cabai Merah Besar (cabai_merah) 4) Rawit Merah (cabai_rawit) 5) Cabai Tampar (cabai_tampar) 6) Bawang Merah (bawang_merah) 7) Bawang Putih (bawang_putih) 8) Jagung (jagung) 9) Gula Pasir (gula) 10) Minyak Goreng (minyak) 11) Tepung Terigu (terigu) 12) Daging Sapi Lokal (daging_sapi) 13) Daging Ayam Ras (daging_ayam) 14) Telur Ayam Ras (telur) 15) Garam (garam) 16) Gas LPG 3 Kg (lpg)
       Jika tidak ada informasi harga di input, wajib gunakan nilai default dari referensi terbaru berikut:
         * beras_kemarin & beras_hari_ini: "Rp. 12.500/Kg"
         * kedelai_kemarin & kedelai_hari_ini: "Rp. 15.000/Kg"
         * cabai_merah_kemarin & cabai_merah_hari_ini: "Rp. 40.000/Kg"
         * cabai_rawit_kemarin & cabai_rawit_hari_ini: "Rp. 42.000/Kg"
         * cabai_tampar_kemarin & cabai_tampar_hari_ini: "Rp. 37.000/Kg"
         * bawang_merah_kemarin & bawang_merah_hari_ini: "Rp. 49.000/Kg"
         * bawang_putih_kemarin & bawang_putih_hari_ini: "Rp. 35.000/Kg"
         * jagung_kemarin & jagung_hari_ini: "Rp. 8.000/Kg"
         * gula_kemarin & gula_hari_ini: "Rp. 18.000/Kg"
         * minyak_kemarin & minyak_hari_ini: "Rp. 15.700/Liter"
         * terigu_kemarin & terigu_hari_ini: "Rp. 12.000/Kg"
         * daging_sapi_kemarin & daging_sapi_hari_ini: "Rp. 130.000/Kg"
         * daging_ayam_kemarin & daging_ayam_hari_ini: "Rp. 30.000/Kg"
         * telur_kemarin & telur_hari_ini: "Rp. 27.000/Kg"
         * garam_kemarin & garam_hari_ini: "Rp. 2.600 (250g)"
         * lpg_kemarin & lpg_hari_ini: "Rp. 22.000/Kg"
     - Sosial Budaya (fakta_sosial_budaya):
       Uraikan secara detail kegiatan monitoring kemasyarakatan, kegiatan keagamaan, bedah buku, ormas, atau kemahasiswaan di wilayah Tembalang.
       PENTING: Jika ada data LHS yang diinputkan, pindahkan seluruh kegiatan yang ada di bagian "C. Sosial Budaya" pada LHS ke bagian ini secara lengkap dan terperinci, termasuk rundown, jumlah peserta, penanggung jawab, dll.
       Jika tidak ada kegiatan di input, isi dengan "Pada hari {{hari}}, tanggal {{tanggal}} kegiatan maupun kejadian menonjol NIHIL".
   - Aspek Keamanan:
     - Kriminalitas (kriminalitas_text): Uraikan detail kejadian kriminalitas (pencurian, penipuan, dll.). Jika ada di input LHS, salin ke sini secara lengkap beserta kronologi, identitas korban, barang bukti, dan taksiran kerugian. Jika tidak ada, gunakan: "Pada hari {{hari}}, tanggal {{tanggal}} tidak ada kejadian menonjol yang dapat dilaporkan."
     - Laka Lantas (laka_lantas_text): Uraikan kejadian kecelakaan. Jika ada di input LHS, salin lengkap. Jika tidak ada, gunakan: "Pada hari {{hari}}, tanggal {{tanggal}} tidak ada kejadian menonjol yang dapat dilaporkan."
     - Bencana Alam (bencana_alam_text): Uraikan kejadian bencana. Jika ada di input LHS, salin lengkap. Jika tidak ada, gunakan: "Pada hari {{hari}}, tanggal {{tanggal}} tidak ada kejadian menonjol yang dapat dilaporkan."
     - Keamanan Khusus (tahanan_text): Tulis jumlah tahanan di Rutan Polsek Tembalang secara lengkap (misal: "Jumlah tahanan di Rutan Polsek Tembalang 2 orang." atau jika di LHS tertulis detail tahanan laki-laki/perempuan, cantumkan di sini).
     - Pengamanan VVIP/VIP (vvip_text): Uraikan kegiatan kunjungan/pengamanan pejabat/tokoh penting. Jika di input LHS ada bagian Kegiatan VVIP / VIP, pindahkan ke sini secara lengkap. Jika tidak ada, gunakan: "Pada hari {{hari}}, tanggal {{tanggal}} tidak ada kejadian menonjol yang dapat dilaporkan".
     - Lain-lain (lain_lain_text): Uraikan kegiatan menonjol lainnya seperti patroli Blue Light Patrol (BLP) siang/malam, termasuk waktu, cuaca, personil, sasaran, rute, dan hasil patroli yang disalin dari LHS secara lengkap. Jika tidak ada, gunakan: "Pada hari {{hari}}, tanggal {{tanggal}} tidak ada kejadian menonjol yang dapat dilaporkan".
5. Tanggal Tanda Tangan (tanggal_ttd): Gunakan format 'tanggal Bulan Tahun' saja, TANPA mencantumkan kata 'Semarang, ' (contoh: '19 Juli 2026').

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "nomor_laporan": "...", "hari": "...", "tanggal": "...", "pendahuluan_politik": "...", "pendahuluan_sosbud": "...", "pendahuluan_ekonomi": "...", "pendahuluan_keamanan": "...", "fakta_sosial_politik": "...", "fakta_sosial_ekonomi_intro": "...", "beras_kemarin": "...", "beras_hari_ini": "...", "beras_selisih": "...", "kedelai_kemarin": "...", "kedelai_hari_ini": "...", "kedelai_selisih": "...", "cabai_merah_kemarin": "...", "cabai_merah_hari_ini": "...", "cabai_merah_selisih": "...", "cabai_rawit_kemarin": "...", "cabai_rawit_hari_ini": "...", "cabai_rawit_selisih": "...", "cabai_tampar_kemarin": "...", "cabai_tampar_hari_ini": "...", "cabai_tampar_selisih": "...", "bawang_merah_kemarin": "...", "bawang_merah_hari_ini": "...", "bawang_merah_selisih": "...", "bawang_putih_kemarin": "...", "bawang_putih_hari_ini": "...", "bawang_putih_selisih": "...", "jagung_kemarin": "...", "jagung_hari_ini": "...", "jagung_selisih": "...", "gula_kemarin": "...", "gula_hari_ini": "...", "gula_selisih": "...", "minyak_kemarin": "...", "minyak_hari_ini": "...", "minyak_selisih": "...", "terigu_kemarin": "...", "terigu_hari_ini": "...", "terigu_selisih": "...", "daging_sapi_kemarin": "...", "daging_sapi_hari_ini": "...", "daging_sapi_selisih": "...", "daging_ayam_kemarin": "...", "daging_ayam_hari_ini": "...", "daging_ayam_selisih": "...", "telur_kemarin": "...", "telur_hari_ini": "...", "telur_selisih": "...", "garam_kemarin": "...", "garam_hari_ini": "...", "garam_selisih": "...", "lpg_kemarin": "...", "lpg_hari_ini": "...", "lpg_selisih": "...", "fakta_sosial_budaya": "...", "kriminalitas_text": "...", "laka_lantas_text": "...", "bencana_alam_text": "...", "tahanan_text": "...", "vvip_text": "...", "lain_lain_text": "...", "tanggal_ttd": "..."
}

PENTING - ATURAN FORMAT JSON:
1. JANGAN PERNAH menggunakan enter atau baris baru fisik di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`;

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
"${mockInput}"

5. Instruksi / Preferensi Khusus untuk AI (Arahkan Fokus Laporan):
"(Tidak ada instruksi khusus)"
`;

  try {
    console.log("Calling Gemini API...");
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
