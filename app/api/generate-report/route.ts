import { NextRequest, NextResponse } from "next/server";
import { geminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

// --- DYNAMIC CALENDAR CORRECTOR HELPERS ---

function getCorrectWeekdayIndo(dayNameMatched: string, dateNum: number, monthName: string, yearNum: number): string {
  const monthMap: Record<string, number> = {
    januari: 0, jan: 0,
    februari: 1, pebruari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agt: 7, agust: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9,
    november: 10, nopember: 10, nov: 10,
    desember: 11, des: 11
  };
  const key = monthName.toLowerCase();
  const monthIndex = monthMap[key];
  if (monthIndex === undefined) return dayNameMatched;

  const dateObj = new Date(yearNum, monthIndex, dateNum);
  if (isNaN(dateObj.getTime())) return dayNameMatched;

  const weekdaysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const correctDay = weekdaysIndo[dateObj.getDay()];

  if (dayNameMatched === dayNameMatched.toUpperCase()) {
    return correctDay.toUpperCase();
  } else if (dayNameMatched === dayNameMatched.toLowerCase()) {
    return correctDay.toLowerCase();
  } else {
    return correctDay;
  }
}

function correctWeekdaysInString(text: string): string {
  if (typeof text !== "string") return text;

  const regex = /(Minggu|Senin|Selasa|Rabu|Kamis|Jumat|Jum'at|Sabtu)(,\s*|\s+)(tanggal\s+)?(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agt|Agust|Sep|Sept|Okt|Nov|Nop|Des|Pebruari|Nopember)\s+(\d{4})/gi;

  return text.replace(regex, (match, dayGroup, separatorGroup, tanggalGroup, dateGroup, monthGroup, yearGroup) => {
    const dateNum = parseInt(dateGroup, 10);
    const yearNum = parseInt(yearGroup, 10);
    const correctDay = getCorrectWeekdayIndo(dayGroup, dateNum, monthGroup, yearNum);

    const optionalTanggal = tanggalGroup || "";
    return `${correctDay}${separatorGroup}${optionalTanggal}${dateGroup} ${monthGroup} ${yearGroup}`;
  });
}

function correctWeekdaysInObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return correctWeekdaysInString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => correctWeekdaysInObject(item));
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = correctWeekdaysInObject(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

function sanitizeJsonString(str: string): string {
  // Normalize line endings
  let normalized = str.replace(/\r\n/g, "\n");
  
  let result = "";
  let inString = false;
  let escaped = false;
  
  const getNextNonWhitespace = (index: number): { char: string; index: number } => {
    for (let k = index; k < normalized.length; k++) {
      const c = normalized[k];
      if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') {
        return { char: c, index: k };
      }
    }
    return { char: '', index: normalized.length };
  };

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    
    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        result += char;
        escaped = true;
      } else if (char === '"') {
        // Look ahead to see if this is the closing quote
        const next1 = getNextNonWhitespace(i + 1);
        let isClose = false;
        
        if (next1.char === '}' || next1.char === ']' || next1.char === ':') {
          isClose = true;
        } else if (next1.char === ',') {
          // Look ahead past the comma to verify the next JSON token structure
          const next2 = getNextNonWhitespace(next1.index + 1);
          const c2 = next2.char;
          const isValidJsonNext = 
            c2 === '"' || 
            c2 === '{' || 
            c2 === '[';
            
          if (isValidJsonNext) {
            isClose = true;
          }
        }
        
        if (isClose) {
          result += char;
          inString = false;
        } else {
          // Unescaped double quote inside the string, escape it!
          result += '\\"';
        }
      } else if (char === '\n') {
        // Escape raw newline inside string
        result += '\\n';
      } else if (char === '\r') {
        // skip
      } else {
        result += char;
      }
    } else {
      result += char;
      if (char === '"') {
        inString = true;
        escaped = false;
      }
    }
  }
  
  return result;
}

function healTruncatedJson(str: string): any {
  let cleaned = str.trim();
  
  const closeStructures = (input: string): string => {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
          escaped = false;
        } else if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
          }
        }
      }
    }
    
    let result = input;
    if (inString) {
      if (result.endsWith('\\') && !result.endsWith('\\\\')) {
        result = result.slice(0, -1);
      }
      result += '"';
    }
    
    while (stack.length > 0) {
      const openChar = stack.pop();
      if (openChar === '{') {
        result += '}';
      } else if (openChar === '[') {
        result += ']';
      }
    }
    
    return result;
  };

  // Attempt 1: Just close current structures
  try {
    const attempt1 = closeStructures(cleaned);
    return JSON.parse(attempt1);
  } catch (err1) {
    // Attempt 2: If it failed, slice up to the last comma and try again
    const lastCommaIndex = cleaned.lastIndexOf(",");
    if (lastCommaIndex !== -1) {
      try {
        const sliced = cleaned.substring(0, lastCommaIndex);
        const attempt2 = closeStructures(sliced);
        return JSON.parse(attempt2);
      } catch (err2) {
        // Multi-level comma slicing up to 3 times
        let tempStr = cleaned;
        for (let attempt = 0; attempt < 3; attempt++) {
          const commaIdx = tempStr.lastIndexOf(",");
          if (commaIdx === -1) break;
          tempStr = tempStr.substring(0, commaIdx);
          try {
            const attemptN = closeStructures(tempStr);
            return JSON.parse(attemptN);
          } catch (errN) {
            // continue
          }
        }
      }
    }
  }
  
  throw new Error("Gagal menyembuhkan JSON yang terpotong.");
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, imageAnalysis, pdfText, userInput, userPreference = "", templateType, laporanHarianForm, scope } = await req.json();

    console.log(`[Gemini Mode] Generating report narrative for template: ${templateType}...`);

    // Dynamic current date for formatting fallback
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const currentDay = new Date().toLocaleDateString("id-ID", { weekday: "long" });

    // Calculate tomorrow's date for Rencana Kegiatan template (H+1)
    const tomorrowDateObj = new Date();
    tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
    const tomorrowDate = tomorrowDateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const tomorrowDay = tomorrowDateObj.toLocaleDateString("id-ID", { weekday: "long" });

    // Calendar helper matrix to guarantee 100% accurate day-to-date mapping for all of 2026
    const calendarContext = `
=========================================
PENTING: ACUAN KALENDER & HARI LIBUR NASIONAL TAHUN 2026 (Wajib presisi 100%):
- Hari ini adalah hari ${currentDay}, tanggal ${currentDate}.
- Daftar Hari Libur Nasional & Kejadian Penting 2026 Resmi SKB 3 Menteri:
  * 1 Januari (Kamis): Tahun Baru 2026 Masehi
  * 16 Januari (Jumat): Isra Mikraj Nabi Muhammad SAW
  * 17 Februari (Selasa): Tahun Baru Imlek 2577 Kongzili
  * 16 Februari (Senin) & 18 Maret (Rabu): Cuti Bersama Imlek & Nyepi
  * 19 Maret (Kamis): Hari Suci Nyepi (Tahun Baru Saka 1948)
  * 21-22 Maret (Sabtu-Minggu): Hari Raya Idul Fitri 1447 Hijriah
  * 20, 23, 24 Maret (Jumat, Senin, Selasa): Cuti Bersama Idul Fitri 1447 H
  * 1 Mei (Jumat): Hari Buruh Internasional
  * 14 Mei (Kamis): Hari Kenaikan Yesus Kristus
  * 15 Mei (Jumat): Cuti Bersama Kenaikan Yesus Kristus
  * 27 Mei (Rabu): Hari Raya Idul Adha 1447 Hijriah
  * 28 Mei (Kamis): Cuti Bersama Hari Raya Idul Adha 1447 H
  * 31 Mei (Minggu - Hari Ini): Hari Raya Waisak 2570 BE
  * 1 Juni (Senin - Besok): Hari Lahir Pancasila
  * 16 Juni (Selasa): Tahun Baru Islam 1448 Hijriah
  * 17 Agustus (Senin): Hari Kemerdekaan RI
- Anda dilarang keras mengarang atau salah memetakan nama hari dengan tanggalnya. Pastikan semua penulisan hari dan tanggal dalam laporan Anda disinkronkan secara matematis dengan kalender Masehi 2026 yang sahih (misalnya, jika Anda menulis tanggal 19 Mei 2026 itu adalah hari Selasa, 27 Mei 2026 adalah hari Rabu, dan 31 Mei 2026 adalah hari Minggu).
=========================================`;

    let systemPrompt = "";
    if (templateType === "laporan-informasi") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Informasi (LI) dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat isi Laporan Informasi formal berdasarkan hasil transkrip audio/sambutan, analisa gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user. 
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti dokumen referensi intelkam resmi.

${calendarContext}

PENTING - STRUKTUR PENULISAN DOKUMEN RELEVAN:
1. Anda DILARANG keras berasumsi atau memasukkan fakta bawaan (seperti Turnamen Futsal IKAMMI Singgalang Cup, lokasi GOR Futsal Stadion Undip Tembalang, dsb.) jika input data dari pengguna membahas topik acara lain yang berbeda!
2. Anda harus menyusun Laporan Informasi ini 100% secara dinamis dan faktual berdasarkan data nyata yang disediakan di masukan pengguna (jadwal rundown, aturan guidebook, transkrip, catatan teks).
3. Jika ada tanggal/waktu spesifik yang terdeteksi di salah satu dokumen masukan, gunakan tanggal tersebut sebagai waktu pelaksanaan acara. Jika sama sekali tidak ada tanggal yang terdeteksi, gunakan tanggal hari ini: ${currentDate}.

PANDUAN EKSTRAPOLASI KREATIF & SIMULASI LOGIS (JIKA DATA MASUKAN TIDAK LENGKAP):
- Jika masukan sangat minim atau tidak lengkap, Anda DILARANG KERAS menulis kalimat apologetis seperti "Rangkaian acara tidak dapat dirinci karena dokumen tidak tersedia".
- Sebaliknya, Anda WAJIB melakukan ekstrapolasi kreatif dan mensimulasikan rincian agenda rundown, aturan acara, sarana pendukung, nama tokoh penanggung jawab, serta substansi kegiatan secara sangat logis, realistis, detail, dan meyakinkan sesuai dengan norma umum jenis kegiatan tersebut.
- Pastikan seluruh rincian hasil simulasi logis tersebut mengalir alami, terlihat padat, berbobot, berwibawa, dan sangat profesional untuk sebuah laporan dinas resmi kepolisian.

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "bidang": "Kategori bidang laporan (Kapital penuh, misal: KEAMANAN, POLITIK, IDEOLOGI / SOSIAL POLITIK, SOSIAL BUDAYA)",
  "perihal": "Informasi kejadian/kegiatan secara KAPITAL PENUH and sangat deskriptif dimulai dengan kata 'INFORMASI KEGIATAN...' (sesuaikan dengan kegiatan nyata di masukan pengguna)",
  "cara-mendapatkan-informasi": "Bagaimana data/informasi didapatkan (misal: Observasi lapangan dan koordinasi dengan pihak panitia., Monitoring dan wawancara., dsb.)",
  "waktu-mendapatkan-informasi": "Hari dan tanggal mendapatkan informasi (misal: Sabtu tanggal 16 Mei 2026 atau sesuai dokumen masukan)",
  "isi_laporan": "Teks rincian fakta lapangan yang SANGAT LENGKAP, DETAIL, DAN KOMPREHENSIF. Anda WAJIB membaginya ke dalam poin-poin terstruktur menggunakan urutan alfabet kapital (A., B., C., D., E., F., dst.). Pisahkan setiap poin utama alfabet (seperti A., B., C., D., dst.) dengan baris baru ganda (\\n\\n). Jika isi poin tersebut HANYA terdiri dari 1 paragraf penjelasan/fakta, Anda DILARANG KERAS memberi judul/label/topik di awal poin (contoh: tulis langsung 'A. Pada hari Senin tanggal...', dan JANGAN PERNAH menulis seperti 'A. Penemuan Korban: Pada hari...' atau 'A. Waktu Kejadian \\n Pada hari...'). Jika poin tersebut memperkenalkan daftar (saksi, rundown/kronologi, hasil otopsi/pemeriksaan, dsb.), tulis kalimat pengantar setelah huruf alfabet (contoh: 'D. Saksi dalam kejadian tersebut antara lain sebagai berikut :'), lalu cantumkan item-itemnya sebagai sub-poin angka (1., 2., 3., dst.) pada baris baru di bawahnya. Untuk seluruh sub-poin (saksi-saksi, kronologi kejadian, hasil pemeriksaan awal, otopsi, dsb.), Anda WAJIB memisahkan kalimat pengantar, sub-poin pertama, dan antar sub-poin berikutnya hanya dengan baris baru tunggal (\\n) agar tidak terlalu renggang. Setiap paragraf penjelasan harus ringkas, padat informasi, formal, dan tidak terlalu panjang (jangan monoton atau seperti tulisan robot/template mati). Gunakan bahasa dinas intelkam resmi kepolisian yang baku dan berwibawa.",
  "analisa": "Uraian analisa/analisis menyeluruh terhadap kerawanan kegiatan (potensi kerawanan, gesekan, kesiapan pengamanan, dll.) yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "prediksi": "Poin-poin prediksi kerawanan ke depan yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "langkah": "Langkah-langkah taktis antisipasi/penanganan oleh kepolisian yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "rekomendasi": "Rekomendasi kebijakan jangka panjang atau koordinasi berkelanjutan yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "tanggal": "Tanggal pembuatan laporan (misal: 16 Mei 2026 atau disesuaikan)"
}

BERIKUT ADALAH 6 PILIHAN ACUAN GAYA BAHASA, STRUKTUR FORMAT, DAN DIKSI INTELKAM (Sesuaikan struktur isi_laporan Anda dengan gaya yang paling cocok berdasarkan konteks):

1. GAYA DEKLARASI / ACARA SEREMONIAL / KAMPANYE (Tiru gaya Referensi 2)
   - Pembagian: Wajib dibagi ke dalam poin-poin alfabet (A., B., C., D., dst.)
   - Struktur: A. Waktu dan Tempat Pelaksanaan..., B. Daftar Undangan dan Pejabat Penting Hadir..., C. Substansi Komitmen/Deklarasi..., D. Rangkaian Jalannya Kegiatan...
   - Diksi: "...telah dilaksanakan kegiatan...", "Hadir dalam kegiatan tersebut antara lain...", "Adapun komitmen yang dideklarasikan sbb:"

2. GAYA SEKSI URUTAN A,B,C,D (Tiru gaya Referensi 3)
   - Pembagian: Wajib menggunakan format huruf A., B., C., D., dst.
   - Struktur: A. Fakta Pembuka dan Penyelenggara..., B. Rincian Ketentuan Teknis & Aturan Acara..., C. Skema Pengamanan Polri/Internal..., D. Hasil Pemantauan & Situasi Akhir...

3. GAYA KRONOLOGI / INSIDEN HUKUM DAN KAMTIBMAS (Tiru gaya Referensi 4)
   - Pembagian: Wajib menggunakan format huruf A., B., C., D., dst.
   - Struktur: A. Kejadian Pembuka..., B. Kronologi Peristiwa secara Detail (gunakan tanda minus '-' untuk poin waktu per menit/jam)..., C. Tindakan Kepolisian & Keterangan Saksi..., D. Dampak Peristiwa & Situasi Terakhir...
   - Diksi: "Pada hari... sekira pukul... diketahui ada...", "Adapun kronologi kejadian sbb:", "- Pada pukul..."

4. GAYA ACARA KEAGAMAAN / HAUL / DZIKIR AKBAR (Tiru gaya Referensi 5)
   - Pembagian: Wajib menggunakan format huruf A., B., C., D., dst.
   - Struktur: A. Rencana Kegiatan & Profil Tokoh..., B. Agenda dan Susunan Ritual Ibadah Keagamaan..., C. Daftar Tokoh Agama & Undangan Penting Hadir..., D. Estimasi Massa & Skema Pengamanan...
   - Diksi: "...telah memperoleh informasi terkait rencana kegiatan...", "Berikut rencana susunan acara sbb:", "Berikut daftar undangan:"

5. GAYA PENYELIDIKAN ORGANISASI / KELOMPOK / ORMAS (Tiru gaya Referensi 6)
   - Pembagian: Wajib menggunakan format huruf A., B., C., D., dst.
   - Struktur: A. Profil Singkat & Legalitas Kelompok..., B. Struktur Organisasi & Pengurus..., C. Rencana Aksi/Titik Kumpul Massa..., D. Potensi Kerawanan Kamtibmas...
   - Diksi: "...pelapor melaksanakan penyelidikan dan Pulbaket terkait...", "Adapun Hasil dari penyelidikan tersebut antara lain sebagai berikut:"

6. GAYA SELEKSI / MONITORING TAHAPAN PEMILU / PILKADA (Tiru gaya Referensi 7)
   - Pembagian: Wajib menggunakan format huruf A., B., C., D., dst.
   - Struktur: A. Dasar Pelaksanaan Monitoring Seleksi..., B. Daftar Penguji/Panitia & Statistik Peserta..., C. Jadwal & Pembagian Waktu Seleksi..., D. Mekanisme Tes & Hasil Penilaian...
   - Diksi: "...berlangsung kegiatan Seleksi Wawancara...", "Hadir dalam kegiatan tersebut...", "Jadwal kegiatan tes wawancara sbb:"

3. Sesuaikan bidang (KEAMANAN, POLITIK, IDEOLOGI / SOSIAL POLITIK, atau lainnya) dengan jenis isi kegiatan nyata yang dibahas.`;
    } else if (templateType === "laporan-harian-khusus") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Khusus (LHK) dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat isi Laporan Harian Khusus formal berdasarkan hasil transkrip audio/sambutan, analisa gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user. 
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti dokumen referensi LHK intelkam resmi.

${calendarContext}

PENTING - STRUKTUR PENULISAN DOKUMEN RELEVAN:
1. Anda DILARANG keras berasumsi atau memasukkan fakta bawaan (seperti Harlah PRIMA, dsb.) jika input data dari pengguna membahas topik acara lain yang berbeda!
2. Anda harus menyusun Laporan Harian Khusus ini 100% secara dinamis dan faktual berdasarkan data nyata yang disediakan di masukan pengguna (jadwal rundown, aturan guidebook, transkrip, catatan teks).
3. Jika ada tanggal/waktu spesifik yang terdeteksi di salah satu dokumen masukan, gunakan tanggal tersebut sebagai waktu pelaksanaan acara. Jika sama sekali tidak ada tanggal yang terdeteksi, gunakan tanggal hari ini: ${currentDate}.

PANDUAN EKSTRAPOLASI KREATIF & SIMULASI LOGIS (JIKA DATA MASUKAN TIDAK LENGKAP):
- Jika masukan sangat minim atau tidak lengkap, Anda DILARANG KERAS menulis kalimat apologetis seperti "Rangkaian acara tidak dapat dirinci karena dokumen tidak tersedia".
- Sebaliknya, Anda WAJIB melakukan ekstrapolasi kreatif dan mensimulasikan rincian agenda rundown, aturan acara, sarana pendukung, nama tokoh penanggung jawab, serta substansi kegiatan secara sangat logis, realistis, detail, dan meyakinkan sesuai dengan norma umum jenis kegiatan tersebut.
- Pastikan seluruh rincian hasil simulasi logis tersebut mengalir alami, terlihat padat, berbobot, berwibawa, dan sangat profesional untuk sebuah laporan dinas resmi kepolisian.

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "judul": "TOPIK/PERIHAL UTAMA LAPORAN DALAM HURUF KAPITAL PENUH (e.g. KEGIATAN HARI LAHIR KE-5 PARTAI RAKYAT ADIL MAKMUR (PRIMA) DI HOTEL CANDI INDAH CONVENTION KOTA SEMARANG)",
  "tanggal": "Tanggal pembuatan laporan (e.g. 1 Juni 2026 atau sesuai dokumen masukan)",
  "bidang": "Kategori bidang laporan (Kapital penuh, misal: POLITIK, SOSBUD, KEAMANAN)",
  "perihal": "Informasi kejadian/kegiatan secara Title Case/normal deskriptif dan diakhiri dengan tanda titik (e.g. Kegiatan Hari Lahir (Harlah) Ke-5 Partai Rakyat Adil Makmur (PRIMA) di Hotel Candi Indah Convention Kota Semarang.)",
  "isi_laporan": "Teks rincian fakta lapangan yang SANGAT LENGKAP, DETAIL, DAN KOMPREHENSIF. Anda WAJIB membaginya ke dalam poin-poin terstruktur menggunakan urutan alfabet kapital (A., B., C., D., E., F., dst.). Pisahkan setiap poin utama alfabet (seperti A., B., C., D., dst.) dengan baris baru ganda (\\n\\n). Jika isi poin tersebut HANYA terdiri dari 1 paragraf penjelasan/fakta, Anda DILARANG KERAS memberi judul/label/topik di awal poin (contoh: tulis langsung 'A. Pada hari Senin tanggal...', dan JANGAN PERNAH menulis seperti 'A. Penemuan Korban: Pada hari...' atau 'A. Waktu Kejadian \\n Pada hari...'). Jika poin tersebut memperkenalkan daftar (saksi, rundown/kronologi, hasil otopsi/pemeriksaan, dsb.), tulis kalimat pengantar setelah huruf alfabet (contoh: 'D. Saksi dalam kejadian tersebut antara lain sebagai berikut :'), lalu cantumkan item-itemnya sebagai sub-poin angka (1., 2., 3., dst.) pada baris baru di bawahnya. Untuk seluruh sub-poin (saksi-saksi, kronologi kejadian, hasil pemeriksaan awal, otopsi, dsb.), Anda WAJIB memisahkan kalimat pengantar, sub-poin pertama, dan antar sub-poin berikutnya hanya dengan baris baru tunggal (\\n) agar tidak terlalu renggang. Setiap paragraf penjelasan harus ringkas, padat informasi, formal, dan tidak terlalu panjang (jangan monoton atau seperti tulisan robot/template mati). Gunakan bahasa dinas intelkam resmi kepolisian yang baku dan berwibawa.",
  "analisa": "Pendapat pelapor berupa analisa menyeluruh terhadap kerawanan kegiatan (potensi kerawanan, gesekan, kesiapan pengamanan, dll.) yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "prediksi": "Poin-poin prediksi kerawanan ke depan yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "langkah": "Langkah-langkah taktis antisipasi/penanganan oleh kepolisian yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "rekomendasi": "Rekomendasi kebijakan jangka panjang atau koordinasi berkelanjutan yang wajib dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n."
}

GAYA BAHASA, STRUKTUR FORMAT, DAN DIKSI INTELKAM UNTUK LHK:
- Pembagian Fakta Lapangan: Wajib dibagi ke dalam poin-poin alfabet (A., B., C., D., E., dst.)
- Poin A: Waktu dan tempat kegiatan, serta penyelenggara/penanggung jawab.
- Poin B: Pejabat dan tamu undangan penting yang hadir.
- Poin C: Rincian susunan acara / rundown secara lengkap.
- Poin D: Ringkasan pidato, sambutan, materi diskusi, atau kejadian penting.
- Poin E: Waktu selesai, situasi keamanan, dan nihil kejadian menonjol.
- Diksi: "...telah dilaksanakan kegiatan...", "Hadir dalam kegiatan tersebut antara lain...", "Situasi selama kegiatan berlangsung aman, tertib, dan kondusif."

PENTING - ATURAN FORMAT JSON (Wajib Dipatuhi Agar Tidak Error):
1. JANGAN PERNAH menggunakan enter atau baris baru fisik (raw newlines) di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan (misalnya kutipan tema acara atau nama), gunakan tanda kutip tunggal (') saja. Contoh: gunakan 'Revolusi Sudah Dimulai Dari Istana' dan BUKAN "Revolusi Sudah Dimulai Dari Istana".`;
    } else if (templateType === "laporan-kegiatan") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Kegiatan dinas resmi Polsek Tembalang berbahasa Indonesia yang dikirimkan ke tingkat Polres/Polrestabes.
Tugas Anda adalah membuat isi Laporan Kegiatan berdasarkan hasil transkrip audio/sambutan, analisa gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user.
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti contoh referensi Laporan Kegiatan yang disajikan.

${calendarContext}

PENTING:
1. Susun seluruh isi laporan 100% secara dinamis dan faktual berdasarkan data nyata yang disediakan di masukan pengguna (gambar dokumen, PDF guidebook, transkrip, catatan teks). Jangan pernah berasumsi atau menyalin detail acara lain jika masukan berbeda!
2. Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "perihal": "Informasi kejadian/kegiatan secara ringkas namun deskriptif. PENTING: JANGAN PERNAH diawali dengan kata 'Laporan', tetapi harus langsung diawali dengan kata 'Kegiatan' (misal: Kegiatan Monitoring Giat Nobar Pesta Babi... di Beranda FH Undip Kec. Tembalang atau Kegiatan Silaturahmi...)",
  "isi_laporan": "Teks lengkap rincian fakta lapangan. Susun dalam alfabet penomoran (A., B., C., D... dst.) secara dinamis dan fleksibel (tidak dipatok harus A s.d F, sesuaikan dengan kompleksitas masukan pengguna). Setiap poin dipisahkan baris baru ganda (\\n\\n). Gunakan bahasa baku resmi Indonesia yang dinamis, tidak monoton, luwes, dan mengalir secara alami (tidak kaku seperti tulisan robot/template mati). Pelajari dan tiru susunan format dari 4 contoh referensi di bawah.",
  "kapolsek_nama": "Nama dan gelar Kapolsek Tembalang yang menandatangani laporan. PENTING: Selalu gunakan nama 'KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H.'."
}

PANDUAN EKSTRAPOLASI KREATIF & SIMULASI LOGIS (JIKA DATA MASUKAN TIDAK LENGKAP):
- Jika pengguna tidak mengunggah gambar rundown, berkas PDF guidebook, rekaman suara, atau jika informasi masukan sangat minim/tidak lengkap, Anda DILARANG KERAS menulis kalimat apologetis seperti "Rangkaian acara tidak dapat dirinci karena dokumen tidak tersedia".
- Sebaliknya, Anda WAJIB melakukan ekstrapolasi kreatif dan mensimulasikan rincian agenda rundown, aturan acara, sarana pendukung, nama tokoh penanggung jawab, serta substansi kegiatan secara sangat logis, realistis, detail, dan meyakinkan sesuai dengan norma umum jenis kegiatan tersebut.
- Pastikan seluruh rincian hasil simulasi logis tersebut mengalir alami, terlihat padat, berbobot, berwibawa, dan sangat profesional untuk sebuah laporan dinas resmi kepolisian.

BERIKUT ADALAH 4 PILIHAN ACUAN GAYA BAHASA, STRUKTUR FORMAT, DAN DIKSI LAPORAN KEGIATAN (Sesuaikan isi_laporan Anda dengan gaya yang paling sesuai):

1. GAYA NON-OLAHRAGA / KAJIAN SOSIAL / DISKUSI MAHASISWA (Referensi 1)
   - Pembagian: A s.d F (6 poin).
   - Isi: Poin A (pembuka giat, waktu, tempat, PIC), Poin B (keterkaitan acara/rangkaian), Poin C (alat peraga yang digunakan), Poin D (substansi isi/tema yang dikaji), Poin E (rundown rangkaian acara), Poin F (situasi akhir & kesimpulan).
   - Contoh Diksi: "Alat peraga yang digunakan dalam kegiatan nobar, sebagai berikut:", "tujuan dari diputarnya film ini untuk meningkatkan kepedulian terhadap..."

2. GAYA KOMPETISI OLAHRAGA NASIONAL / BESAR (Referensi 2)
   - Pembagian: A s.d H (8 poin).
   - Isi: Poin A (pembuka giat basket/olahraga, waktu, tempat, PIC), Poin B (home match/durasi kompetisi keseluruhan), Poin C (detail tiket masuk & harga), Poin D (jumlah penonton, pemeriksaan tubuh & barang bawaan suporter), Poin E (jumlah personel pengamanan Polri & sprin pimpinan), Poin F (pengamanan internal, tim kesehatan, damkar), Poin G (skor akhir kompetisi), Poin H (situasi akhir & kamtibmas).
   - Contoh Diksi: "...lanjutan Kompetisi Indonesia Basket League...", "...terlebih dahulu dilakukan pemeriksaan tubuh serta pemeriksaan barang bawaan oleh panitia...", "Petugas pengamanan sebanyak..."

3. GAYA TURNAMEN OLAHRAGA LOKAL / KEMAHASISWAAN (Referensi 3)
   - Pembagian: A s.d D (4 poin).
   - Isi: Poin A (pembuka giat futsal, waktu, tempat, penyelenggara, tema), Poin B (lama turnamen, jumlah tim peserta), Poin C (body checking suporter, larangan membawa sajam/miras/mabuk, pembatasan jumlah suporter), Poin D (situasi akhir & kejadian menonjol nihil).
   - Contoh Diksi: "...kegiatan berlangsung selama 6 hari...", "...menerapkan aturan kepada semua suporter yang memasuki GOR untuk tidak membawa..."

4. GAYA KEGIATAN KEAGAMAAN / HARI RAYA / SHOLAT ID (Referensi 4)
   - Pembagian: A s.d D (4 poin).
   - Isi: Poin A (pembuka giat sholat Id, waktu, tempat, jumlah jamaah, PIC), Poin B (identitas khotib & imam, tata cara ibadah/jumlah takbir), Poin C (jumlah personel pengamanan Polri & nama penanggung jawab sprin), Poin D (situasi akhir selesai giat & kamtibmas).
   - Contoh Diksi: "...telah berlangsung kegiatan Sholat Idul Adha...", "...ditunaikan dengan melaksanakan sebanyak dua rakaat dengan...", "Pengamanan kegiatan Sholat Idul Adha..."

Aturan Tambahan:
1. Pastikan seluruh isi laporan bebas dari kosakata kasual. Ubah kosakata sehari-hari dari transkrip audio menjadi bahasa intelkam resmi yang baku, terstruktur, sopan, objektif, dan formal. Namun, kemaslah diksi tersebut secara luwes, variatif, mengalir alami, dan tidak monoton. Hindari pengulangan kata/frasa pembuka yang sama secara terus-menerus (seperti 'bahwa', 'kemudian', 'dapat dilaporkan bahwa') di awal kalimat/paragraf agar tulisan tidak terasa kaku atau robotik.
2. Jika ada tanggal/waktu spesifik yang terdeteksi dari transkrip atau catatan user/rundown, wajib digunakan. Jika tidak terdeteksi, gunakan tanggal hari ini: ${currentDate}.`;
    } else if (templateType === "laporan-harian") {
      const form = laporanHarianForm || {};
      const totalTahanan = (parseInt(form.tahananL || "0") + parseInt(form.tahananP || "0")) || 0;
      let keamananKhususText = "Tidak ada hal yang dapat dilaporkan.";
      if (totalTahanan > 0) {
        keamananKhususText = `Jumlah tahanan di Rutan Polsek Tembalang:
Tahanan laki-laki : ${form.tahananL || "0"}
Tahanan perempuan : ${form.tahananP || "0"}
Total : ${totalTahanan}`;
      }

      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Situasi Kamtibmas (Laporan Harian) resmi untuk Polsek Tembalang, Polrestabes Semarang, Jawa Tengah.
Tugas Anda adalah merangkai dan menghasilkan teks laporan harian lengkap (isi_laporan) berbahasa Indonesia berdasarkan formulir masukan terstruktur yang disediakan dan data tidak terstruktur yang diunggah pengguna (transkrip, analisa gambar rundown, teks PDF, catatan user).

Anda wajib mempertahankan struktur format teks persis seperti yang tertulis dalam panduan format berikut, termasuk spasi, tanda pagar/bintang, dan tanda hubung pemisah:

POLRESTABES SEMARANG
POLSEK TEMBALANG
================

Kepada Yth :
KAPOLRESTABES SEMARANG

Dari :
KAPOLSEK TEMBALANG

Perihal :
LAPORAN SITUASI DI WILAYAH HUKUM POLSEK TEMBALANG

Hari         : ${form.hari || ""}
Tanggal  : ${form.tanggal || ""}
Waktu     : ${form.waktu || "08.00 s.d. 08.00 WIB"}

*SITUASI POLEKSOSBUDKAM*

*I. SITUASI / KEGIATAN:*

*A. Politik:*
${form.politik || "Tidak ada hal yang dapat dilaporkan."}

---

*B. Ekonomi:*

1. Distribusi BBM, LPG dan Minyak goreng berjalan lancar tidak terjadi kelangkaan di wilayah hukum polsek Tembalang. 

2. Adapun hasil pantauan harga Bahan Kebutuhan Pokok di pasar tradisional Kedungmundu dan Pasar Meteseh dapat dilaporkan sbb :

*1) BERAS MEDIUM*
Harga terendah per Kg: Rp. ${form.berasMin || "15.000"},-
Harga tertinggi per Kg:  Rp. ${form.berasMax || "17.000"},-

*2) KEDELAI*
Harga terendah per Kg: Rp. ${form.kedelaiMin || "9.000"},-
Harga tertinggi per Kg:  Rp. ${form.kedelaiMax || "13.000"},-

*3) CABAI MERAH BESAR*
Harga terendah per Kg: Rp. ${form.cabaiBesarMin || "40.000"},-
Harga tertinggi per Kg: Rp. ${form.cabaiBesarMax || "45.000"},-

*4) CABAI RAWIT MERAH*
Harga terendah per Kg: Rp. ${form.cabaiRawitMin || "90.000"},-
Harga tertinggi per Kg:  Rp. ${form.cabaiRawitMax || "95.000"},-

*5) CABAI TAMPAR*
Harga terendah per Kg: Rp. ${form.cabaiTamparMin || "35.000"},-
Harga tertinggi per Kg: Rp. ${form.cabaiTamparMax || "40.000"},-

*6) BAWANG MERAH*
Harga terendah per Kg: Rp. ${form.bawangMerahMin || "45.000"},-
Harga tertinggi per Kg: Rp. ${form.bawangMerahMax || "50.000"},-

*7) BAWANG PUTIH*
Harga terendah per Kg: Rp. ${form.bawangPutihMin || "35.000"},-
Harga tertinggi per Kg: Rp. ${form.bawangPutihMax || "40.000"},-

*8) JAGUNG (Pipilan Kering)*
Harga terendah per Kg: Rp.   ${form.jagungMin || "8.000"},-
Harga tertinggi per Kg:  Rp. ${form.jagungMax || "11.000"},-

*9) GULA PASIR*
Harga terendah per Kg: Rp. ${form.gulaMin || "17.500"},-
Harga tertinggi per Kg:  Rp. ${form.gulaMax || "18.500"},-

*10) MINYAK GORENG (MINYAK KITA)*
Harga terendah per Liter: Rp. ${form.minyakMin || "15.700"},-
Harga tertinggi per Liter:  Rp. ${form.minyakMax || "19.000"},-

*11) TEPUNG TERIGU*
Harga terendah per Kg: Rp.${form.teriguMin || "10.000"},-
Harga tertinggi per Kg:  Rp. ${form.teriguMax || "12.500"},-

*12) DAGING SAPI*
Harga terendah per Kg: Rp. ${form.dagingSapiMin || "120.000"},-
Harga tertinggi per Kg:  Rp. ${form.dagingSapiMax || "130.000"},-

*13) DAGING AYAM RAS*
Harga terendah per Kg: Rp. ${form.dagingAyamMin || "40.000"},-
Harga tertinggi per Kg: Rp. ${form.dagingAyamMax || "48.000"},-

*14) TELUR AYAM RAS*
Harga terendah per Kg: Rp. ${form.telurMin || "29.000"},-
Harga tertinggi per Kg: Rp. ${form.telurMax || "31.000"},-

*15) GARAM*
Harga terendah: Rp. ${form.garamMin || "2.500"},- / 250 Gram
Harga tertinggi: Rp. ${form.garamMax || "3.500"},- / 250 Gram

*16) Gas LPG 3 Kg*
Harga terendah: Rp. ${form.lpgMin || "18.000"},- (pangkalan)
Harga tertinggi: Rp. ${form.lpgMax || "23.000"},- (pengecer)

---

*C. Sosial Budaya:*
${form.sosbud || "Tidak ada hal yang dapat dilaporkan."}

---

*D. Sosial Keamanan:*
[ISI_SOSIAL_KEAMANAN]

---

*E. Keamanan Negara:*

*1. Keamanan umum:*

a. Kriminalitas:
${form.kriminalitas || "Tidak ada hal yang dapat dilaporkan."}

b. Laka Lantas :
${form.lakaLantas || "Tidak ada hal yang dapat dilaporkan."}

*2. Keamanan Khusus:*
${keamananKhususText}

---

*F. Bencana Alam:*
${form.bencanaAlam || "Tidak ada hal yang dapat dilaporkan."}

---

*G. Lain-lain:*

1. PATROLI BLP ( BLUE LIGHT PATROL ) / POLISI SIAGA SIANG HARI

Kegiatan rutin Patroli BLP (Blue Light Patrol) Siang hari dalam rangka antisipasi gangguan kamtibmas di Wilayah Hukum Polsek Tembalang, yang dilaksanakan pada :
 
Pukul     : ${form.patroliSiangWaktu || "11.00 Wib s/d Selesai."}
Cuaca    : ${form.patroliSiangCuaca || "CERAH"}

Personil :
${form.patroliSiangPersonil || ""}

I. SASARAN :
${form.patroliSiangSasaran || ""}

II. ROUTE
${form.patroliSiangRute || ""}

III. CARA BERTINDAK :
1.  Unit Patroli Memberikan himbauan kamtibmas kepada masyarakat untuk antisipasi tindak pidana C3.
2.  Melaksanakan Patroli obyek-obyek vital, SPBU, Kantor/ATM Perbankan, Tempat ibadah, patroli ke pemukiman penduduk/perumahan.
3.  Patroli antisipasi C3, balap liar, tawuran and pengendara sepeda motor yang menggunakan knalpot yang tidak sesuai dengan spesifikasi teknis di wilayah hukum Polsek Tembalang

IV. HASIL GIAT YANG DICAPAI :
${form.patroliSiangHasil || ""}

Selama kegiatan Patroli BLP berlangsung situasi dan kondisi berjalan aman, tertib dan lancar kejadian menonjol NIHIL

---

2. *PATROLI BLP ( BLUE LIGHT PATROL ) / POLISI SIAGA MALAM HARI*
                
Kegiatan rutin Patroli *BLP (Blue Light Patrol)* Malam hari dalam rangka antisipasi gangguan kamtibmas di Wilayah Hukum Polsek Tembalang, yang dilaksanakan pada :
Pukul     : ${form.patroliMalamWaktu || "22.00 Wib s/d selesai"}
Cuaca    : ${form.patroliMalamCuaca || "Cerah"}

Personil :
${form.patroliMalamPersonil || ""}

*Sasaran*
${form.patroliMalamSasaran || ""}

*II. ROUTE*
${form.patroliMalamRute || ""}

*III. CARA BERTINDAK :*
*1.* Unit Patroli Memberikan himbauan kamtibmas kepada masyarakat untuk antisipasi tindak pidana C3.
*2.* Melaksanakan Patroli obyek-obyek vital, SPBU, Kantor/ATM Perbankan, Tempat ibadah/Gereja, patroli ke pemukiman penduduk/perumahan.
*3.* Patroli antisipasi C3, balap liar, tawuran and pengendara sepeda motor yang menggunakan knalpot yang tidak sesuai dengan spesifikasi teknis di wilayah hukum Polsek Tembalang

*IV. HASIL GIAT YANG DICAPAI :*
${form.patroliMalamHasil || ""}

Selama kegiatan Patroli BLP berlangsung situasi berjalan aman, tertib dan lancar kejadian menonjol *_NIHIL_*

---

*II. KEGIATAN VVIP / VIP:*
[KEGIATAN_VVIP]

---

*III. CATATAN:*
${form.catatan || "Secara umum situasi di wilayah Hukum Polsek Tembalang dalam keadaan aman dan terkendali."}

---

*IV. RENCANA KEGIATAN:*

Hari    : ${form.rencanaHari || ""}

Tanggal : ${form.rencanaTanggal || ""}

*A. Unras : ${form.rencanaUnras || "NIHIL"}*

*B. Giat Menonjol : ${form.rencanaGiatMenonjol || "NIHIL"}*

*C. Politik : ${form.rencanaPolitik || "NIHIL"}*

*D. Giat Masyarakat: ${form.rencanaGiatMasyarakat || "NIHIL"}*

*E. Kegiatan Personil:*
1. ${form.rencanaPersonil1 || "Melaksanakan pam dan monitoring giat masyarakat di wilayah hukum Polsek Tembalang."}
2. ${form.rencanaPersonil2 || "Melaksanakan monitoring distribusi BBM, LPG serta Bahan kebutuhan pokok di wilayah hukum Polsek Tembalang."}
3. ${form.rencanaPersonil3 || "Melaksanakan Kegiatan Rutin dengan target yang dioptimalkan di wilayah hukum Polsek Tembalang dalam rangka menciptakan sitkamtibmas yang aman dan kondusif."}

DUMP

Hormat kami
Kapolsek Tembalang

[KAPOLSEK_NAMA]

${calendarContext}

Aturan Penulisan & Pengisian:
1. Pastikan Anda menyalin data dari formulir masukan persis seperti di atas.
2. Untuk [ISI_POLITIK], [KEGIATAN_SOSBUD], [ISI_SOSIAL_KEAMANAN], [KEGIATAN_VVIP], analisis unggahan transkrip/berkas dari user. Jika tidak ada yang terdeteksi, default-kan ke 'Tidak ada hal yang dapat dilaporkan' atau 'Tidak ada kegiatan untuk dilaporkan' atau 'NIHIL'.
3. Jika ADA peristiwa politik, sosial budaya (perayaan ibadah, misa, haul), sosial keamanan (eksekusi lahan, unras), kegiatan VVIP (kunjungan walikota, gubernur), jelaskan secara detail dan komprehensif memakai diksi intelkam resmi yang luwes dan dinamis (tidak monoton/stiff/robotik).
4. Untuk [KAPOLSEK_NAMA], selalu gunakan nama "KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H." (Jangan pernah menggunakan nama KOMPOL WAHDAH M., S.H., S.I.K. untuk template Laporan Harian ini).
5. Untuk bagian *C. Sosial Budaya*, jika ada kegiatan, gunakan format penomoran:
   1. [JUDUL KEGIATAN INDIKATIF] (dimulai dengan *_Monitoring Dan Pengamanan Kegiatan..._* atau sejenisnya, tebal dan miring menggunakan *_ dan _*)
   a. Rincian pelaksanaan, hari, tanggal, waktu, tempat, penyelenggara, pemateri/tokoh, jumlah jemaat/peserta.
   b. Dasar pengamanan (Undang-Undang No 2 Tahun 2002, surat perintah/sprin jika terdeteksi atau simulasikan nomor sprin logis yang valid).
   c. Jalannya pengamanan, situasi akhir, dan nihil kejadian menonjol.
   d. Dan seterusnya. Jika ada hal yang panjang dan kompleks yang mengharuskan ada poin E, F, dan seterusnya, eksekusilah, jangan terpatok pada poin A-D saja.

Kembalikan respons JSON:
{
  "perihal": "LAPORAN SITUASI DI WILAYAH HUKUM POLSEK TEMBALANG",
  "isi_laporan": "Teks lengkap laporan harian yang sudah di-merge dengan format persis di atas (termasuk header POLRESTABES SEMARANG sampai dengan tanda tangan Kapolsek di paling bawah).",
  "kapolsek_nama": "Nama Kapolsek yang menandatangani"
}
`;
    } else if (templateType === "infosus") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Informasi Khusus (Infosus) dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat isi Informasi Khusus formal berdasarkan hasil transkrip audio, analisa gambar, isi PDF, dan catatan user.
Anda WAJIB mengikuti format parafrase, gaya bahasa faktual-kronologis, dan struktur kalimat persis seperti dokumen referensi Infosus intelkam resmi.

${calendarContext}

PENTING - STRUKTUR PENULISAN DOKUMEN RELEVAN:
1. Anda DILARANG keras berasumsi atau memasukkan fakta bawaan yang tidak relevan dengan input pengguna.
2. Anda harus menyusun Infosus ini 100% secara dinamis dan faktual berdasarkan data nyata dari masukan pengguna.
3. Jika ada tanggal/waktu spesifik yang terdeteksi di salah satu dokumen masukan, gunakan tanggal tersebut. Jika sama sekali tidak ada tanggal, gunakan tanggal hari ini: ${currentDate}.

PANDUAN EKSTRAPOLASI KREATIF & SIMULASI LOGIS (JIKA DATA MASUKAN TIDAK LENGKAP):
- Jika masukan sangat minim atau tidak lengkap, Anda DILARANG KERAS menulis kalimat apologetis.
- Sebaliknya, Anda WAJIB melakukan ekstrapolasi kreatif dan mensimulasikan kronologi kejadian, identitas korban/pelaku/saksi, serta rincian tindakan kepolisian secara sangat logis, realistis, dan meyakinkan sesuai konteks kejadian.
- Pastikan seluruh rincian hasil simulasi logis tersebut mengalir alami, padat, berbobot, dan sangat profesional untuk sebuah laporan dinas resmi kepolisian.

KARAKTER KHAS GAYA PENULISAN INFOSUS (Berbeda dari LHK dan LI):
1. FAKTA – FAKTA: Harus menggunakan poin A, B, C, D dan sub-poin 1, 2, 3 (jika memang ada). Setiap poin/sub-poin ditulis secara terstruktur, kronologis, dengan paragraf yang ringkas dan tidak terlalu panjang (jangan monoton atau seperti tulisan robot/template mati).
2. CATATAN: Terdiri dari Analisa, Prediksi, Langkah-langkah kepolisian, Rekomendasi yang masing-masing uraiannya wajib dikelompokkan per poin langsung dengan format penomoran (1, 2, 3, dst) tanpa kalimat pengantar/pembuka.
3. PERIHAL: Ringkas, kapital sebagian, menggambarkan kejadian utama (misal: 'Ditemukan Orang Meninggal Dunia Di...').
4. PERIHAL_JUDUL: Versi KAPITAL PENUH dari perihal untuk cover halaman depan (misal: 'DITEMUKAN ORANG MENINGGAL DUNIA DI...').

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "tanggal": "Tanggal pembuatan laporan (misal: 30 April 2026 atau sesuai dokumen masukan)",
  "perihal_judul": "PERIHAL KEJADIAN DALAM HURUF KAPITAL PENUH UNTUK HALAMAN COVER (misal: DITEMUKAN ORANG MENINGGAL DUNIA DI EMBUNG BROWN CANYON KEL. ROWOSARI KEC. TEMBALANG KOTA SEMARANG)",
  "perihal": "Perihal kejadian dalam Title Case diakhiri tanda titik (misal: Ditemukan Orang Meninggal Dunia Di Embung Brown Canyon Kel. Rowosari Kec. Tembalang Kota Semarang.)",
  "fakta_fakta": "Narasi kronologis SANGAT LENGKAP dan padat fakta. Anda WAJIB membaginya ke dalam poin-poin terstruktur menggunakan urutan alfabet kapital (A., B., C., D., E., F., dst.). Pisahkan setiap poin utama alfabet (seperti A., B., C., D., dst.) dengan baris baru ganda (\\n\\n). Jika isi poin tersebut HANYA terdiri dari 1 paragraf penjelasan/fakta, Anda DILARANG KERAS memberi judul/label/topik di awal poin (contoh: tulis langsung 'A. Pada hari Senin tanggal...', dan JANGAN PERNAH menulis seperti 'A. Penemuan Korban: Pada hari...' atau 'A. Waktu Kejadian \\n Pada hari...'). Jika poin tersebut memperkenalkan daftar (saksi, rundown/kronologi, hasil otopsi/pemeriksaan, dsb.), tulis kalimat pengantar setelah huruf alfabet (contoh: 'D. Saksi dalam kejadian tersebut antara lain sebagai berikut :'), lalu cantumkan item-itemnya sebagai sub-poin angka (1., 2., 3., dst.) pada baris baru di bawahnya. Untuk seluruh sub-poin (saksi-saksi, kronologi kejadian, hasil pemeriksaan awal, otopsi, dsb.), Anda WAJIB memisahkan kalimat pengantar, sub-poin pertama, dan antar sub-poin berikutnya hanya dengan baris baru tunggal (\\n) agar tidak terlalu renggang. Setiap paragraf penjelasan harus ringkas, padat informasi, formal, dan tidak terlalu panjang (jangan monoton atau seperti tulisan robot/template mati). Gunakan gaya bahasa formal-faktual intelkam yang baku dan berwibawa.",
  "analisa": "Uraian analisa singkat namun tajam berdasarkan fakta-fakta yang dilaporkan, dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "prediksi": "Poin-poin prediksi potensi dampak ke depan (keresahan masyarakat, viral media sosial, kepercayaan masyarakat, potensi tindak lanjut) yang dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "langkah": "Langkah-langkah nyata yang sudah diambil oleh kepolisian (mendatangi TKP, mengamankan TKP, mendata korban/saksi, memeriksa saksi, memasang garis polisi, berkoordinasi dengan pihak terkait, melaporkan pimpinan) yang dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n.",
  "rekomendasi": "Rekomendasi tindak lanjut yang diperlukan (ringkas, 1-3 poin) yang dikelompokkan per poin langsung dengan format penomoran (1., 2., 3., dst.) tanpa kalimat pengantar/pembuka. Pisahkan poin dengan \\n."
}

PENTING - ATURAN FORMAT JSON (Wajib Dipatuhi Agar Tidak Error):
1. JANGAN PERNAH menggunakan enter atau baris baru fisik (raw newlines) di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`    } else if (templateType === "laporan-harian-intelijen") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Harian Intelijen (LHI) dinas resmi kepolisian dan intelkam berbahasa Indonesia.
Tugas Anda adalah membuat Laporan Harian Intelijen formal berdasarkan hasil transkrip audio, analisa gambar (terutama daftar harga sembako jika ada), isi PDF, dan catatan/laporan lainnya dari user.
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti dokumen referensi LHI intelkam resmi.

${calendarContext}

PENTING - ATURAN RESOLUSI TANGGAL DAN HARI:
- Anda harus menentukan Hari dan Tanggal Pelaporan dari dokumen masukan. Jika di input/referensi ada tanggal spesifik, gunakan tanggal itu. Jika tidak, gunakan tanggal hari ini: ${currentDate}.
- Nama hari pelaporan harus disesuaikan secara presisi dengan tanggal pelaporan tersebut (misalnya: "Kamis, 2 Juli 2026").
- PENTING: JANGAN PERNAH menyertakan tag delimiter literal seperti "{{hari}}" atau "{{tanggal}}" di dalam nilai respons JSON Anda. Anda harus mengevaluasi hari dan tanggal tersebut secara langsung menjadi teks nyata (contoh: gunakan "Kamis" dan "2 Juli 2026" secara harfiah, bukan "{{hari}}" atau "{{tanggal}}").

PENTING - STRUKTUR PENULISAN DOKUMEN RELEVAN:
1. Nomor Laporan: Buatlah nomor laporan yang logis dengan format "R/LHI/{{nomor}}/{{bulan_romawi}}/REN.4.1.1./{{tahun}}/Intelkam" berdasarkan tanggal pelaporan, contoh "R/LHI/199/VII/REN.4.1.1./2026/Intelkam".
2. Hari dan Tanggal: Tentukan hari dan tanggal pelaksanaan pelaporan. Tulis secara harfiah sesuai tanggal pelaporan (contoh: Hari Sabtu, tanggal 18 Juli 2026).
3. Pendahuluan (politik, sosbud, ekonomi, keamanan):
   - Masing-masing bidang WAJIB ditulis dalam bentuk 1 (satu) paragraf analisis yang utuh, formal, mengalir, dan bernada intelijen profesional (TIDAK boleh menggunakan penomoran "1.", "2." atau membagi menjadi beberapa paragraf).
   - PENTING: Pendahuluan ini HARUS SELALU diisi dengan paragraf analisis lengkap sesuai format di bawah ini. JANGAN PERNAH mengosongkannya, menulis "-", atau menulis "Tidak ada hal yang dapat dilaporkan" meskipun data masukan (LHS) kosong atau mencantumkan "NIHIL".
   - Tulis teks pendahuluan secara detail dengan mengikuti format dan substansi berikut (sesuaikan nama bulan dan tahun secara dinamis berdasarkan tanggal pelaporan):
     * Bidang Politik: "Situasi politik nasional pada [Bulan] [Tahun] berada dalam fase konsolidasi pemerintahan Presiden Prabowo Subianto pasca-Pemilu 2024, dengan isu utama berkisar pada polemik parliamentary threshold dalam pembahasan RUU Pemilu yang akan dimulai Juli–Agustus 2026, serta tekanan dari aksi penyampaian aspirasi elemen mahasiswa dan buruh yang menuntut hapus outsourcing dan revisi UU Sisdiknas. Di tingkat daerah, koordinasi unsur Forkopimda dioptimalkan sesudah May Day 2026 untuk mengantisipasi dinamika protes buruh. Secara umum, situasi politik domestik tetap aman, tertib, dan kondusif meskipun terdapat dinamika politik yang intens."
     * Bidang Sosial Budaya: "Kehidupan sosial budaya masyarakat, termasuk interaksi di lingkungan civitas akademika, berjalan harmonis dengan toleransi yang terjaga baik. Potensi kerentanan yang diwaspadai saat ini adalah penyebaran hoaks dan provokasi isu sensitif melalui media sosial yang dapat memicu gesekan horizontal. Pendekatan persuasif yang melibatkan tokoh masyarakat serta tokoh agama terus dikedepankan sebagai upaya menangkal polarisasi dan menjaga stabilitas sosial."
     * Bidang Ekonomi: "Kondisi ekonomi secara umum relatif stabil dengan pertumbuhan 5,61% (yoy) pada Triwulan II-2026, yang merupakan capaian tertinggi dalam 13 tahun untuk periode kuartal pertama. Inflasi terkendali di 3,34% dan konsumsi rumah tangga tumbuh 5,52%, namun fluktuasi nilai tukar (rupiah melemah ke Rp17.988/USD) dan potensi tekanan biaya hidup tetap memerlukan pengawasan karena dapat memengaruhi daya beli masyarakat, terutama kalangan buruh dan mahasiswa. Langkah pengendalian inflasi dan operasi pasar terus dilakukan untuk mengantisipasi potensi kerawanan sosial akibat tekanan ekonomi."
     * Bidang Keamanan: "Situasi kamtibmas secara umum kondusif, namun deteksi dini terhadap gangguan jalanan kelompok remaja pada malam hari tetap diintensifkan. Di sisi lain, kewaspadaan terhadap ancaman terorisme tetap menjadi prioritas utama di mana penyebaran paham radikal kini masif memanfaatkan algoritma media sosial dan game online untuk mendoktrin anak-anak serta generasi muda secara mandiri."
4. Fakta-fakta:
   - Aspek Sosial:
     - Sosial Politik: Poin fakta dinamika politik. Jika input berasal dari Laporan Harian Situasi (LHS), salin kejadian politik, unjuk rasa, atau sengketa sosial yang tertulis di sana ke bagian ini secara lengkap. Jika tidak ada kejadian, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata): "Pada hari [Hari], tanggal [Tanggal] kegiatan maupun kejadian menonjol NIHIL".
     - Sosial Ekonomi:
       * Kalimat Pengantar (fakta_sosial_ekonomi_intro): Gunakan kalimat pengantar berikut secara persis: "Perkembangan harga sembako di Pasar Kedungmundu dan Pasar Meteseh harga stabil dan tidak ada kelangkaan pasokan."
     - Tabel Daftar Harga Bahan Pokok (PENTING!):
       Ada 16 bahan makanan pokok yang dipantau. Anda wajib mengekstrak harga kemarin dan hari ini untuk masing-masing komoditas dari foto (hasil analisis gambar), suara (transkrip audio), atau teks laporan harian situasi (LHS) yang dimasukkan pengguna.
       PENTING: Jika pengguna memasukkan teks Laporan Harian Situasi (LHS) yang berisi "Harga Terendah" dan "Harga Tertinggi", petakan Harga Terendah ke kolom Kemarin ([komoditas]_kemarin) dan Harga Tertinggi ke kolom Hari Ini ([komoditas]_hari_ini).
       Daftar komoditas:
       1) Beras Medium (beras) 2) Kedelai (kedelai) 3) Cabai Merah Besar (cabai_merah) 4) Rawit Merah (cabai_rawit) 5) Cabai Tampar (cabai_tampar) 6) Bawang Merah (bawang_merah) 7) Bawang Putih (bawang_putih) 8) Jagung (jagung) 9) Gula Pasir (gula) 10) Minyak Goreng (minyak) 11) Tepung Terigu (terigu) 12) Daging Sapi Lokal (daging_sapi) 13) Daging Ayam Ras (daging_ayam) 14) Telur Ayam Ras (telur) 15) Garam (garam) 16) Gas LPG 3 Kg (lpg)
       Untuk setiap komoditas, Anda harus menentukan:
       - [komoditas]_kemarin, [komoditas]_hari_ini, [komoditas]_selisih.
       - [komoditas]_selisih WAJIB selalu diisi "-" saja (tanda hubung/minus tunggal).
       Format penulisan nominal harga wajib menggunakan format rupiah bertitik (misal: "Rp. 12.500/Kg" atau "Rp. 15.700/Liter" atau "Rp. 2.600 (250g)" atau "Rp. 22.000/Kg").
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
       Jika tidak ada kegiatan di input, isi dengan format ini (ganti dengan hari/tanggal pelaporan yang nyata): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan."
   - Aspek Keamanan:
     - Kriminalitas (kriminalitas_text): Uraikan detail kejadian kriminalitas (pencurian, penipuan, dll.). Jika ada di input LHS, salin ke sini secara lengkap beserta kronologi, identitas korban, barang bukti, dan taksiran kerugian. Jika tidak ada, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan."
     - Laka Lantas (laka_lantas_text): Uraikan kejadian kecelakaan. Jika ada di input LHS, salin lengkap. Jika tidak ada, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan."
     - Bencana Alam (bencana_alam_text): Uraikan kejadian bencana. Jika ada di input LHS, salin lengkap. Jika tidak ada, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan."
     - Keamanan Khusus (tahanan_text): Tulis jumlah tahanan di Rutan Polsek Tembalang secara lengkap (misal: "Jumlah tahanan di Rutan Polsek Tembalang 2 orang." atau jika tidak ada tahanan yang dilaporkan/kosong, gunakan default "Jumlah tahanan di Rutan Polsek Tembalang NIHIL.").
     - Pengamanan VVIP/VIP (vvip_text): Uraikan kegiatan kunjungan/pengamanan pejabat/tokoh penting. Jika di input LHS ada bagian Kegiatan VVIP / VIP, pindahkan ke sini secara lengkap. Jika tidak ada, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata, TANPA titik di akhir): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan".
     - Lain-lain (lain_lain_text): Uraikan kegiatan menonjol lainnya seperti patroli Blue Light Patrol (BLP) siang/malam, termasuk waktu, cuaca, personil, sasaran, rute, dan hasil patroli yang disalin dari LHS secara lengkap. Jika tidak ada, gunakan format ini (ganti dengan hari/tanggal pelaporan yang nyata, TANPA titik di akhir): "Pada hari [Hari], tanggal [Tanggal] tidak ada kejadian menonjol yang dapat dilaporkan".
5. Tanggal Tanda Tangan (tanggal_ttd): Gunakan format 'tanggal Bulan Tahun' saja, TANPA mencantumkan kata 'Semarang, ' (contoh: '19 Juli 2026').

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "nomor_laporan": "...", "hari": "...", "tanggal": "...", "pendahuluan_politik": "...", "pendahuluan_sosbud": "...", "pendahuluan_ekonomi": "...", "pendahuluan_keamanan": "...", "fakta_sosial_politik": "...", "fakta_sosial_ekonomi_intro": "...", "beras_kemarin": "...", "beras_hari_ini": "...", "beras_selisih": "...", "kedelai_kemarin": "...", "kedelai_hari_ini": "...", "kedelai_selisih": "...", "cabai_merah_kemarin": "...", "cabai_merah_hari_ini": "...", "cabai_merah_selisih": "...", "cabai_rawit_kemarin": "...", "cabai_rawit_hari_ini": "...", "cabai_rawit_selisih": "...", "cabai_tampar_kemarin": "...", "cabai_tampar_hari_ini": "...", "cabai_tampar_selisih": "...", "bawang_merah_kemarin": "...", "bawang_merah_hari_ini": "...", "bawang_merah_selisih": "...", "bawang_putih_kemarin": "...", "bawang_putih_hari_ini": "...", "bawang_putih_selisih": "...", "jagung_kemarin": "...", "jagung_hari_ini": "...", "jagung_selisih": "...", "gula_kemarin": "...", "gula_hari_ini": "...", "gula_selisih": "...", "minyak_kemarin": "...", "minyak_hari_ini": "...", "minyak_selisih": "...", "terigu_kemarin": "...", "terigu_hari_ini": "...", "terigu_selisih": "...", "daging_sapi_kemarin": "...", "daging_sapi_hari_ini": "...", "daging_sapi_selisih": "...", "daging_ayam_kemarin": "...", "daging_ayam_hari_ini": "...", "daging_ayam_selisih": "...", "telur_kemarin": "...", "telur_hari_ini": "...", "telur_selisih": "...", "garam_kemarin": "...", "garam_hari_ini": "...", "garam_selisih": "...", "lpg_kemarin": "...", "lpg_hari_ini": "...", "lpg_selisih": "...", "fakta_sosial_budaya": "...", "kriminalitas_text": "...", "laka_lantas_text": "...", "bencana_alam_text": "...", "tahanan_text": "...", "vvip_text": "...", "lain_lain_text": "...", "tanggal_ttd": "..."
}

PENTING - ATURAN FORMAT JSON:
1. JANGAN PERNAH menggunakan enter atau baris baru fisik di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`;
    } else if (templateType === "rencana-kegiatan") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Rencana Kegiatan Anggota Unit Intelkam dinas resmi kepolisian sektor Tembalang berbahasa Indonesia.
Tugas Anda adalah merumuskan rencana kegiatan intelkam harian dalam bentuk tabel terstruktur yang singkat, padat, dan jelas.

${calendarContext}

PENTING - KETENTUAN PENULISAN DOKUMEN:
1. Hari & Tanggal Rencana (hari_tanggal): 
   - Karena ini merupakan dokumen "Rencana Kegiatan" (rencana masa depan), maka hari dan tanggal rencana wajib dijadwalkan untuk esok hari / besok (H+1 dari tanggal hari ini atau tanggal referensi).
   - Jika berdasarkan hari ini, Anda wajib menjadwalkannya untuk esok hari yaitu: ${tomorrowDay}, ${tomorrowDate}.
   - Jika pengguna menentukan/merujuk tanggal referensi lain secara spesifik, Anda wajib menjadwalkannya tepat 1 hari setelah tanggal tersebut (H+1 secara eksak). Contoh: jika tanggal referensi di dokumen masukan adalah Sabtu, 18 Januari 2025, maka Rencana Kegiatan wajib dijadwalkan untuk Minggu, 19 Januari 2025.
2. Daftar Rencana Kegiatan (kegiatan_list):
   Simulasikan rencana kegiatan Unit Intelkam yang sangat singkat, padat, dan berupa poin-poin dasar saja (tanpa penjelasan yang bertele-tele atau bahasa AI yang panjang lebar).
   Setiap rencana kegiatan wajib memiliki field: no, waktu_lokasi, kegiatan, hasil, ket.
   - no: Angka urutan (contoh: "1", "2")
   - waktu_lokasi: Gunakan format "Pukul [Waktu] [WIB/Wib] [s.d. selesai] di [Lokasi/Wilayah hukum Polsek Tembalang]".
   - kegiatan: Tuliskan rencana kegiatan intelkam secara singkat dan padat (contoh: "Pemberangkatan Mahasiswa KKN Undip Tim I TA. 2024/ 2025", "Melaksanakan KKRYD 2024", "Melakukan monitoring distribusi BBM, LPG serta Bahan kebutuhan pokok di wilayah hukum Polsek Tembalang").
   - hasil: Anda WAJIB menuliskan kalimat ini secara eksak tanpa variasi apa pun: "Situasi kamtibmas aman terkendali berikut kejadian menonjol nihil"
   - ket: Isi dengan "-" atau "Nihil".
   - KEGIATAN WAJIB/PATEN: Anda WAJIB menyertakan rencana kegiatan berikut ini di dalam daftar 'kegiatan_list' (masukkan sebagai salah satu item di no urut berapa pun):
     {
       "waktu_lokasi": "Pukul 10.00 Wib di wilayah Hukum Polsek Tembalang",
       "kegiatan": "Melakukan monitoring distribusi BBM, LPG serta Bahan kebutuhan pokok di wilayah hukum Polsek Tembalang.",
       "hasil": "Situasi kamtibmas aman terkendali berikut kejadian menonjol nihil",
       "ket": "-"
     }
3. Tanggal Tanda Tangan (tanggal_ttd): Gunakan format 'tanggal Bulan Tahun' saja, TANPA mencantumkan kata 'Semarang, ' (contoh: '${currentDate}').
4. Penandatangan: jabatan_ttd: "BA SIAGA INTELKAM", nama_ttd: "YUDHA M.P.", pangkat_nrp_ttd: "AIPDA NRP 86040324".

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "hari_tanggal": "...",
  "kegiatan_list": [
    {
      "no": "...",
      "waktu_lokasi": "...",
      "kegiatan": "...",
      "hasil": "...",
      "ket": "..."
    }
  ],
  "tanggal_ttd": "...",
  "jabatan_ttd": "...",
  "nama_ttd": "...",
  "pangkat_nrp_ttd": "..."
}

PENTING - ATURAN FORMAT JSON:
1. JANGAN PERNAH menggunakan enter atau baris baru fisik di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`;
    } else if (templateType === "laporan-harian-autofill") {
      let scopeInstructions = "";
      let jsonSchema = "";

      if (scope === "umum") {
        scopeInstructions = `Fokus HANYA pada informasi Umum, Tahanan, dan Keamanan. Ekstrak data untuk hari, tanggal, waktu piket, tahanan laki-laki (tahananL), tahanan perempuan (tahananP), kasus kriminalitas, laka lantas, bencana alam, dan kegiatan VVIP.`;
        jsonSchema = `{
  "hari": "...",
  "tanggal": "...",
  "waktu": "...",
  "kriminalitas": "...",
  "lakaLantas": "...",
  "tahananL": "...",
  "tahananP": "...",
  "bencanaAlam": "...",
  "vvip": "..."
}`;
      } else if (scope === "ekonomi") {
        scopeInstructions = `Fokus HANYA pada harga komoditas bahan pokok penting (sembako). Ekstrak Harga Terendah (Min) dan Harga Tertinggi (Max) secara akurat dari data masukan untuk 16 komoditas bahan pokok. Jangan tertukar antara Min (Harga Terendah) dan Max (Harga Tertinggi).`;
        jsonSchema = `{
  "berasMin": "...", "berasMax": "...",
  "kedelaiMin": "...", "kedelaiMax": "...",
  "cabaiBesarMin": "...", "cabaiBesarMax": "...",
  "cabaiRawitMin": "...", "cabaiRawitMax": "...",
  "cabaiTamparMin": "...", "cabaiTamparMax": "...",
  "bawangMerahMin": "...", "bawangMerahMax": "...",
  "bawangPutihMin": "...", "bawangPutihMax": "...",
  "jagungMin": "...", "jagungMax": "...",
  "gulaMin": "...", "gulaMax": "...",
  "minyakMin": "...", "minyakMax": "...",
  "teriguMin": "...", "teriguMax": "...",
  "dagingSapiMin": "...", "dagingSapiMax": "...",
  "dagingAyamMin": "...", "dagingAyamMax": "...",
  "telurMin": "...", "telurMax": "...",
  "garamMin": "...", "garamMax": "...",
  "lpgMin": "...", "lpgMax": "..."
}`;
      } else if (scope === "politik") {
        scopeInstructions = `Fokus HANYA pada informasi politik di wilayah hukum Polsek Tembalang. Ekstrak data untuk bidang politik (politik). Jika tidak ada informasi politik sama sekali, gunakan default 'Tidak ada hal yang dapat dilaporkan'.`;
        jsonSchema = `{
  "politik": "..."
}`;
      } else if (scope === "sosbud") {
        scopeInstructions = `Fokus HANYA pada informasi kegiatan Sosial Budaya (keagamaan, kemasyarakatan, aksi sosial, kuliah umum, dll.) di wilayah hukum Polsek Tembalang. Ekstrak deskripsi kejadian secara detail, panjang, dan komprehensif, tiru gaya bahasa referensi resmi kepolisian (misal: 'Kegiatan Kuliah umum... Pada hari... pukul... bertempat di... telah berlangsung... Rundown:... Dihadiri oleh:... Substansi:... Pengamanan...'). Jika tidak ada informasi sosial budaya sama sekali, gunakan default 'Tidak ada hal yang dapat dilaporkan'.`;
        jsonSchema = `{
  "sosbud": "..."
}`;
      } else if (scope === "patroli") {
        scopeInstructions = `Fokus HANYA pada kegiatan patroli (Siang & Malam). Ekstrak waktu, cuaca, personil, sasaran, rute, dan hasil patroli.`;
        jsonSchema = `{
  "patroliSiangWaktu": "...", "patroliSiangCuaca": "...", "patroliSiangPersonil": "...", "patroliSiangSasaran": "...", "patroliSiangRute": "...", "patroliSiangHasil": "...",
  "patroliMalamWaktu": "...", "patroliMalamCuaca": "...", "patroliMalamPersonil": "...", "patroliMalamSasaran": "...", "patroliMalamRute": "...", "patroliMalamHasil": "..."
}`;
      } else if (scope === "rencana") {
        scopeInstructions = `Fokus HANYA pada rencana kegiatan besok. Ekstrak rencana hari (rencanaHari), rencana tanggal (rencanaTanggal), rencana waktu (rencanaWaktu), rencana sasaran (rencanaSasaran), rencana kegiatan (rencanaKegiatan), rencana hasil (rencanaHasil), dan rencana keterangan (rencanaKeterangan).`;
        jsonSchema = `{
  "rencanaHari": "...", "rencanaTanggal": "...", "rencanaWaktu": "...", "rencanaSasaran": "...", "rencanaKegiatan": "...", "rencanaHasil": "...", "rencanaKeterangan": "..."
}`;
      } else {
        scopeInstructions = `Ekstrak seluruh informasi laporan harian secara lengkap.`;
        jsonSchema = `{
  "hari": "...", "tanggal": "...", "waktu": "...",
  "politik": "...", "sosbud": "...",
  "berasMin": "...", "berasMax": "...",
  "kedelaiMin": "...", "kedelaiMax": "...",
  "cabaiBesarMin": "...", "cabaiBesarMax": "...",
  "cabaiRawitMin": "...", "cabaiRawitMax": "...",
  "cabaiTamparMin": "...", "cabaiTamparMax": "...",
  "bawangMerahMin": "...", "bawangMerahMax": "...",
  "bawangPutihMin": "...", "bawangPutihMax": "...",
  "jagungMin": "...", "jagungMax": "...",
  "gulaMin": "...", "gulaMax": "...",
  "minyakMin": "...", "minyakMax": "...",
  "teriguMin": "...", "teriguMax": "...",
  "dagingSapiMin": "...", "dagingSapiMax": "...",
  "dagingAyamMin": "...", "dagingAyamMax": "...",
  "telurMin": "...", "telurMax": "...",
  "garamMin": "...", "garamMax": "...",
  "lpgMin": "...", "lpgMax": "...",
  "kriminalitas": "...", "lakaLantas": "...", "tahananL": "...", "tahananP": "...", "bencanaAlam": "...", "vvip": "...",
  "patroliSiangWaktu": "...", "patroliSiangCuaca": "...", "patroliSiangPersonil": "...", "patroliSiangSasaran": "...", "patroliSiangRute": "...", "patroliSiangHasil": "...",
  "patroliMalamWaktu": "...", "patroliMalamCuaca": "...", "patroliMalamPersonil": "...", "patroliMalamSasaran": "...", "patroliMalamRute": "...", "patroliMalamHasil": "...",
  "rencanaHari": "...", "rencanaTanggal": "...", "rencanaWaktu": "...", "rencanaSasaran": "...", "rencanaKegiatan": "...", "rencanaHasil": "...", "rencanaKeterangan": "..."
}`;
      }

      systemPrompt = `Anda adalah asisten AI profesional untuk ekstraksi data formulir kepolisian Polsek Tembalang berbahasa Indonesia.
Tugas Anda adalah membaca input transkrip suara pimpinan, hasil analisa foto lapangan, atau catatan pengguna, lalu mengekstrak informasi tersebut ke dalam skema JSON formulir Laporan Harian Situasi (LHS) secara lengkap.

${scopeInstructions}

${calendarContext}

PENTING - KETENTUAN PENGISIAN FIELD:
1. hari: Hari pelaksanaan kegiatan (misal: "Kamis").
2. tanggal: Tanggal pelaksanaan (misal: "23 Juli 2026").
3. waktu: Waktu piket siaga, default "08.00 s.d. 08.00 WIB".
4. Harga Sembako (Min & Max): Ekstrak Harga Terendah (Min) dan Harga Tertinggi (Max) secara akurat untuk 16 komoditas bahan pokok penting dari data masukan. JANGAN tertukar antara Min (Harga Terendah) dan Max (Harga Tertinggi). Format nominal angka tanpa tanda Rp dan tanpa titik ribuan, contoh: "12500" atau "35000" (sebagai string). Jika tidak terdeteksi harga di input, gunakan nilai default:
   - berasMin: "15000", berasMax: "15000"
   - kedelaiMin: "9000", kedelaiMax: "10000"
   - cabaiBesarMin: "40000", cabaiBesarMax: "42000"
   - cabaiRawitMin: "50000", cabaiRawitMax: "53000"
   - cabaiTamparMin: "35000", cabaiTamparMax: "38000"
   - bawangMerahMin: "40000", bawangMerahMax: "42000"
   - bawangPutihMin: "35000", bawangPutihMax: "35800"
   - jagungMin: "8000", jagungMax: "8200"
   - gulaMin: "17500", gulaMax: "17800"
   - minyakMin: "15700", minyakMax: "15900"
   - teriguMin: "11000", teriguMax: "12200"
   - dagingSapiMin: "130000", dagingSapiMax: "130300"
   - dagingAyamMin: "35000", dagingAyamMax: "36800"
   - telurMin: "29000", telurMax: "29300"
   - garamMin: "2500", garamMax: "2500"
   - lpgMin: "20000", lpgMax: "22000"
5. Keamanan:
   - kriminalitas: Default "Tidak ada hal yang dapat dilaporkan."
   - lakaLantas: Default "Tidak ada hal yang dapat dilaporkan."
   - bencanaAlam: Default "Tidak ada hal yang dapat dilaporkan."
   - tahananL: Jumlah tahanan Laki-laki (contoh: "4" atau "0").
   - tahananP: Jumlah tahanan Perempuan (contoh: "0").
6. Kegiatan VVIP / Menonjol (vvip): default "Tidak ada kegiatan untuk dilaporkan."
7. Patroli (Siang & Malam):
   - Waktu, cuaca (default "CERAH"), personil, sasaran, rute, hasil.
8. Rencana Kegiatan Besok (rencanaHari, rencanaTanggal, rencanaWaktu, rencanaSasaran, rencanaKegiatan, rencanaHasil, rencanaKeterangan).

Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
${jsonSchema}

PENTING - ATURAN FORMAT JSON:
1. JANGAN PERNAH menggunakan enter atau baris baru fisik di dalam nilai string JSON. Semua baris baru wajib ditulis menggunakan karakter escape '\\n'.
2. JANGAN PERNAH menggunakan tanda kutip ganda mentah (") di dalam nilai string JSON. Jika ingin menulis kutipan, gunakan tanda kutip tunggal (') saja.`;
    } else {
      systemPrompt = `Anda adalah asisten AI profesional pembuat laporan dinas resmi dan korporat berbahasa Indonesia.
Tugas Anda adalah membuat isi laporan resmi formal bahasa Indonesia berdasarkan hasil transkrip audio, analisis gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user. Gunakan gaya bahasa profesional, singkat, jelas, dan format sesuai laporan dinas resmi (EYD yang disempurnakan, sopan, objektif, dan bernada formal).

${calendarContext}

PENTING:
1. Susun seluruh laporan HANYA berdasarkan data nyata yang disediakan di masukan pengguna (gambar rundown, PDF guidebook, transkrip rekaman suara, catatan teks). Jangan mengada-ada atau berhalusinasi.
2. Jika ada tanggal/waktu yang terdeteksi dari masukan, gunakan itu. Jika tidak ada, gunakan tanggal hari ini: ${currentDate}.
3. Jika masukan sangat minim/tidak ada rundown, WAJIB lakukan ekstrapolasi logis dan simulasikan rincian agenda rundown acara, aturan pengamanan, serta sarana penunjang secara sangat realistis dan detail sesuai norma umum acara tersebut agar laporan tetap terlihat utuh dan profesional. Jangan menulis penolakan data kosong!

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

    let userPrompt = "";
    if (templateType === "laporan-harian") {
      userPrompt = `
Template Laporan yang Dipilih: ${templateType}

FORMULIR MASUKAN TERSTRUKTUR DARI PENGGUNA (Wajib di-merge ke dalam template):
${JSON.stringify(laporanHarianForm, null, 2)}

DOKUMEN DAN UNGGAHAN BERKAS DARI USER (Untuk ekstraksi event dinamis):
1. Hasil Transkrip Rekaman Suara / Sambutan:
"${transcript || "(Tidak ada unggahan suara)"}"

2. Hasil Analisa Gambar Rundown Acara:
"${imageAnalysis || "(Tidak ada unggahan gambar rundown)"}"

3. Teks Ekstraksi dari Guidebook PDF Panduan Acara:
"${pdfText || "(Tidak ada unggahan PDF guidebook)"}"

4. Catatan Teks Tambahan:
"${userInput || "(Tidak ada catatan tambahan)"}"

5. Instruksi / Preferensi Khusus untuk AI (Arahkan Fokus Laporan):
"${userPreference || "(Tidak ada instruksi khusus)"}"

PENTING: Jika pengguna memberikan instruksi khusus pada bagian ke-5 di atas, Anda WAJIB memprioritaskan dan mematuhi instruksi tersebut dalam merancang konten, struktur, maupun detail teknis dari laporan yang dihasilkan.

Silakan susun Laporan Harian Situasi Kamtibmas Polsek Tembalang lengkap sesuai format dan merging rules.`;
    } else {
      userPrompt = `
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

5. Instruksi / Preferensi Khusus untuk AI (Arahkan Fokus Laporan):
"${userPreference || "(Tidak ada instruksi khusus)"}"

PENTING: Jika pengguna memberikan instruksi khusus pada bagian ke-5 di atas, Anda WAJIB memprioritaskan dan mematuhi instruksi tersebut dalam merancang konten, struktur, maupun detail teknis dari laporan yang dihasilkan.

Silakan buat laporan dinas resmi dengan detail faktual utuh sesuai masukan asli di atas. Masukkan hasilnya ke dalam skema JSON yang diminta.`;
    }

    let response;
    const retries = 3;
    let delay = 2000;

    for (let i = 0; i < retries; i++) {
      try {
        response = await geminiClient.chat.completions.create({
          model: "gemini-3.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 8192,
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
    let reportData;
    try {
      reportData = JSON.parse(resultText);
    } catch (parseErr: any) {
      console.error("=== GEMINI JSON PARSE ERROR ===");
      console.error("Error Message:", parseErr.message);
      console.error("Raw Response Content:");
      console.error(resultText);
      console.error("=================================");
      
      // Attempt our advanced state-machine sanitization to escape nested double quotes and newlines:
      try {
        const sanitized = sanitizeJsonString(resultText);
        reportData = JSON.parse(sanitized);
        console.log("Successfully parsed JSON after state-machine sanitization fallback!");
      } catch (secondErr: any) {
        console.error("State-machine sanitization also failed:", secondErr.message);
        
        // Try healing the JSON from state-machine sanitized text in case it is truncated:
        try {
          const sanitized = sanitizeJsonString(resultText);
          reportData = healTruncatedJson(sanitized);
          console.log("Successfully healed and parsed truncated JSON after state-machine sanitization!");
        } catch (healErr: any) {
          console.error("JSON healing after state-machine sanitization failed:", healErr.message);
          
          // Try healing raw resultText directly:
          try {
            reportData = healTruncatedJson(resultText);
            console.log("Successfully healed and parsed raw truncated JSON!");
          } catch (healErr2: any) {
            console.error("JSON healing of raw text failed:", healErr2.message);
            
            // Final fallback: attempt basic regex sanitization to recover raw newlines in string properties:
            try {
              const sanitizedRegex = resultText
                .replace(/\r?\n/g, "\\n")
                .replace(/\\n\s*"/g, '\n  "')
                .replace(/\\n\s*}/g, '\n}');
              reportData = JSON.parse(sanitizedRegex);
              console.log("Successfully parsed JSON after regex sanitization fallback!");
            } catch (thirdErr) {
              throw new Error(`Gagal mem-parsing format JSON dari AI. Detail: ${parseErr.message}`);
            }
          }
        }
      }
    }

    // Apply dynamic calendar corrector to ensure 100% precision for any day/date combination
    reportData = correctWeekdaysInObject(reportData);

    // Force all sembako selisih fields to be "-" as requested by the user
    if (templateType === "laporan-harian-intelijen" && reportData) {
      const sembakoKeys = [
        "beras", "kedelai", "cabai_merah", "cabai_rawit", "cabai_tampar", 
        "bawang_merah", "bawang_putih", "jagung", "gula", "minyak", 
        "terigu", "daging_sapi", "daging_ayam", "telur", "garam", "lpg"
      ];
      sembakoKeys.forEach((key) => {
        reportData[`${key}_selisih`] = "-";
      });
    }

    // Clean up perihal if it starts with "Laporan Kegiatan" (case-insensitive) for "laporan-kegiatan" template
    if (templateType === "laporan-kegiatan" && reportData && typeof reportData.perihal === "string") {
      let perihal = reportData.perihal.trim();
      if (/^laporan\s+kegiatan/i.test(perihal)) {
        perihal = perihal.replace(/^laporan\s+/i, "");
      }
      reportData.perihal = perihal;
    }

    console.log("Report narrative generated and calendar-synchronized successfully via Gemini!");
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
