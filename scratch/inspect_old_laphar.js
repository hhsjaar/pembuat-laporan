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
const oldLapharP = getParagraphs(path.join(projDir, 'laporanharian', 'laphar.docx'));
console.log(`Total paragraphs in old laphar: ${oldLapharP.length}`);
console.log(oldLapharP.map((p, idx) => `${idx + 1}: ${p}`).join('\n'));
