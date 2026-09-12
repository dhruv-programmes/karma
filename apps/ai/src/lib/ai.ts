import { google } from "@ai-sdk/google";

export function getModel() {
  const id = process.env.AI_MODEL?.trim() || "gemini-2.5-flash-lite";
  return google(id);
}

export function requireApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || null;
}

export function fastapiBase(): string {
  return (
    process.env.FASTAPI_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000"
  );
}
