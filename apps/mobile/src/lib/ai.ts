import Constants from "expo-constants";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useAuthStore } from "@/src/store/auth";
import type {
  DocumentConfirmItem,
  DocumentConfirmResult,
  DocumentExtraction,
  ExtractedDocumentItem,
} from "@/src/types/api";

const AI_PORT = 8001;

function resolveDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl?.replace(/^[a-z]+:\/\//, "") ??
    null;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

export function getAiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_AI_URL?.trim();
  const isLoopback =
    !configured ||
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured);

  const lanHost = resolveDevHost();
  if (lanHost) {
    if (!configured || isLoopback) {
      return `http://${lanHost}:${AI_PORT}`;
    }
    return configured.replace(/\/$/, "");
  }

  if (Platform.OS === "android" && isLoopback) {
    return `http://10.0.2.2:${AI_PORT}`;
  }

  if (configured) return configured.replace(/\/$/, "");
  return `http://localhost:${AI_PORT}`;
}

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? `Bearer ${token}` : "Bearer demo-carbon-loop-token";
}

function guessMediaType(name: string, kind: "image" | "pdf"): string {
  if (kind === "pdf") return "application/pdf";
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

/** Read local file URI into base64 (no data: prefix). */
export async function fileUriToBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export type ExtractStreamHandlers = {
  onPartial: (partial: Partial<DocumentExtraction>) => void;
  onFinish: (object: DocumentExtraction) => void;
  onError: (error: Error) => void;
};

/** Stream document extraction via plain fetch (Metro-safe). */
export async function extractDocumentStream(
  input: {
    uri: string;
    name: string;
    kind: "image" | "pdf";
    hint?: string;
  },
  handlers: ExtractStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const mediaType = guessMediaType(input.name, input.kind);
  const dataBase64 = await fileUriToBase64(input.uri);

  const res = await fetch(`${getAiBaseUrl()}/api/documents/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      mediaType,
      dataBase64,
      hint: input.hint,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string; detail?: string }).error ||
        (errBody as { detail?: string }).detail ||
        `Extract failed (${res.status})`
    );
  }

  if (!res.body) {
    // Some RN environments buffer the full body
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as DocumentExtraction;
      handlers.onPartial(parsed);
      handlers.onFinish(normalizeExtraction(parsed));
    } catch {
      throw new Error("Empty extract response");
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    const partial = tryParsePartial(accumulated);
    if (partial) handlers.onPartial(partial);
  }

  const finalObj = tryParsePartial(accumulated);
  if (!finalObj?.items) {
    throw new Error("Could not parse extraction result");
  }
  handlers.onFinish(normalizeExtraction(finalObj as DocumentExtraction));
}

function tryParsePartial(text: string): Partial<DocumentExtraction> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Partial<DocumentExtraction>;
  } catch {
    // Partial JSON — try closing braces naively is unsafe; wait for more
    // Attempt parse of last complete-looking object via incremental repair
    try {
      return JSON.parse(repairJson(trimmed)) as Partial<DocumentExtraction>;
    } catch {
      return null;
    }
  }
}

function repairJson(text: string): string {
  let s = text.trim();
  if (!s.startsWith("{")) return s;
  // Close open strings/brackets roughly for streaming UX
  const opens = (s.match(/\{/g) || []).length;
  const closes = (s.match(/\}/g) || []).length;
  const openArr = (s.match(/\[/g) || []).length;
  const closeArr = (s.match(/\]/g) || []).length;
  if ((s.match(/"/g) || []).length % 2 === 1) s += '"';
  for (let i = 0; i < openArr - closeArr; i++) s += "]";
  for (let i = 0; i < opens - closes; i++) s += "}";
  return s;
}

function normalizeExtraction(obj: DocumentExtraction): DocumentExtraction {
  return {
    title: obj.title || "Imported document",
    doc_type: obj.doc_type || "other",
    items: (obj.items || []).map((item, i) => ({
      id: `ai-${i}-${item.merchant}-${item.amount_inr}`,
      merchant: item.merchant,
      amount_inr: Number(item.amount_inr) || 0,
      date: item.date || new Date().toISOString().slice(0, 10),
      category: item.category || "Other",
      confidence: item.confidence || "medium",
      needs_review_reason: item.needs_review_reason ?? null,
    })),
  };
}

export function splitByConfidence(items: ExtractedDocumentItem[]) {
  const auto_import = items.filter((i) => i.confidence === "high");
  const needs_review = items.filter((i) => i.confidence !== "high");
  return { auto_import, needs_review, requires_review: needs_review.length > 0 };
}

export async function confirmDocumentImport(
  items: DocumentConfirmItem[]
): Promise<DocumentConfirmResult> {
  const res = await fetch(`${getAiBaseUrl()}/api/documents/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ||
        (errBody as { detail?: string }).detail ||
        `Confirm failed (${res.status})`
    );
  }
  return res.json();
}

export type DocumentChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type DocumentChatStreamHandlers = {
  onPartial: (text: string) => void;
  onFinish: (text: string) => void;
};

/**
 * Stream document Q&A without pulling `ai` / `@ai-sdk/react` into Metro.
 * Parses the AI SDK UI message SSE (`text-delta` chunks).
 */
export async function streamDocumentChat(
  input: {
    messages: DocumentChatMessage[];
    documentContext: string;
  },
  handlers: DocumentChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const uiMessages = input.messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.text }],
  }));

  const res = await fetch(`${getAiBaseUrl()}/api/documents/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "X-Document-Context": input.documentContext,
    },
    body: JSON.stringify({
      messages: uiMessages,
      documentContext: input.documentContext,
    }),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ||
        (errBody as { detail?: string }).detail ||
        `Chat failed (${res.status})`
    );
  }

  let accumulated = "";

  const applyChunkLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    let chunk: { type?: string; delta?: string; errorText?: string };
    try {
      chunk = JSON.parse(payload) as typeof chunk;
    } catch {
      return;
    }
    if (chunk.type === "error" && chunk.errorText) {
      throw new Error(chunk.errorText);
    }
    if (chunk.type === "text-delta" && chunk.delta) {
      accumulated += chunk.delta;
      handlers.onPartial(accumulated);
    }
  };

  if (!res.body) {
    const text = await res.text();
    for (const line of text.split("\n")) applyChunkLine(line);
    handlers.onFinish(accumulated.trim() || text.trim());
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) applyChunkLine(line);
  }
  if (buffer) applyChunkLine(buffer);

  handlers.onFinish(accumulated.trim());
}

function newChatId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChatMessage(
  role: "user" | "assistant",
  text: string
): DocumentChatMessage {
  return { id: newChatId(role), role, text };
}
