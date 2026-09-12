# Consumer Carbon Loop

Personal circularity decision engine — scan → compare → act → reward.

## Structure

- `apps/mobile` — Expo SDK 57 / React Native / Expo Router
- `apps/api` — FastAPI circularity engines + hardcoded Indian demo seed (Postgres later)

## Quick start

### API

```bash
cd apps/api
python -m venv .venv
# Windows
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from the repo root: `pnpm api`

Demo barcode (hero phone): `8901030865822`

### Mobile

```bash
cd apps/mobile
pnpm install
pnpm start
```

UI is **gluestack-ui v5 style** on **UniWind** (Tailwind v4) with a liquid-glass + brutalist circular-eco theme. Skills live in `.agents/skills/gluestack-ui-v5/`.

The app auto-resolves the API host from Expo Metro (LAN IP on devices, `10.0.2.2` on Android emulator). Optional override: set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.

## Hero demo (90s)

1. Open Home — Circularity Score ~74  
2. Scan product → demo barcode  
3. See repair/refurbish/resell/donate/recycle/replace  
4. Best = Repair (~₹4,000, ~120 kg CO₂e)  
5. Find repair → mark complete → +100 points → score rises  

## Notes

- No Postgres/Redis yet — in-memory seed + engines.
- External product APIs fall back to seed data (demo never dies).
- Sleek design skill removed; custom warm design system in `src/theme`.
