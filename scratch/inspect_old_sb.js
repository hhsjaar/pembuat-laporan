const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const filepath = path.join(__dirname, '..', 'laporanharian', 'laphar.docx');
const content = fs.readFileSync(filepath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
let match;
let count = 0;
while ((match = pRegex.exec(docXml)) !== null) {
  const pContent = match[0];
  const wtRegexInner = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tMatch;
  let pText = "";
  while ((tMatch = wtRegexInner.exec(pContent)) !== null) {
    pText += tMatch[1];
  }
  
  if (pText.includes("Sosial Budaya") || pText.includes("Sosbud")) {
    console.log(`Paragraph ${++count}: "${pText}"`);
  }
}
