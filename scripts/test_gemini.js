const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^GEMINI_API_KEY\s*=\s*(.+)$/m);
  if (match) {
    apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not found in .env.local!");
  process.exit(1);
}

console.log("Found Gemini API Key:", apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 5));

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function main() {
  try {
    console.log("Calling Gemini API via OpenAI-compatible endpoint...");
    const response = await client.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello!" }
      ],
      temperature: 0.7,
    });
    console.log("Response received successfully!");
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("API call failed!");
    console.error("Status:", err.status);
    console.error("Message:", err.message);
    console.error("Full Error:", err);
  }
}

main();
