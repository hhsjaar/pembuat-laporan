/**
 * Script to create the infosus.docx template from the referensi.docx
 * Extracts header/footer/styles/numbering from the reference file,
 * then replaces the body content with a clean template containing
 * docxtemplater placeholders.
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const refPath = path.join(__dirname, '..', 'infosus', 'referensi.docx');
const outputPath = path.join(__dirname, '..', 'templates', 'infosus.docx');

const content = fs.readFileSync(refPath, 'binary');
const zip = new PizZip(content);

// ─── Helper: make a simple Arial paragraph ──────────────────────────────────
function para(text, opts = {}) {
  const {
    bold = false,
    center = false,
    size = 24,         // half-points (24 = 12pt)
    underline = false,
    indent = 0,        // twips left indent
    hanging = 0,
    spaceAfter = 0,
    spaceBefore = 0,
    widowControl = true,
  } = opts;

  const jc = center ? `<w:jc w:val="center"/>` : `<w:jc w:val="both"/>`;
  const wcTag = widowControl ? '' : `<w:widowControl w:val="0"/>`;

  let indTag = '';
  if (indent || hanging) {
    indTag = `<w:ind w:left="${indent}" ${hanging ? `w:hanging="${hanging}"` : ''}/>`;
  }

  let spacingTag = '';
  if (spaceAfter || spaceBefore) {
    spacingTag = `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}"/>`;
  }

  const rFonts = `<w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/>`;
  const sz = `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  const bdTag = bold ? `<w:b/><w:bCs/>` : '';
  const ulTag = underline ? `<w:u w:val="single"/>` : '';
  const rtl = `<w:rtl w:val="0"/>`;

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<w:p><w:pPr>${wcTag}${spacingTag}${indTag}${jc}<w:rPr>${rFonts}${sz}</w:rPr></w:pPr><w:r><w:rPr>${rFonts}${sz}${bdTag}${ulTag}${rtl}</w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

// ─── Helper: empty paragraph ─────────────────────────────────────────────────
function emptyPara(spaceAfter = 0) {
  return `<w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="${spaceAfter}"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/></w:rPr></w:pPr></w:p>`;
}

// ─── Helper: raw XML placeholder for docxtemplater ───────────────────────────
function rawPlaceholder(fieldName) {
  return `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{${fieldName}}}</w:t></w:r></w:p>`;
}

// ─── Build the document body ─────────────────────────────────────────────────
// Structure based on referensi.docx paragraphs:
// [Cover page: header logo from header1.xml, then body text]
// Page 1 (cover): Unit kode, INFORMASI KHUSUS, TENTANG, perihal_judul
// Then a page break, then the actual report body.

const BODY_PARAGRAPHS = [
  // ── Cover page ──────────────────────────────────────────────────────────
  // The header1.xml already has the POLRI logo + unit name + nomor,
  // so page 1 body just has the centered title block.
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  
  // "INFORMASI KHUSUS" centered, bold, 14pt
  para('INFORMASI KHUSUS', { bold: true, center: true, size: 28 }),
  emptyPara(),
  
  // "TENTANG" centered
  para('TENTANG', { bold: false, center: true, size: 24 }),
  emptyPara(),
  
  // perihal_judul placeholder (KAPITAL)
  rawPlaceholder('perihal_judul'),
  
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),

  // "COPY KE :" row (as in the reference)
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:tabs><w:tab w:val="left" w:pos="5040"/><w:tab w:val="left" w:pos="7200"/></w:tabs><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">COPY KE :</w:t><w:tab/><w:t xml:space="preserve">DARI  :</w:t><w:tab/><w:t>COPIES</w:t></w:r></w:p>`,

  // Page break before report body
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/></w:rPr><w:br w:type="page"/></w:r></w:p>`,

  // ── Report Body (page 2+) ────────────────────────────────────────────────
  // Date line
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">TANGGAL : {{tanggal}}</w:t></w:r></w:p>`,

  emptyPara(),
  emptyPara(),

  // PERIHAL label (bold) + value on next line
  para('PERIHAL :', { bold: true, size: 24 }),
  emptyPara(),

  // perihal value (normal)
  rawPlaceholder('perihal'),

  emptyPara(),

  // FAKTA – FAKTA section
  para('FAKTA \u2013 FAKTA :', { bold: true, size: 24 }),
  emptyPara(),

  // Fakta-fakta raw XML placeholder
  rawPlaceholder('fakta_fakta'),

  emptyPara(),

  // CATATAN section
  para('CATATAN :', { bold: true, size: 24 }),
  emptyPara(),

  para('Analisa', { bold: true, size: 24 }),
  emptyPara(),
  rawPlaceholder('analisa'),
  emptyPara(),

  para('Prediksi', { bold: true, size: 24 }),
  emptyPara(),
  rawPlaceholder('prediksi'),
  emptyPara(),

  para('Langkah - langkah kepolisian :', { bold: true, size: 24 }),
  emptyPara(),
  rawPlaceholder('langkah'),
  emptyPara(),

  para('Rekomendasi :', { bold: true, size: 24 }),
  emptyPara(),
  rawPlaceholder('rekomendasi'),
  emptyPara(),
  emptyPara(),

  // Sign-off block
  // Date right-aligned
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Semarang, {{tanggal}}</w:t></w:r></w:p>`,
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:jc w:val="right"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>UNIT INTELKAM</w:t></w:r></w:p>`,

  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),
  emptyPara(),

  // Authentikasi + Distribusi (left)
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Authentikasi :.......................</w:t></w:r></w:p>`,
  emptyPara(),
  para('Distribusi :', { bold: false, size: 24 }),
  emptyPara(),
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:ind w:left="720" w:hanging="360"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kapolsek Tembalang.</w:t></w:r></w:p>`,
  `<w:p><w:pPr><w:widowControl w:val="0"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:ind w:left="720" w:hanging="360"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Kasatintelkam Polrestabes Semarang.</w:t></w:r></w:p>`,
].join('\n');

// ─── Assemble the full document XML ──────────────────────────────────────────
// Keep the existing sectPr (page margins/size) from the reference document
const refDocXml = zip.files['word/document.xml'].asText();
const sectPrMatch = refDocXml.match(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/);
const sectPr = sectPrMatch ? sectPrMatch[0] : `<w:sectPr><w:pgSz w:h="16834" w:w="11909" w:orient="portrait"/><w:pgMar w:bottom="709" w:top="636" w:left="1008" w:right="864" w:header="454" w:footer="285"/></w:sectPr>`;

const newDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink"
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
<w:body>
${BODY_PARAGRAPHS}
${sectPr}
</w:body>
</w:document>`;

zip.file('word/document.xml', newDocXml);

// Write output
const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(outputPath, output);
console.log('✅ Template infosus.docx created at:', outputPath);
console.log('   Size:', output.length, 'bytes');
