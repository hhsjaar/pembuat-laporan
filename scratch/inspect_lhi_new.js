const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function inspectTemplate(filepath) {
  console.log(`\n==================================================`);
  console.log(`Inspecting file: ${filepath}`);
  console.log(`==================================================`);
  
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return;
  }
  
  const content = fs.readFileSync(filepath, 'binary');
  const zip = new PizZip(content);
  const docXml = zip.files['word/document.xml'].asText();
  
  // Find all text matches inside w:t tags to print text content
  const textMatches = [];
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = wtRegex.exec(docXml)) !== null) {
    textMatches.push(match[1]);
  }
  
  console.log("--- Extracted Text (first 40 lines) ---");
  console.log(textMatches.filter(t => t.trim() !== "").slice(0, 40).join("\n"));
  
  console.log("\n--- Extracted Placeholders ({{...}}) ---");
  const cleanedXml = docXml.replace(/<[^>]+>/g, ''); // strip XML tags to inspect raw text for placeholders
  const placeholderRegex = /\{\{[^}]+\}\}/g;
  const placeholders = cleanedXml.match(placeholderRegex) || [];
  console.log("Placeholders found:", [...new Set(placeholders)]);
}

const projDir = path.join(__dirname, '..');
inspectTemplate(path.join(projDir, 'templates', 'laporan-harian-intelijen.docx'));
inspectTemplate(path.join(projDir, 'laporanharian', 'lapharbaru1.docx'));
inspectTemplate(path.join(projDir, 'laporanharian', 'lapharbaru2.docx'));
inspectTemplate(path.join(projDir, 'laporanharian', 'laphar.docx'));
