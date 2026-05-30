const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files["word/document.xml"].asText();

console.log("Searching for all <w:t> elements with braces...");
const tMatches = docXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];

tMatches.forEach((tXml, idx) => {
  if (tXml.includes('{') || tXml.includes('}')) {
    console.log(`[${idx}]: ${tXml}`);
  }
});
