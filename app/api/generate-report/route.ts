import { NextRequest, NextResponse } from "next/server";
import { geminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { transcript, imageAnalysis, pdfText, userInput, templateType } = await req.json();

    console.log(`[Gemini Mode] Generating report narrative for template: ${templateType}...`);

    // Dynamic current date for formatting fallback
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let systemPrompt = "";
    if (templateType === "laporan-informasi") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Informasi dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat isi Laporan Informasi formal berdasarkan hasil transkrip audio/sambutan, analisa gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user. 
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti dokumen referensi intelkam resmi.

PENTING - JANGAN PERNAH MENYUSUN TENTANG "TURNAMEN FUTSAL IKAMMI" JIKA MASUKAN PENGGUNA MEMBAHAS HAL LAIN:
1. Anda DILARANG keras berasumsi atau memasukkan fakta bawaan (seperti Turnamen Futsal IKAMMI Singgalang Cup, lokasi GOR Futsal Stadion Undip Tembalang, 24 tim putra, Polsek Tembalang, dsb.) ke dalam laporan jika input data dari pengguna membahas topik acara lain yang berbeda!
2. Contoh di bawah ini HANYA SEBAGAI REFERENSI GAYA BAHASA, FORMAT PENULISAN JSON, DAN STRUKTUR KALIMAT INTELKAM.
3. Anda harus menyusun Laporan Informasi ini 100% secara dinamis dan faktual berdasarkan data nyata yang disediakan di bawah ini:
   - Jadwal/rundown yang terdeteksi dari Analisis Gambar Rundown Acara.
   - Peraturan/panduan/aturan main dari Dokumen Guidebook PDF Panduan Acara.
   - Isi transkrip sambutan atau rekaman laporan suara.
   - Catatan teks masukan tambahan pengguna.
4. Hubungkan seluruh data di atas (tanggal, waktu, lokasi, nama tokoh/penyelenggara, detail kegiatan) menjadi narasi intelkam yang runtut dan logis.
5. Jika ada tanggal/waktu spesifik yang terdeteksi di salah satu dokumen masukan (rundown, guidebook, transkrip, catatan), gunakan tanggal tersebut sebagai waktu pelaksanaan acara. Jika sama sekali tidak ada tanggal yang terdeteksi di semua masukan, barulah gunakan tanggal hari ini: ${currentDate}.

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "bidang": "Kategori bidang laporan (Kapital, misal: KEAMANAN / TERTIB SOSIAL, IDEOLOGI / SOSIAL POLITIK, SOSIAL BUDAYA)",
  "perihal": "Informasi kejadian/kegiatan secara KAPITAL PENUH dan sangat deskriptif dimulai dengan kata 'INFORMASI KEGIATAN...' (sesuaikan dengan kegiatan yang dibahas di masukan pengguna, jangan futsal jika masukan bukan futsal!)",
  "cara-mendapatkan-informasi": "Bagaimana data/informasi didapatkan (misal: Observasi lapangan dan koordinasi dengan pihak panitia.)",
  "waktu-mendapatkan-informasi": "Hari dan tanggal mendapatkan informasi (misal: Sabtu tanggal 16 Mei 2026 atau sesuai dokumen masukan)",
  "A": "Paragraf rincian pembuka fakta lapangan berisi waktu, petugas, nama kegiatan nyata, lokasi lengkap (kelurahan, kecamatan jika ada), penyelenggara, dan nama penanggung jawab/ketua dari data masukan pengguna.",
  "B": "Rincian fakta-fakta pelaksanaan kegiatan. Harus berisi rincian: Waktu Pelaksanaan (termasuk jadwal detail/rundown dari analisis gambar), Jumlah Peserta/Massa, dan Aturan Acara (dari guidebook PDF, seperti body checking, barang terlarang, dll.). Tulis dengan gaya poin-poin terstruktur yang dipisahkan baris baru (\\n). Wajib sertakan kode poin seperti 'Waktu Pelaksanaan:' 'Jumlah Peserta:' dan 'Aturan Acara:'.",
  "C": "Deskripsi tentang Pengamanan Kegiatan (oleh personel aparat keamanan dibantu internal/satpam, efektivitas penerapan aturan/guidebook).",
  "D": "Rincian Hasil Pengamanan dan Situasi (aman, terkendali, kejadian menonjol nihil, situasi kamtibmas kondusif).",
  "analisa": "Paragraf pendapat pelapor berupa analisa menyeluruh terhadap kerawanan kegiatan (skala kegiatan nyata, potensi kerawanan, kesiapan panitia, kesiagaan personel pengamanan).",
  "prediksi": "Poin-poin prediksi kerawanan ke depan (potensi kerawanan puncak, penumpukan suporter/massa di luar area, kelancaran kegiatan). Gunakan format poin-poin bernomor (1., 2., 3.).",
  "langkah": "Langkah-langkah taktis antisipasi/penanganan (meningkatkan kewaspadaan, patroli area luar, koordinasi, penyiapan jalur evakuasi/medis). Use format poin-poin bernomor (1., 2., 3.).",
  "rekomendasi": "Rekomendasi kebijakan jangka panjang berupa sinergi berkelanjutan antar pihak, serta poin rekomendasi prioritas (koordinasi pra-kegiatan, parkir/akses, penempatan personel, evaluasi pasca-kegiatan).",
  "tanggal": "Tanggal pembuatan laporan (misal: 16 Mei 2026 atau disesuaikan)"
}

BERIKUT CONTOH ACUAN GAYA BAHASA, PARAFRASE, DAN STRUKTUR (JANGAN COPAS ISINYA JIKA KATA KUNCI USER BERBEDA!):
---
ACUAN FORMAT:
{
  "bidang": "IDEOLOGI / SOSIAL POLITIK",
  "perihal": "INFORMASI KEGIATAN TURNAMEN FUTSAL IKATAN MAHASISWA MINANG (IKAMMI) SINGGALANG CUP XVI TAHUN 2026 DI GOR FUTSAL STADION UNDIP KELURAHAN BULUSAN KECAMATAN TEMBALANG",
  "cara-mendapatkan-informasi": "Observasi lapangan dan koordinasi dengan personel pengamanan.",
  "waktu-mendapatkan-informasi": "Sabtu tanggal 16 Mei 2026",
  "A": "Pada hari Sabtu tanggal 16 Mei 2026 pukul 12.00 WIB, Piket Ik Pengumpulan Bahan Keterangan melakukan kajian terhadap kegiatan Laporan Kegiatan yang sedang berlangsung...",
  "B": "Berdasarkan hasil observasi dan data dari panitia, berikut adalah detail pelaksanaan kegiatan:\\n\\nWaktu Pelaksanaan: Kegiatan berlangsung selama 6 hari, terbagi dalam dua pekan:\\nPekan I: Jumat s.d. Minggu, tanggal 15 s.d. 17 Mei 2026.\\nPekan II: Jumat s.d. Minggu, tanggal 22 s.d. 24 Mei 2026.\\n\\nJumlah Peserta: 24 tim putra.\\n\\nAturan Pengamanan Panitia:\\n- Panitia melaksanakan body checking terhadap suporter laki-laki maupun perempuan.\\n- Suporter dilarang membawa: senjata tajam, minuman keras, obat-obatan terlarang, rokok, korek api, petasan, makanan dan minuman kemasan.\\n- Suporter dilarang menonton dalam kondisi mabuk.\\n- Pembatasan jumlah suporter maksimal 150 orang untuk setiap tim yang bertanding.\\n\\nAturan ini sesuai kesepakatan bersama pada saat technical meeting yang dituangkan dalam surat pernyataan.",
  "C": "Pengamanan Kegiatan\\n\\nPengamanan dilaksanakan oleh personel Polsek Tembalang dibantu Satpam Stadion Undip.\\nPenerapan aturan ketat oleh panitia terhadap suporter dinilai efektif untuk mencegah potensi kericuhan antar pendukung.",
  "D": "Hasil Pengamanan dan Situasi\\n\\nKegiatan berlangsung dengan aman dan terkendali.\\nKejadian menonjol (menonjol) dinyatakan nihil.\\nSituasi kamtibmas di lokasi kegiatan dan sekitarnya dalam kondisi kondusif.",
  "analisa": "Turnamen Futsal IKAMMI Singgalang Cup XVI yang diikuti 24 tim putra dan berlangsung selama 6 hari merupakan kegiatan olahraga berskala cukup besar yang berpotensi menimbulkan gesekan antarsuporter. Langkah antisipatif panitia dengan menerapkan body checking dan pembatasan suporter maksimal 150 orang per tim merupakan upaya preventif yang baik. Personel Polsek Tembalang yang bertugas di lokasi perlu terus siaga mengingat potensi kericuhan terjadi saat pertandingan sengit antar tim.",
  "prediksi": "1. Potensi kerawanan tertinggi terjadi pada saat pertandingan final atau pertandingan yang mempertemukan tim-tim unggulan.\\n2. Gesekan antarsuporter dapat terjadi di luar GOR, mengingat pembatasan suporter di dalam ruangan mendorong massa berkumpul di area luar.\\n3. Dengan pengamanan yang konsisten dan kepatuhan panitia terhadap aturan, kegiatan diprediksi akan berlangsung lancar hingga akhir.",
  "langkah": "1. Meningkatkan kewaspadaan personel pada saat pertandingan yang diprediksi berlangsung sengit.\\n2. Melakukan patroli di area luar GOR untuk menganticipasi potensi kerumunan suporter yang tidak tertampung di dalam.\\n3. Berkoordinasi dengan panitia untuk memastikan aturan body checking dan larangan membawa barang berbahaya ditegakkan secara konsisten.\\n4. Menyiapkan jalur evakuasi dan koordinasi dengan tim medis untuk mengantisipasi cedera atau insiden di lapangan.",
  "rekomendasi": "Perlunya sinergi berkelanjutan antara Polsek Tembalang, panitia IKAMMI, dan pengelola Stadion Undip dalam menyelenggarakan kegiatan olahraga yang melibatkan massa dalam jumlah besar. Rekomendasi prioritas meliputi: (1) peningkatan koordinasi pra-kegiatan antara panitia dan aparat keamanan, (2) pengaturan parkir dan akses keluar-masuk GOR untuk mencegah kemacetan, (3) penempatan personel di titik-titik rawan kerumunan, serta (4) evaluasi bersama pasca kegiatan untuk perbaikan pengamanan di masa mendatang.",
  "tanggal": "16 Mei 2026"
}
---

Aturan Tambahan:
1. Pastikan seluruh isi laporan bebas dari kosakata kasual. Ubah kosakata sehari-hari dari transkrip audio menjadi bahasa intelkam resmi yang baku, terstruktur, sopan, objektif, dan formal.
2. Jika ada tanggal/waktu spesifik yang terdeteksi dari transkrip atau catatan user/rundown, wajib digunakan. Jika tidak terdeteksi, gunakan tanggal hari ini: ${currentDate}.
3. Sesuaikan bidang (KEAMANAN, IDEOLOGI / SOSIAL POLITIK, atau lainnya) dengan jenis isi kegiatan nyata yang dibahas.`;
    } else {
      systemPrompt = `Anda adalah asisten AI profesional pembuat laporan dinas resmi dan korporat berbahasa Indonesia.
Tugas Anda adalah membuat isi laporan resmi formal bahasa Indonesia berdasarkan hasil transkrip audio, analisis gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user. Gunakan gaya bahasa profesional, singkat, jelas, dan format sesuai laporan dinas resmi (EYD yang disempurnakan, sopan, objektif, dan bernada formal).

PENTING:
1. Susun seluruh laporan HANYA berdasarkan data nyata yang disediakan di masukan pengguna (gambar rundown, PDF guidebook, transkrip rekaman suara, catatan teks). Jangan mengada-ada atau berhalusinasi.
2. Jika ada tanggal/waktu yang terdeteksi dari masukan, gunakan itu. Jika tidak ada, gunakan tanggal hari ini: ${currentDate}.

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "judul": "Judul Laporan (Kapital, singkat, padat, profesional sesuai kegiatan nyata)",
  "tanggal": "Hari, Tanggal Bulan Tahun pelaksanaan/kejadian (sesuai dokumen masukan)",
  "lokasi": "Lokasi spesifik kejadian atau pengawasan",
  "isi_laporan": "Isi rincian fakta lapangan, kronologi, atau deskripsi informasi secara mendalam dan formal. Rangkai dengan indah gabungan transkrip audio, analisis gambar rundown, PDF guidebook, dan catatan pengguna. Gunakan paragraf terstruktur.",
  "kesimpulan": "Kesimpulan strategis, tindak lanjut, atau saran rekomendasi kebijakan ke depan."
}

Aturan Tambahan:
1. Pastikan isi laporan bebas dari bahasa sehari-hari. Ubah kosakata kasual dari rekaman suara menjadi bahasa baku resmi Indonesia.
2. Jika ada tanggal/waktu yang terdeteksi dari transkrip atau catatan user, gunakan itu. Jika tidak ada, gunakan tanggal hari ini: ${currentDate}.
3. Tulis isi laporan dan kesimpulan dengan detail yang memadai agar laporan terlihat berbobot, kredibel, dan profesional.`;
    }

    const userPrompt = `
Template Laporan yang Dipilih: ${templateType}

MASUKAN DARI USER (KATA KUNCI & RINCIANNYA):
1. Hasil Transkrip Rekaman Suara / Sambutan:
"${transcript || "(Tidak ada unggahan suara)"}"

2. Hasil Analisa Gambar Rundown Acara:
"${imageAnalysis || "(Tidak ada unggahan gambar rundown)"}"

3. Teks Ekstraksi dari Guidebook PDF Panduan Acara:
"${pdfText || "(Tidak ada unggahan PDF guidebook)"}"

4. Catatan Teks Tambahan:
"${userInput || "(Tidak ada catatan tambahan)"}"

Silakan buat laporan dinas resmi dengan detail faktual utuh sesuai masukan asli di atas. Masukkan hasilnya ke dalam skema JSON yang diminta.`;

    let response;
    const retries = 3;
    let delay = 2000;
    
    for (let i = 0; i < retries; i++) {
      try {
        response = await geminiClient.chat.completions.create({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        break; // Success! Break out of loop
      } catch (err: any) {
        if (err.status === 429 && i < retries - 1) {
          console.warn(`[Gemini API] Hit 429 Rate Limit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        } else {
          throw err;
        }
      }
    }

    if (!response) {
      throw new Error("Gagal menerima respons dari Gemini API.");
    }

    const resultText = response.choices[0].message.content || "{}";
    const reportData = JSON.parse(resultText);

    console.log("Report narrative generated successfully via Gemini!");
    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("Generate Report API Error:", error);
    
    // Custom error handling for rate limit (429)
    if (error.status === 429) {
      return NextResponse.json(
        { 
          error: "Batas kuota panggilan (Rate Limit 429) pada API Key Gemini Anda telah terlampaui. Mohon tunggu sekitar 1 menit sebelum mencoba kembali, atau pastikan akun Gemini Anda memiliki saldo kuota yang cukup di Google AI Studio." 
        },
        { status: 429 }
      );
    }
    
    // Custom error handling for invalid/missing API key (404/401)
    if (error.status === 404 || error.status === 401) {
      return NextResponse.json(
        { 
          error: "Kunci API Gemini (GEMINI_API_KEY) tidak valid atau belum terdeteksi. Pastikan Anda sudah memasukkan API Key yang benar di berkas .env.local dan MERESTART server Next.js Anda (tekan Ctrl+C pada terminal, lalu jalankan kembali 'npm run dev') agar perubahan dibaca oleh server Next.js." 
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: error.message || "Gagal memproses narasi laporan resmi dengan AI." },
      { status: 500 }
    );
  }
}
