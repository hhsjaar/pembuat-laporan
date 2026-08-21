const puppeteer = require("puppeteer-core");
const fs = require("fs");
const { generatePdfHtml } = require("../lib/generatePdfHtml.ts");

const testData = {
  "laporan-informasi": {
    bidang: "SOSIAL POLITIK",
    perihal: "PERKEMBANGAN SITUASI KAMTIBMAS DI WILAYAH KECAMATAN TEMBALANG SEMARANG",
    "cara-mendapatkan-informasi": "Wawancara Langsung dan Observasi Lapangan",
    "waktu-mendapatkan-informasi": "Kamis, 21 Agustus 2026 pukul 09.00 WIB",
    tanggal: "21 Agustus 2026",
    isi_laporan: "1. Pada hari Kamis, tanggal 21 Agustus 2026 pukul 09.00 WIB bertempat di wilayah Tembalang Semarang telah dilaksanakan kegiatan pemantauan situasi kamtibmas.\n2. Secara umum kegiatan masyarakat berlangsung aman, tertib, dan kondusif tanpa adanya gangguan yang menonjol.",
    analisa: "Kegiatan berjalan lancar berkat koordinasi intensif antara aparat keamanan dan elemen masyarakat setempat.",
    prediksi: "Situasi diperkirakan akan tetap stabil dan kondusif dalam kurun waktu 24 jam ke depan.",
    langkah: "Melanjutkan patroli rutin dan deteksi dini di titik-titik rawan keramaian.",
    rekomendasi: "Disarankan meningkatkan koordinasi dengan tokoh masyarakat dan pengamanan swakarsa."
  },
  "laporan-harian-khusus": {
    bidang: "KEAMANAN",
    perihal: "PEMANTAUAN AKSI UNJUK RASA DI DEPAN KANTOR KECAMATAN TEMBALANG",
    judul: "PEMANTAUAN AKSI UNJUK RASA DAMAI MAHASISWA DI KECAMATAN TEMBALANG",
    tanggal: "21 Agustus 2026",
    isi_laporan: "Pada hari Kamis tanggal 21 Agustus 2026 pukul 10.00 WIB telah berlangsung aksi unjuk rasa damai mahasiswa yang menuntut perbaikan fasilitas jalan umum.\nJumlah massa sekitar 50 orang dengan penanggung jawab Sdr. Ahmad Fauzi.",
    analisa: "Aksi berlangsung damai dan tertib dengan pengawalan dari personil Polsek Tembalang.",
    prediksi: "Tidak berpotensi anarkis apabila tuntutan ditanggapi positif oleh pihak terkait.",
    langkah: "Melakukan negosiasi dan pengamanan jalur lalu lintas di sekitar lokasi.",
    rekomendasi: "Agar pihak kecamatan segera memberikan jadwal audiensi resmi."
  },
  "infosus": {
    perihal_judul: "RENCANA KEGIATAN TABLIGH AKBAR DAN PENGAJIAN UMUM DI TEMBALANG",
    perihal: "Rencana Kegiatan Tabligh Akbar di Lapangan Sambiroto",
    tanggal: "21 Agustus 2026",
    fakta_fakta: "1. Akan diselenggarakan pengajian akbar pada hari Sabtu mendatang.\n2. Diperkirakan dihadiri oleh sekitar 500 jamaah dari berbagai wilayah.",
    analisa: "Diperlukan rekayasa lalu lintas di sepanjang Jl. Sambiroto untuk menghindari kemacetan.",
    prediksi: "Potensi kepadatan arus lalu lintas tinggi pada jam kedatangan dan kepulangan jamaah.",
    langkah: "Menyiapkan kantong parkir dan penempatan personil gatur lantas.",
    rekomendasi: "Koordinasi dengan panitia pelaksana untuk menyiapkan tim medis dan keamanan mandiri."
  },
  "laporan-harian-intelijen": {
    nomor_laporan: "R/LHI/205/VIII/REN.4.1.1./2026/Intelkam",
    hari: "Kamis",
    tanggal: "21 Agustus 2026",
    pendahuluan_politik: "Situasi politik di wilayah Tembalang secara umum tetap kondusif.",
    pendahuluan_sosbud: "Kehidupan sosial budaya masyarakat berjalan normal dan harmonis.",
    pendahuluan_ekonomi: "Pasokan dan ketersediaan bahan kebutuhan pokok terpantau stabil.",
    pendahuluan_keamanan: "Situasi kamtibmas terpantau aman dan terkendali.",
    fakta_sosial_politik: "Kegiatan maupun kejadian menonjol di bidang sosial politik NIHIL.",
    fakta_sosial_ekonomi_intro: "Berdasarkan hasil pemantauan harga sembako di Pasar Meteseh:",
    beras_kemarin: "Rp 13.000",
    beras_hari_ini: "Rp 13.000",
    beras_selisih: "-",
    minyak_kemarin: "Rp 16.000",
    minyak_hari_ini: "Rp 16.500",
    minyak_selisih: "+500",
    fakta_sosial_budaya: "Kegiatan keagamaan dan kemasyarakatan berlangsung lancar.",
    kriminalitas_text: "Kejadian kriminalitas menonjol NIHIL.",
    laka_lantas_text: "Kejadian laka lantas menonjol NIHIL.",
    tahanan_text: "Jumlah tahanan 2 orang laki-laki dalam keadaan sehat.",
    bencana_alam_text: "Kejadian bencana alam NIHIL.",
    vvip_text: "Kegiatan pengamanan VVIP/VIP NIHIL.",
    lain_lain_text: "Lain-lain NIHIL.",
    tanggal_ttd: "21 Agustus 2026"
  },
  "rencana-kegiatan": {
    hari_tanggal: "JUMAT, 22 AGUSTUS 2026",
    tanggal_ttd: "22 Agustus 2026",
    jabatan_ttd: "PS. KANIT INTELKAM",
    nama_ttd: "YUDHA M.P.",
    pangkat_nrp_ttd: "AIPTU NRP 79040182",
    kegiatan_list: [
      {
        no: 1,
        waktu_lokasi: "Pukul 08.00 WIB\nWilayah Tembalang",
        kegiatan: "Monitoring giat masyarakat dan patroli dialogis",
        hasil: "Terciptanya situasi kamtibmas yang aman kondusif",
        ket: "Aiptu Sutrisno"
      },
      {
        no: 2,
        waktu_lokasi: "Pukul 11.30 WIB\nMasjid Agung Tembalang",
        kegiatan: "Pengamanan dan monitoring ibadah Sholat Jumat",
        hasil: "Ibadah berlangsung khusyuk dan tertib",
        ket: "Bripka Dani"
      }
    ]
  }
};

async function testAll() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      </head>
      <body>
        <div id="print-mount"></div>
      </body>
    </html>
  `);

  for (const [type, data] of Object.entries(testData)) {
    const rawHtml = generatePdfHtml(type, data);
    
    const pdfBase64 = await page.evaluate(async (htmlStr) => {
      const mount = document.getElementById("print-mount");
      mount.innerHTML = "";
      
      const bodyMatch = htmlStr.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const innerContent = bodyMatch ? bodyMatch[1] : htmlStr;
      const styleMatches = htmlStr.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
      const styles = styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
      
      const wrapper = document.createElement("div");
      wrapper.id = "pdf-target";
      wrapper.style.width = "750px";
      wrapper.style.padding = "24px 28px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.color = "#000000";
      wrapper.style.boxSizing = "border-box";
      wrapper.innerHTML = "<style>" + styles + "</style><div class=\"inner-wrap\">" + innerContent + "</div>";
      
      mount.appendChild(wrapper);
      await new Promise(r => setTimeout(r, 150));
      
      const opt = {
        margin: [10, 8, 10, 8],
        filename: "test.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: "#ffffff",
          windowWidth: 750
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      const out = await html2pdf().set(opt).from(wrapper).outputPdf("datauristring");
      mount.innerHTML = "";
      return out;
    }, rawHtml);

    const base64Data = pdfBase64.replace(/^data:application\/pdf;filename=[^;]+;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
    const buf = Buffer.from(base64Data, "base64");
    fs.writeFileSync(`scratch/test_fixed_${type}.pdf`, buf);
    console.log(`✓ ${type}: ${buf.length} bytes`);
  }

  await browser.close();
}

testAll().catch(console.error);
