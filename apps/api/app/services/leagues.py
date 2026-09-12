"""Monthly CCS-action leagues.

League points are intentionally a third balance: they are not Karma/Impact
Points and they never feed the Carbon Credit Score.  The service owns all
anti-spam and promotion rules; clients only render the configuration returned
by the API.
"""

from __future__ import annotations

import json
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.db.models import (
    FriendConnectionModel,
    LeagueActionLogModel,
    LeagueDefinitionModel,
    UserBadgeModel,
    UserLeagueStateModel,
    UserModel,
)
from app.services.core import log_activity_event


# These are backend defaults only.  The seeded LeagueDefinitionModel rows are
# the runtime configuration exposed to the UI and future admin tooling.
LEAGUE_DEFINITIONS: tuple[dict, ...] = (
    {
        "slug": "bronze", "display_name": "Bronze", "rank": 0,
        "promotion_threshold": 300, "badge_id": "league_bronze",
        "badge_asset_url": "/assets/league-badges/bronze.png", "color_hex": "#B7794B",
    },
    {
        "slug": "silver", "display_name": "Silver", "rank": 1,
        "promotion_threshold": 600, "badge_id": "league_silver",
        "badge_asset_url": "/assets/league-badges/silver.png", "color_hex": "#9AA5AE",
    },
    {
        "slug": "gold", "display_name": "Gold", "rank": 2,
        "promotion_threshold": 1000, "badge_id": "league_gold",
        "badge_asset_url": "/assets/league-badges/gold.png", "color_hex": "#E7B84B",
    },
    {
        "slug": "platinum", "display_name": "Platinum", "rank": 3,
        "promotion_threshold": 0, "badge_id": "league_platinum",
        "badge_asset_url": "/assets/league-badges/platinum.png", "color_hex": "#72C8C5",
    },
)

# Verified event weights.  These are deliberately not accepted from the
# client, preventing a forged request from manufacturing league points.
ACTION_POINT_VALUES: dict[str, int] = {
    "repair": 120,
    "refurbish": 120,
    "recycle": 90,
    "donate": 80,
    "resell": 80,
    "commute": 35,
    "low_carbon_commute": 35,
    "steps": 20,
    "walking": 20,
    "solar": 100,
    "solar_optimization": 100,
    "sustainable_purchase": 150,
    "challenge": 40,
    "receipt": 30,
    "reduce": 50,
}
DAILY_CATEGORY_CAP = 200
MONTHLY_POINTS_CAP = 2500
DIMINISHING_RETURNS = (1.0, 0.5, 0.25, 0.1)

# Reward bonuses are intentionally modest and are paid in Impact/Karma Points,
# not in Carbon Credit Score or league points.  A qualifying action can earn
# one streak bonus per calendar day; this prevents repeating the same action
# from minting an unbounded daily streak reward.
STREAK_BONUS_FORMULA_VERSION = "streak-bonus-v1"
STREAK_BONUS_RATE_PER_DAY = 0.05
STREAK_BONUS_MAX_RATE = 0.50
STREAK_BONUS_MAX_POINTS = 50
LEAGUE_REWARD_MULTIPLIERS: dict[str, float] = {
    "bronze": 1.00,
    "silver": 1.05,
    "gold": 1.10,
    "platinum": 1.15,
}
LEAGUE_BONUS_MAX_POINTS = 40


def calculate_streak_bonus(base_reward_points: int, streak_days: int) -> int:
    """Return the bounded streak bonus for one verified green action.

    ``base_reward * min(streak_days * 5%, 50%)`` is rounded to whole points
    and capped at 50 points.  Thus the streak can feel meaningful without
    making a high-value action or a very long streak economically dominant.
    """
    try:
        base = max(0, int(base_reward_points))
        days = max(0, int(streak_days))
    except (TypeError, ValueError):
        return 0
    rate = min(STREAK_BONUS_MAX_RATE, days * STREAK_BONUS_RATE_PER_DAY)
    return min(STREAK_BONUS_MAX_POINTS, max(0, round(base * rate)))


def league_reward_multiplier(league_slug: str) -> float:
    """Return the server-owned multiplier for the user's current league."""
    return LEAGUE_REWARD_MULTIPLIERS.get(str(league_slug).lower(), 1.0)


def calculate_league_bonus(base_reward_points: int, league_slug: str) -> int:
    """Return the bounded reward bonus for the current league tier."""
    try:
        base = max(0, int(base_reward_points))
    except (TypeError, ValueError):
        return 0
    multiplier = league_reward_multiplier(league_slug)
    return min(LEAGUE_BONUS_MAX_POINTS, max(0, round(base * (multiplier - 1.0))))


def _advance_streak(user: UserModel, today: date) -> int:
    """Advance a user's consecutive verified-action streak exactly once/day."""
    today_key = today.isoformat()
    last_key = getattr(user, "streak_last_activity_date", None)
    try:
        last_day = date.fromisoformat(last_key) if last_key else None
    except (TypeError, ValueError):
        last_day = None

    current = max(1, int(getattr(user, "streak_days", 0) or 0))
    if last_day == today:
        # Multiple different green actions in one day do not inflate streak
        # length, and the date remains the source of truth for idempotency.
        pass
    elif last_day == today - timedelta(days=1):
        current += 1
    else:
        # Legacy rows have no verifiable date. Start a fresh evidence-backed
        # streak rather than trusting a stale display-only counter.
        current = 1
    user.streak_days = current
    user.streak_last_activity_date = today_key
    return current


def _award_reward_bonuses(
    db: Session,
    user: UserModel,
    row: UserLeagueStateModel,
    reward_points: int | None,
    today: date,
    action_type: str,
    action_key: str,
) -> dict[str, int | float]:
    """Apply one eligible action's streak/league bonuses transactionally.

    ``None`` means the caller is recording a league-only action with no known
    Impact Points base reward; it must not mutate the user's reward balance.
    """
    if reward_points is None or int(reward_points) <= 0:
        return {
            "reward_points_base": 0,
            "streak_bonus_points": 0,
            "league_bonus_points": 0,
            "reward_points_total": 0,
            "league_reward_multiplier": league_reward_multiplier(row.current_league_slug),
            "streak_days": int(getattr(user, "streak_days", 0) or 0),
        }

    base = int(reward_points)
    streak_days = _advance_streak(user, today)
    streak_bonus = 0
    if getattr(user, "streak_last_bonus_date", None) != today.isoformat():
        streak_bonus = calculate_streak_bonus(base, streak_days)
        user.streak_last_bonus_date = today.isoformat()
    multiplier = league_reward_multiplier(row.current_league_slug)
    league_bonus = calculate_league_bonus(base, row.current_league_slug)
    total = streak_bonus + league_bonus
    if total:
        user.impact_points = int(user.impact_points or 0) + total
        user.loop_level = max(1, int(user.impact_points) // 250 + 1)
    formula_meta = {
        "action_key": action_key,
        "action_type": action_type,
        "base_reward_points": base,
        "streak_days": streak_days,
        "streak_bonus_points": streak_bonus,
        "league": row.current_league_slug,
        "league_reward_multiplier": multiplier,
        "league_bonus_points": league_bonus,
        "formula_version": STREAK_BONUS_FORMULA_VERSION,
    }
    if streak_bonus:
        log_activity_event(
            user, db, "streak_bonus", f"{streak_days}-day green streak bonus",
            f"+{streak_bonus} Impact Points · {action_type.replace('_', ' ')}",
            points_delta=streak_bonus, meta={**formula_meta, "bonus_kind": "streak"},
        )
    if league_bonus:
        log_activity_event(
            user, db, "league_bonus", f"{row.current_league_slug.title()} league bonus",
            f"+{league_bonus} Impact Points · {multiplier:.2f}× action reward",
            points_delta=league_bonus,
            meta={**formula_meta, "bonus_kind": "league"},
        )
    return {
        "reward_points_base": base,
        "streak_bonus_points": streak_bonus,
        "league_bonus_points": league_bonus,
        "reward_points_total": base + total,
        "league_reward_multiplier": multiplier,
        "streak_days": streak_days,
    }


def season_key(day: date | None = None) -> str:
    return (day or date.today()).strftime("%Y-%m")


def week_key(day: date | None = None) -> str:
    current = day or date.today()
    year, week, _ = current.isocalendar()
    return f"{year}-W{week:02d}"


def _parse_month(key: str) -> tuple[int, int]:
    year, month = key.split("-", 1)
    return int(year), int(month)


def _next_month(key: str) -> str:
    year, month = _parse_month(key)
    if month == 12:
        year, month = year + 1, 1
    else:
        month += 1
    return f"{year:04d}-{month:02d}"


def _iter_months(start_exclusive: str, end_inclusive: str) -> list[str]:
    result: list[str] = []
    cursor = _next_month(start_exclusive)
    while cursor <= end_inclusive:
        result.append(cursor)
        cursor = _next_month(cursor)
    return result


def ensure_definitions(db: Session) -> list[LeagueDefinitionModel]:
    """Ensure config exists for tests and legacy DBs without a migration."""
    rows = db.query(LeagueDefinitionModel).order_by(LeagueDefinitionModel.rank.asc()).all()
    by_slug = {row.slug: row for row in rows}
    changed = False
    for definition in LEAGUE_DEFINITIONS:
        row = by_slug.get(definition["slug"])
        if row is None:
            row = LeagueDefinitionModel(id=str(uuid4()), **definition)
            db.add(row)
            by_slug[row.slug] = row
            changed = True
        else:
            # Backfill newly introduced metadata without overwriting admin
            # balance changes to thresholds/caps.
            for field in ("display_name", "rank", "badge_id", "badge_asset_url", "color_hex"):
                if getattr(row, field, None) in (None, ""):
                    setattr(row, field, definition[field])
                    changed = True
    if changed:
        db.flush()
    return sorted(by_slug.values(), key=lambda row: row.rank)


def _definitions_by_slug(db: Session) -> dict[str, LeagueDefinitionModel]:
    return {row.slug: row for row in ensure_definitions(db)}


def _badge_for(db: Session, user: UserModel, definition: LeagueDefinitionModel) -> None:
    existing = db.query(UserBadgeModel).filter(
        UserBadgeModel.user_id == user.id,
        UserBadgeModel.badge_id == definition.badge_id,
    ).first()
    if existing is None:
        db.add(UserBadgeModel(user_id=user.id, badge_id=definition.badge_id))


def _state(db: Session, user: UserModel, today: date) -> UserLeagueStateModel:
    definitions = _definitions_by_slug(db)
    row = db.query(UserLeagueStateModel).filter(UserLeagueStateModel.user_id == user.id).first()
    current = season_key(today)
    if row is None:
        row = UserLeagueStateModel(
            id=str(uuid4()), user_id=user.id, season_key=current,
            weekly_key=week_key(today), current_league_slug="bronze",
            lifetime_best_league_slug="bronze",
        )
        db.add(row)
        db.flush()
    if row.current_league_slug not in definitions:
        row.current_league_slug = "bronze"
    if row.lifetime_best_league_slug not in definitions:
        row.lifetime_best_league_slug = row.current_league_slug
    _badge_for(db, user, definitions[row.current_league_slug])
    return row


def _demote_once(row: UserLeagueStateModel, definitions: dict[str, LeagueDefinitionModel], at: datetime) -> None:
    current = definitions[row.current_league_slug]
    target_rank = max(0, current.rank - 1)
    target = next(item for item in definitions.values() if item.rank == target_rank)
    row.last_demotion_at = at
    row.last_demotion_from = current.slug
    row.last_demotion_to = target.slug
    row.current_league_slug = target.slug
    row.season_points = 0
    row.weekly_league_points = 0
    row.weekly_action_count = 0


def rollover_user(db: Session, user: UserModel, today: date | None = None) -> UserLeagueStateModel:
    """Apply each missed calendar-month demotion once, then refresh week state."""
    today = today or date.today()
    current_season = season_key(today)
    current_week = week_key(today)
    definitions = _definitions_by_slug(db)
    row = _state(db, user, today)
    if row.season_key < current_season:
        now = datetime.now(timezone.utc)
        for entered_month in _iter_months(row.season_key, current_season):
            _demote_once(row, definitions, now)
            row.season_key = entered_month
            row.last_rollover_key = entered_month
    # A backwards system clock must never create a second demotion.
    if row.season_key == current_season and row.last_rollover_key != current_season:
        row.last_rollover_key = current_season
    if row.weekly_key != current_week:
        row.weekly_key = current_week
        row.weekly_league_points = 0
        row.weekly_action_count = 0
    return row


def rollover_all(db: Session, today: date | None = None) -> int:
    users = db.query(UserModel).all()
    for user in users:
        rollover_user(db, user, today)
    db.commit()
    return len(users)


def _status_payload(db: Session, user: UserModel, row: UserLeagueStateModel) -> dict:
    definitions = _definitions_by_slug(db)
    ordered = sorted(definitions.values(), key=lambda item: item.rank)
    current = definitions[row.current_league_slug]
    next_league = next((item for item in ordered if item.rank == current.rank + 1), None)
    threshold = current.promotion_threshold if next_league else None
    points_to_next = max(0, threshold - row.season_points) if threshold is not None else 0
    return {
        "current_league": {
            "slug": current.slug, "display_name": current.display_name,
            "rank": current.rank, "badge_id": current.badge_id,
            "badge_asset_url": current.badge_asset_url, "color_hex": current.color_hex,
        },
        "season_key": row.season_key,
        "season_league_points": row.season_points,
        "weekly_league_points": row.weekly_league_points,
        "weekly_action_count": row.weekly_action_count,
        "lifetime_best_league": row.lifetime_best_league_slug,
        "next_league": next_league.slug if next_league else None,
        "next_league_display_name": next_league.display_name if next_league else None,
        "promotion_threshold": threshold,
        "points_to_next": points_to_next,
        "promotion_status": "max" if next_league is None else ("ready" if points_to_next == 0 else "in_progress"),
        "last_promotion_at": row.last_promotion_at.isoformat() if row.last_promotion_at else None,
        "last_promotion_from": row.last_promotion_from,
        "last_promotion_to": row.last_promotion_to,
        "last_demotion_at": row.last_demotion_at.isoformat() if row.last_demotion_at else None,
        "last_demotion_from": row.last_demotion_from,
        "last_demotion_to": row.last_demotion_to,
        "weekly_points_cap": current.weekly_points_cap,
        "monthly_points_cap": MONTHLY_POINTS_CAP,
        "league_config": [
            {
                "slug": item.slug, "display_name": item.display_name, "rank": item.rank,
                "promotion_threshold": item.promotion_threshold, "badge_id": item.badge_id,
                "badge_asset_url": item.badge_asset_url, "color_hex": item.color_hex,
            }
            for item in ordered
        ],
    }


def get_status(db: Session, user: UserModel, today: date | None = None) -> dict:
    # The first authenticated read also makes rollover visible globally.
    rollover_all(db, today)
    row = rollover_user(db, user, today)
    db.commit()
    return _status_payload(db, user, row)


def _promote_if_ready(db: Session, user: UserModel, row: UserLeagueStateModel, now: datetime) -> bool:
    definitions = _definitions_by_slug(db)
    current = definitions[row.current_league_slug]
    if current.rank >= 3 or row.season_points < current.promotion_threshold:
        return False
    target = next(item for item in definitions.values() if item.rank == current.rank + 1)
    row.last_promotion_at = now
    row.last_promotion_from = current.slug
    row.last_promotion_to = target.slug
    row.current_league_slug = target.slug
    if target.rank > definitions[row.lifetime_best_league_slug].rank:
        row.lifetime_best_league_slug = target.slug
    _badge_for(db, user, target)
    return True


def _day_logs(db: Session, user: UserModel, today: date, action_type: str) -> list[LeagueActionLogModel]:
    rows = db.query(LeagueActionLogModel).filter(
        LeagueActionLogModel.user_id == user.id,
        LeagueActionLogModel.season_key == season_key(today),
        LeagueActionLogModel.action_type == action_type,
    ).all()
    return [row for row in rows if row.created_at and row.created_at.date() == today]


def record_action(
    db: Session,
    user: UserModel,
    action_key: str,
    action_type: str,
    verified: bool = True,
    source: str = "app",
    evidence: dict | None = None,
    reward_points: int | None = None,
    today: date | None = None,
    _commit: bool = True,
) -> dict:
    today = today or date.today()
    action_key = action_key.strip()
    action_type = action_type.strip().lower().replace("-", "_").replace(" ", "_")
    if not action_key:
        raise ValueError("action_key is required")
    if action_type not in ACTION_POINT_VALUES:
        raise ValueError(f"Unsupported league action type: {action_type}")
    if not verified:
        raise ValueError("Only verified green actions can earn league points")

    row = rollover_user(db, user, today)
    existing = db.query(LeagueActionLogModel).filter(
        LeagueActionLogModel.user_id == user.id,
        LeagueActionLogModel.action_key == action_key,
    ).first()
    if existing is not None:
        existing_evidence = {}
        try:
            existing_evidence = json.loads(existing.evidence_json or "{}")
        except (TypeError, ValueError):
            pass
        payload = _status_payload(db, user, row)
        payload.update({
            "action_key": action_key,
            "awarded_points": existing.awarded_points,
            "already_recorded": True,
            "reward_points_base": int(existing_evidence.get("reward_points_base", 0) or 0),
            "streak_bonus_points": int(existing_evidence.get("streak_bonus_points", 0) or 0),
            "league_bonus_points": int(existing_evidence.get("league_bonus_points", 0) or 0),
            "reward_points_total": int(existing_evidence.get("reward_points_total", 0) or 0),
            "league_reward_multiplier": float(existing_evidence.get("league_reward_multiplier", 1.0) or 1.0),
            "streak_days": int(existing_evidence.get("streak_days", getattr(user, "streak_days", 0)) or 0),
        })
        if _commit:
            db.commit()
        return payload

    definitions = _definitions_by_slug(db)
    daily_rows = _day_logs(db, user, today, action_type)
    month_rows = db.query(LeagueActionLogModel).filter(
        LeagueActionLogModel.user_id == user.id,
        LeagueActionLogModel.season_key == season_key(today),
    ).all()
    monthly_awarded = sum(item.awarded_points for item in month_rows)
    weekly_awarded = sum(
        item.awarded_points for item in month_rows if item.week_key == week_key(today)
    )
    base_points = ACTION_POINT_VALUES[action_type]
    multiplier = DIMINISHING_RETURNS[min(len(daily_rows), len(DIMINISHING_RETURNS) - 1)]
    daily_used = sum(item.awarded_points for item in daily_rows)
    awarded = int(round(base_points * multiplier))
    weekly_cap = definitions[row.current_league_slug].weekly_points_cap
    awarded = max(
        0,
        min(
            awarded,
            DAILY_CATEGORY_CAP - daily_used,
            weekly_cap - weekly_awarded,
            MONTHLY_POINTS_CAP - monthly_awarded,
        ),
    )

    stamp = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc) + timedelta(
        seconds=len(month_rows)
    )
    bonus = _award_reward_bonuses(
        db, user, row, reward_points, today, action_type, action_key,
    )
    action_evidence = dict(evidence or {})
    action_evidence.update(bonus)
    event = LeagueActionLogModel(
        id=str(uuid4()), user_id=user.id, action_key=action_key,
        action_type=action_type, source=source, verified=True,
        week_key=week_key(today), season_key=season_key(today),
        base_points=base_points, awarded_points=awarded,
        evidence_json=json.dumps(action_evidence), created_at=stamp,
    )
    db.add(event)
    row.season_points += awarded
    row.weekly_league_points += awarded
    row.weekly_action_count += 1
    promoted = _promote_if_ready(db, user, row, stamp)
    # Keep the activity feed useful without changing the separate reward balance.
    log_activity_event(
        user, db, "league_action", f"League action: {action_type.replace('_', ' ').title()}",
        f"+{awarded} League Points" + (" · Promoted!" if promoted else ""), 0,
        {"action_key": action_key, "league_points": awarded, "league": row.current_league_slug},
    )
    if _commit:
        db.commit()
    payload = _status_payload(db, user, row)
    payload.update({"action_key": action_key, "base_points": base_points, "awarded_points": awarded,
                    "already_recorded": False, "promoted": promoted,
                    **bonus,
                    "impact_points": int(user.impact_points or 0),
                    "carbon_credit_score": int(user.verified_score if user.verified_score is not None else (user.provisional_score or 650))})
    return payload


def sync_actions(db: Session, user: UserModel, actions: list[dict], today: date | None = None) -> dict:
    results = [record_action(db, user, _commit=False, today=today, **item) for item in actions]
    db.commit()
    return {"recorded": results, "status": get_status(db, user, today)}


def standings(db: Session, user: UserModel, scope: str = "global", today: date | None = None) -> dict:
    today = today or date.today()
    rollover_all(db, today)
    users = db.query(UserModel).all()
    friend_ids = {
        link.friend_id for link in db.query(FriendConnectionModel).filter(
            FriendConnectionModel.user_id == user.id,
            FriendConnectionModel.status == "accepted",
        ).all()
    }
    if scope == "friends":
        users = [item for item in users if item.id == user.id or item.id in friend_ids]
    elif scope != "global":
        raise ValueError("scope must be global or friends")
    states = {item.id: rollover_user(db, item, today) for item in users}
    users.sort(key=lambda item: (
        -states[item.id].season_points,
        -states[item.id].weekly_league_points,
        (item.username or item.email).lower(), item.id,
    ))
    definitions = _definitions_by_slug(db)
    entries = []
    for rank, item in enumerate(users, 1):
        state = states[item.id]
        definition = definitions[state.current_league_slug]
        entries.append({
            "rank": rank, "user_id": item.id,
            "username": item.username or item.email.split("@", 1)[0], "name": item.name,
            "league": state.current_league_slug, "league_display_name": definition.display_name,
            "season_league_points": state.season_points,
            "weekly_league_points": state.weekly_league_points,
            "badge_id": definition.badge_id, "badge_asset_url": definition.badge_asset_url,
            "is_current_user": item.id == user.id, "is_friend": item.id in friend_ids,
        })
    db.commit()
    me = next((item["rank"] for item in entries if item["is_current_user"]), None)
    return {"scope": scope, "season_key": season_key(today), "entries": entries, "current_user_rank": me}
