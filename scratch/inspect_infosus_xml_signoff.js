const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'infosus.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

const index = docXml.indexOf('UNITINTELKAM');
if (index !== -1) {
  console.log('--- XML context around UNITINTELKAM ---');
  console.log(docXml.substring(index - 500, index + 300));
} else {
  console.log('UNITINTELKAM not found');
}
