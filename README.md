# Consumer Carbon Loop

Personal circularity decision engine — scan → compare → act → reward.

## Structure

- `apps/mobile` — Expo SDK 57 / React Native / Expo Router
- `apps/api` — FastAPI circularity engines + hardcoded Indian demo seed (Postgres later)
- `apps/ai` — Next.js Vercel AI SDK service (Gemini document extract + bill chat)

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io/) (`corepack enable` then `corepack prepare pnpm@10.17.1 --activate`)
- Python 3.11+ (for the API)
- A [Google AI Studio](https://aistudio.google.com/apikey) API key for document upload / bill chat

## Run everything (3 terminals)

Document upload needs **API + AI + Mobile** at once. From the repo root you can use the shortcuts after each app is installed once.

### 1. API — port `8000`

```bash
cd apps/api
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from the repo root (after the venv exists): `pnpm api`

Demo barcode (hero phone): `8901030865822`

### 2. AI — port `8001`

```bash
cd apps/ai
pnpm install
cp .env.example .env.local
```

Edit `apps/ai/.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
FASTAPI_BASE_URL=http://localhost:8000
AI_MODEL=gemini-3.8-flash
```

Then:

```bash
pnpm dev
```

Or from the repo root: `pnpm ai`

Model notes:

- Default / recommended: **`gemini-3.8-flash`** (current Gemini Flash; replaces deprecated `gemini-2.5-flash` / `gemini-2.5-flash-lite`)
- Override anytime with `AI_MODEL` in `.env.local` (e.g. `gemini-3.7-flash` or `gemini-3.5-flash-lite`)
- See [Gemini model docs](https://ai.google.dev/gemini-api/docs/models)

### 3. Mobile — Expo

```bash
cd apps/mobile
pnpm install
pnpm start
```

Or from the repo root: `pnpm mobile`

Scan the QR code with Expo Go, or press `a` / `i` for emulator. Use a **device on the same LAN** as the machines running API/AI (or an Android emulator).

UI is **gluestack-ui v5 style** on **UniWind** (Tailwind v4) with a liquid-glass + brutalist circular-eco theme. Skills live in `.agents/skills/gluestack-ui-v5/`.

The app auto-resolves hosts from Expo Metro (LAN IP on devices, `10.0.2.2` on Android emulator). Optional overrides in `apps/mobile/.env`:

- `EXPO_PUBLIC_API_URL` — FastAPI (default port 8000)
- `EXPO_PUBLIC_AI_URL` — AI service (default port 8001)

Copy from `apps/mobile/.env.example` if you need overrides.

## Hero demo (90s)

1. Open Home — Circularity Score ~74  
2. Scan product → demo barcode  
3. See repair/refurbish/resell/donate/recycle/replace  
4. Best = Repair (~₹4,000, ~120 kg CO₂e)  
5. Find repair → mark complete → +100 points → score rises  

## Notes

- No Postgres/Redis yet — in-memory seed + engines.
- External product APIs fall back to seed data (demo never dies).
- Custom warm design system in `apps/mobile` theme / components.
