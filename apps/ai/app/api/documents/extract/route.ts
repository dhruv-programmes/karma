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
    return {
      mediaType: file.type || "application/octet-stream",
      bytes: buf,
      hint,
    };
  }

  const body = (await req.json()) as {
    mediaType?: string;
    dataBase64?: string;
    hint?: string;
  };
  if (!body.dataBase64 || !body.mediaType) {
    throw new Error("Expected mediaType and dataBase64");
  }
  const binary = Buffer.from(body.dataBase64, "base64");
  return {
    mediaType: body.mediaType,
    bytes: new Uint8Array(binary),
    hint: body.hint,
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

  if (payload.bytes.byteLength > 10 * 1024 * 1024) {
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
