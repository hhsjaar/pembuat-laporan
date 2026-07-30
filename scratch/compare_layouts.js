const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function getParagraphs(filepath) {
  if (!fs.existsSync(filepath)) {
    return [`File not found: ${filepath}`];
  }
  const content = fs.readFileSync(filepath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  const wtRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gs;
  const paragraphs = [];
  let match;
  while ((match = wtRegex.exec(docXml)) !== null) {
    const pContent = match[1];
    // extract text from w:t tags
    const wtRegexInner = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    let pText = "";
    while ((tMatch = wtRegexInner.exec(pContent)) !== null) {
      pText += tMatch[1];
    }
    paragraphs.push(pText);
  }
  return paragraphs.map(p => p.trim()).filter(p => p !== "");
}

const projDir = path.join(__dirname, '..');
const templateP = getParagraphs(path.join(projDir, 'templates', 'laporan-harian-intelijen.docx'));
const ref1P = getParagraphs(path.join(projDir, 'laporanharian', 'lapharbaru1.docx'));
const ref2P = getParagraphs(path.join(projDir, 'laporanharian', 'lapharbaru2.docx'));

console.log("\n=================== TEMPLATE (laporan-harian-intelijen.docx) paragraphs 100-180 ===================");
console.log(templateP.slice(100, 180).map((p, idx) => `${idx + 101}: ${p}`));

console.log("\n=================== REFERENCE 1 (lapharbaru1.docx) paragraphs 100-180 ===================");
console.log(ref1P.slice(100, 180).map((p, idx) => `${idx + 101}: ${p}`));

console.log("\n=================== REFERENCE 2 (lapharbaru2.docx) paragraphs 100-180 ===================");
console.log(ref2P.slice(100, 180).map((p, idx) => `${idx + 101}: ${p}`));
