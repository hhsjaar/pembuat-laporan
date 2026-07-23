const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function inspectXmlRegions(filename, keyword) {
  const filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  let index = 0;
  let count = 0;
  console.log(`\n=== Keyword: "${keyword}" in ${filename} ===`);
  while ((index = docXml.indexOf(keyword, index)) !== -1) {
    count++;
    console.log(`[${count}] Found at index ${index}:`);
    const start = Math.max(0, index - 80);
    const end = Math.min(docXml.length, index + keyword.length + 120);
    console.log(docXml.substring(start, end));
    index += keyword.length;
  }
}

inspectXmlRegions('laporanharian/laphar.docx', 'R/LHI');
inspectXmlRegions('laporanharian/laphar.docx', 'Hari Sabtu');
inspectXmlRegions('laporanharian/laphar.docx', 'Situasi politik');
inspectXmlRegions('laporanharian/laphar.docx', 'Training Legislative');
inspectXmlRegions('laporanharian/laphar.docx', '12.600');
inspectXmlRegions('laporanharian/laphar.docx', '19 Juli 2026');
inspectXmlRegions('ren/ren.docx', 'HARI / TANGGAL');
inspectXmlRegions('ren/ren.docx', 'Pam dan monitoring');
inspectXmlRegions('ren/ren.docx', 'YUDHA');
