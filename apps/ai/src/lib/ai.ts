import { google } from "@ai-sdk/google";

export function getModel() {
  const id = process.env.AI_MODEL?.trim() || "gemini-3.8-flash";
  return google(id);
}

/** Keep Gemini 3.x thinking low so structured OCR / chat stay reliable. */
export const googleProviderOptions = {
  google: {
    thinkingConfig: {
      thinkingLevel: "low" as const,
    },
  },
};

export function requireApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || null;
}

export function fastapiBase(): string {
  return (
    process.env.FASTAPI_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000"
  );
}
