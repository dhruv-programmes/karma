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

export function getLocalVlmConfig() {
  const baseUrl =
    process.env.LOCAL_VLM_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "http://localhost:11434/v1";
  const model =
    process.env.LOCAL_VLM_MODEL?.trim() || "qwen2.5-vl";
  const apiKey =
    process.env.LOCAL_VLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "ollama";
  return { baseUrl: baseUrl.replace(/\/$/, ""), model, apiKey };
}

export async function callLocalVlm(params: {
  imageBase64: string;
  mediaType: string;
  systemPrompt: string;
  userPrompt?: string;
}): Promise<string> {
  const { baseUrl, model, apiKey } = getLocalVlmConfig();
  const url = `${baseUrl}/chat/completions`;

  const payload = {
    model,
    // System prompt & JSON schema are pre-configured in LM Studio — only send the image.
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${params.mediaType};base64,${params.imageBase64}`,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to local VLM at ${url}: ${msg}. Please ensure Ollama, LM Studio, or your local inference server is running.`
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Local VLM returned status ${res.status} from ${url}: ${errorText.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = json?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Local VLM returned empty or invalid response content");
  }

  return rawContent;
}

/**
 * Fallback: call Gemini API via AI SDK for vision-based verification.
 * Used when the local VLM server is unreachable.
 */
export async function callGeminiVlm(params: {
  imageBase64: string;
  mediaType: string;
  systemPrompt: string;
  userPrompt?: string;
}): Promise<string> {
  const { generateText } = await import("ai");

  const model = getModel();

  const result = await generateText({
    model,
    system: params.systemPrompt,
    providerOptions: googleProviderOptions,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: params.userPrompt || "Analyze this sustainability evidence and extract verified facts.",
          },
          {
            type: "image",
            image: Buffer.from(params.imageBase64, "base64"),
            mimeType: params.mediaType,
          },
        ],
      },
    ],
  });

  return result.text;
}

/**
 * Calls the local VLM first; if unreachable or erroring, falls back to
 * the cloud Gemini API. Returns `{ text, source }` so the caller knows
 * which provider answered.
 */
export async function callVlmWithFallback(params: {
  imageBase64: string;
  mediaType: string;
  systemPrompt: string;
  userPrompt?: string;
}): Promise<{ text: string; source: "local" | "gemini" }> {
  try {
    const text = await callLocalVlm(params);
    return { text, source: "local" };
  } catch (localErr) {
    console.warn(
      `[verify] Local VLM unavailable, falling back to Gemini API: ${
        localErr instanceof Error ? localErr.message : localErr
      }`
    );

    const apiKey = requireApiKey();
    if (!apiKey) {
      throw new Error(
        "Local VLM is unreachable and no GOOGLE_GENERATIVE_AI_API_KEY is set for Gemini fallback."
      );
    }

    try {
      const text = await callGeminiVlm(params);
      return { text, source: "gemini" };
    } catch (geminiErr) {
      throw new Error(
        `Both local VLM and Gemini API failed. Local: ${
          localErr instanceof Error ? localErr.message : localErr
        }; Gemini: ${
          geminiErr instanceof Error ? geminiErr.message : geminiErr
        }`
      );
    }
  }
}

