const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-harian-khusus.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const index = docXml.indexOf('Authentikasi');
if (index !== -1) {
  console.log('--- XML from Authentikasi to end ---');
  console.log(docXml.substring(index - 200));
} else {
  console.log('Authentikasi not found');
}
