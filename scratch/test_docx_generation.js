const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Mock data matching the Gemini response
const mockReportData = {
  "nomor_laporan": "R/LHI/205/VII/REN.4.1.1./2026/Intelkam",
  "hari": "Kamis",
  "tanggal": "23 Juli 2026",
  "pendahuluan_politik": "Situasi politik nasional pada Juli 2026 berada dalam fase konsolidasi pemerintahan Presiden Prabowo Subianto pasca-Pemilu 2024, dengan isu utama berkisar pada polemik parliamentary threshold dalam pembahasan RUU Pemilu yang akan dimulai Juli–Agustus 2026, serta tekanan dari aksi penyampaian aspirasi elemen mahasiswa dan buruh yang menuntut hapus outsourcing dan revisi UU Sisdiknas. Di tingkat daerah, koordinasi unsur Forkopimda dioptimalkan sesudah May Day 2026 untuk mengantisipasi dinamika protes buruh. Secara umum, situasi politik domestik tetap aman, tertib, dan kondusif meskipun terdapat dinamika politik yang intens.",
  "pendahuluan_sosbud": "Kehidupan sosial budaya masyarakat, termasuk interaksi di lingkungan civitas akademika, berjalan harmonis dengan toleransi yang terjaga baik. Potensi kerentanan yang diwaspadai saat ini adalah penyebaran hoaks dan provokasi isu sensitif melalui media sosial yang dapat memicu gesekan horizontal. Pendekatan persuasif yang melibatkan tokoh masyarakat serta tokoh agama terus dikedepankan sebagai upaya menangkal polarisasi dan menjaga stabilitas sosial.",
  "pendahuluan_ekonomi": "Kondisi ekonomi secara umum relatif stabil dengan pertumbuhan 5,61% (yoy) pada Triwulan II-2026, yang merupakan capaian tertinggi dalam 13 tahun untuk periode kuartal pertama. Inflasi terkendali di 3,34% dan konsumsi rumah tangga tumbuh 5,52%, namun fluktuasi nilai tukar (rupiah melemah ke Rp17.988/USD) dan potensi tekanan biaya hidup tetap memerlukan pengawasan karena dapat memengaruhi daya beli masyarakat, terutama kalangan buruh dan mahasiswa. Langkah pengendalian inflasi dan operasi pasar terus dilakukan untuk mengantisipasi potensi kerawanan sosial akibat tekanan ekonomi.",
  "pendahuluan_keamanan": "Situasi kamtibmas secara umum kondusif, namun deteksi dini terhadap gangguan jalanan kelompok remaja pada malam hari tetap diintensifkan. Di sisi lain, kewaspadaan terhadap ancaman terorisme tetap menjadi prioritas utama di mana penyebaran paham radikal kini masif memanfaatkan algoritma media sosial dan game online untuk mendoktrin anak-anak serta generasi muda secara mandiri.",
  "fakta_sosial_politik": "Pada hari Kamis, tanggal 23 Juli 2026 kegiatan maupun kejadian menonjol NIHIL.",
  "fakta_sosial_ekonomi_intro": "Berdasarkan hasil pemantauan dan monitoring ketersediaan serta perkembangan harga bahan pokok penting (bapokting) yang dilakukan oleh unit intelkam di beberapa pasar tradisional wilayah hukum Polsek Tembalang, khususnya Pasar Kedungmundu dan Pasar Meteseh pada Kamis, 23 Juli 2026, secara umum harga-harga komoditas pangan utama relatif stabil dan pasokan berada dalam kondisi aman untuk memenuhi kebutuhan masyarakat sehari-hari.",
  "beras_kemarin": "Rp. 12.500/Kg",
  "beras_hari_ini": "Rp. 12.500/Kg",
  "beras_selisih": "0",
  "kedelai_kemarin": "Rp. 15.000/Kg",
  "kedelai_hari_ini": "Rp. 15.000/Kg",
  "kedelai_selisih": "0",
  "cabai_merah_kemarin": "Rp. 40.000/Kg",
  "cabai_merah_hari_ini": "Rp. 40.000/Kg",
  "cabai_merah_selisih": "0",
  "cabai_rawit_kemarin": "Rp. 42.000/Kg",
  "cabai_rawit_hari_ini": "Rp. 42.000/Kg",
  "cabai_rawit_selisih": "0",
  "cabai_tampar_kemarin": "Rp. 37.000/Kg",
  "cabai_tampar_hari_ini": "Rp. 37.000/Kg",
  "cabai_tampar_selisih": "0",
  "bawang_merah_kemarin": "Rp. 49.000/Kg",
  "bawang_merah_hari_ini": "Rp. 49.000/Kg",
  "bawang_merah_selisih": "0",
  "bawang_putih_kemarin": "Rp. 35.000/Kg",
  "bawang_putih_hari_ini": "Rp. 35.000/Kg",
  "bawang_putih_selisih": "0",
  "jagung_kemarin": "Rp. 8.000/Kg",
  "jagung_hari_ini": "Rp. 8.000/Kg",
  "jagung_selisih": "0",
  "gula_kemarin": "Rp. 18.000/Kg",
  "gula_hari_ini": "Rp. 18.000/Kg",
  "gula_selisih": "0",
  "minyak_kemarin": "Rp. 15.700/Liter",
  "minyak_hari_ini": "Rp. 15.700/Liter",
  "minyak_selisih": "0",
  "terigu_kemarin": "Rp. 12.000/Kg",
  "terigu_hari_ini": "Rp. 12.000/Kg",
  "terigu_selisih": "0",
  "daging_sapi_kemarin": "Rp. 130.000/Kg",
  "daging_sapi_hari_ini": "Rp. 130.000/Kg",
  "daging_sapi_selisih": "0",
  "daging_ayam_kemarin": "Rp. 30.000/Kg",
  "daging_ayam_hari_ini": "Rp. 30.000/Kg",
  "daging_ayam_selisih": "0",
  "telur_kemarin": "Rp. 27.000/Kg",
  "telur_hari_ini": "Rp. 27.000/Kg",
  "telur_selisih": "0",
  "garam_kemarin": "Rp. 2.600 (250g)",
  "garam_hari_ini": "Rp. 2.600 (250g)",
  "garam_selisih": "0",
  "lpg_kemarin": "Rp. 22.000/Kg",
  "lpg_hari_ini": "Rp. 22.000/Kg",
  "lpg_selisih": "0",
  "fakta_sosial_budaya": "Pada hari Kamis, tanggal 23 Juli 2026, terpantau beberapa kegiatan kemasyarakatan di wilayah hukum Polsek Tembalang sebagai berikut:\n1. Kegiatan monitoring dan pengamanan ibadah kebaktian/misa bertempat di Gereja Kristen Indonesia (GKI) Tembalang, Jl. Mulawarman Raya No. 1A. Kegiatan tersebut dihadiri oleh sekitar 150 jemaat dengan pengamanan dipimpin langsung oleh Aiptu Sutrisno.\n2. Kegiatan Rapat Koordinasi Organisasi Kemasyarakatan (Ormas) Pemuda Pancasila tingkat Kecamatan Tembalang bertempat di Aula Kecamatan Tembalang. Kegiatan ini dihadiri oleh sekitar 50 orang anggota dan dipimpin oleh Ketua PAC PP Tembalang.",
  "kriminalitas_text": "Pada hari Kamis, tanggal 23 Juli 2026 sekitar pukul 10.00 WIB, telah terjadi tindak pidana pencurian kendaraan bermotor (curanmor) roda dua di Perumahan Graha Estetika, Kecamatan Tembalang. Korban diketahui atas nama Budi Santoso, dengan kerugian materiil berupa 1 unit sepeda motor merk Honda Vario yang ditaksir senilai Rp 20.000.000,-. Kasus ini saat ini sedang dalam penanganan dan penyelidikan lebih lanjut oleh Unit Reskrim Polsek Tembalang.",
  "laka_lantas_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
  "bencana_alam_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
  "tahanan_text": "Jumlah tahanan yang berada di Rumah Tahanan (Rutan) Polsek Tembalang tercatat sebanyak 3 (tiga) orang, dengan rincian seluruhnya berjenis kelamin laki-laki (3 laki-laki, 0 perempuan) dalam keadaan sehat dan lengkap.",
  "vvip_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
  "lain_lain_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
  "tanggal_ttd": "23 Juli 2026"
};

const convertTextToOpenXml = (text, prefix = "", leftIndent = 1134) => {
  if (!text) return "";
  
  const lines = text.split(/\r?\n/);
  const escapedLines = lines.map((line) => {
    return line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  });
  
  let xml = "";
  const fontFamily = "Arial Narrow";
  const fontSize = "24";
  
  const fontXml = `<w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}" w:eastAsia="${fontFamily}"/>`;
  const szXml = `<w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`;
  const rPrXml = `<w:rPr>${fontXml}${szXml}</w:rPr>`;
  const pPrRPrXml = `<w:rPr>${fontXml}${szXml}</w:rPr>`;
  
  for (let i = 0; i < escapedLines.length; i++) {
    const line = escapedLines[i];
    
    if (i === 0 && prefix) {
      xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}" w:hanging="567"/><w:jc w:val="both"/>${pPrRPrXml}</w:pPr><w:r>${rPrXml}<w:t xml:space="preserve">${prefix}</w:t><w:tab/><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
    } else if (line.trim() === "") {
      xml += `<w:p><w:pPr><w:spacing w:after="120"/>${pPrRPrXml}</w:pPr></w:p>`;
    } else {
      xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}"/><w:jc w:val="both"/>${pPrRPrXml}</w:pPr><w:r>${rPrXml}<w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
    }
  }
  return xml;
};

const cleanXmlTags = (xml) => {
  let result = "";
  let inBraces = 0;
  let i = 0;
  
  while (i < xml.length) {
    const char = xml[i];
    if (char === "{") {
      inBraces++;
      result += char;
      i++;
    } else if (char === "}") {
      inBraces--;
      if (inBraces < 0) inBraces = 0;
      result += char;
      i++;
    } else if (inBraces > 0) {
      if (char === "<") {
        while (i < xml.length && xml[i] !== ">") {
          i++;
        }
        if (i < xml.length) {
          i++; // skip >
        }
      } else {
        result += char;
        i++;
      }
    } else {
      result += char;
      i++;
    }
  }
  return result;
};

// Main execution simulation
const templatePath = path.join(__dirname, "..", "templates", "laporan-harian-intelijen.docx");
const content = fs.readFileSync(templatePath, "binary");
const zip = new PizZip(content);

let docXml = zip.files["word/document.xml"].asText();
docXml = cleanXmlTags(docXml);

const otherFields = [
  "pendahuluan_politik", "pendahuluan_sosbud", "pendahuluan_ekonomi", "pendahuluan_keamanan",
  "fakta_sosial_politik", "fakta_sosial_ekonomi_intro", "fakta_sosial_budaya",
  "kriminalitas_text", "laka_lantas_text", "bencana_alam_text", "tahanan_text", "vvip_text", "lain_lain_text"
];

otherFields.forEach((field) => {
  const regex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
  docXml = docXml.replace(regex, `{{@${field}}}`);
});

zip.file("word/document.xml", docXml);

const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: {
    start: "{{",
    end: "}}"
  }
});

const renderData = {
  ...mockReportData,
  pendahuluan_politik: convertTextToOpenXml(mockReportData.pendahuluan_politik, "", 1134),
  pendahuluan_sosbud: convertTextToOpenXml(mockReportData.pendahuluan_sosbud, "", 1134),
  pendahuluan_ekonomi: convertTextToOpenXml(mockReportData.pendahuluan_ekonomi, "", 1134),
  pendahuluan_keamanan: convertTextToOpenXml(mockReportData.pendahuluan_keamanan, "", 1134),
  fakta_sosial_politik: convertTextToOpenXml(mockReportData.fakta_sosial_politik, "", 1701),
  fakta_sosial_ekonomi_intro: convertTextToOpenXml(mockReportData.fakta_sosial_ekonomi_intro, "", 1701),
  fakta_sosial_budaya: convertTextToOpenXml(mockReportData.fakta_sosial_budaya, "", 1701),
  kriminalitas_text: convertTextToOpenXml(mockReportData.kriminalitas_text, "", 2268),
  laka_lantas_text: convertTextToOpenXml(mockReportData.laka_lantas_text, "", 2268),
  bencana_alam_text: convertTextToOpenXml(mockReportData.bencana_alam_text, "", 2268),
  tahanan_text: convertTextToOpenXml(mockReportData.tahanan_text, "", 1701),
  vvip_text: convertTextToOpenXml(mockReportData.vvip_text, "", 1701),
  lain_lain_text: convertTextToOpenXml(mockReportData.lain_lain_text, "", 1701)
};

try {
  doc.render(renderData);
  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  
  const outPath = path.join(__dirname, "test_generated_lhi.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Successfully generated test document at:", outPath);
  
  // Now read it back and extract text to check if the placeholders were replaced or are empty!
  const outContent = fs.readFileSync(outPath, 'binary');
  const outZip = new PizZip(outContent);
  const outDocXml = outZip.files['word/document.xml'].asText();
  
  const textMatches = [];
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = wtRegex.exec(outDocXml)) !== null) {
    textMatches.push(match[1]);
  }
  
  console.log("--- Extracted text from generated file (first 40 lines) ---");
  console.log(textMatches.filter(t => t.trim() !== "").slice(0, 40).join("\n"));
  
} catch (error) {
  console.error("Error during rendering:", error);
}
