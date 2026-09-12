# QA Report — A4 Review of A1/A2/A3 Uncommitted Work (2026-09-12)

Scope: logic-only review. No UI files touched by QA. Fixes limited to logic files.

## 1. Git surface

`git status --short` (tracked mods + untracked):
- M apps/api/app/api/routes.py
- M apps/api/app/db/models.py
- M apps/api/app/db/seed.py
- M apps/api/app/engines/scoring.py
- M apps/api/app/schemas.py
- M apps/api/app/services/core.py
- M apps/mobile/src/hooks/queries.ts
- M apps/mobile/src/lib/api.ts
- M apps/mobile/src/lib/fallbacks.ts
- M apps/mobile/src/store/auth.ts
- M apps/mobile/src/types/api.ts
- ?? apps/api/tests/test_kcs.py
- ?? proof reading/

`git diff --name-only` (tracked): same 11 files as above. No other files.

## 2. Check results

### a) ZERO UI TOUCH — PASS
`git diff --name-only -- 'apps/mobile/app/**' 'apps/mobile/components/**' 'apps/mobile/global.css' 'apps/mobile/src/theme/**' 'apps/mobile/assets/**'` → empty (verified before and after QA fixes).

### b) CONTRACT MATCH — PASS with notes (2 mobile-only normalize fixes applied)
Backend `ScoreResponse` (apps/api/app/schemas.py) vs mobile `ScoreResponse extends DataMeter` (apps/mobile/src/types/api.ts), bridged by `normalizeScoreResponse` (apps/mobile/src/lib/api.ts):

| Backend (snake_case) | Mobile (camelCase) | Status |
|---|---|---|
| provisional: int | provisional: number | MATCH (default fixed 681→650, see §5) |
| verified: int\|None | verified: number\|null | MATCH |
| state: str | state: ScoreState | MATCH (also accepts score_state) |
| confidence: float | confidence: number | MATCH (also accepts score_confidence) |
| confidence_label: str | confidenceLabel: string | MATCH via capitalization (schema default "low" vs runtime "High/Low" — normalize tolerant) |
| signals: int | signals: number | MATCH |
| signals_needed: int (=12) | signalsNeeded: number (=12) | MATCH |
| categories_covered: list[str] | categoriesCovered: number | LOSSY BUT TOLERANT — normalize maps list→length. Actual bucket names are dropped; UI teammate only gets the count. See follow-up §7. |
| categories_needed: int (=4) | categoriesNeeded: number (=4) | MATCH |
| merchants: int | merchants: number | MATCH |
| merchants_needed: int (=5) | merchantsNeeded: number (=5) | MATCH |
| missing: list[str] | missing: string[] | MATCH |
| (absent — quiet by design) | varietyOk: boolean | GAP FIXED in normalize: derived from missing labels (`!"Varied history" in missing`) when backend sends a missing array; explicit varietyOk/variety_ok still wins; else false. See §5. |
| nudge: bool | nudge: boolean | MATCH |
| nudge_copy: str\|None | nudgeCopy: string | MATCH (None→"") |
| baseline_total_kg: float\|None | baselineTotalKg: number | MATCH |
| target_kg: float\|None | targetKg: number | MATCH |

Backend also returns extra keys (`provisional_raw`, `score`, `score_state`, `cats_covered`, `meter`, …) — stripped by `response_model=ScoreResponse`, harmless.

### c) FORMULA — PASS (proven by execution, backend + mobile agree)
Python (apps/api, `app.engines.scoring`):
- 96kg → raw 681, provisional 680 ✓ (spec 96→681/680)
- 40kg → raw 804, provisional 680 ✓ (spec 40→804/680)
- 150kg → 562 verified ✓ (spec 150→562)
- clamp: kcs(-500)=820, kcs(1000)=480 ✓ (480–820)
- cap: PROVISIONAL_CAP=680 ✓
- shopping eco (`never/often/often`) = 12 ✓; heavy (`often/never/never`) = 56 ✓
- transport all-never = 8 (floor) ✓; rarely-row = 24; sometimes-row = 58 ✓
Node (mobile constants in auth.ts): 96→681/680, 40→804/680, 150→562, eco 12 / heavy 56 — identical ✓
Mobile `computeBaselineFootprint` tables (transport per-mode, shopping frequent/selective_rev/repair_credit, homeKg=20, `max(8,…)`, `max(12,…)`) match backend `transport_kg`/`shopping_kg` exactly ✓

### d) METER+NUDGE — PASS
- Gate in `compute_data_meter` (scoring.py): signals≥12, cats≥4, merchants≥5, variety_ok (≥3 distinct ISO weeks AND largest single-day share ≤50%, <3 txns→False) ✓
- Nudge rule: `(now − baseline_created_at) ≥ 14d AND NOT verified_gate`; missing/unparseable baseline → False (never crashes) ✓
- Nudge copy exact: `We need more data to calculate your Carbon Score (Upload electricity, shopping, food + travel bills to improve accuracy)` — `SCORE_NUDGE_COPY` and `fallbackScore.nudgeCopy` match byte-for-byte ✓
- `nudge_copy` is None (backend) / "" (mobile) when no nudge ✓

### e) ANTI-GAMING — PASS (after 1 QA fix)
- Redeem >300 while provisional → 403: `redeem_reward` (core.py) raises HTTPException(403) when `score_state != "verified"`; routes.py only catches ValueError so 403 propagates ✓ (covered by `test_redeem_gate_blocks_over_300_when_provisional`)
- Baseline edits award 0 pts: `onboarding/baseline` touches only score/budget fields, never `impact_points`; `complete_action` is the sole points path and is state-independent ✓
- Rewards independent: `complete_action` has no score gate; only redeem >300 is gated ✓
- FIX APPLIED: server previously stored client `provisional` uncapped (routes.py) — now `min(int, 680)` (§5). Seed values exceeding cap fixed (§5).

### f) BACKWARD COMPAT — PASS
- `computeBaselineFootprint` returns same keys `{totalKg, transportKg, shoppingKg, homeKg, score}` ✓
- Old screens typecheck: tsc shows 0 new errors vs pre-change baseline (§4) ✓
- Signup: `SignUpRequest` unchanged (old clients unaffected); `UserProfile` additions are optional with defaults; pre-KCS rows handled via nullable columns + `ensure_kcs_columns` + seed backfill ✓

## 3. Pytest output (apps/api, .venv)
`27 passed, 2 warnings` (warnings: pre-existing starlette/anyio deprecation notices).
Includes untracked `apps/api/tests/test_kcs.py` (KCS math, meter gating, nudge timing, redeem gate, `build_score_response` shape).

## 4. tsc output (apps/mobile, `tsc --noEmit`)
10 errors before AND after A1–A3 + QA fixes — byte-identical sets (only line numbers shifted in auth.ts). **0 new errors introduced.**
- 6× pre-existing UI errors: `"outline"` variant not assignable (signin, signup, account, baseline ×2, reveal) — UI teammate's files, untouched by logic work.
- 4× pre-existing `expo-file-system` `documentDirectory` errors in src/store/auth.ts — present on clean tree (verified via `git stash`), caused by installed expo-file-system@57 API drift, not by A1–A3.
Stash was popped; no stash left applied (verified `git status --short` restores all 11 mods).

## 5. QA fixes applied (logic files only, minimal diffs)
1. `apps/api/app/api/routes.py` — cap stored provisional: `min(int(body.provisional), 680)` with fallback 650. Reason: server trusted client score; liar could POST 820 and display it.
2. `apps/api/app/db/seed.py` — Aisha seed/backfill 681→680; Rohan seed/backfill 740→680. Reason: violated provisional cap 680 (proven in §2c).
3. `apps/mobile/src/lib/fallbacks.ts` — `fallbackScore.provisional` 681→680 (cap compliance for offline demo).
4. `apps/mobile/src/lib/api.ts` — normalize default provisional 681→650 (match backend default; 681 leaked the 96kg example); derive `varietyOk` from `missing` labels when backend omits the key (explicit key still wins).
Post-fix: pytest 27 passed, tsc still 10 pre-existing/0 new, `import app.api.routes, app.db.seed, app.services.core` OK.

## 6. AI slop / drift flagged (not fixed — owners: A1/A2)
- **Duplicate `build_score_response` in `apps/api/app/services/core.py`** (defs at ~L250 and ~L1136; second wins, first is dead). Dead copy also redefines `NUDGE_COPY`/`_FALLBACK_MISSING` (short lowercase labels) and `_confidence_label` (lowercase labels) — never executes (proven: tests pass with full meter labels) but must be deleted by owner. No runtime effect today.
- `schemas.ScoreResponse.confidence_label` default `"low"` (lowercase) vs runtime `"High/Medium/Low"` — normalize tolerates; suggest capitalizing the default.
- Seed persona differentiation is now 680/680/562 (Aisha/Rohan capped) — if demo wants Rohan visibly greener, verify him via bills (verified path is uncapped) rather than raising provisional.
- `api.ts request()` 4s AbortController surfaces AbortError (not `API_UNAVAILABLE`) to non-`withFallback` callers (complete/redeem) — acceptable (mutations should surface errors), noted only.

## 7. GO / NOGO + follow-ups for UI teammate
**Verdict: CONDITIONAL GO for demo** — logic contract holds, formulas proven, 27/27 tests pass, 0 new type errors, zero UI touches. Conditions: keep the 4 QA fixes in; A1/A2 should delete the dead `build_score_response` copy before merge.

Hooks for UI teammate (all ready, no UI changes needed from logic side):
- `useScore()` / `useDataMeter()` (`apps/mobile/src/hooks/queries.ts`, React Query, 30s stale, offline fallback to `fallbackScore`, auto-sync into `useAuthStore.setDataMeter`).
- `api.getScore()` / `api.getDataMeter()` / `api.syncBaseline()` (`apps/mobile/src/lib/api.ts`) — all return normalized camelCase `ScoreResponse`.
- Store: `useAuthStore` → `scoreState`, `scoreConfidence`, `scoreConfidenceLabel`, `dataMeter`, `startingScore`, `startingFootprintKg`.
- Notes: `categoriesCovered` is a COUNT (bucket list is not preserved — ask if you need names); `varietyOk` is derived from `missing` (no "Varied history" ⇒ OK); `nudgeCopy` is "" when `nudge` is false — render banner only when `nudge === true`; provisional never exceeds 680 by contract.
