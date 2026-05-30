import OpenAI from "openai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set in environment variables!");
}

export const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "DUMMY_KEY",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});
