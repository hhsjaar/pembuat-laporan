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

async function checkHistory() {
  console.log("Fetching last 5 history items of type laporan-harian-intelijen...");
  const { data, error } = await supabase
    .from("report_history")
    .select("*")
    .eq("template_type", "laporan-harian-intelijen")
    .order("created_at", { ascending: false })
    .limit(5);
    
  if (error) {
    console.error("Error fetching history:", error);
    return;
  }
  
  console.log(`Found ${data.length} items.`);
  data.forEach((item, idx) => {
    console.log(`\n=================== ITEM ${idx + 1} (ID: ${item.id}, Date: ${item.created_at}) ===================`);
    console.log(`Perihal: ${item.perihal}`);
    console.log("Meta Data raw_report keys:", Object.keys(item.meta_data?.raw_report || {}));
    console.log("Content length:", item.content?.length);
    console.log("Content snippet (first 300 chars):");
    console.log(item.content?.substring(0, 300));
    console.log("-----------------------------------------");
    console.log("Content snippet (around Bab Sosial Budaya):");
    const sbIndex = item.content?.indexOf("Sosial Budaya:");
    if (sbIndex !== -1) {
      console.log(item.content?.substring(sbIndex, sbIndex + 300));
    } else {
      console.log("No 'Sosial Budaya:' found in content");
    }
  });
}

checkHistory();
