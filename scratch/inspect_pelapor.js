const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const index = docXml.indexOf('Pelapor', 30000); // start search from index 30000 to find the second occurrence
if (index !== -1) {
  console.log('--- XML context around Pelapor ---');
  console.log(docXml.substring(index - 500, index + 1500));
} else {
  console.log('Pelapor not found at index > 30000');
}
