const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase keys not found in env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRecords() {
  console.log("Fetching latest history item of type laporan-harian-intelijen...");
  const { data, error } = await supabase
    .from("report_history")
    .select("*")
    .eq("template_type", "laporan-harian-intelijen")
    .order("created_at", { ascending: false })
    .limit(2);
    
  if (error) {
    console.error("Error fetching history:", error);
    return;
  }
  
  console.log(`Found ${data.length} items.`);
  data.forEach((item, idx) => {
    console.log(`\n=================== ITEM ${idx + 1} (ID: ${item.id}, Date: ${item.created_at}) ===================`);
    console.log("Database Row columns:", Object.keys(item));
    console.log("Input data keys:", Object.keys(item.meta_data || {}));
    console.log("content length:", item.content?.length);
    const rawReport = item.meta_data?.raw_report || {};
    console.log("tahanan_text from raw_report:", rawReport.tahanan_text);
    console.log("fakta_sosial_budaya length:", rawReport.fakta_sosial_budaya?.length);
    console.log("fakta_sosial_budaya preview:");
    console.log(rawReport.fakta_sosial_budaya ? rawReport.fakta_sosial_budaya.substring(0, 1000) : "N/A");
    console.log("\nLast 500 chars of fakta_sosial_budaya:");
    if (rawReport.fakta_sosial_budaya) {
      console.log(rawReport.fakta_sosial_budaya.substring(rawReport.fakta_sosial_budaya.length - 500));
    }
    console.log("-----------------------------------------");
  });
}

inspectRecords();
