const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.join(__dirname, '..', 'templates', 'infosus.docx');
const outputPath = path.join(__dirname, '..', 'scratch', 'test_infosus_rendered.docx');

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

// Preprocess as in route.ts
let docXml = zip.files['word/document.xml'].asText();
const otherFields = ["fakta_fakta", "analisa", "prediksi", "langkah", "rekomendasi"];
otherFields.forEach((field) => {
  const regex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
  docXml = docXml.replace(regex, `{{@${field}}}`);
});
zip.file('word/document.xml', docXml);

const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: {
    start: "{{",
    end: "}}"
  }
});

// Helper to convert multiline text into high-fidelity, self-contained OpenXML paragraphs
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
  for (let i = 0; i < escapedLines.length; i++) {
    const line = escapedLines[i];
    if (i === 0 && prefix) {
      xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}" w:hanging="567"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/></w:rPr><w:t xml:space="preserve">${prefix}</w:t><w:tab/><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
    } else if (line.trim() === "") {
      xml += `<w:p><w:pPr><w:spacing w:after="120"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/></w:rPr></w:pPr></w:p>`;
    } else {
      xml += `<w:p><w:pPr><w:ind w:left="${leftIndent}"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/></w:rPr><w:t xml:space="preserve">${line}</w:t></w:r></w:p>`;
    }
  }
  return xml;
};

const factsText = `Pada hari Kamis tanggal 30 April 2026 pukul 09.30 Wib Piket Fungsi Polsek Tembalang mendatangi TKP orang meninggal dunia di Embung Brown Canyon Kel. Rowosari Kec. Tembalang Kota Semarang
Korban ditemukan meninggal tergeletak tanpa identitas dengan ciri ciri : Perawakan kurus, tinggi ± 170 cm, rambut hitam, pendek, kulit sawo matang, ditemukan bekas luka di leher , lidah terjulur keluar tidak memakai busana apapun.`;

const renderData = {
  tanggal: "30 Juni 2026",
  perihal_judul: "DITEMUKAN ORANG MENINGGAL DUNIA DI EMBUNG BROWN CANYON KEL. ROWOSARI KEC. TEMBALANG KOTA SEMARANG",
  perihal: "Ditemukan Orang Meninggal Dunia Di Embung Brown Canyon Kel. Rowosari Kec. Tembalang Kota Semarang.",
  fakta_fakta: convertTextToOpenXml(factsText),
  analisa: convertTextToOpenXml("Hasil otopsi menunjukkan korban meninggal akibat bekap dan cekik, diduga kuat tindak pidana pembunuhan.\nKondisi korban tanpa busana dan tidak ditemukannya barang milik korban."),
  prediksi: convertTextToOpenXml("Berpotensi menimbulkan keresahan masyarakat.\nKasus berpotensi viral."),
  langkah: convertTextToOpenXml("Mendatangi TKP.\nMengamankan TKP."),
  rekomendasi: convertTextToOpenXml("Percepatan pengungkapan kasus.\nPeningkatan patroli.")
};

try {
  doc.render(renderData);
  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  fs.writeFileSync(outputPath, buffer);
  console.log("✅ Render test successfully created at scratch/test_infosus_rendered.docx!");
} catch (error) {
  console.error("Render failed:", error);
}
