const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const index = docXml.indexOf('w14:paraId="0000004B"');
if (index !== -1) {
  console.log('--- XML of paragraph 0000004B ---');
  console.log(docXml.substring(index, index + 3500));
} else {
  console.log('0000004B not found');
}
