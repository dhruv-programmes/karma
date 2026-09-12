import Constants from "expo-constants";
import { Platform } from "react-native";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { useAuthStore } from "@/src/store/auth";
import type {
  DocumentConfirmItem,
  DocumentConfirmResult,
  DocumentExtraction,
  ExtractedDocumentItem,
} from "@/src/types/api";

const AI_PORT = 8001;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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

async function readErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      const errBody = JSON.parse(text) as { error?: string; detail?: string };
      return (
        errBody.error ||
        errBody.detail ||
        `${fallback} (${res.status})`
      );
    } catch {
      const trimmed = text.trim().slice(0, 200);
      if (trimmed) return trimmed;
    }
  }
  return `${fallback} (${res.status})`;
}

function guessMediaType(name: string, kind: "image" | "pdf"): string {
  if (kind === "pdf") return "application/pdf";
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return out;
}

/**
 * Copy Android content:// (and other unreadable) URIs into app cache so
 * FileSystem / Gemini upload can read them.
 */
async function ensureReadableFileUri(uri: string, kind: "image" | "pdf") {
  const ext = kind === "pdf" ? "pdf" : "jpg";
  const cacheDir = FileSystem.cacheDirectory;

  // Legacy FileSystem cannot read Android SAF / content URIs directly.
  const needsCopy =
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    (Platform.OS === "android" && !uri.startsWith("file://"));

  if (!needsCopy || !cacheDir) {
    return uri;
  }

  const dest = `${cacheDir}carbon-loop-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** Read local file URI into base64 (no data: prefix). */
export async function fileUriToBase64(
  uri: string,
  kind: "image" | "pdf" = "image"
): Promise<string> {
  const readableUri = await ensureReadableFileUri(uri, kind);
  const errors: string[] = [];

  // 1) New File API (handles many SAF / cache paths on Android)
  try {
    const file = new File(readableUri);
    const ab = await file.arrayBuffer();
    if (ab.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("File too large (max 10MB)");
    }
    if (ab.byteLength === 0) {
      throw new Error("File is empty");
    }
    return uint8ToBase64(new Uint8Array(ab));
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "File.arrayBuffer failed");
  }

  // 2) Legacy readAsStringAsync (file:// cache copies)
  try {
    const b64 = await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!b64) throw new Error("Empty base64 from FileSystem");
    if ((b64.length * 3) / 4 > MAX_UPLOAD_BYTES) {
      throw new Error("File too large (max 10MB)");
    }
    return b64;
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "readAsStringAsync failed");
  }

  // 3) fetch → blob (works for some file:// URIs)
  try {
    const res = await fetch(readableUri);
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("File too large (max 10MB)");
    }
    if (ab.byteLength === 0) throw new Error("File is empty");
    return uint8ToBase64(new Uint8Array(ab));
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "fetch failed");
  }

  throw new Error(
    kind === "pdf"
      ? `Couldn't read this PDF on your device. Try a smaller file, or photograph the bill instead. (${errors[0] ?? "unreadable"})`
      : `Couldn't read this image. (${errors[0] ?? "unreadable"})`
  );
}

export type ExtractStreamHandlers = {
  onPartial: (partial: Partial<DocumentExtraction>) => void;
  onFinish: (object: DocumentExtraction) => void;
  onError: (error: Error) => void;
};

/** Extract document via JSON response (Metro-safe; no AI SDK client). */
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
  const dataBase64 = await fileUriToBase64(input.uri, input.kind);

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
    throw new Error(await readErrorMessage(res, "Extract failed"));
  }

  const parsed = (await res.json()) as DocumentExtraction;
  if (!parsed?.items) {
    throw new Error("Could not parse extraction result");
  }

  handlers.onPartial(parsed);
  handlers.onFinish(normalizeExtraction(parsed));
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
  items: DocumentConfirmItem[],
  extras?: { userName?: string; documentTitle?: string }
): Promise<DocumentConfirmResult & { total_inr?: number }> {
  const res = await fetch(`${getAiBaseUrl()}/api/documents/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      items,
      userName: extras?.userName,
      documentTitle: extras?.documentTitle,
    }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Confirm failed"));
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
 * Expects a plain text stream from the AI service.
 */
export async function streamDocumentChat(
  input: {
    messages: DocumentChatMessage[];
    documentContext: string;
    userName?: string;
  },
  handlers: DocumentChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const messages = input.messages.map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const res = await fetch(`${getAiBaseUrl()}/api/documents/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      messages,
      documentContext: input.documentContext || undefined,
      userName: input.userName,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Chat failed"));
  }

  let accumulated = "";

  if (!res.body) {
    const text = await res.text();
    accumulated = text;
    handlers.onPartial(accumulated);
    handlers.onFinish(accumulated.trim());
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
    handlers.onPartial(accumulated);
  }

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
