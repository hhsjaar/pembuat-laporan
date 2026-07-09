const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const docxPath = path.join(__dirname, '..', 'infosus', 'referensi.docx');
if (!fs.existsSync(docxPath)) {
  console.error("File not found at:", docxPath);
  process.exit(1);
}

const content = fs.readFileSync(docxPath, 'binary');
const zip = new PizZip(content);
const xml = zip.files['word/document.xml'].asText();

// A simple regex parser to extract paragraphs
const paragraphs = [];
const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
let pMatch;

while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/g;
  let tMatch;
  let text = '';
  while ((tMatch = tRegex.exec(pContent)) !== null) {
    text += tMatch[1];
  }
  paragraphs.push(text);
}

console.log("--- START OF TEXT ---");
paragraphs.forEach((p, i) => {
  if (p.trim()) {
    console.log(`${i}: ${p}`);
  }
});
console.log("--- END OF TEXT ---");
