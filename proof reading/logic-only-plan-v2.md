# Logic-Only Plan v2 (UI FREEZE — teammate owns UI)

## Rule
Zero touches to: `apps/mobile/app/**`, `apps/mobile/components/**`, `global.css`, `src/theme/*`.
Only logic: `src/store/*`, `src/lib/*`, `src/types/*`, `src/hooks/*`, `apps/api/**`.
UI teammate gets clean hooks to wire later, no merge conflicts.

## Workflow (logic only)
```
[auth.ts calc] -> totalKg + provisional (650+(110-kg)*2.2, cap 680, shopping reversed)
  -> POST /onboarding/baseline
  -> server stores + returns meter
  -> hooks expose useScore()/useDataMeter() for UI teammate (he renders)
  -> bills in -> server meter -> verified (same scale) + nudge flag after 14d
  -> rewards track untouched, still immediate
```

## Agents (each field separate, no UI agent)
- A1 Backend DB+API: `models.py` (provisional/verified/confidence/state/hash/meter/created_at), `schemas.py`, `routes.py` (POST baseline, GET score/meter), seed defaults. No scoring math.
- A2 Backend engine: `engines/scoring.py` + `carbon.py` + `services/core.py` (provisional_kcs, verified_kcs, data_meter, quiet 3-week variety, nudge rule, anti-gaming: 0 pts for baseline edits, >300pt redeem blocked while provisional). + pytest.
- A3 Mobile logic: `src/store/auth.ts` (new formula + shopping reverse + scoreState/confidence), `src/types/api.ts`, `src/lib/api.ts`, `src/hooks/queries.ts` (useScore/useDataMeter with fallbacks). No app/ screens.
- A4 QA reviewer: reviews all diffs, runs pytest + typecheck, checks zero UI files touched (`git status`), validates contracts match.

## Contract for UI teammate (he builds later, we don't)
- `useScore()` -> { provisional, verified, state: provisional|verified, confidence: Low|Med|High, signals x/12, categories[5], merchants, missing[], nudge:boolean }
- `GET /api/v1/users/me/score` same JSON. Nudge copy: "We need more data to calculate your Carbon Score (Upload electricity, shopping, food + travel bills to improve accuracy) [Upload]".
- No UI changes from us — he reads these hooks when ready.

## Shopping fix (logic only, in auth.ts + mirrored server)
`shoppingKg = max(12, frequent + selective_rev - repair_credit)`, frequent 0/10/22/40, selective_rev 16/10/6/0 (reversed), repair_credit 0/4/8/12 (subtract).

## Verify
- pytest pass, typecheck pass, `git diff --name-only` shows zero `app/` or `components/` files.
