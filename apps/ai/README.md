# Carbon Loop AI

Next.js service for real document extract + bill chat (Vercel AI SDK + Gemini).

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Set `GOOGLE_GENERATIVE_AI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
pnpm dev
```

Listens on **http://localhost:8001**.

## Endpoints

- `POST /api/documents/extract` — multipart `file` or JSON `{ mediaType, dataBase64, hint }` → streamed structured object
- `POST /api/documents/chat` — AI SDK UI chat (`useChat`) with document context
- `POST /api/documents/confirm` — proxies items to FastAPI `POST /api/v1/transactions/import`
