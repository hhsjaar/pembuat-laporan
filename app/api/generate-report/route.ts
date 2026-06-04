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

export async function POST(req: NextRequest) {
  try {
    const { transcript, imageAnalysis, pdfText, userInput, userPreference = "", templateType, laporanHarianForm } = await req.json();

    console.log(`[Gemini Mode] Generating report narrative for template: ${templateType}...`);

    // Dynamic current date for formatting fallback
    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const currentDay = new Date().toLocaleDateString("id-ID", { weekday: "long" });

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
  "isi_laporan": "Teks rincian fakta lapangan yang SANGAT LENGKAP, DETAIL, DAN KOMPREHENSIF. Anda WAJIB membaginya ke dalam poin-poin terstruktur menggunakan urutan alfabet kapital (A., B., C., D., E., F., dst.). Jangan pernah terpatok hanya pada poin A sampai D saja; jika pembahasan dari masukan data bersifat panjang, kompleks, atau membutuhkan penjelasan multi-dimensi, silakan eksekusi poin-poin selanjutnya (seperti E., F., G., dst.) secara dinamis sesuai kebutuhan. Judul atau fokus dari masing-masing poin alfabet ini bersifat dinamis (menyesuaikan dengan jenis kegiatan/peristiwa yang dilaporkan, misalnya: A. Fakta-fakta Pelaksanaan Kegiatan, B. Rincian Susunan Acara/Rundown secara Detail, C. Aspek Keamanan dan Pengamanan, D. Informasi Tambahan/Lain-lain). Setiap poin wajib dijabarkan dengan deskripsi/narasi yang sangat mendalam dan tidak boleh disingkat-singkat. Pisahkan antar poin menggunakan baris baru ganda (\\n\\n). Gunakan bahasa dinas intelkam resmi kepolisian yang baku dan berwibawa, namun kemaslah diksi tersebut secara luwes, variatif, mengalir alami, dan tidak kaku (jangan monoton atau seperti tulisan robot/template mati).",
  "analisa": "Paragraf pendapat pelapor berupa analisa menyeluruh terhadap kerawanan kegiatan (potensi kerawanan, gesekan, kesiapan pengamanan, dll.)",
  "prediksi": "Poin-poin prediksi kerawanan ke depan (gunakan format poin-poin bernomor atau deskriptif, pisahkan dengan \\n)",
  "langkah": "Langkah-langkah taktis antisipasi/penanganan oleh kepolisian (gunakan format poin-poin bernomor atau deskriptif, pisahkan dengan \\n)",
  "rekomendasi": "Rekomendasi kebijakan jangka panjang atau koordinasi berkelanjutan (gunakan format paragraf atau poin, pisahkan dengan \\n)",
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

Aturan Tambahan:
1. Pastikan seluruh isi laporan bebas dari kosakata kasual. Ubah kosakata sehari-hari dari transkrip audio menjadi bahasa intelkam resmi yang baku, terstruktur, sopan, objektif, dan formal. Namun, kemaslah diksi tersebut secara luwes, variatif, mengalir alami, dan tidak monoton. Hindari pengulangan kata/frasa pembuka yang sama secara terus-menerus (seperti 'bahwa', 'kemudian', 'dapat dilaporkan bahwa') di awal kalimat/paragraf agar tulisan tidak terasa kaku atau robotik.
2. Jika ada tanggal/waktu spesifik yang terdeteksi dari transkrip atau catatan user/rundown, wajib digunakan. Jika tidak terdeteksi, gunakan tanggal hari ini: ${currentDate}.
3. Sesuaikan bidang (KEAMANAN, POLITIK, IDEOLOGI / SOSIAL POLITIK, atau lainnya) dengan jenis isi kegiatan nyata yang dibahas.`;
    } else if (templateType === "laporan-kegiatan") {
      systemPrompt = `Anda adalah asisten AI profesional pembuat Laporan Kegiatan dinas resmi Polsek Tembalang berbahasa Indonesia yang dikirimkan ke tingkat Polres/Polrestabes.
Tugas Anda adalah membuat isi Laporan Kegiatan berdasarkan hasil transkrip audio/sambutan, analisa gambar rundown acara, isi guidebook PDF panduan acara, dan catatan user.
Anda WAJIB mengikuti format parafrase, gaya bahasa formal-analitis, dan struktur kalimat persis seperti contoh referensi Laporan Kegiatan yang disajikan.

${calendarContext}

PENTING:
1. Susun seluruh isi laporan 100% secara dinamis dan faktual berdasarkan data nyata yang disediakan di masukan pengguna (gambar dokumen, PDF guidebook, transkrip, catatan teks). Jangan pernah berasumsi atau menyalin detail acara lain jika masukan berbeda!
2. Anda wajib mengembalikan respons dalam format JSON yang valid dengan skema berikut:
{
  "perihal": "Informasi kejadian/kegiatan secara ringkas namun deskriptif (misal: Monitoring Giat Nobar Pesta Babi... di Beranda FH Undip Kec. Tembalang)",
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
[ISI_POLITIK]

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
Harga tertinggi per Kg:  Rp. ${form.cabaiTamparMax || "40.000"},-

*6) BAWANG MERAH*
Harga terendah per Kg: Rp. ${form.bawangMerahMin || "45.000"},-
Harga tertinggi per Kg:  Rp. ${form.bawangMerahMax || "50.000"},-

*7) BAWANG PUTIH*
Harga terendah per Kg: Rp. ${form.bawangPutihMin || "35.000"},-
Harga tertinggi per Kg:  Rp. ${form.bawangPutihMax || "40.000"},-

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
[KEGIATAN_SOSBUD]

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
    let reportData = JSON.parse(resultText);

    // Apply dynamic calendar corrector to ensure 100% precision for any day/date combination
    reportData = correctWeekdaysInObject(reportData);

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
