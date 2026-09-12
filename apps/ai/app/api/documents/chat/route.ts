import { streamText, type CoreMessage } from "ai";
import { getModel, googleProviderOptions, requireApiKey } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

type ChatBodyMessage = {
  role?: string;
  content?: string;
  text?: string;
};

export async function POST(req: Request) {
  if (!requireApiKey()) {
    return jsonError(
      503,
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to apps/ai/.env.local",
      req
    );
  }

  let body: {
    messages?: ChatBodyMessage[];
    documentContext?: string;
    userName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body", req);
  }

  const documentContext =
    body.documentContext?.trim() || "No extraction context provided.";
  const firstName = (body.userName || "").trim().split(/\s+/)[0] || "the user";

  const messages: CoreMessage[] = (body.messages ?? [])
    .map((m) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      const content = (m.content ?? m.text ?? "").trim();
      if (!content) return null;
      return { role, content } as CoreMessage;
    })
    .filter((m): m is CoreMessage => m != null);

  if (messages.length === 0) {
    return jsonError(400, "At least one non-empty message is required", req);
  }

  try {
    const result = streamText({
      model: getModel(),
      providerOptions: googleProviderOptions,
      system: `You are a warm, concise assistant helping ${firstName} understand a bill/receipt just extracted for their personal carbon footprint app (Carbon Loop).
Address them by name when it feels natural. Keep answers short and practical.
Answer only about this document, amounts, merchants, categories, and footprint implications for ${firstName}.
Do not invent line items that are not in the context.
If unsure, say so briefly.

Extracted document context:
${documentContext}`,
      messages,
    });

    return withCors(result.toTextStreamResponse(), req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    return jsonError(502, message, req);
  }
}
