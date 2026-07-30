const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const filepath = path.join(__dirname, '..', 'laporanharian', 'laphar.docx');
const content = fs.readFileSync(filepath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
const paragraphs = [];
let match;
while ((match = pRegex.exec(docXml)) !== null) {
  const pContent = match[0];
  const wtRegexInner = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tMatch;
  let pText = "";
  while ((tMatch = wtRegexInner.exec(pContent)) !== null) {
    pText += tMatch[1];
  }
  paragraphs.push(pText.trim());
}

paragraphs.forEach((p, idx) => {
  if (p.includes("Sosial Budaya")) {
    console.log(`\nContext around paragraph ${idx + 1}:`);
    for (let i = Math.max(0, idx - 3); i <= Math.min(paragraphs.length - 1, idx + 3); i++) {
      console.log(`  ${i + 1}: ${paragraphs[i]}`);
    }
  }
});
