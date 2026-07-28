const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function replaceParagraphTextPreservingStyle(pXml, newText) {
  const firstRMatch = pXml.match(/<w:r[^>]*>([\s\S]*?)<\/w:r>/);
  const pPrMatch = pXml.match(/<w:pPr[^>]*>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  
  if (!firstRMatch) {
    return `<w:p>${pPr}<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
  }
  
  const firstRContent = firstRMatch[1];
  const rPrMatch = firstRContent.match(/<w:rPr[^>]*>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : '';
  
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
}

function replaceCellText(tcXml, newText) {
  const pMatch = tcXml.match(/<w:p[^>]*>([\s\S]*?)<\/w:p>/);
  if (!pMatch) return tcXml;
  
  const pXml = pMatch[0];
  const replacedP = replaceParagraphTextPreservingStyle(pXml, newText);
  return tcXml.replace(pXml, replacedP);
}

function buildLHI() {
  console.log("Building LHI template from lapharbaru1.docx...");
  const refPath = path.join(__dirname, '..', 'laporanharian', 'lapharbaru1.docx');
  const outputPath = path.join(__dirname, '..', 'templates', 'laporan-harian-intelijen.docx');
  
  if (!fs.existsSync(refPath)) {
    console.error("Reference file not found:", refPath);
    return;
  }

  const content = fs.readFileSync(refPath, 'binary');
  const zip = new PizZip(content);
  let docXml = zip.files['word/document.xml'].asText();
  
  // Replace the table rows inside the price table
  const tblRegex = /<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g;
  docXml = docXml.replace(tblRegex, (tblXml) => {
    if (!tblXml.includes('Beras Medium')) {
      return tblXml;
    }
    console.log("Found Sembako price table, replacing cells with placeholders...");
    
    const trRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trMatches = [];
    let match;
    while ((match = trRegex.exec(tblXml)) !== null) {
      trMatches.push({ full: match[0], content: match[1] });
    }
    
    let newRows = [];
    newRows.push(trMatches[0].full); // Keep header row
    
    for (let i = 1; i < trMatches.length; i++) {
      const rowMatch = trMatches[i];
      const rowXml = rowMatch.full;
      const rowText = rowXml.replace(/<[^>]+>/g, '').trim();
      
      const tcRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
      let tcMatches = [];
      let cellMatch;
      while ((cellMatch = tcRegex.exec(rowMatch.content)) !== null) {
        tcMatches.push({ full: cellMatch[0], content: cellMatch[1] });
      }
      
      let itemKey = '';
      if (rowText.includes('Beras Medium')) itemKey = 'beras';
      else if (rowText.includes('Kedelai')) itemKey = 'kedelai';
      else if (rowText.includes('Cabai Merah Besar')) itemKey = 'cabai_merah';
      else if (rowText.includes('Rawit Merah')) itemKey = 'cabai_rawit';
      else if (rowText.includes('Cabai Tampar')) itemKey = 'cabai_tampar';
      else if (rowText.includes('Merah') && !rowText.includes('Cabai')) itemKey = 'bawang_merah';
      else if (rowText.includes('Putih')) itemKey = 'bawang_putih';
      else if (rowText.includes('Jagung')) itemKey = 'jagung';
      else if (rowText.includes('Gula Pasir')) itemKey = 'gula';
      else if (rowText.includes('Minyak Goreng')) itemKey = 'minyak';
      else if (rowText.includes('Tepung Terigu')) itemKey = 'terigu';
      else if (rowText.includes('Daging Sapi Lokal')) itemKey = 'daging_sapi';
      else if (rowText.includes('Daging Ayam Ras')) itemKey = 'daging_ayam';
      else if (rowText.includes('Telur Ayam Ras')) itemKey = 'telur';
      else if (rowText.includes('Garam')) itemKey = 'garam';
      else if (rowText.includes('Gas LPG 3 Kg')) itemKey = 'lpg';
      
      if (itemKey && tcMatches.length >= 5) {
        const newCell2 = replaceCellText(tcMatches[2].full, `{{${itemKey}_kemarin}}`);
        const newCell3 = replaceCellText(tcMatches[3].full, `{{${itemKey}_hari_ini}}`);
        const newCell4 = replaceCellText(tcMatches[4].full, `{{${itemKey}_selisih}}`);
        
        let newRowContent = rowMatch.content
          .replace(tcMatches[2].full, newCell2)
          .replace(tcMatches[3].full, newCell3)
          .replace(tcMatches[4].full, newCell4);
          
        newRows.push(rowXml.replace(rowMatch.content, newRowContent));
      } else {
        newRows.push(rowXml);
      }
    }
    
    // Reconstruct the table XML
    let reconstructedTbl = tblXml;
    for (let i = 0; i < trMatches.length; i++) {
      reconstructedTbl = reconstructedTbl.replace(trMatches[i].full, newRows[i]);
    }
    return reconstructedTbl;
  });

  const bodyStartIdx = docXml.indexOf('<w:body>');
  const bodyEndIdx = docXml.indexOf('</w:body>');
  
  if (bodyStartIdx !== -1 && bodyEndIdx !== -1) {
    const headerXml = docXml.substring(0, bodyStartIdx + 8);
    const footerXml = docXml.substring(bodyEndIdx);
    const bodyXml = docXml.substring(bodyStartIdx + 8, bodyEndIdx);
    
    const partRegex = /(<w:p[^>]*>[\s\S]*?<\/w:p>|<w:tbl[^>]*>[\s\S]*?<\/w:tbl>)/g;
    let parts = bodyXml.match(partRegex) || [];
    let newParts = [];
    
    let skipMode = false;
    let section = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('<w:tbl')) {
        newParts.push(part); // Price table is already processed
        continue;
      }
      
      const pXml = part;
      const rawText = pXml.replace(/<[^>]+>/g, '').trim();
      
      // Track sections to place placeholders correctly
      if (rawText === 'Kriminalitas:') {
        section = 'kriminalitas';
      } else if (rawText === 'Laka Lantas') {
        section = 'laka_lantas';
      } else if (rawText === 'Bencana Alam:') {
        section = 'bencana_alam';
      } else if (rawText === 'Keamanan Khusus') {
        section = 'keamanan_khusus';
      } else if (rawText === 'Pengamanan VVIP/VIP:') {
        section = 'vvip';
      } else if (rawText === 'Lain-lain') {
        section = 'lain_lain';
      }
      
      // Skip Sosial Budaya activities
      if (rawText.startsWith('Pada hari Sabtu, tanggal 4 Juli 2026 kejadian menonjol yang dapat dilaporkan :')) {
        skipMode = true;
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_budaya}}'));
        continue;
      }
      
      if (skipMode) {
        if (rawText === 'Aspek Keamanan') {
          skipMode = false;
          // Keep "Aspek Keamanan"
        } else {
          continue; // Skip
        }
      }
      
      // Perform paragraph replacements
      if (rawText.includes('Nomor: R/LHI/')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, 'Nomor: {{nomor_laporan}}'));
      } else if (rawText.startsWith('Hari ') && rawText.includes('Tanggal') && rawText.includes('2026')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, 'Hari {{hari}}, Tanggal {{tanggal}}'));
      } else if (rawText.includes('Situasi politik nasional pada Juni 2026') || rawText.includes('Situasi politik nasional pada Juli 2026')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_politik}}'));
      } else if (rawText.includes('Kehidupan sosial budaya masyarakat, termasuk interaksi di lingkungan civitas akademika')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_sosbud}}'));
      } else if (rawText.includes('Kondisi ekonomi secara umum relatif') && rawText.includes('Triwulan')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_ekonomi}}'));
      } else if (rawText.includes('Situasi kamtibmas secara umum kondusif, namun deteksi dini')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_keamanan}}'));
      } else if (rawText.startsWith('Pada hari Sabtu, tanggal 4 Juli 2026 kegiatan maupun kejadian menonjol NIHIL')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_politik}}'));
      } else if (rawText.includes('Perkembangan harga sembako di Pasar Kedungmundu dan Pasar Meteseh')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_ekonomi_intro}}'));
      } else if (rawText.includes('tidak ada kejadian menonjol yang dapat dilaporkan') || rawText.includes('tidak ada kejadian menonjol yang dapat dilaporkan.')) {
        if (section === 'kriminalitas') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{kriminalitas_text}}'));
        } else if (section === 'laka_lantas') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{laka_lantas_text}}'));
        } else if (section === 'bencana_alam') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{bencana_alam_text}}'));
        } else if (section === 'vvip') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{vvip_text}}'));
        } else if (section === 'lain_lain') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{lain_lain_text}}'));
        } else {
          newParts.push(pXml);
        }
      } else if (section === 'keamanan_khusus' && rawText.includes('Jumlah tahanan di Rutan Polsek Tembalang')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{tahanan_text}}'));
      } else if (rawText.startsWith('Semarang, ') && (rawText.includes('2026') || rawText.includes('Juli'))) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, 'Semarang, {{tanggal_ttd}}'));
      } else {
        newParts.push(pXml);
      }
    }
    
    docXml = headerXml + newParts.join('\n') + footerXml;
  }
  
  zip.file('word/document.xml', docXml);
  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, output);
  console.log(`✅ Rebuilt templates/laporan-harian-intelijen.docx successfully!`);
}

buildLHI();
