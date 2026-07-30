const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const filepath = path.join(__dirname, '..', 'laporanharian', 'lapharbaru1.docx');
const content = fs.readFileSync(filepath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

// Find paragraphs and print their XML properties
const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
let match;
let count = 0;
while ((match = pRegex.exec(docXml)) !== null) {
  const pContent = match[0];
  // extract text from w:t tags
  const wtRegexInner = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let tMatch;
  let pText = "";
  while ((tMatch = wtRegexInner.exec(pContent)) !== null) {
    pText += tMatch[1];
  }
  
  if (pText.includes("Nasional pada Juni") || pText.includes("Kehidupan sosial budaya") || pText.includes("stabil dengan pertumbuhan") || pText.includes("kamtibmas secara umum") || pText.includes("kejadian menonjol yang dapat dilaporkan") || pText.includes("Kegiatan pemberangkatan Calon")) {
    console.log(`\n--- PARAGRAPH ${++count}: "${pText.substring(0, 60)}..." ---`);
    // Extract w:pPr
    const pPrMatch = pContent.match(/<w:pPr\b[^>]*>.*?<\/w:pPr>/s);
    if (pPrMatch) {
      console.log("w:pPr:", pPrMatch[0]);
    } else {
      console.log("No w:pPr");
    }
  }
}
