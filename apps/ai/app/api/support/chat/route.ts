import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createSupportTools, buildSupportSystem } from "@/agents/support-agent";
import { getSupportModel, requireApiKey, supportProviderOptions } from "@/lib/ai";
import { jsonError, optionsResponse, withCors } from "@/lib/cors";

export const maxDuration = 30;

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
    userName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body", req);
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return jsonError(400, "At least one message is required", req);
  }

  const authHeader =
    req.headers.get("authorization") || "Bearer demo-carbon-loop-token";

  try {
    const result = streamText({
      model: getSupportModel(),
      system: buildSupportSystem(body.userName),
      messages: await convertToModelMessages(messages),
      tools: createSupportTools(authHeader),
      stopWhen: stepCountIs(3),
      maxOutputTokens: 280,
      temperature: 0.2,
      providerOptions: supportProviderOptions,
    });

    const response = result.toUIMessageStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
    return withCors(response, req);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Support chat failed";
    return jsonError(502, message, req);
  }
}
