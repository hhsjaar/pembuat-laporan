const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '..', 'templates', 'laporan-informasi.docx');
if (!fs.existsSync(templatePath)) {
  console.error("Template file not found!");
  process.exit(1);
}

const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
let docXml = zip.files['word/document.xml'].asText();

const searchStr = '<w:t>LI Cengli</w:t>';
const index = docXml.indexOf(searchStr);

if (index !== -1) {
  console.log("Found first 'LI Cengli' element. Replacing with empty text run...");
  // Replace only the first occurrence
  docXml = docXml.substring(0, index) + '<w:t></w:t>' + docXml.substring(index + searchStr.length);
  zip.file('word/document.xml', docXml);
  
  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  
  fs.writeFileSync(templatePath, buffer);
  console.log("Successfully removed first 'LI Cengli' from template!");
} else {
  console.log("First occurrence of '<w:t>LI Cengli</w:t>' not found.");
}
