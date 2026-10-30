// Laporan format teks WhatsApp (salin-tempel): Laporan Segera Gangguan Kamtibmas & Laporan Kemajuan.
// AI hanya mengisi kolom (JSON); kepala surat, tembusan, salam, dan penutup dirakit di sini agar format selalu sama.

export type WaTemplateType = "wa-segera-kamtibmas" | "wa-kemajuan";

export const WA_TEMPLATE_TYPES: WaTemplateType[] = ["wa-segera-kamtibmas", "wa-kemajuan"];

export function isWaTemplate(t: unknown): t is WaTemplateType {
  return typeof t === "string" && (WA_TEMPLATE_TYPES as string[]).includes(t);
}

// Penanda poin yang tidak ada isinya / tidak dilaporkan.
const KOSONG = "NIHIL";
// Variasi "kosong" yang kadang ditulis AI; semuanya diseragamkan menjadi KOSONG.
const POLA_KOSONG = /^(?:[-–—]+|nihil|tidak ada|belum ada|n\/a)\.?$/i;

export const LABEL_LAPORAN_WA: Record<string, string> = {
  "wa-segera-kamtibmas": "Laporan Segera (WA)",
  "wa-kemajuan": "Laporan Kemajuan (WA)",
};

// Judul untuk daftar Riwayat.
export function judulLaporanWa(type: WaTemplateType, data: Record<string, any>): string {
  if (type === "wa-kemajuan") {
    const perihal = teks(data.perihal);
    if (perihal !== KOSONG) return perihal;
    return `Laporan Kemajuan ${teks(data.jenis_gangguan)}`.trim();
  }
  const ringkasan = teks(data.ringkasan_gangguan);
  return ringkasan !== KOSONG ? `Laporan Segera Gangguan Kamtibmas ${ringkasan}` : "Laporan Segera Gangguan Kamtibmas";
}

// Nama Penandatangan yang disimpan sebagai kapolsek_nama di riwayat (kolom wajib di tabel).
export const PENANDATANGAN_WA = "KOMBES POL ERLIN TANG JAYA, S.H., S.I.K., M.H.";

const KEPALA = `POLRESTABES SEMARANG

Kepada Yth: Kapolda Jateng
Dari: Kapolrestabes Semarang

Tembusan:
1. Wakapolda Jateng
2. Irwasda Polda Jateng
3. Karo Ops Polda Jateng
4. Kabid Humas Polda Jateng
5. Kabid Propam Polda Jateng
6. Dir/Kabid terkait`;

// Penutup & penandatangan sama untuk kedua jenis laporan.
const PENUTUP = `Dump, Terima Kasih.

KAPOLRESTABES SEMARANG
${PENANDATANGAN_WA}`;

// Skema JSON yang diminta dari AI untuk tiap jenis laporan.
const SKEMA_SEGERA = `{
  "ringkasan_gangguan": "frasa singkat gangguan kamtibmas untuk kalimat pembuka, contoh: Pencurian dengan Pemberatan di Jl. Pandanaran Semarang",
  "jenis_gangguan": "...",
  "waktu_kejadian": "...",
  "waktu_dilaporkan": "...",
  "waktu_mendatangi_tkp": "...",
  "tempat_kejadian": "...",
  "modus_operandi": "...",
  "korban": "...",
  "uraian_singkat": "...",
  "pelaku": "...",
  "saksi": "...",
  "motif": "...",
  "alat_digunakan": "...",
  "kerugian": "...",
  "bukti_disita": "...",
  "satuan_tambahan": ["...", "..."],
  "tindakan_kepolisian": "...",
  "keterangan_lain": "..."
}`;

const SKEMA_KEMAJUAN = `{
  "jenis_gangguan": "jenis gangguan kamtibmas untuk kalimat pembuka",
  "perihal": "perihal surat, contoh: Laporan Kemajuan Penanganan Perkara Pencurian dengan Pemberatan di Jl. Pandanaran Semarang",
  "dasar": "...",
  "perkara": "...",
  "waktu": "...",
  "tempat_kejadian": "...",
  "korban": ["...", "..."],
  "saksi": ["...", "..."],
  "uraian_singkat": "...",
  "fakta_fakta": ["...", "..."],
  "penangkapan_tersangka": ["...", "..."],
  "keterangan_tersangka": ["...", "..."],
  "barang_bukti": ["...", "..."],
  "modus_operandi": "...",
  "motif": "...",
  "alat_digunakan": "...",
  "kerugian": "...",
  "kesatuan_menangani": "..."
}`;

export function buildWaSystemPrompt(type: WaTemplateType, hariIni: string): string {
  const isSegera = type === "wa-segera-kamtibmas";
  const nama = isSegera ? "Laporan Segera Gangguan Kamtibmas" : "Laporan Kemajuan penanganan perkara gangguan Kamtibmas";

  const aturanKhusus = isSegera
    ? `- "ringkasan_gangguan" dipakai dalam kalimat "Laporan Segera gangguan Kamtibmas <ringkasan_gangguan>": singkat (maks. 1 baris), memuat jenis gangguan dan lokasi/wilayahnya bila ada.
- Waktu kejadian, dilaporkan, dan mendatangi TKP ditulis lengkap: "Hari, tanggal Bulan Tahun, pukul HH.MM WIB". Bila hanya sebagian yang disebut, tulis sebagian itu; bila tidak ada sama sekali tulis "${KOSONG}".
- Bila ada beberapa korban/pelaku/saksi, tulis satu per baris dengan awalan "a. ", "b. ", dst. (pisahkan baris dengan \\n). Sertakan nama, umur, pekerjaan, dan alamat sejauh disebut di teks.
- "satuan_tambahan" (untuk poin Kesatuan Yang Menangani) adalah ARRAY berisi nol atau lebih nilai PERSIS dari: "BPBD", "Inafis Polrestabes Semarang", "Basarnas". Polsek Tembalang SELALU menangani dan ditambahkan otomatis, jadi JANGAN ditulis di array. Pilih satuan yang kira-kira dibutuhkan untuk peristiwa tersebut, bisa lebih dari satu atau tidak ada sama sekali (array kosong []):
  * "BPBD": bila peristiwa berkaitan dengan bencana alam / cuaca ekstrem (banjir, longsor, pohon tumbang, angin kencang, kebakaran lahan, dsb.) atau perlu penanganan kebencanaan/evakuasi warga.
  * "Inafis Polrestabes Semarang": bila ada tindak pidana atau kejadian yang perlu olah TKP / identifikasi (korban meninggal atau luka akibat tindak kejahatan, pencurian, kekerasan, penemuan jenazah, kebakaran/ledakan yang dicurigai, laka lantas berat) atau disebut sidik jari, identifikasi korban, olah TKP.
  * "Basarnas": bila perlu operasi pencarian dan pertolongan (orang hilang, tenggelam, korban tertimbun/terjebak, banjir atau longsor dengan korban, kecelakaan besar). 
  Bila teks menyebut satuan tersebut terlibat, masukkan juga. Jangan memilih satuan yang tidak relevan.`
    : `- "korban", "saksi", "fakta_fakta", "penangkapan_tersangka", "keterangan_tersangka", dan "barang_bukti" adalah ARRAY string; satu butir per elemen, TANPA awalan "a." / "b." (nomor huruf ditambahkan otomatis). Bila tidak ada informasi, isi dengan array berisi satu elemen "${KOSONG}".
- "waktu" adalah periode perkembangan, contoh: "1 s.d. 7 Oktober 2026" atau satu tanggal bila hanya satu hari.
- "dasar" memuat nomor Laporan Polisi / laporan gangguan sebelumnya beserta tanggalnya bila disebut.
- "fakta_fakta" berisi perkembangan terkini (situasi, keterangan saksi, barang bukti baru). "penangkapan_tersangka" khusus penangkapan (tanggal & lokasi). "keterangan_tersangka" berisi peran, pengakuan, dan hasil pengembangan.
- "korban" dan "saksi": satu orang per elemen, sertakan nama (atau inisial), umur, pekerjaan, dan alamat sejauh disebut di teks. "barang_bukti": satu barang per elemen (jenis, merek/nomor, jumlah) yang telah disita/diamankan.`;

  return `Anda adalah asisten AI penyusun ${nama} untuk Polrestabes Semarang, berbahasa Indonesia baku kepolisian (formal, ringkas, lugas).
Tugas Anda: membaca SATU teks panjang dari pengguna (bisa berupa kronologi, catatan lapangan, atau pesan WhatsApp yang bercampur), lalu mengelompokkan isinya ke kolom-kolom laporan.

Tanggal hari ini: ${hariIni} (zona waktu WIB). Gunakan untuk menafsirkan kata seperti "hari ini", "tadi malam", "kemarin".

ATURAN:
- Gunakan HANYA fakta yang ada di teks pengguna. DILARANG mengarang nama, angka, waktu, alamat, atau pasal. Bila suatu kolom tidak disebut di teks, isi persis "${KOSONG}".
- Tulis ulang ke bahasa baku resmi; jangan menyalin bahasa percakapan. Pertahankan nama orang, tempat, nominal uang, dan nomor laporan persis seperti di teks.
- Jangan memakai format markdown (tanpa tanda bintang, pagar, atau backtick) di dalam nilai.
- Tiap nilai ringkas dan padat. Uraian boleh beberapa kalimat, tetapi tanpa pengulangan antar kolom.
${aturanKhusus}

Kembalikan HANYA objek JSON valid dengan skema berikut (semua kunci wajib ada):
${isSegera ? SKEMA_SEGERA : SKEMA_KEMAJUAN}

ATURAN FORMAT JSON:
1. Jangan pakai baris baru fisik di dalam nilai string; tulis baris baru sebagai \\n.
2. Jangan pakai tanda kutip ganda mentah (") di dalam nilai string; pakai tanda kutip tunggal (').`;
}

// Nilai teks: buang markup yang bentrok dengan tebal-WhatsApp, rapikan spasi, kosong -> "NIHIL".
function teks(v: unknown): string {
  if (typeof v !== "string") return KOSONG;
  const bersih = v
    .replace(/\*+/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  return !bersih || POLA_KOSONG.test(bersih) ? KOSONG : bersih;
}

// Daftar bersub-huruf: a. ..., b. ...
function daftarHuruf(v: unknown): string {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
  const item = arr
    .map((x) => teks(x).replace(/^[a-z][.)]\s+/i, ""))
    .filter((x) => x !== KOSONG);
  if (item.length === 0) return `a. ${KOSONG}`;
  return item.map((x, i) => `${String.fromCharCode(97 + (i % 26))}. ${x}`).join("\n");
}

const SATUAN_WAJIB = "Polsek Tembalang";
const SATUAN_OPSIONAL = [
  { nama: "BPBD", kunci: "bpbd" },
  { nama: "Inafis Polrestabes Semarang", kunci: "inafis" },
  { nama: "Basarnas", kunci: "basarnas" },
];

// Satuan penanganan (Laporan Segera no. 13): Polsek Tembalang selalu ada; BPBD / Inafis / Basarnas
// ditambahkan hanya bila dipilih AI. Nama dikanonkan dari daftar tetap, urutan selalu sama.
function daftarSatuan(v: unknown): string {
  const dipilih = (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).map((x) => String(x).toLowerCase());
  const satuan = [SATUAN_WAJIB, ...SATUAN_OPSIONAL.filter((o) => dipilih.some((d) => d.includes(o.kunci))).map((o) => o.nama)];
  if (satuan.length === 1) return satuan[0];
  return satuan.map((x, i) => `${String.fromCharCode(97 + i)}. ${x}`).join("\n");
}

export function salamWaktu(now: Date = new Date()): string {
  const jam = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(now)
  );
  if (jam < 11) return "Selamat Pagi";
  if (jam < 15) return "Selamat Siang";
  if (jam < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function renderLaporanWa(type: WaTemplateType, data: Record<string, any>, now: Date = new Date()): string {
  const salam = `${salamWaktu(now)},`;

  if (type === "wa-segera-kamtibmas") {
    return `${KEPALA}

${salam}

Mohon ijin bersama ini kami kirimkan Laporan Segera gangguan Kamtibmas ${teks(data.ringkasan_gangguan)} dengan rincian sebagai berikut:

1. *Jenis Gangguan Kamtibmas:*
${teks(data.jenis_gangguan)}

2. *Waktu:*
a. Waktu Kejadian: ${teks(data.waktu_kejadian)}
b. Waktu Dilaporkan: ${teks(data.waktu_dilaporkan)}
c. Waktu Mendatangi TKP: ${teks(data.waktu_mendatangi_tkp)}

3. *Tempat Kejadian:*
${teks(data.tempat_kejadian)}

4. *Modus Operandi:*
${teks(data.modus_operandi)}

5. *Korban:*
${teks(data.korban)}

6. *Uraian Singkat Kejadian:*
${teks(data.uraian_singkat)}

7. *Pelaku:*
${teks(data.pelaku)}

8. *Saksi-Saksi:*
${teks(data.saksi)}

9. *Motif:*
${teks(data.motif)}

10. *Alat Yang Digunakan:*
${teks(data.alat_digunakan)}

11. *Kerugian:*
${teks(data.kerugian)}

12. *Bukti Yang Dapat Disita:*
${teks(data.bukti_disita)}

13. *Kesatuan Yang Menangani:*
${daftarSatuan(data.satuan_tambahan)}

14. *Tindakan Kepolisian:*
${teks(data.tindakan_kepolisian)}

15. *Keterangan Lain:*
${teks(data.keterangan_lain)}

${PENUTUP}`;
  }

  return `${KEPALA}

Perihal : ${teks(data.perihal)}

${salam}

Mohon ijin bersama ini kami kirimkan Laporan Kemajuan/Perkembangan penanganan kasus/perkara gangguan Kamtibmas ${teks(data.jenis_gangguan)} dengan rincian sebagai berikut:

1. *Dasar:* ${teks(data.dasar)}
2. *Perkara/Peristiwa:* ${teks(data.perkara)}
3. *Waktu:* ${teks(data.waktu)}
4. *Tempat Kejadian:* ${teks(data.tempat_kejadian)}
5. *Korban:*
${daftarHuruf(data.korban)}
6. *Saksi-Saksi:*
${daftarHuruf(data.saksi)}
7. *Uraian Singkat Kejadian:* ${teks(data.uraian_singkat)}
8. *Fakta-Fakta / Perkembangan Terkini:*
${daftarHuruf(data.fakta_fakta)}
9. *Penangkapan Tersangka:*
${daftarHuruf(data.penangkapan_tersangka)}
10. *Keterangan Tersangka:*
${daftarHuruf(data.keterangan_tersangka)}
11. *Barang Bukti:*
${daftarHuruf(data.barang_bukti)}
12. *Modus Operandi:* ${teks(data.modus_operandi)}
13. *Motif:* ${teks(data.motif)}
14. *Alat Yang Digunakan:* ${teks(data.alat_digunakan)}
15. *Kerugian:* ${teks(data.kerugian)}
16. *Kesatuan Yang Menangani:* ${teks(data.kesatuan_menangani)}

${PENUTUP}`;
}
