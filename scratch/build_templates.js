const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

// Helper to replace text inside the first <w:t> of a paragraph and remove other runs
function replaceParagraphTextPreservingStyle(pXml, newText) {
  // Find the first <w:r>
  const firstRMatch = pXml.match(/<w:r[^>]*>([\s\S]*?)<\/w:r>/);
  
  // Extract paragraph properties <w:pPr>
  const pPrMatch = pXml.match(/<w:pPr[^>]*>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  
  if (!firstRMatch) {
    return `<w:p>${pPr}<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
  }
  
  // Extract run properties <w:rPr> from first run
  const firstRContent = firstRMatch[1];
  const rPrMatch = firstRContent.match(/<w:rPr[^>]*>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : '';
  
  // Build a single run paragraph
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
}

// Helper to replace text in cell paragraphs
function replaceCellText(tcXml, newText) {
  // Find the first paragraph <w:p>
  const pMatch = tcXml.match(/<w:p[^>]*>([\s\S]*?)<\/w:p>/);
  if (!pMatch) return tcXml;
  
  const pXml = pMatch[0];
  const replacedP = replaceParagraphTextPreservingStyle(pXml, newText);
  return tcXml.replace(pXml, replacedP);
}

function buildLHI() {
  console.log("Building Laporan Harian Intelijen template...");
  const refPath = path.join(__dirname, '..', 'laporanharian', 'laphar.docx');
  const outputPath = path.join(__dirname, '..', 'templates', 'laporan-harian-intelijen.docx');
  
  const content = fs.readFileSync(refPath, 'binary');
  const zip = new PizZip(content);
  let docXml = zip.files['word/document.xml'].asText();
  
  // 1. Process paragraphs
  // Split the body into paragraphs
  const pRegex = /<w:p[^>]*>[\s\S]*?<\/w:p>/g;
  let paragraphs = docXml.match(pRegex) || [];
  
  let newParagraphs = [];
  let skipMode = false;
  let section = ''; // Keep track of section headers
  
  for (let i = 0; i < paragraphs.length; i++) {
    const pXml = paragraphs[i];
    const rawText = pXml.replace(/<[^>]+>/g, '').trim();
    
    // Track sections
    if (rawText === 'Kriminalitas:') {
      section = 'kriminalitas';
    } else if (rawText === 'Laka Lantas') {
      section = 'laka_lantas';
    } else if (rawText === 'Bencana Alam:') {
      section = 'bencana_alam';
    } else if (rawText === 'Lain-lain') {
      section = 'lain_lain';
    } else if (rawText === 'Keamanan Khusus') {
      section = 'keamanan_khusus';
    }
    
    // Check for skip mode (Sosial Budaya events)
    if (rawText.startsWith('1. Kegiatan Monitoring dan Pengamanan Pembukaan Training Legislative')) {
      skipMode = true;
      // Replace with our facts placeholder
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_budaya}}'));
      continue;
    }
    
    if (skipMode) {
      if (rawText === 'Aspek Keamanan') {
        skipMode = false;
        // Keep "Aspek Keamanan"
      } else {
        // Skip this paragraph
        continue;
      }
    }
    
    // Check other replacements
    if (rawText.includes('Nomor: R/LHI/')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, 'Nomor: {{nomor_laporan}}'));
    } else if (rawText.startsWith('Hari ') && rawText.includes('tanggal') && rawText.includes('2026')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, 'Hari {{hari}}, tanggal {{tanggal}}'));
    } else if (rawText.includes('Situasi politik nasional tahun 2026')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_politik}}'));
    } else if (rawText.includes('Di tingkat daerah, implementasi KUHP baru')) {
      // Remove second paragraph of politik or replace with empty? Let's just remove it
      continue;
    } else if (rawText.includes('Situasi sosial budaya di wilayah Kota Semarang')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_sosbud}}'));
    } else if (rawText.includes('Situasi ekonomi di wilayah Kota Semarang')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_ekonomi}}'));
    } else if (rawText.includes('Situasi keamanan di wilayah Kota Semarang')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_keamanan}}'));
    } else if (rawText.includes('Ancaman teroris ISIS, kelompok JAD')) {
      // Remove second paragraph of keamanan or replace with empty? Let's just remove it
      continue;
    } else if (rawText.startsWith('Pada hari Sabtu, tanggal 18 Juli 2026 kegiatan maupun kejadian menonjol')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_politik}}'));
    } else if (rawText.includes('Perkembangan harga sembako di Pasar')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_ekonomi_intro}}'));
    } else if (rawText.includes('tidak ada kejadian menonjol yang dapat dilaporkan')) {
      if (section === 'kriminalitas') {
        newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{kriminalitas_text}}'));
      } else if (section === 'laka_lantas') {
        newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{laka_lantas_text}}'));
      } else if (section === 'bencana_alam') {
        newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{bencana_alam_text}}'));
      } else if (section === 'lain_lain') {
        newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{lain_lain_text}}'));
      } else {
        newParagraphs.push(pXml);
      }
    } else if (section === 'keamanan_khusus' && rawText.includes('Jumlah tahanan di Rutan Polsek Tembalang')) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, '{{tahanan_text}}'));
    } else if (rawText.startsWith('Semarang, ') && (rawText.includes('2026') || rawText.includes('Juli'))) {
      newParagraphs.push(replaceParagraphTextPreservingStyle(pXml, 'Semarang, {{tanggal_ttd}}'));
    } else {
      newParagraphs.push(pXml);
    }
  }
  
  // Re-assemble the paragraphs back
  // Replace the paragraphs section in docXml.
  // Wait! A cleaner way is to do search and replace on the docXml directly. But splitting by paragraphs is also good if we replace paragraph-by-paragraph.
  // Let's replace the body of document.xml.
  // Wait, let's look at the table. We need to process the table rows too!
  // Let's write a script that does replacement of paragraphs first.
  let rebuiltXml = docXml;
  
  // Let's find the table in docXml and process it.
  const tblRegex = /<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g;
  rebuiltXml = rebuiltXml.replace(tblRegex, (tblXml) => {
    // Process rows inside this table
    const trRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trMatches = [];
    let match;
    while ((match = trRegex.exec(tblXml)) !== null) {
      trMatches.push({ full: match[0], content: match[1] });
    }
    
    // We only process the table if it's the price table (contains "Beras Medium")
    if (!tblXml.includes('Beras Medium')) {
      return tblXml;
    }
    
    let newRows = [];
    // Keep the header row
    newRows.push(trMatches[0].full);
    
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
        // Replace yesterday cell (index 2)
        const newCell2 = replaceCellText(tcMatches[2].full, `{{${itemKey}_kemarin}}`);
        // Replace today cell (index 3)
        const newCell3 = replaceCellText(tcMatches[3].full, `{{${itemKey}_hari_ini}}`);
        // Replace change cell (index 4)
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
    
    return tblXml.replace(rowMatch => '', '').replace(trRegex, () => newRows.shift() || '');
  });
  
  // Now apply the paragraph replacements to rebuiltXml
  // Since rebuiltXml contains the updated table, we split rebuiltXml by paragraphs and reconstruct
  const bodyStartIdx = rebuiltXml.indexOf('<w:body>');
  const bodyEndIdx = rebuiltXml.indexOf('</w:body>');
  
  if (bodyStartIdx !== -1 && bodyEndIdx !== -1) {
    const headerXml = rebuiltXml.substring(0, bodyStartIdx + 8);
    const footerXml = rebuiltXml.substring(bodyEndIdx);
    
    const bodyXml = rebuiltXml.substring(bodyStartIdx + 8, bodyEndIdx);
    
    // Find paragraphs and tables in bodyXml
    const partRegex = /(<w:p[^>]*>[\s\S]*?<\/w:p>|<w:tbl[^>]*>[\s\S]*?<\/w:tbl>)/g;
    let parts = bodyXml.match(partRegex) || [];
    let newParts = [];
    
    skipMode = false;
    section = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('<w:tbl')) {
        newParts.push(part); // Already processed table
        continue;
      }
      
      const pXml = part;
      const rawText = pXml.replace(/<[^>]+>/g, '').trim();
      
      // Track sections
      if (rawText === 'Kriminalitas:') {
        section = 'kriminalitas';
      } else if (rawText === 'Laka Lantas') {
        section = 'laka_lantas';
      } else if (rawText === 'Bencana Alam:') {
        section = 'bencana_alam';
      } else if (rawText === 'Lain-lain') {
        section = 'lain_lain';
      } else if (rawText === 'Keamanan Khusus') {
        section = 'keamanan_khusus';
      }
      
      // Check for skip mode (Sosial Budaya events)
      if (rawText.startsWith('1. Kegiatan Monitoring dan Pengamanan Pembukaan Training Legislative')) {
        skipMode = true;
        // Replace with our facts placeholder
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_budaya}}'));
        continue;
      }
      
      if (skipMode) {
        if (rawText === 'Aspek Keamanan') {
          skipMode = false;
          // Keep "Aspek Keamanan"
        } else {
          // Skip this paragraph
          continue;
        }
      }
      
      // Check other replacements
      if (rawText.includes('Nomor: R/LHI/')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, 'Nomor: {{nomor_laporan}}'));
      } else if (rawText.startsWith('Hari ') && rawText.includes('tanggal') && rawText.includes('2026')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, 'Hari {{hari}}, tanggal {{tanggal}}'));
      } else if (rawText.includes('Situasi politik nasional tahun 2026')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_politik}}'));
      } else if (rawText.includes('Di tingkat daerah, implementasi KUHP baru')) {
        // Remove second paragraph of politik or replace with empty? Let's just remove it
        continue;
      } else if (rawText.includes('Situasi sosial budaya di wilayah Kota Semarang')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_sosbud}}'));
      } else if (rawText.includes('Situasi ekonomi di wilayah Kota Semarang')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_ekonomi}}'));
      } else if (rawText.includes('Situasi keamanan di wilayah Kota Semarang')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{pendahuluan_keamanan}}'));
      } else if (rawText.includes('Ancaman teroris ISIS, kelompok JAD')) {
        // Remove second paragraph of keamanan or replace with empty? Let's just remove it
        continue;
      } else if (rawText.startsWith('Pada hari Sabtu, tanggal 18 Juli 2026 kegiatan maupun kejadian menonjol')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_politik}}'));
      } else if (rawText.includes('Perkembangan harga sembako di Pasar')) {
        newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{fakta_sosial_ekonomi_intro}}'));
      } else if (rawText.includes('tidak ada kejadian menonjol yang dapat dilaporkan')) {
        if (section === 'kriminalitas') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{kriminalitas_text}}'));
        } else if (section === 'laka_lantas') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{laka_lantas_text}}'));
        } else if (section === 'bencana_alam') {
          newParts.push(replaceParagraphTextPreservingStyle(pXml, '{{bencana_alam_text}}'));
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
    
    rebuiltXml = headerXml + newParts.join('\n') + footerXml;
  }
  
  zip.file('word/document.xml', rebuiltXml);
  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, output);
  console.log(`✅ LHI Template built successfully: ${outputPath}`);
}

function buildRen() {
  console.log("Building Rencana Kegiatan template...");
  const refPath = path.join(__dirname, '..', 'ren', 'ren.docx');
  const outputPath = path.join(__dirname, '..', 'templates', 'rencana-kegiatan.docx');
  
  const content = fs.readFileSync(refPath, 'binary');
  const zip = new PizZip(content);
  let docXml = zip.files['word/document.xml'].asText();
  
  // 1. Replace "HARI / TANGGAL : KAMIS, 16 JULI 2026"
  const pRegex = /<w:p[^>]*>[\s\S]*?<\/w:p>/g;
  let paragraphs = docXml.match(pRegex) || [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const pXml = paragraphs[i];
    const rawText = pXml.replace(/<[^>]+>/g, '').trim();
    if (rawText.includes('HARI / TANGGAL')) {
      const replacedP = replaceParagraphTextPreservingStyle(pXml, 'HARI / TANGGAL : {{hari_tanggal}}');
      docXml = docXml.replace(pXml, replacedP);
      break;
    }
  }
  
  // 2. Replace signature block YUDHA M.P.
  // Re-read paragraphs to get updated index
  paragraphs = docXml.match(pRegex) || [];
  for (let i = 0; i < paragraphs.length; i++) {
    const pXml = paragraphs[i];
    const rawText = pXml.replace(/<[^>]+>/g, '').trim();
    
    if (rawText.startsWith('Semarang, ') && rawText.includes('2026')) {
      const replacedP = replaceParagraphTextPreservingStyle(pXml, 'Semarang, {{tanggal_ttd}}');
      docXml = docXml.replace(pXml, replacedP);
    } else if (rawText === 'BA SIAGA INTELKAM') {
      const replacedP = replaceParagraphTextPreservingStyle(pXml, '{{jabatan_ttd}}');
      docXml = docXml.replace(pXml, replacedP);
    } else if (rawText === 'YUDHA M.P.') {
      const replacedP = replaceParagraphTextPreservingStyle(pXml, '{{nama_ttd}}');
      docXml = docXml.replace(pXml, replacedP);
    } else if (rawText.startsWith('AIPDA NRP')) {
      const replacedP = replaceParagraphTextPreservingStyle(pXml, '{{pangkat_nrp_ttd}}');
      docXml = docXml.replace(pXml, replacedP);
    }
  }
  
  // 3. Process the table
  const tblRegex = /<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g;
  docXml = docXml.replace(tblRegex, (tblXml) => {
    // Process rows inside this table
    const trRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trMatches = [];
    let match;
    while ((match = trRegex.exec(tblXml)) !== null) {
      trMatches.push({ full: match[0], content: match[1] });
    }
    
    if (trMatches.length < 2) return tblXml; // No data rows
    
    // We keep the header row (index 0) and the first data row (index 1) modified as template
    const templateRowMatch = trMatches[1];
    
    const tcRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
    let tcMatches = [];
    let cellMatch;
    while ((cellMatch = tcRegex.exec(templateRowMatch.content)) !== null) {
      tcMatches.push({ full: cellMatch[0], content: cellMatch[1] });
    }
    
    if (tcMatches.length >= 5) {
      const newCell0 = replaceCellText(tcMatches[0].full, '{{#kegiatan_list}}{{no}}');
      const newCell1 = replaceCellText(tcMatches[1].full, '{{waktu_lokasi}}');
      const newCell2 = replaceCellText(tcMatches[2].full, '{{kegiatan}}');
      const newCell3 = replaceCellText(tcMatches[3].full, '{{hasil}}');
      const newCell4 = replaceCellText(tcMatches[4].full, '{{ket}}{{/kegiatan_list}}');
      
      let newRowContent = templateRowMatch.content
        .replace(tcMatches[0].full, newCell0)
        .replace(tcMatches[1].full, newCell1)
        .replace(tcMatches[2].full, newCell2)
        .replace(tcMatches[3].full, newCell3)
        .replace(tcMatches[4].full, newCell4);
        
      const templateRow = templateRowMatch.full.replace(templateRowMatch.content, newRowContent);
      
      // Rebuild the table with header row + template row
      // We remove all rows and replace with these two
      const tableHeaderXml = tblXml.substring(0, tblXml.indexOf(trMatches[0].full));
      const tableFooterXml = tblXml.substring(tblXml.lastIndexOf('</w:tr>') + 7);
      
      return tableHeaderXml + trMatches[0].full + '\n' + templateRow + tableFooterXml;
    }
    
    return tblXml;
  });
  
  zip.file('word/document.xml', docXml);
  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, output);
  console.log(`✅ Ren Giat Template built successfully: ${outputPath}`);
}

buildLHI();
buildRen();
