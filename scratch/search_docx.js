const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatesDir = path.join(__dirname, '..', 'templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.docx'));

files.forEach(filename => {
  const filePath = path.join(templatesDir, filename);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  // Search case-insensitive
  const query = 'tblg';
  let index = 0;
  let count = 0;
  while (true) {
    const nextIdx = docXml.toLowerCase().indexOf(query, index);
    if (nextIdx === -1) break;
    count++;
    console.log(`Found "${query}" in ${filename} at index ${nextIdx}:`);
    console.log(docXml.substring(Math.max(0, nextIdx - 50), Math.min(docXml.length, nextIdx + 100)));
    index = nextIdx + query.length;
  }
  if (count > 0) {
    console.log(`Total found in ${filename}: ${count}`);
  }
});
