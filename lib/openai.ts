import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY is not set in environment variables!");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});
