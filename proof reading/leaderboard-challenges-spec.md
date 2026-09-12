# Leaderboard + Green Challenges — Refined Feature Brief

## Goal

Add a social competition layer that helps users discover friends, compare verified progress, and complete renewable green-action challenges. The experience must feel like a game mission board without turning the product into a game or confusing Carbon Credit Score with reward points.

## Product rules

1. A user can search for another user by unique username and send/remove a friend connection.
2. Leaderboards have two scopes: **Global** (all eligible users) and **Friends** (the current user plus accepted friends).
3. Leaderboards support two independent ranking metrics:
   - **Green/Reward points:** `impact_points`, the incentive balance earned through actions, steps, solar, and challenges.
   - **Carbon Credit Score:** KCS, the 480–820 impact-quality index; show provisional/verified state where relevant.
4. Challenges are renewable and grouped into **Daily**, **Weekly**, and **Monthly** periods.
5. Daily challenges award the least, weekly more, and monthly the most. Rewards are green/impact points, never KCS points.
6. Challenge progress must be server-authoritative, idempotent, and safe to refresh. A completed period must not be claimable twice.
7. Challenge copy must describe an actual green action or metric: walking, repair, recycling, reuse, low-carbon commute, solar optimization, receipt verification, or similar. Avoid fake claims.
8. Empty states must explain how to add friends or complete a challenge. The UI must work on narrow mobile screens and web.

## Suggested API contract

### Friends

- `GET /api/v1/friends/search?q=<username>` — authenticated search, never expose email/password data.
- `GET /api/v1/friends` — accepted friends and pending requests.
- `POST /api/v1/friends/{user_id}` — send/request connection, idempotent.
- `DELETE /api/v1/friends/{user_id}` — remove/cancel connection.

### Leaderboard

- `GET /api/v1/leaderboard?scope=global|friends&metric=impact_points|kcs&limit=50`
- Response should include rank, public username/display name, metric value, score state (for KCS), current-user marker, and friend marker. Do not leak private profile fields.

### Challenges

- `GET /api/v1/challenges?period=daily|weekly|monthly` — active challenge definitions plus current progress.
- `POST /api/v1/challenges/{challenge_id}/claim` — claim a completed challenge once; returns awarded points and claim state.
- Optional `GET /api/v1/challenges/history` for past periods.

The backend may derive progress from existing `ActivityEventModel`, `UserDailyStepsModel`, solar state, and completed actions. Do not duplicate KCS calculation inside challenge code.

## Challenge model

Each challenge needs: stable ID, title, description, period, goal type, target, current progress, reward points, start/end timestamps, completion state, claim state, and a green-action category. Recommended reward ordering is `daily < weekly < monthly`; exact values should live in seed/config data, not screen constants.

## UX placement

- Add a Leaderboard entry from the existing rewards/impact experience and an obvious Home or Profile affordance without disrupting the central Scan button.
- Screen header: title, points balance, and a short explanation that KCS and points are different.
- First control row: `Global` / `Friends`.
- Second control row: `Green points` / `Carbon score`.
- Challenge section: `Daily` / `Weekly` / `Monthly` tabs, mission cards with progress bars, reward chips, and a clear completed/claimed state.
- Friend search: username field, result card, add/remove/pending state, and friendly empty/error states.

## Acceptance criteria

- A seeded/demo user can search a username, add a friend, and see the friend in Friends scope.
- Global and Friends leaderboards return deterministic ranks for both metrics.
- A challenge can progress from 0 to target, be claimed once, and add reward points without changing KCS.
- Daily/weekly/monthly challenges show different reward tiers and period labels.
- Refreshing the screen does not duplicate points or reset progress.
- API tests cover authorization, friendship idempotency, scope filtering, ranking ties, challenge claim idempotency, and KCS/points separation.
- Mobile/web TypeScript, API tests, and a browser smoke test pass.
