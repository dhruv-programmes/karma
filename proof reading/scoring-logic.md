# Carbon Loop — Onboarding Scoring Logic (Proof Reading)

Saved: 2026-09-12 — to remember what we decided.

## 1. Where the score comes from
File: `apps/mobile/src/store/auth.ts` -> `computeBaselineFootprint()`
Shown in: `apps/mobile/app/onboarding/reveal.tsx`

Flow: `baseline.tsx` (routine) -> Continue -> `goal.tsx` (My Goal %) -> Reveal starting point.

Goal % does NOT change score. It only changes target:
`target = round(totalKg * (1 - reductionPct/100))`

## 2. Current logic (in code today)
- `homeKg = 20` fixed
- Transport table by frequency (never/rarely/sometimes/often):
  - rarely: public 4, twowheeler 6, car 12, walk 2
  - sometimes: public 12, twowheeler 16, car 26, walk 4
  - often: public 22, twowheeler 26, car 44, walk 6
  - `transportKg = max(8, sum)`
- Shopping table:
  - rarely: repair 4, selective 6, frequent 10
  - sometimes: repair 8, selective 14, frequent 22
  - often: repair 12, selective 20, frequent 40
  - `shoppingKg = max(12, sum)`
- `totalKg = transportKg + shoppingKg + homeKg` (range ~40-190kg)
- Score (old):
  ```
  start 642
  +14 if public==often
  +18 if walk==often
  -28 if car==often else +12 if car==never
  +28 if repair==often else +12 if sometimes
  -32 if frequent==often else +16 if never
  +10 if selective==often
  clamp 480-820
  ```
- Problem: 642 is arbitrary (demo user Alex Rivera 642/74kg). Effective range only 582-740, clamp never hits. Client-only, gameable, never sent to backend. Backend uses different scale 0-100 (signup=68, Aisha 74, Rohan 88, Maya 52).

## 3. New logic we agreed (to implement)
One-line mapping from footprint, no per-answer bonuses:

```
Score = 650 + (110 - totalKg) x 2.2
score = clamp(round(raw), 480, 820)
shown = min(score, 680) until 3 verified actions
```

- `110` = REF, average Indian urban kg/month. Average person gets middle score.
- `650` = BASE, middle of 480-820. `(480+820)/2 = 650`. Picked for continuity (old demo 642 -> ~650, +8 shift).
- `2.2` = SLOPE, points per kg. 10kg better = +22 pts.
- `680` = provisional cap. Liars can't show >680 without proof.

Examples:
- You, public daily (~96kg): 650 + (14x2.2) = 681
- Green liar (40kg): raw 804 -> shown 680 until verified
- Heavy (150kg): 650 - (40x2.2) = 562
- Max (190kg): 474 -> clamped 480

## 4. Anti-cheat rule
- Answers only set starting line + monthly_budget_kg. Zero points for editing answers.
- Points (impact_points) only from backend verified completes: scan / receipt / repair check-in (SCORE_BUMP in `apps/api/app/engines/scoring.py`).
- Backend stores baseline hash, compares predicted totalKg vs real `estimate_from_spend()` later. Mismatch = flag.

## 5. To-do
- [ ] Replace `auth.ts:125-137` with new formula
- [ ] Send baseline to backend `POST /onboarding/baseline`, make backend authoritative
- [ ] Unify frontend 480-820 vs backend 0-100 (keep both but map clearly)
