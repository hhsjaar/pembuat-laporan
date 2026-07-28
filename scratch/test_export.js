const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

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
          i++;
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

function runTest() {
  const reportData = {
    "nomor_laporan": "R/LHI/205/VII/REN.4.1.1./2026/Intelkam",
    "hari": "Kamis",
    "tanggal": "23 Juli 2026",
    "pendahuluan_politik": "Situasi politik nasional pada Juli 2026...",
    "pendahuluan_sosbud": "Kehidupan sosial budaya masyarakat...",
    "pendahuluan_ekonomi": "Kondisi ekonomi secara umum...",
    "pendahuluan_keamanan": "Situasi kamtibmas secara umum...",
    "fakta_sosial_politik": "Pada hari Kamis, tanggal 23 Juli 2026 kegiatan maupun kejadian menonjol NIHIL.",
    "fakta_sosial_ekonomi_intro": "Berdasarkan hasil pemantauan...",
    "beras_kemarin": "Rp. 12.500/Kg",
    "beras_hari_ini": "Rp. 12.500/Kg",
    "beras_selisih": "-",
    "fakta_sosial_budaya": "Pada hari Kamis, tanggal 23 Juli 2026, telah dilaksanakan monitoring dan pengamanan terhadap beberapa kegiatan kemasyarakatan di wilayah hukum Polsek Tembalang, antara lain:\n1. Monitoring dan pengamanan kegiatan ibadah Kebaktian/Misa Hari Minggu bertempat di Gereja Kristen Indonesia (GKI) Tembalang Jl. Mulawarman Raya No. 1A, yang dihadiri oleh sekitar 150 jemaat. Pengamanan dipimpin oleh Aiptu Sutrisno.\n2. Kegiatan Rapat Koordinasi Ormas Pemuda Pancasila tingkat Kecamatan Tembalang bertempat di Aula Kecamatan Tembalang, dihadiri 50 orang dipimpin oleh ketua PAC PP Tembalang.",
    "kriminalitas_text": "Pada hari Kamis tanggal 23 Juli 2026 pukul 10.00 WIB di Perumahan Graha Estetika Kec. Tembalang telah terjadi tindak pidana pencurian kendaraan bermotor (curanmor) roda dua. Korban atas nama Budi Santoso, dengan kerugian berupa 1 unit sepeda motor Honda Vario yang ditaksir senilai Rp 20.000.000.",
    "laka_lantas_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
    "bencana_alam_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
    "tahanan_text": "Jumlah tahanan di Rutan Polsek Tembalang saat ini tercatat sebanyak 3 orang, dengan rincian seluruhnya berjenis kelamin laki-laki (3 laki-laki, 0 perempuan).",
    "vvip_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
    "lain_lain_text": "Pada hari Kamis, tanggal 23 Juli 2026 tidak ada kejadian menonjol yang dapat dilaporkan.",
    "tanggal_ttd": "23 Juli 2026"
  };

  const templatePath = path.join(__dirname, "..", "templates", "laporan-harian-intelijen.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  let docXml = zip.files["word/document.xml"].asText();

  docXml = cleanXmlTags(docXml);

  const otherFields = ["pendahuluan_politik", "pendahuluan_sosbud", "pendahuluan_ekonomi", "pendahuluan_keamanan", "fakta_sosial_budaya", "kriminalitas_text", "laka_lantas_text", "bencana_alam_text", "tahanan_text", "vvip_text", "lain_lain_text"];
  otherFields.forEach((field) => {
    const regex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
    docXml = docXml.replace(regex, `{{@${field}}}`);
  });

  zip.file("word/document.xml", docXml);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" }
  });

  const renderData = {
    ...reportData,
    pendahuluan_politik: convertTextToOpenXml(reportData.pendahuluan_politik, "", 1134),
    pendahuluan_sosbud: convertTextToOpenXml(reportData.pendahuluan_sosbud, "", 1134),
    pendahuluan_ekonomi: convertTextToOpenXml(reportData.pendahuluan_ekonomi, "", 1134),
    pendahuluan_keamanan: convertTextToOpenXml(reportData.pendahuluan_keamanan, "", 1134),
    fakta_sosial_budaya: convertTextToOpenXml(reportData.fakta_sosial_budaya, "", 1701),
    kriminalitas_text: convertTextToOpenXml(reportData.kriminalitas_text, "", 2268),
    laka_lantas_text: convertTextToOpenXml(reportData.laka_lantas_text, "", 2268),
    bencana_alam_text: convertTextToOpenXml(reportData.bencana_alam_text, "", 2268),
    tahanan_text: convertTextToOpenXml(reportData.tahanan_text, "", 1701),
    vvip_text: convertTextToOpenXml(reportData.vvip_text, "", 1701),
    lain_lain_text: convertTextToOpenXml(reportData.lain_lain_text, "", 1701),
  };

  doc.render(renderData);

  const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  const outputPath = path.join(__dirname, "test_rendered_lhi.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log("Success! Rendered file written to scratch/test_rendered_lhi.docx");
}

runTest();
