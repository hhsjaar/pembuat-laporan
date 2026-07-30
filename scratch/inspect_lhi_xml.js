const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const filepath = path.join(__dirname, '..', 'templates', 'laporan-harian-intelijen.docx');
const content = fs.readFileSync(filepath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

console.log("Searching for XML around 'pendahuluan'...");
const pRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?pendahuluan.*?<\/w:p>/gs;
let match;
while ((match = pRegex.exec(docXml)) !== null) {
  console.log("--- FOUND MATCH ---");
  console.log(match[0]);
}

console.log("\nSearching for XML around 'sosial_budaya'...");
const sbRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?sosial_budaya.*?<\/w:p>/gs;
while ((match = sbRegex.exec(docXml)) !== null) {
  console.log("--- FOUND MATCH ---");
  console.log(match[0]);
}
