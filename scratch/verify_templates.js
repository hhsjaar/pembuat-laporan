const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function verifyLHK() {
  const file = 'laporan-harian-khusus.docx';
  const filePath = path.join(__dirname, '..', 'templates', file);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  if (docXml.includes('Unit IK')) {
    console.log('LHK Verification PASSED: Contains "Unit IK"');
  } else {
    console.log('LHK Verification FAILED: "Unit IK" not found');
  }
}

function verifyLI() {
  const file = 'laporan-informasi.docx';
  const filePath = path.join(__dirname, '..', 'templates', file);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  if (docXml.includes('LI Cengli')) {
    console.log('LI Verification PASSED: Contains "LI Cengli"');
    const index = docXml.indexOf('LI Cengli');
    console.log('XML snippet: ', docXml.substring(index - 100, index + 200));
  } else {
    console.log('LI Verification FAILED: "LI Cengli" not found');
  }
}

verifyLHK();
verifyLI();
