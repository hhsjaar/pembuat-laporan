const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
let match;
console.log('--- Text tags near the end of the document ---');
while ((match = regex.exec(docXml)) !== null) {
  if (match.index > 50000) {
    console.log(`Index: ${match.index}, Text: "${match[1]}"`);
  }
}
