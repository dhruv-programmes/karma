import { google } from "@ai-sdk/google";

export function getModel() {
  const id = process.env.AI_MODEL?.trim() || "gemini-3.8-flash";
  return google(id);
}

/**
 * Fast support-chat model. Default: gemini-3.5-flash-lite
 * (current fastest/cost-efficient Flash-Lite per Google Gemini API docs;
 * gemini-2.5-flash-lite is retiring Oct 2026).
 */
export function getSupportModel() {
  const id = process.env.AI_SUPPORT_MODEL?.trim() || "gemini-3.5-flash-lite";
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

/**
 * Snappy support replies — set only thinkingLevel (API rejects
 * thinkingBudget + thinkingLevel together).
 */
export const supportProviderOptions = {
  google: {
    thinkingConfig: {
      thinkingLevel: "minimal" as const,
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
