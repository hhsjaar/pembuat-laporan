const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

let index = 0;
let count = 0;
const query = 'cengli';

while (true) {
  const nextIdx = docXml.toLowerCase().indexOf(query, index);
  if (nextIdx === -1) break;
  count++;
  console.log(`Found "${query}" in template at index ${nextIdx}:`);
  console.log(docXml.substring(Math.max(0, nextIdx - 100), Math.min(docXml.length, nextIdx + 200)));
  index = nextIdx + query.length;
}
console.log(`Total occurrences: ${count}`);
