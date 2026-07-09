const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'infosus.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const xml = zip.files['word/document.xml'].asText();

const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
let pMatch;
let i = 0;
while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/g;
  let tMatch;
  let text = '';
  while ((tMatch = tRegex.exec(pContent)) !== null) {
    text += tMatch[1];
  }
  if (text.includes('Semarang') || text.includes('UNIT') || text.includes('Distribusi')) {
    console.log(`Paragraph ${i} (at char ${pMatch.index}): ${text}`);
  }
  i++;
}
