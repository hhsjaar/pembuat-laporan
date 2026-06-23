const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const indexStart = docXml.indexOf('Pelapor');
const indexEnd = docXml.indexOf('DISTRIBUSI');

if (indexStart !== -1 && indexEnd !== -1) {
  console.log(`Extracting XML between indices ${indexStart} and ${indexEnd}`);
  const segment = docXml.substring(indexStart, indexEnd);
  console.log(segment);
} else {
  console.log('Indices not found');
}
