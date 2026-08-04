const OpenAI = require("openai");
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

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

async function testTokenLimit() {
  try {
    console.log("Testing token limit with max_tokens: 8192 in JSON mode...");
    const response = await geminiClient.chat.completions.create({
      model: "gemini-3.5-flash",
      messages: [
        { role: "user", content: "Write a very long JSON object containing a story. The JSON should have a key 'story' which contains a very long, highly detailed story about a space explorer. Write at least 4000 words. Make it extremely long and detailed." }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8192,
    });
    console.log("Response text length:", response.choices[0].message.content.length);
    console.log("Finish reason:", response.choices[0].finish_reason);
    console.log("Last 200 chars of story:");
    console.log(response.choices[0].message.content.slice(-200));
  } catch (err) {
    console.error(err);
  }
}

testTokenLimit();
