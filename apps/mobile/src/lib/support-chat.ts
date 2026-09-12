import { getAiBaseUrl } from "@/src/lib/ai";
import { useAuthStore } from "@/src/store/auth";

export type SupportTextPart = {
  type: "text";
  text: string;
};

export type SupportToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  toolName: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type SupportMessagePart =
  | SupportTextPart
  | SupportToolPart
  | { type: "step-start" };

export type SupportMessage = {
  id: string;
  role: "user" | "assistant";
  parts: SupportMessagePart[];
};

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? `Bearer ${token}` : "Bearer demo-carbon-loop-token";
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createUserSupportMessage(text: string): SupportMessage {
  return {
    id: newId("user"),
    role: "user",
    parts: [{ type: "text", text }],
  };
}

type StreamChunk = {
  type: string;
  [key: string]: unknown;
};

type AssistantDraft = {
  id: string;
  parts: SupportMessagePart[];
  textById: Map<string, { index: number }>;
  toolByCallId: Map<string, number>;
};

function ensureDraft(
  draft: AssistantDraft | null,
  messageId?: string
): AssistantDraft {
  if (draft) {
    if (messageId) draft.id = messageId;
    return draft;
  }
  return {
    id: messageId || newId("assistant"),
    parts: [],
    textById: new Map(),
    toolByCallId: new Map(),
  };
}

function applyChunk(draft: AssistantDraft, chunk: StreamChunk): AssistantDraft {
  const next = draft;

  switch (chunk.type) {
    case "start": {
      if (typeof chunk.messageId === "string") next.id = chunk.messageId;
      return next;
    }
    case "start-step": {
      next.parts.push({ type: "step-start" });
      return next;
    }
    case "finish-step":
    case "finish":
    case "abort":
      return next;
    case "text-start": {
      const id = String(chunk.id ?? "");
      const index = next.parts.length;
      next.parts.push({ type: "text", text: "" });
      if (id) next.textById.set(id, { index });
      return next;
    }
    case "text-delta": {
      const id = String(chunk.id ?? "");
      const delta = typeof chunk.delta === "string" ? chunk.delta : "";
      const loc = next.textById.get(id);
      if (loc) {
        const part = next.parts[loc.index];
        if (part?.type === "text") {
          next.parts[loc.index] = { type: "text", text: part.text + delta };
        }
      } else if (delta) {
        const last = next.parts[next.parts.length - 1];
        if (last?.type === "text") {
          next.parts[next.parts.length - 1] = {
            type: "text",
            text: last.text + delta,
          };
        } else {
          next.parts.push({ type: "text", text: delta });
        }
      }
      return next;
    }
    case "text-end":
      return next;
    case "tool-input-start": {
      const toolCallId = String(chunk.toolCallId ?? "");
      const toolName = String(chunk.toolName ?? "tool");
      const index = next.parts.length;
      next.parts.push({
        type: `tool-${toolName}`,
        toolCallId,
        toolName,
        state: "input-streaming",
      });
      if (toolCallId) next.toolByCallId.set(toolCallId, index);
      return next;
    }
    case "tool-input-delta":
      return next;
    case "tool-input-available": {
      const toolCallId = String(chunk.toolCallId ?? "");
      const toolName = String(chunk.toolName ?? "tool");
      const index = next.toolByCallId.get(toolCallId);
      const part: SupportToolPart = {
        type: `tool-${toolName}`,
        toolCallId,
        toolName,
        state: "input-available",
        input: chunk.input,
      };
      if (index != null) next.parts[index] = part;
      else {
        next.toolByCallId.set(toolCallId, next.parts.length);
        next.parts.push(part);
      }
      return next;
    }
    case "tool-output-available": {
      const toolCallId = String(chunk.toolCallId ?? "");
      const index = next.toolByCallId.get(toolCallId);
      if (index != null) {
        const prev = next.parts[index];
        if (prev && prev.type.startsWith("tool-")) {
          const toolPrev = prev as SupportToolPart;
          next.parts[index] = {
            ...toolPrev,
            state: "output-available",
            output: chunk.output,
          };
        }
      }
      return next;
    }
    case "tool-output-error":
    case "tool-output-denied": {
      const toolCallId = String(chunk.toolCallId ?? "");
      const index = next.toolByCallId.get(toolCallId);
      if (index != null) {
        const prev = next.parts[index];
        if (prev && prev.type.startsWith("tool-")) {
          const toolPrev = prev as SupportToolPart;
          next.parts[index] = {
            ...toolPrev,
            state: "output-error",
            errorText:
              typeof chunk.errorText === "string"
                ? chunk.errorText
                : "Tool failed",
          };
        }
      }
      return next;
    }
    case "error": {
      const err =
        typeof chunk.errorText === "string"
          ? chunk.errorText
          : "Support chat error";
      next.parts.push({ type: "text", text: `\n${err}` });
      return next;
    }
    default:
      return next;
  }
}

function draftToMessage(draft: AssistantDraft): SupportMessage {
  return {
    id: draft.id,
    role: "assistant",
    parts: draft.parts.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text };
      if (p.type === "step-start") return { type: "step-start" };
      return { ...(p as SupportToolPart) };
    }),
  };
}

function parseSseChunk(
  raw: string,
  onEvent: (chunk: StreamChunk) => void
): string {
  // Prefer event boundaries; also accept lone data lines (RN/XHR quirks).
  const parts = raw.split(/\r?\n\r?\n/);
  const incomplete = parts.pop() ?? "";
  for (const block of parts) {
    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        onEvent(JSON.parse(data) as StreamChunk);
      } catch {
        /* ignore partial JSON */
      }
    }
  }
  return incomplete;
}

/**
 * Stream via XHR onprogress — more reliable than fetch ReadableStream on Android.
 */
function streamSseWithXhr(input: {
  url: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
  onBytes: (chunk: string) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", input.url);
    for (const [k, v] of Object.entries(input.headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.responseType = "text";

    let last = 0;
    const emit = () => {
      const text = xhr.responseText ?? "";
      if (text.length <= last) return;
      const slice = text.slice(last);
      last = text.length;
      if (slice) input.onBytes(slice);
    };

    xhr.onprogress = emit;
    xhr.onreadystatechange = () => {
      // readyState 3 = LOADING (streaming body)
      if (xhr.readyState === 3) emit();
    };

    xhr.onload = () => {
      emit();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Support chat failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText) as {
            error?: string;
            detail?: string;
          };
          msg = err.error || err.detail || msg;
        } catch {
          /* keep msg */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    };

    if (input.signal) {
      if (input.signal.aborted) {
        xhr.abort();
        return;
      }
      input.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(input.body);
  });
}

/**
 * Stream Karma support chat using the AI SDK UI message SSE protocol,
 * without importing `ai` / `@ai-sdk/react` (Metro-safe).
 */
export async function streamSupportChat(
  input: {
    messages: SupportMessage[];
    userName?: string;
  },
  handlers: {
    onPartial: (assistant: SupportMessage) => void;
    onFinish: (assistant: SupportMessage) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  let draft: AssistantDraft | null = null;
  let buffer = "";

  const handleEvent = (chunk: StreamChunk) => {
    draft = applyChunk(ensureDraft(draft), chunk);
    handlers.onPartial(draftToMessage(draft));
  };

  await streamSseWithXhr({
    url: `${getAiBaseUrl()}/api/support/chat`,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      messages: input.messages,
      userName: input.userName,
    }),
    signal,
    onBytes: (slice) => {
      buffer += slice;
      buffer = parseSseChunk(buffer, handleEvent);
    },
  });

  if (buffer.trim()) parseSseChunk(`${buffer}\n\n`, handleEvent);

  handlers.onFinish(
    draft
      ? draftToMessage(draft)
      : {
          id: newId("assistant"),
          role: "assistant",
          parts: [{ type: "text", text: "No response." }],
        }
  );
}
