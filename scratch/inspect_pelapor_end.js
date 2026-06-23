const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const index = docXml.indexOf('Pelapor', 30000);
if (index !== -1) {
  console.log('--- XML context from Pelapor to the end of document.xml ---');
  console.log(docXml.substring(index, index + 3500));
} else {
  console.log('Pelapor not found');
}
