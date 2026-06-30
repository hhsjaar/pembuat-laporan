const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const refPath = path.join(__dirname, '..', 'infosus', 'referensi.docx');
const outputPath = path.join(__dirname, '..', 'templates', 'infosus.docx');

const content = fs.readFileSync(refPath, 'binary');
const zip = new PizZip(content);
let docXml = zip.files['word/document.xml'].asText();

function findParagraphStart(xml, index) {
  let idx = index;
  while (idx > 0) {
    const pIdx = xml.lastIndexOf('<w:p', idx);
    if (pIdx === -1) return -1;
    // Ensure it's not <w:pPr
    if (xml.substring(pIdx, pIdx + 6) !== '<w:pPr') {
      return pIdx;
    }
    idx = pIdx - 1;
  }
  return -1;
}

function findParagraphBounds(xml, searchText) {
  const index = xml.indexOf(searchText);
  if (index === -1) {
    throw new Error(`Text "${searchText}" not found in XML.`);
  }

  const startIdx = findParagraphStart(xml, index);
  if (startIdx === -1) {
    throw new Error(`Start <w:p> tag not found for "${searchText}".`);
  }

  const endIdx = xml.indexOf('</w:p>', index);
  if (endIdx === -1) {
    throw new Error(`Closing </w:p> tag not found for "${searchText}".`);
  }

  return {
    start: startIdx,
    end: endIdx + 6
  };
}

try {
  // 1. Replace Semarang, 30 April 2026 dates globally
  docXml = docXml.replace(/<w:t xml:space="preserve">Semarang, 30 April 2026<\/w:t>/g, '<w:t xml:space="preserve">Semarang, {{tanggal}}</w:t>');
  docXml = docXml.replace(/<w:t>Semarang, 30 April 2026<\/w:t>/g, '<w:t>Semarang, {{tanggal}}</w:t>');

  // 2. Replace TANGGAL : 30 MEI 2026
  docXml = docXml.replace(/<w:t xml:space="preserve">TANGGAL : 30 MEI 2026<\/w:t>/g, '<w:t xml:space="preserve">TANGGAL : {{tanggal}}</w:t>');
  docXml = docXml.replace(/<w:t>TANGGAL : 30 MEI 2026<\/w:t>/g, '<w:t>TANGGAL : {{tanggal}}</w:t>');

  // 3. Replace PERIHAL value
  docXml = docXml.replace(
    '<w:t xml:space="preserve">Ditemukan Orang Meninggal Dunia Di Embung Brown Canyon Kel. Rowosari Kec. Tembalang Kota Semarang.</w:t>',
    '<w:t xml:space="preserve">{{perihal}}</w:t>'
  );

  // 4. Replace Cover Page Title
  const pCoverStart = findParagraphBounds(docXml, 'DITEMUKAN ORANG MENINGGAL DUNIA DI EMBUNG BROWN CANYON');
  const pCoverEnd = findParagraphBounds(docXml, 'KEL. ROWOSARI KEC. TEMBALANG KOTA SEMARANG');
  
  const coverReplacement = `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:rtl w:val="0"/></w:rPr><w:t>{{perihal_judul}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pCoverStart.start) + coverReplacement + docXml.substring(pCoverEnd.end);

  // 5. Replace FAKTA-FAKTA block
  const pFactsStart = findParagraphBounds(docXml, 'Pada hari Kamis tanggal 30 April 2026 pukul 09.30 Wib');
  const pFactsEnd = findParagraphBounds(docXml, 'Pemeriksaan diatom menunggu hasil.');

  const factsReplacement = `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{fakta_fakta}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pFactsStart.start) + factsReplacement + docXml.substring(pFactsEnd.end);

  // 6. Replace Analisa block
  const pAnalisaStart = findParagraphBounds(docXml, 'Hasil otopsi menunjukkan korban meninggal akibat bekap dan cekik');
  const pPrediksiHeading = findParagraphBounds(docXml, 'Prediksi');

  const analisaReplacement = `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{analisa}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pAnalisaStart.start) + analisaReplacement + docXml.substring(pPrediksiHeading.start);

  // 7. Replace Prediksi block
  const pPrediksiStart = findParagraphBounds(docXml, 'Berpotensi menimbulkan keresahan masyarakat dan rasa tidak aman.');
  const pLangkahHeading = findParagraphBounds(docXml, 'Langkah - langkah kepolisian :');

  const prediksiReplacement = `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{prediksi}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pPrediksiStart.start) + prediksiReplacement + docXml.substring(pLangkahHeading.start);

  // 8. Replace Langkah-langkah block
  const pLangkahStart = findParagraphBounds(docXml, 'Mendatangi TKP.');
  const pRekomendasiHeading = findParagraphBounds(docXml, 'Rekomendasi :');

  const langkahReplacement = `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{langkah}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pLangkahStart.start) + langkahReplacement + docXml.substring(pRekomendasiHeading.start);

  // 9. Replace Rekomendasi block
  const pRekomendasiStart = findParagraphBounds(docXml, 'Percepatan pengungkapan kasus dan pendalaman saksi.');
  const pSignoffDate = findParagraphBounds(docXml, 'UNITINTELKAM'); 
  const pSemarangDateStart = findParagraphStart(docXml, pSignoffDate.start);

  const rekomendasiReplacement = `<w:p><w:pPr><w:jc w:val="both"/><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{{rekomendasi}}</w:t></w:r></w:p>`;
  docXml = docXml.substring(0, pRekomendasiStart.start) + rekomendasiReplacement + docXml.substring(pSemarangDateStart);

  // Write the updated document.xml back into the zip
  zip.file('word/document.xml', docXml);

  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Template templates/infosus.docx rebuilt successfully with clean bounds!');
} catch (error) {
  console.error('Error modifying template:', error);
}
