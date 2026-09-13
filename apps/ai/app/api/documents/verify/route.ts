import { NextResponse } from "next/server";
import { callVlmWithFallback } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";
import {
  verificationAnalysisSchema,
  VERIFY_SYSTEM_PROMPT,
} from "@/schemas/verify-schema";

export const maxDuration = 120;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type Payload = {
  mediaType: string;
  dataBase64: string;
  hint?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  
  // Strip <think> tags if the model produced reasoning
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Extract from markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  // Fallback: grab the first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

async function readPayload(req: Request): Promise<Payload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const hint = String(form.get("hint") || "") || undefined;
    if (!(file instanceof File)) {
      throw new Error("Missing file field");
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("File is empty");
    if (buf.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("File too large (max 10MB)");
    }
    const base64 = Buffer.from(buf).toString("base64");
    return {
      mediaType: (file.type || "image/jpeg").trim().toLowerCase(),
      dataBase64: base64,
      hint,
    };
  }

  const raw = await req.json();
  if (!isRecord(raw)) {
    throw new Error("Expected a JSON object with mediaType and dataBase64");
  }
  const mediaType = typeof raw.mediaType === "string" ? raw.mediaType.trim().toLowerCase() : "image/jpeg";
  if (typeof raw.dataBase64 !== "string" || raw.dataBase64.trim().length === 0) {
    throw new Error("Expected a non-empty dataBase64 string");
  }
  return {
    mediaType,
    dataBase64: raw.dataBase64.replace(/\s/g, ""),
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
  };
}

export async function POST(req: Request) {
  let payload: Payload;
  try {
    payload = await readPayload(req);
  } catch (e) {
    return jsonError(
      400,
      e instanceof Error ? e.message : "Invalid upload",
      req
    );
  }

  const userPrompt =
    payload.hint?.trim() ||
    "Inspect this evidence image carefully. Extract all verified facts, measurements, dates, identifiers, and classify the asset.";

  try {
    const { text: rawVlmOutput, source } = await callVlmWithFallback({
      imageBase64: payload.dataBase64,
      mediaType: payload.mediaType,
      systemPrompt: VERIFY_SYSTEM_PROMPT,
      userPrompt,
    });

    console.log(`[verify] Response from: ${source}`);

    const cleanedJson = cleanJsonResponse(rawVlmOutput);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      throw new Error(
        `VLM (${source}) returned malformed JSON: ${rawVlmOutput.slice(0, 200)}`
      );
    }

    const parseResult = verificationAnalysisSchema.safeParse(parsed);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      // Return partial data with raw output so frontend can still use it
      return withCors(
        NextResponse.json({
          raw: parsed,
          source,
          schema_errors: issues,
        }),
        req
      );
    }

    return withCors(
      NextResponse.json({ ...parseResult.data, source }),
      req
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Evidence verification failed";
    return jsonError(502, message, req);
  }
}
