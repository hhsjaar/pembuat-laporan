const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function dumpDocxText(filepath, outputTextPath) {
  console.log(`Dumping ${filepath} to ${outputTextPath}...`);
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return;
  }
  
  const content = fs.readFileSync(filepath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  let output = [];
  const regex = /<(w:p|w:tbl)[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(docXml)) !== null) {
    const type = match[1];
    const innerXml = match[2];
    
    if (type === 'w:p') {
      let pText = '';
      const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tMatch;
      while ((tMatch = wtRegex.exec(innerXml)) !== null) {
        pText += tMatch[1];
      }
      if (pText.trim() !== '') {
        output.push(`[P] ${pText}`);
      } else {
        output.push(`[EMPTY P]`);
      }
    } else if (type === 'w:tbl') {
      output.push(`[TABLE START]`);
      const trRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
      let trMatch;
      while ((trMatch = trRegex.exec(innerXml)) !== null) {
        let rowText = [];
        const tcRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
        let tcMatch;
        while ((tcMatch = tcRegex.exec(trMatch[1])) !== null) {
          let cellText = '';
          const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
          let tMatch;
          while ((tMatch = wtRegex.exec(tcMatch[1])) !== null) {
            cellText += tMatch[1];
          }
          rowText.push(cellText.trim());
        }
        output.push(`  [ROW] ${rowText.join(' | ')}`);
      }
      output.push(`[TABLE END]`);
    }
  }
  
  fs.writeFileSync(outputTextPath, output.join('\n'), 'utf8');
  console.log(`Finished dumping to ${outputTextPath}`);
}

const projDir = path.join(__dirname, '..');
dumpDocxText(path.join(projDir, 'laporanharian', 'lapharbaru1.docx'), path.join(projDir, 'scratch', 'lapharbaru1_dump.txt'));
dumpDocxText(path.join(projDir, 'laporanharian', 'lapharbaru2.docx'), path.join(projDir, 'scratch', 'lapharbaru2_dump.txt'));
dumpDocxText(path.join(projDir, 'templates', 'laporan-harian-intelijen.docx'), path.join(projDir, 'scratch', 'lhi_template_dump.txt'));
