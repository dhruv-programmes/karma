import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getModel, requireApiKey } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";

export const maxDuration = 60;

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  if (!requireApiKey()) {
    return jsonError(
      503,
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to apps/ai/.env.local",
      req
    );
  }

  let body: {
    messages?: UIMessage[];
    documentContext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body", req);
  }

  const contextHeader = req.headers.get("x-document-context");
  const documentContext =
    body.documentContext || contextHeader || "No extraction context provided.";

  const messages = body.messages ?? [];

  const result = streamText({
    model: getModel(),
    system: `You help the user understand a bill/receipt that was just extracted for a carbon footprint app.
Answer only about this document, amounts, merchants, categories, and footprint implications.
Do not invent line items that are not in the context.
If unsure, say so briefly.

Extracted document context:
${documentContext}`,
    messages: convertToModelMessages(messages),
  });

  return withCors(result.toUIMessageStreamResponse(), req);
}
