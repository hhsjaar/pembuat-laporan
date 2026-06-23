const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

// 1. Update laporan-harian-khusus.docx
function updateLHK() {
  const file = 'laporan-harian-khusus.docx';
  const filePath = path.join(__dirname, '..', 'templates', file);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  let docXml = zip.files['word/document.xml'].asText();
  
  const target = '<w:t xml:space="preserve">SATUAN INTELIJEN KEAMANAN </w:t>';
  const replacement = '<w:t xml:space="preserve">Unit IK</w:t>';
  
  if (docXml.includes(target)) {
    docXml = docXml.replace(target, replacement);
    zip.file('word/document.xml', docXml);
    const buffer = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, buffer);
    console.log(`Successfully updated ${file}`);
  } else {
    console.log(`Target not found in ${file}`);
  }
}

// 2. Update laporan-informasi.docx
function updateLI() {
  const file = 'laporan-informasi.docx';
  const filePath = path.join(__dirname, '..', 'templates', file);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  let docXml = zip.files['word/document.xml'].asText();
  
  const searchStr = '<w:t xml:space="preserve">Pelapor</w:t>';
  const index = docXml.indexOf(searchStr);
  
  if (index !== -1) {
    // Find the end of this paragraph
    const nextParaEnd = docXml.indexOf('</w:p>', index);
    if (nextParaEnd !== -1) {
      const insertPos = nextParaEnd + '</w:p>'.length;
      
      // Let's create a paragraph for "LI Cengli"
      // Centered, bold, same font as Pelapor (Calibri)
      const newPara = `<w:p w14:paraId="0000004C"><w:pPr><w:ind w:left="6096" w:firstLine="0"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/><w:b w:val="1"/><w:bCs w:val="1"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:cs="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri"/><w:b w:val="1"/><w:bCs w:val="1"/><w:rtl w:val="0"/></w:rPr><w:t>LI Cengli</w:t></w:r></w:p>`;
      
      docXml = docXml.substring(0, insertPos) + newPara + docXml.substring(insertPos);
      zip.file('word/document.xml', docXml);
      const buffer = zip.generate({ type: 'nodebuffer' });
      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully updated ${file}`);
    } else {
      console.log(`Could not find paragraph end after Pelapor in ${file}`);
    }
  } else {
    console.log(`Target Pelapor not found in ${file}`);
  }
}

updateLHK();
updateLI();
