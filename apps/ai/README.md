# Carbon Loop AI

Next.js service for document extract + bill chat + Karma support agent (Vercel AI SDK + Gemini).

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Set `GOOGLE_GENERATIVE_AI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey).

Optional env:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_MODEL` | `gemini-3.8-flash` | Gemini model id for document OCR/chat |
| `AI_SUPPORT_MODEL` | `gemini-3.5-flash-lite` | Fast Flash-Lite for `/api/support/chat` (2.5 Flash-Lite retiring Oct 2026) |
| `FASTAPI_BASE_URL` | `http://localhost:8000` | Confirm/import + support tool proxies |

```bash
pnpm dev
```

Listens on **http://localhost:8001**. From the monorepo root: `pnpm ai`.

Model calls use **low thinking** for reliable OCR and chat (`minimal` is not supported on Gemini 3.8 Flash).

## Endpoints

- `POST /api/documents/extract` — multipart `file` or JSON `{ mediaType, dataBase64, hint }` → JSON `DocumentExtraction`
- `POST /api/documents/chat` — JSON `{ messages: [{ role, content }], documentContext }` → plain text stream
- `POST /api/documents/confirm` — proxies items to FastAPI `POST /api/v1/transactions/import`
- `POST /api/support/chat` — Karma support agent; body `{ messages: UIMessage[], userName? }` → UI message SSE stream (tools: benefits, guides, score, impact, rewards, offsets, facilities, `openScreen`). Expo uses a Metro-safe SSE client (no `@ai-sdk/react`).
