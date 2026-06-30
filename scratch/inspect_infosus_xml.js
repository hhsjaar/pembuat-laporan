const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const refPath = path.join(__dirname, '..', 'infosus', 'referensi.docx');
const content = fs.readFileSync(refPath, 'binary');
const zip = new PizZip(content);
const docXml = zip.files['word/document.xml'].asText();

console.log('Total document length:', docXml.length);

const keys = [
  'DITEMUKAN ORANG MENINGGAL',
  '30 April 2026',
  '30 MEI 2026',
  'FAKTA',
  'Pada hari Kamis tanggal 30',
  'Sebab kematian adalah bekap',
  'CATATAN',
  'Analisa',
  'Hasil otopsi menunjukkan',
  'Prediksi',
  'Berpotensi menimbulkan',
  'Langkah',
  'Mendatangi TKP',
  'Rekomendasi',
  'Percepatan pengungkapan',
  'UNITINTELKAM'
];

keys.forEach(k => {
  const index = docXml.indexOf(k);
  if (index !== -1) {
    console.log(`Key "${k}" found at index ${index}`);
    // Print a small window around it to see structure
    const start = Math.max(0, index - 80);
    const end = Math.min(docXml.length, index + k.length + 80);
    console.log('  Context:', docXml.substring(start, end).replace(/\s+/g, ' '));
  } else {
    // Try word-by-word if not found as a whole string (due to XML tags)
    console.log(`Key "${k}" not found directly.`);
    const firstWord = k.split(' ')[0];
    const wordIndex = docXml.indexOf(firstWord);
    if (wordIndex !== -1) {
      console.log(`  First word "${firstWord}" found at index ${wordIndex}`);
      const start = Math.max(0, wordIndex - 80);
      const end = Math.min(docXml.length, wordIndex + 200);
      console.log('    Context:', docXml.substring(start, end).replace(/\s+/g, ' '));
    }
  }
});
