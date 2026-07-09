const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'infosus.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

let idx = 0;
while ((idx = docXml.indexOf('Semarang', idx)) !== -1) {
  console.log(`Found "Semarang" at index ${idx}`);
  console.log('  Context:', docXml.substring(idx - 100, idx + 200).replace(/\s+/g, ' '));
  idx += 8;
}
