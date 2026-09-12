# Karma / Carbon Loop — Project Context

**Purpose:** canonical handoff for anyone working on this repository. This document describes the product, code layout, contracts, scoring rules, local runbook, and current caveats.

**Snapshot date:** 2026-09-12  
**Repository:** `carbon-loop-app`  
**Current commit:** `21c47be feat: add sustainable purchase verification rewards`  
**Branch state:** the working tree also contains uncommitted sustainable-purchase UI/API changes. Do not treat those changes as released or discard them without checking with the owner.

## 1. Product in one paragraph

Karma (repository name: Carbon Loop) is a mobile-first personal circularity and climate-impact app. It combines onboarding data, product/receipt intelligence, circular actions, mobility, solar intelligence, verified sustainable purchases, partner offers, offsets, and rewards. The home screen should show a **Carbon Credit Score / Karma Circularity Score (KCS)** as the user’s impact-quality metric. Reward/impact points are a separate incentive balance and must never be substituted for the score.

The product is currently a polished demo/prototype with a local SQLite backend and optional Gemini-powered AI service. Several flows are intentionally demo-backed, but the UI is being shaped as a production product rather than a development console.

## 2. Non-negotiable product vocabulary

| Concept | Meaning | Current source |
|---|---|---|
| Carbon Credit Score / KCS | A provisional or verified 480–820 index derived from carbon-impact inputs. It is displayed in the home score ring, profile, and impact surfaces. | `apps/api/app/engines/scoring.py`, `apps/mobile/app/(tabs)/index.tsx` |
| Provisional score | Initial estimate based on onboarding/baseline data. It should be visibly labelled provisional until data confidence is sufficient. | `UserModel.provisional_score`, `score_state`, `score_confidence` |
| Verified score | Higher-confidence score after enough varied activity/history. | `UserModel.verified_score` |
| Reward / Impact points | Incentive currency earned from circular actions, walking, solar recommendations, and sustainable-purchase verification. | `UserModel.impact_points`, `ActivityEventModel.points_delta` |
| Circularity score | Older/secondary circularity presentation used in some profile/legacy cards. It is not a replacement for KCS or reward points. | legacy UI and docs |

Never render a hard-coded `68` as the user’s score. Do not show reward points as the carbon score. Existing labels (“Karma Coins”, “Green Points”, “Impact Points”) are inconsistent; backend naming is currently `impact_points`.

## 3. System at a glance

```text
Expo mobile/web (apps/mobile)
  ├─ Zustand auth/UI state + TanStack Query cache
  ├─ REST client: apps/mobile/src/lib/api.ts
  └─ Expo Router screens/components
          │ HTTP /api/v1
          ▼
FastAPI API (apps/api, port 8000)
  ├─ routes.py: auth, users, scores, impact, activity, products, rewards,
  │             solar, commute, receipts, offsets, facilities, verification
  ├─ services/core.py + services/solar.py
  ├─ engines/scoring.py, carbon.py, circularity.py, commute.py, repair_replace.py
  ├─ SQLAlchemy models + SQLite carbon_loop.db
  └─ seed/compatibility repair on startup
          │ optional HTTP proxy
          ▼
AI service (apps/ai, port 8001)
  ├─ Gemini document extraction/chat
  └─ confirmation proxy to FastAPI transactions/import flow
```

## 4. Repository map

```text
apps/mobile/          Expo Router application for native and web
apps/api/             FastAPI backend, SQLAlchemy models, scoring engines
apps/ai/              Next.js/Vercel AI service for document workflows
assets/               app icon, logo, wordmark, screenshots
proof reading/        design decisions, QA notes, system proposals, this context
README.md             product overview and setup (some version claims are stale)
start-*.sh/.bat      convenience launch scripts
docker-compose.yml    optional local service orchestration
```

### Mobile entry points

- `app/_layout.tsx`: fonts, providers, auth hydration, root stack.
- `app/(tabs)/_layout.tsx`: custom floating dock with Home, Tools, central Scan, Impact, Actions. Profile is opened from the Home avatar rather than the dock.
- `app/(tabs)/index.tsx`: home score ring, next best action, mobility/steps, points, impact summaries.
- `app/(tabs)/tools.tsx`: tool cards for product scan, receipt import, recycling hubs, offsets, and sustainable-purchase verification.
- `app/(tabs)/impact.tsx`: Overview/Solar/Carbon/Financial/Rewards views.
- `app/(tabs)/actions.tsx`, `offers.tsx`, `profile.tsx`: action completion, partner offers, account/profile.
- `app/scan`, `app/receipt`, `app/map`, `app/offsets`, `app/rewards`: supporting flows.
- `app/tools/verify-sustainable-purchase.tsx`: sustainable purchase verification flow.
- `components/custom/`: domain cards, score rings, solar hero/dashboard, charts, and verification visuals.
- `src/lib/api.ts`: typed REST client and token handling.
- `src/store/`: Zustand stores; the sustainable-purchase store is currently uncommitted and non-persistent.

### Mobile navigation invariant

The central scan button must remain visually centered in the bottom dock. Dock height and bottom clearance are centralized in `src/theme/layout.ts`; avoid one-off screen-specific offsets. Long names must wrap or truncate inside their own header region instead of shifting the entire layout horizontally.

## 5. Mobile feature behavior

### Home and score

The home hero presents the dynamic KCS/carbon score ring, provisional/verified state, score trend, footprint, target, streak, recommendations, and reward points. The score ring is not a reward counter. The current web/mobile design uses a dark-green/mint palette with light cards and IBM Plex Mono for numeric accents.

### Tools

Tools are cards, not a second score system:

1. Scan Product — barcode/product lookup and circular options.
2. Import Receipt — receipt parsing and transaction import.
3. Recycling Hubs — nearby facility map.
4. Offset Carbon — project listing and purchase.
5. Verify Sustainable Purchase — document upload/verification and reward claim.

### Impact and rewards

Impact has separate tabs for solar, carbon, financial impact, and rewards. Walking/steps is a metric that earns points over time; it is not a tool card. Reward points should be visible on high-value surfaces such as Home, Impact/Rewards, and partner offers while remaining visually distinct from KCS.

### Solar intelligence

Solar includes a production-style green visual system, solar score, live/pseudo-3D panel hero, current-versus-optimized comparison, recommendations, and solar rewards. Older design notes contain cards such as “today’s energy rhythm” and “tomorrow’s forecast”; these are not automatically authoritative. Check current screen code and owner decisions before restoring them.

## 6. API surface

FastAPI uses the `/api/v1` prefix. Important groups:

- **Auth:** signup, signin, demo users, current user.
- **User/impact:** `/users/me`, impact summary, timeseries, activity, recommendations, closet, badges.
- **Scores/onboarding:** baseline submission, score, data-meter/confidence.
- **Mobility:** steps read/sync and commute log/summary.
- **Solar:** solar impact aliases, recommendation acceptance/completion.
- **Circular actions:** product barcode/detail/options, action completion, facilities/nearby.
- **Transactions/documents:** transactions, receipt parse, document examples/process/confirm.
- **Rewards/offsets:** rewards list/redeem, offset projects/purchase.
- **Sustainable purchase:** `POST /api/v1/sustainable-purchases/verify`; current uncommitted work also adds a demo reset endpoint.
- **AI:** ask/assistant endpoint and AI-service proxy support.

`apps/api/app/main.py` creates tables with SQLAlchemy `create_all`, repairs missing KCS columns, seeds demo data, and installs permissive CORS middleware. The local database is `apps/api/carbon_loop.db`.

## 7. Persistence model

Core SQLAlchemy entities in `apps/api/app/db/models.py`:

- `UserModel`: identity, password hash, KCS fields, impact points, streak/trend, preferences, baseline/data-meter state.
- `ProductModel`, `UserProductModel`: catalog and user ownership/scan data.
- `TransactionModel`: imported purchases and carbon/category data.
- `FacilityModel`: repair/recycling locations.
- `RecommendationModel`, `UserCompletedActionModel`: suggested and completed actions.
- `RewardModel`, `UserRewardRedemptionModel`: reward catalog/redemptions.
- `OffsetProjectModel`, `UserOffsetPurchaseModel`: offsets.
- `ActivityEventModel`: append-only-ish impact/activity ledger with `kind`, title, metadata, and `points_delta`.
- `UserDailyStepsModel`: one row per user/day for step sync.
- `SolarRecommendationStateModel`, `UserCommuteTripModel`: solar and commute state.

There is no dedicated sustainable-verification table yet. Verification idempotency is currently inferred from an `ActivityEventModel` of kind `sustainable_purchase_verification`.

## 8. Scoring and points rules

### KCS formula

Current code in `engines/scoring.py`:

```text
reference_kg = 110
base_score   = 650
slope        = 2.2
kcs          = clamp(round(650 + (110 - total_kg) * 2.2), 480, 820)
```

Lower estimated impact produces a higher score. Keep score state and confidence visible: a provisional score is an estimate, not a certified carbon-credit balance.

### Action points

Current default point awards include repair 100, refurbish 120, recycle 150, donate 100, resell 90, reduce 80, and replace 0. Exact scoring belongs in the engine, not in screen constants.

### Data-meter verification gate

The documented gate expects enough signals, at least four of five categories, multiple merchants, and varied history (at least three ISO weeks with no single day over half the activity). Confidence is low below six signals, medium otherwise; a high/verified state needs the gate. The user should receive a nudge after roughly 14 days if still provisional.

### Steps

Steps are stored per user/day and synced through API endpoints. The intended UX is a time-series incentive: more walking over time earns more reward points. Do not fold step points into the KCS formula unless the scoring contract is explicitly changed.

## 9. Sustainable purchase verification

### Intended flow

1. User opens Tools → Verify Sustainable Purchase.
2. They upload a receipt/document or use the demo fallback.
3. The UI shows staged verification: connecting, reading document, checking ownership, checking vehicle category, EV detected.
4. Backend verifies the demo purchase, awards 1,500 impact points on the first successful claim, and returns the vehicle result.
5. A loot-box/reward reveal communicates the reward; repeat verification is idempotent and awards zero additional points.

### Current implementation status

The committed feature is in `21c47be`. The working tree also contains an in-progress refinement:

- `components/custom/sustainable-verification/document-uploader.tsx`
- `components/custom/sustainable-verification/verification-scanner.tsx`
- `components/custom/sustainable-verification/lootbox-reveal.tsx`
- `src/store/sustainable-purchase.ts`
- modifications to the verification screen, Tools, Impact, API client, `routes.py`, and `services/core.py`

The in-progress client store tracks verified/claimed state, document metadata, vehicle metadata, and a 1,500-point reward. It is not persisted across app restarts. The backend activity ledger is the stronger source of truth.

The current reset endpoint deletes the verification activity and subtracts points with a clamp for demo reset behavior. It is not a production account-reversal design and should be removed or protected before launch.

### Production seams still needed

- Real document/OCR and ownership providers instead of demo EV detection.
- A dedicated verification/claim table with audit status, provider response, timestamps, and user identity.
- Server-authoritative reward claim transaction and replay protection.
- Persistent client query/state invalidation after claim.
- Explicit privacy/retention policy for uploaded documents.

## 10. AI service

`apps/ai` is a Next.js service on port 8001 using Vercel AI SDK and Google Gemini. It exposes document extraction, document chat, and confirmation routes. `POST /api/documents/confirm` proxies confirmed data into the FastAPI transaction/import flow. Required environment variable: `GOOGLE_GENERATIVE_AI_API_KEY`; optional `AI_MODEL` and `FASTAPI_BASE_URL`.

The mobile app can run without the AI service for core demo flows. AI failures should degrade to a clear error state, not silently convert to fake transaction data.

## 11. Local runbook

Run from the repository root. Use separate terminals.

```bash
# API
cd apps/api
python -m venv .venv                 # first run only
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# AI service (optional)
pnpm --dir apps/ai dev                 # port 8001

# Expo web/native
pnpm --dir apps/mobile start            # Expo dev server, usually 8081 for web
```

On Windows, the root `start-backend.*` and `start-server.*` helpers may be more convenient, but inspect them before relying on their path assumptions. Typical local URLs are:

- API docs: `http://127.0.0.1:8000/docs`
- Mobile web: `http://127.0.0.1:8081`
- AI: `http://127.0.0.1:8001`

The API seeds demo users on an empty database. Demo credentials and the demo token are configuration/data for local development only and must not be shipped as production secrets.

## 12. Verification evidence

The last verified baseline before the current uncommitted refinement included:

- TypeScript check: `pnpm exec tsc --noEmit --pretty false` passed.
- API tests: `pytest -q` — 51 passed.
- Expo web export passed.
- Browser smoke: Tools and sustainable verification pages loaded without console warnings/errors.
- API idempotency check: first sustainable verification awarded 1,500 points; second awarded 0 and created no duplicate activity event.

The browser automation could not reliably trigger Expo DocumentPicker’s web file callback; this is an automation limitation, not proof that native file selection is broken. Re-test upload manually in a real browser before release.

## 13. Known inconsistencies and risks

1. **Historical docs versus code:** `proof reading/scoring-logic.md` and older system proposals describe an older cap/formula. Current code in `engines/scoring.py` is authoritative.
2. **README version drift:** README mentions React Native 0.79; `apps/mobile/package.json` currently uses React Native 0.86.3 and Expo 57.
3. **Reward naming drift:** backend uses `impact_points`, while screens use several labels. Pick one public term and migrate copy consistently.
4. **CORS:** API currently allows `*`; acceptable for local demo, unsafe as a production default.
5. **Schema migrations:** startup uses `create_all` and compatibility column repair, not a full migration system. Existing databases can still drift.
6. **Auth/security:** demo token, local SQLite, and seeded passwords are development-only. Password hashing is intentionally expensive; clients need a timeout that tolerates slower devices.
7. **Verification persistence:** client Zustand state is not persisted; backend ledger is authoritative but the feature has no dedicated verification table.
8. **Reset endpoint:** current demo reset mutates earned points and must not be exposed to arbitrary production users.
9. **AI dependency:** missing/invalid Gemini configuration must be handled explicitly.
10. **Untracked artifact:** repository root contains an untracked executable named `4,350`; investigate before committing unrelated work.
11. **Working-tree feature edits:** sustainable verification/API/UI files listed in the snapshot are not committed. Review and test as one change set.

## 14. Proof-reading folder guide

- `home-kcs-ring-decision.md`: approved home-ring/KCS direction.
- `logic-only-plan-v2.md`: implementation planning notes.
- `master-agent-protocol.md`: delegation/working protocol.
- `qa-report.md`: QA findings and scoring/data-meter checks.
- `scoring-logic.md`: scoring design history; compare with current engine.
- `skills-and-system.md`: product/system capability notes.
- `system-design-diagram.md`: architecture diagram.
- `system-design-proposal-v1.md`: earlier system proposal.
- `project-context.md`: this consolidated handoff.

When a design note conflicts with executable code, record the decision here and update the older note rather than silently changing the formula or API contract.

## 15. Safe next-agent checklist

Before changing code:

1. Pull/inspect the latest branch and check `git status`; preserve unrelated in-progress edits.
2. Read this file plus the relevant proof-reading decision note.
3. Decide whether the change is mobile, API, AI, or cross-layer and update the contract first.
4. Keep KCS, provisional/verified state, and reward points separate in names, API fields, copy, and tests.
5. Run TypeScript, API tests, Expo web export, and a browser smoke check for UI changes.
6. For visual work, inspect a screenshot at mobile width and check overflow, dock centering, score alignment, and long-name wrapping.
7. Do not commit or push unless explicitly requested; report uncommitted files and verification evidence.

## 16. Source-of-truth table

| Question | Source of truth |
|---|---|
| Score calculation | `apps/api/app/engines/scoring.py` |
| Stored user/reward fields | `apps/api/app/db/models.py` |
| REST contracts | `apps/api/app/api/routes.py` + `apps/mobile/src/lib/api.ts` |
| Mobile navigation | `apps/mobile/app/_layout.tsx`, `app/(tabs)/_layout.tsx` |
| Current visual implementation | mobile screen/component code and screenshot QA |
| Product decisions | relevant file in `proof reading/`, with this document resolving conflicts |
| Local setup | `README.md`, package manifests, and actual start scripts |
| Production readiness | not yet established; see risks above |
