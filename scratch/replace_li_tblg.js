const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
if (!fs.existsSync(templatePath)) {
  console.error("Template file not found!");
  process.exit(1);
}

console.log("Reading template...");
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
let docXml = zip.files['word/document.xml'].asText();

if (docXml.includes('Li_TBLG')) {
  console.log("Found 'Li_TBLG'. Replacing it with 'LI Cengli'...");
  docXml = docXml.replace(/Li_TBLG/g, 'LI Cengli');
  zip.file('word/document.xml', docXml);
  
  console.log("Saving new docx template...");
  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  
  fs.writeFileSync(templatePath, buffer);
  console.log("Successfully updated template!");
} else {
  console.log("'Li_TBLG' not found in template. Maybe it was already replaced?");
}
