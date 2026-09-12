# Karma Leagues — Gamification Contract

## Player fantasy

Karma should feel like a game where real circular actions create visible progress. Users earn renewable reward points, climb a monthly league through verified green actions, display a league badge, and compete with friends/global players without confusing the league score with the Carbon Credit Score.

## League ladder

```text
Bronze → Silver → Gold → Platinum
```

Every user has exactly one current league. Each league has a generated badge in `assets/league-badges/`.

## Calendar lifecycle

- A season is one calendar month (`YYYY-MM`).
- On the first authenticated league read/write in a new month, the server performs an idempotent rollover.
- Rollover demotes every user exactly one tier: Platinum → Gold, Gold → Silver, Silver → Bronze, Bronze → Bronze.
- Rollover resets the current season’s league points and weekly action counters, records the prior league and demotion timestamp, and preserves lifetime best league.
- A user can promote upward during the new month; promotion never skips more than one league at a time unless a future product decision explicitly enables it.
- A user who does not act is demoted on the next monthly rollover; inactivity is not silently treated as promotion progress.

## League points

League points are a third metric, separate from both `impact_points`/Karma Coins and KCS:

1. Only verified green actions or trusted integrations contribute.
2. The same source event is idempotent and cannot be replayed for more points.
3. Repeated identical low-value events receive diminishing returns and a daily category cap.
4. Points are awarded from action quality and evidence, not from arbitrary taps.
5. League points may coexist with reward points on one action, but KCS is never directly incremented by league points.

### Initial action weights

| Verified action | League points |
|---|---:|
| Repair/refurbish | 120 |
| Recycle correctly | 90 |
| Donate/resell | 80 |
| Low-carbon commute day | 35 |
| 2,000 verified steps | 20 |
| Solar optimization recommendation completed | 100 |
| Sustainable purchase verification | 150 |

The backend should own these values and allow future configuration. A per-category daily cap of 200 points and a monthly total cap of 2,500 points prevent spam while leaving room for active users.

## Promotion thresholds

Promotion is based on the user’s current-season accumulated league points. Initial configurable thresholds:

| Current league | Points required to promote | Next league |
|---|---:|---|
| Bronze | 300 | Silver |
| Silver | 600 | Gold |
| Gold | 1,000 | Platinum |
| Platinum | — | stays Platinum |

Thresholds are intentionally reachable through consistent weekly actions rather than one exploit. The UI should show points-to-next-league and a weekly pace estimate. Reaching a threshold creates a pending promotion; the server applies it once and records the event.

## Weekly action rhythm

- The leaderboard can show a weekly league-action score for social comparison.
- Weekly score is a view over verified events in the current ISO week; it does not reset the monthly accumulated league points.
- Daily/weekly/monthly challenges can award Karma Coins and also produce eligible league events when their underlying action is verified.

## Required server state

- `current_league`
- `season_key`
- `season_league_points`
- `weekly_league_points`
- `lifetime_best_league`
- `last_promotion_at`, `last_demotion_at`
- `last_rollover_key` / idempotency marker
- action-event ledger with source-event ID, category, awarded league points, and evidence metadata

## UX requirements

- Community owns League, Challenges, and Leaderboard navigation.
- Home/Profile show a compact current-league badge and progress card.
- League detail shows badge, season progress, next promotion threshold, weekly activity, standings, and the next monthly demotion message.
- Use the generated badge asset for the user’s current tier; never substitute a generic icon when the asset is available.
- State clearly: “League points are for climbing. Karma Coins are rewards. Carbon Credit Score measures impact.”
- Celebrate promotion with a reveal, but make demotion informative and non-shaming.

## Acceptance criteria

- Bronze/Silver/Gold/Platinum are seeded and visible.
- A new month causes exactly one demotion per user, with Bronze floor, and repeated reads do not demote twice.
- Verified action points are idempotent and capped/diminishing for spam.
- Threshold crossing promotes one tier and records an event.
- League points, reward points, and KCS remain separate in API responses and UI copy.
- Badges render in dashboard/profile/league detail on web and native layouts.
- Backend tests cover rollover, promotion, caps, and idempotency; mobile TypeScript and browser smoke pass.
