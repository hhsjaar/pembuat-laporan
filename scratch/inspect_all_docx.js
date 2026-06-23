const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function inspectAllOccurrences(filename, searchQuery) {
  const templatePath = path.join(__dirname, '..', 'templates', filename);
  if (!fs.existsSync(templatePath)) {
    console.log(`File not found: ${filename}`);
    return;
  }
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  let index = 0;
  let count = 0;
  while ((index = docXml.indexOf(searchQuery, index)) !== -1) {
    count++;
    console.log(`\n--- [${count}] Found "${searchQuery}" in ${filename} at index ${index} ---`);
    console.log(docXml.substring(Math.max(0, index - 100), Math.min(docXml.length, index + searchQuery.length + 150)));
    index += searchQuery.length;
  }
  if (count === 0) {
    console.log(`\n"${searchQuery}" not found in ${filename}`);
  }
}

inspectAllOccurrences('laporan-informasi.docx', 'Pelapor');
inspectAllOccurrences('laporan-informasi.docx', 'PELAPOR');
inspectAllOccurrences('laporan-harian-khusus.docx', 'SATUAN');
inspectAllOccurrences('laporan-harian-khusus.docx', 'Unit');
inspectAllOccurrences('laporan-harian-khusus.docx', 'UNIT');
inspectAllOccurrences('laporan-harian-khusus.docx', 'IK');
