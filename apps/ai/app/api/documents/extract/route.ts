import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { getModel, googleProviderOptions, requireApiKey } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";
import {
  documentExtractionSchema,
  EXTRACT_SYSTEM_PROMPT,
} from "@/schemas/document";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

type FilePayload = {
  mediaType: string;
  bytes: Uint8Array;
  hint?: string;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decodeBase64(value: unknown): Uint8Array {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Expected a non-empty dataBase64 string");
  }

  const encoded = value.replace(/\s/g, "");
  // Reject malformed input before Buffer's permissive decoder silently drops
  // invalid characters and turns a bad upload into an empty/partial file.
  if (
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
    encoded.slice(0, -2).includes("=")
  ) {
    throw new Error("dataBase64 is not valid base64");
  }
  if (encoded.length > Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 4) {
    throw new Error("File too large (max 10MB)");
  }

  const binary = Buffer.from(encoded, "base64");
  if (binary.byteLength === 0) throw new Error("File is empty");
  if (binary.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File too large (max 10MB)");
  }
  return new Uint8Array(binary);
}

async function readPayload(req: Request): Promise<FilePayload> {
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
    return {
      mediaType: (file.type || "application/octet-stream").trim().toLowerCase(),
      bytes: buf,
      hint,
    };
  }

  const raw = await req.json();
  if (!isRecord(raw)) {
    throw new Error("Expected a JSON object with mediaType and dataBase64");
  }
  const mediaType = raw.mediaType;
  if (typeof mediaType !== "string" || mediaType.trim().length === 0) {
    throw new Error("Expected a non-empty mediaType");
  }
  if (raw.dataBase64 == null) {
    throw new Error("Expected mediaType and dataBase64");
  }
  return {
    mediaType: mediaType.trim().toLowerCase(),
    bytes: decodeBase64(raw.dataBase64),
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
  };
}

export async function POST(req: Request) {
  if (!requireApiKey()) {
    return jsonError(
      503,
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to apps/ai/.env.local",
      req
    );
  }

  let payload: FilePayload;
  try {
    payload = await readPayload(req);
  } catch (e) {
    return jsonError(
      400,
      e instanceof Error ? e.message : "Invalid upload",
      req
    );
  }

  if (
    !payload.mediaType.startsWith("image/") &&
    payload.mediaType !== "application/pdf"
  ) {
    return jsonError(415, `Unsupported type: ${payload.mediaType}`, req);
  }

  if (payload.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return jsonError(413, "File too large (max 10MB)", req);
  }

  const isPdf = payload.mediaType === "application/pdf";
  const userText =
    payload.hint?.trim() ||
    "Extract all footprint-relevant line items from this document.";

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: documentExtractionSchema,
      system: EXTRACT_SYSTEM_PROMPT,
      providerOptions: googleProviderOptions,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            isPdf
              ? {
                  type: "file" as const,
                  data: payload.bytes,
                  mediaType: "application/pdf",
                }
              : {
                  type: "image" as const,
                  image: payload.bytes,
                },
          ],
        },
      ],
    });

    return withCors(NextResponse.json(object), req);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Document extraction failed";
    return jsonError(502, message, req);
  }
}
