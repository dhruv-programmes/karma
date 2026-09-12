# Skills read + System understanding (saved 2026-09-12)

## Skills read
- `.agents/skills/gluestack-ui-v5/SKILL.md` (overview) + sub-skills: setup, creating-components, components, styling, variants, performance, validation
  - Rule: Gluestack components over RN primitives, props over className, semantic tokens ONLY (`bg-primary`, `text-foreground`, `border-border`, no `gray-*`/`red-500`/`typography-*`), className over inline styles, spacing scale, tva for variants, compound components (ButtonText, InputSlot).
- `.agents/skills/vercel-react-native-skills/SKILL.md` + `AGENTS.md` (35+ rules) + `rules/*`
  - Critical: FlashList virtualization, memo items, stable callbacks, GPU-only animations (transform/opacity), native navigators, expo-image, Pressable, safe-area, no `&&` with falsy, Text-in-Text.
- `.agents/skills/imagegen-frontend-mobile/SKILL.md` + `.claude/skills/...` — images-only, no code. Ignore for implementation.
- `apps/mobile/AGENTS.md` -> Expo v57 docs mandatory. `skills-lock.json` confirms 3 skills.

## UI lock (no AI slop)
- Keep `apps/mobile` theme: bg #F4FAF6, primary #2EA86E, accent #FF9678, Nunito + IBM Plex Mono, radius 12-32, UniWind + Tailwind v4.
- Only touch logic files (`src/store/auth.ts`, `app/onboarding/*`, `apps/api/...`). No color/layout restyle. Validate with `gluestack-ui-v5:validation`.

## System (current)
- Mobile Expo Router + Zustand (`auth.ts`) + React Query. API FastAPI + SQLite. Engines: carbon/circularity/repair_replace/scoring. Seed: 3 users, 16 products, 12 BLR facilities.
- Tracks separated:
  - Rewards = actions (REPAIR 100, RECYCLE 150...), immediate, redeemable Day 1.
  - Carbon Score = provisional (questions, capped 680) -> verified (server, >=12 signals, 4/5 categories: electricity/shopping/food/travel/home, 5 merchants, varied history). Mapping TBD by user. After ~2 weeks if insufficient, nudge: "We need more data... (upload bills...)" + Upload CTA.

## Master-agent mode
- I reason, spawn subagents on `implement` with solid prompts. No direct code edits on implement signal.
