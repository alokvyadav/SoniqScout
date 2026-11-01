import process from "node:process";

// Server-only config. The .server.ts suffix keeps this out of the client bundle.
// Always read process.env INSIDE a function so it resolves per request
// (module-scope reads break on serverless / edge runtimes).

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "AI is not configured. Set AI_API_KEY, AI_BASE_URL and AI_MODEL (see .env.example).",
    );
  }
  return { apiKey, baseUrl, model };
}
