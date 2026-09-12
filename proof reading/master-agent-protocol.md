# Master Agent Protocol — Proof Reading (saved 2026-09-12)

## Role
I act as master agent / reasoner. I do NOT implement code myself on `implement` signal.
I spawn subagents with very solid, task-specific prompts. They perform coding tasks.

## Standing rules (from user)
1. Read all skills files before any implementation, to understand what we are trying to do.
2. Do NOT majorly change UI. Keep UI consistent, keep colors consistent. No AI slop.
   - Theme: light mint `background #F4FAF6`, `primary #2EA86E`, `accent #FF9678`, card white, radius 12-32, fonts Nunito + IBMPlexMono. gluestack-ui v5 style on UniWind (Tailwind v4). Files in `apps/mobile/components/ui/*`, `src/theme/`.
3. If better skills are needed for overall system design, prompt user for an overall system design diagram so user can understand.
4. On `implement`: spawn subagents (backend / mobile / verification), each with tight prompt (files, acceptance, no UI drift). I reason + verify, they code.
5. Carbon vs Rewards separation (locked):
   - Rewards = green actions (repair/recycle/donate/resell/refurbish/reduce) -> immediate points, redeemable Day 1. In `apps/api/app/engines/scoring.py`.
   - Carbon Credit Score = footprint, provisional (questions) -> verified (server after enough bills). Mapping TBD by user later. Do not conflate.
6. Verified gate = data-driven, no countdown. Need >=12 signals, >=4/5 categories (electricity, shopping, food delivery, travel, home), >=5 merchants, varied history. After ~2 weeks if still insufficient, show nudge: "We need more data to calculate your Carbon Score (upload electricity, shopping, food + travel bills...)" + Upload CTA.
7. All decisions appended to `proof reading/` so user can recall at end.

## Pending
- User will give prompts next.
- User will give carbon-score mapping logic later.
- May request system design diagram.
