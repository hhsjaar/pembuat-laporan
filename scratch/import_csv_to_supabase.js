const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing!");
  process.exit(1);
}

console.log("Connecting to Supabase at:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Custom CSV Parser that handles multiline fields and escaped quotes
function parseCSV(content) {
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRecord.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++; // skip \r
        currentRecord.push(currentField);
        currentField = '';
        if (currentRecord.length > 1 || currentRecord[0] !== '') {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  return records;
}

async function runImport() {
  const csvPath = path.join(__dirname, '..', 'report_history_rows.csv');
  console.log("Reading CSV file:", csvPath);
  const rawCSV = fs.readFileSync(csvPath, 'utf-8');

  const rows = parseCSV(rawCSV);
  console.log(`Parsed ${rows.length} total rows from CSV.`);

  if (rows.length <= 1) {
    console.log("No data rows found in CSV!");
    return;
  }

  const header = rows[0];
  console.log("Headers:", header);

  const dataRows = rows.slice(1);
  console.log(`Processing ${dataRows.length} history records...`);

  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < dataRows.length; i += batchSize) {
    const chunk = dataRows.slice(i, i + batchSize);
    const recordsToInsert = chunk.map(row => {
      let metaDataObj = {};
      try {
        if (row[5] && row[5].trim()) {
          metaDataObj = JSON.parse(row[5]);
        }
      } catch (e) {
        metaDataObj = {};
      }

      return {
        id: row[0] || undefined,
        template_type: row[1] || 'laporan-kegiatan',
        perihal: row[2] || '',
        content: row[3] || '',
        kapolsek_nama: row[4] || 'KOMPOL KRISTIYASTUTI HANDAYANI, S.H., M.H.',
        meta_data: metaDataObj,
        created_at: row[6] ? new Date(row[6]).toISOString() : new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('report_history')
      .upsert(recordsToInsert, { onConflict: 'id' });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      errorCount += recordsToInsert.length;
    } else {
      successCount += recordsToInsert.length;
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(dataRows.length / batchSize)} (${successCount} total)`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`IMPORT COMPLETE! Success: ${successCount}, Failed: ${errorCount}`);
  console.log(`==============================================`);
}

runImport();
