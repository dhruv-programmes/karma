# System Design Proposal v1 — Karma Credit Score + Rewards (NEEDS APPROVAL, no code yet)

## 0. Naming (locked)
- **Karma Credit Score (KCS)** = footprint-based, 480-820, Provisional* -> Verified. This is the "carbon credit score".
- **Rewards / Impact Points** = action-based (repair/recycle/donate...), immediate, redeemable Day 1. Separate track, never mixed.
- User will give final KCS mapping later. This design keeps the slot ready with interim formula `650+(110-kg)*2.2` so both tracks work without conflation.

## 1. Flow
```
Onboarding (routine+goal)
  -> compute totalKg (transport+shopping+20) [mobile + mirrored server]
  -> Provisional KCS = 650+(110-totalKg)*2.2, capped 680, confidence Low, badge Provisional*
  -> POST /onboarding/baseline (server stores hash, budget=target)
  -> Home shows Provisional* + Data Meter (no countdown)
  -> User adds bills: electricity/shopping/food/travel via receipts/import/scans/check-ins
  -> Server counts signals/categories/merchants/variety (quiet anti-dump)
  -> When >=12 signals + >=4/5 cats + >=5 merchants + >=3 weeks variety -> compute Verified KCS (same scale) + confidence High, badge Verified
  -> If 14d since baseline and still unverified -> nudge banner (no days-left, just missing list + Upload CTA)
  -> Rewards run in parallel from Day 1 via complete_action -> points -> redeem (unchanged)
```

## 2. Formulae
- totalKg: transport table (0/4-6-12-2 ... often 22/26/44/6, min 8) + shopping FIXED (see §3) + home 20. Range ~40-190.
- Provisional/Verified shared scale: `raw=650+(110-kg)*2.2, clamp 480-820`. REF=110 tunable, BASE=650 mid, SLOPE=2.2.
- Provisional shown = min(raw,680). Verified shown = raw.
- Confidence: Low (<6 signals), Medium (6-11), High (verified).
- Target (goal %): `round(totalKg*(1-pct/100))`, no effect on score.

## 3. Shopping fix (reverse bug)
Today repair-often +12kg (wrong) and selective-often +20kg (wrong), contradicting score bonuses.
New: `shoppingKg = max(12, frequent + selective_rev - repair_credit)`
- frequent (driver): never 0 / rarely 10 / sometimes 22 / often 40. Ask countable: deliveries+new non-grocery items/month 0/1-2/3-5/6+.
- selective_rev (saver, reversed): never 16 / rarely 10 / sometimes 6 / often 0.
- repair_credit (saver, subtract): never 0 / rarely 4 / sometimes 8 / often 12.
- Ex: eco 0+0-12->12, heavy 40+16-0=56.

## 4. Backend changes (no UI)
- `UserModel` add: provisional_score INT, verified_score INT NULL, score_confidence FLOAT, score_state ENUM(provision/baseline-only/verified), baseline_hash TEXT, baseline_total_kg FLOAT, data_meter_json TEXT, baseline_created_at.
- New/extend routes: `POST /onboarding/baseline {transport,shopping,goal,totalKg,provisional}` -> stores + returns meter; `GET /users/me/score` -> {provisional, verified, state, confidence, signals, categories[5], merchants, missing[], nudge:boolean}; `GET /users/me/data-meter` (same payload, for Home).
- Engine `scoring.py` + `carbon.py`: `provisional_kcs(totalKg)`, `verified_kcs(actual_monthly_kg)` (actual = avg_daily*30 via estimate_from_spend), `data_meter(user)` with quiet variety check (>=3 distinct ISO weeks, >50% single-day = fail, message "varied history").
- Nudge: `nudge = (now-baseline_created_at>=14d) and state!=verified`. Copy: "We need more data to calculate your Carbon Score (Upload electricity, shopping, food + travel bills to improve accuracy) [Upload]".
- Anti-gaming: baseline edits give 0 points; points only via SCORE_BUMP on verified completes; provisional never redeemable for >300pt rewards (server enforces); baseline hash logged.

## 5. Mobile changes (logic vs UI split)
- Logic (`auth.ts`, `types/api.ts`, `lib/api.ts`, `hooks/queries.ts`): replace 642+bonuses with §2 formula + shopping §3, add `scoreState/confidence/meter` to store, POST baseline, poll `GET /score`.
- UI (only `reveal.tsx`, `(tabs)/index.tsx`, `profile.tsx` + existing cards): add `Provisional* / Verified` badge, `x/12 signals + missing chips + confidence bar`, nudge banner. No new colors, no layout restyle. Semantic tokens only, gluestack props (space/size/variant), FlashList rules preserved. Validate with `gluestack-ui-v5:validation`.

## 6. Verification
- `pytest apps/api/tests` must pass; new tests: provisional cap, shopping reverse, meter gating, nudge after 14d, rewards independent of baseline edits.
- Mobile: `pnpm typecheck/lint`, Expo v57 docs, gluestack validation checklist, no `typography-*/gray-*` tokens, no inline colors.

## 7. Subagent split (after approval, I only review)
- A1 Backend DB+API (models/schemas/routes/migrations/seed) — no UI.
- A2 Backend engine (formula/meter/confidence/anti-dump + tests) — no UI.
- A3 Mobile logic (store/types/api/hooks/onboarding calc + POST) — no styling.
- A4 Mobile UI (badges/meter/nudge in existing screens, same palette) — no scoring logic.
- A5 QA reviewer (reviews all diffs, runs pytest+typecheck+gluestack validation, blocks UI drift).
- I (master) review entire touched paths, advise, block merge on slop.

## 8. Open for you
1. Approve REF=110/BASE=650/SLOPE=2.2 interim until you give final KCS mapping?
2. Approve thresholds 12 / 4-of-5 / 5 merchants / 3-week variety (quiet)?
3. Approve >300pt rewards blocked while Provisional*?
Reply Approve / Approve-with-edits / Redesign.
