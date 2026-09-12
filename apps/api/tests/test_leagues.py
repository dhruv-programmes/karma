from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, LeagueDefinitionModel, UserLeagueStateModel, UserModel
from app.services.leagues import (
    calculate_league_bonus,
    calculate_streak_bonus,
    get_status,
    record_action,
    rollover_user,
    standings,
)


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db, username="aisha"):
    user = UserModel(
        id=str(uuid4()), name=username.title(), username=username,
        email=f"{username}@example.com", password_hash="x", circularity_score=70,
        impact_points=100, streak_days=1, trend_delta=0, loop_level=1,
        offset_kg_total=0, monthly_budget_kg=90, preferences_json="{}",
        provisional_score=700, score_state="provisional", score_confidence=.4,
    )
    db.add(user)
    db.flush()
    return user


def test_seeded_thresholds_and_status_are_config_driven():
    db = _db()
    user = _user(db)
    status = get_status(db, user, date(2026, 9, 12))
    assert [(row["slug"], row["promotion_threshold"]) for row in status["league_config"]] == [
        ("bronze", 300), ("silver", 600), ("gold", 1000), ("platinum", 0)
    ]
    assert status["current_league"]["badge_id"] == "league_bronze"
    db.close()


def test_verified_action_is_idempotent_and_does_not_change_other_balances():
    db = _db()
    user = _user(db)
    original = (user.impact_points, user.provisional_score)
    first = record_action(db, user, "repair-1", "repair", today=date(2026, 9, 12))
    second = record_action(db, user, "repair-1", "repair", today=date(2026, 9, 12))
    assert first["awarded_points"] == second["awarded_points"] == 120
    assert second["already_recorded"] is True
    assert (user.impact_points, user.provisional_score) == original
    db.close()


def test_diminishing_returns_and_daily_category_cap():
    db = _db()
    user = _user(db)
    today = date(2026, 9, 12)
    rewards = [record_action(db, user, f"repair-{i}", "repair", today=today)["awarded_points"] for i in range(5)]
    assert rewards[:4] == [120, 60, 20, 0]
    assert sum(rewards) == 200
    db.close()


def test_promotion_is_one_tier_and_points_are_separate():
    db = _db()
    user = _user(db)
    today = date(2026, 9, 12)
    # Four verified categories accumulate 310 points. Bronze's 300 threshold
    # promotes exactly once to Silver.
    record_action(db, user, "repair-1", "repair", today=today)
    record_action(db, user, "recycle-1", "recycle", today=today)
    record_action(db, user, "donate-1", "donate", today=today)
    result = record_action(db, user, "steps-1", "steps", today=today)
    assert result["current_league"]["slug"] == "silver"
    assert result["promoted"] is True
    assert result["season_league_points"] == 310
    # The next tier cannot be skipped in the same evaluation.
    result = record_action(db, user, "commute-1", "commute", today=today)
    assert result["season_league_points"] == 345
    assert result["current_league"]["slug"] == "silver"
    assert user.impact_points == 100
    assert user.provisional_score == 700
    db.close()


def test_month_rollover_demotes_once_and_bronze_stays_floor():
    db = _db()
    user = _user(db)
    state = UserLeagueStateModel(
        user_id=user.id, season_key="2026-08", weekly_key="2026-W35",
        current_league_slug="gold", lifetime_best_league_slug="gold",
        season_points=700, weekly_league_points=100, weekly_action_count=2,
    )
    db.add(state)
    db.commit()
    first = get_status(db, user, date(2026, 9, 1))
    second = get_status(db, user, date(2026, 9, 1))
    assert first["current_league"]["slug"] == second["current_league"]["slug"] == "silver"
    assert first["last_demotion_from"] == "gold"
    assert second["season_league_points"] == 0

    state.current_league_slug = "bronze"
    state.season_key = "2026-08"
    state.last_rollover_key = None
    db.commit()
    rollover_user(db, user, date(2026, 9, 1))
    assert state.current_league_slug == "bronze"
    db.close()


def test_standings_expose_weekly_and_season_league_points():
    db = _db()
    user = _user(db)
    result = standings(db, user, "global", date(2026, 9, 12))
    assert result["entries"][0]["username"] == "aisha"
    assert "weekly_league_points" in result["entries"][0]
    db.close()


def test_streak_bonus_advances_once_per_day_and_is_idempotent():
    db = _db()
    user = _user(db)
    user.streak_days = 4
    user.streak_last_activity_date = "2026-09-11"
    user.streak_last_bonus_date = "2026-09-11"
    db.commit()

    first = record_action(
        db, user, "repair-day-1", "repair", today=date(2026, 9, 12),
        reward_points=100,
    )
    assert first["streak_days"] == 5
    assert first["streak_bonus_points"] == 25
    assert first["league_bonus_points"] == 0
    assert first["reward_points_total"] == 125
    assert user.impact_points == 125

    duplicate = record_action(
        db, user, "repair-day-1", "repair", today=date(2026, 9, 12),
        reward_points=100,
    )
    assert duplicate["already_recorded"] is True
    assert user.impact_points == 125

    # A new verified action on the same day can still earn league points, but
    # never a second daily streak bonus.
    second = record_action(
        db, user, "recycle-day-1", "recycle", today=date(2026, 9, 12),
        reward_points=100,
    )
    assert second["streak_days"] == 5
    assert second["streak_bonus_points"] == 0
    assert user.impact_points == 125
    db.close()


def test_bonus_formulas_are_bounded_and_league_configured():
    assert calculate_streak_bonus(10_000, 100) == 50
    assert calculate_streak_bonus(0, 20) == 0
    assert calculate_league_bonus(1_000, "bronze") == 0
    assert calculate_league_bonus(1_000, "silver") == 40
    assert calculate_league_bonus(1_000, "gold") == 40
    assert calculate_league_bonus(1_000, "platinum") == 40


def test_league_multiplier_uses_current_tier_and_stays_separate():
    db = _db()
    user = _user(db)
    user.impact_points = 100
    state = UserLeagueStateModel(
        user_id=user.id, season_key="2026-09", weekly_key="2026-W37",
        current_league_slug="gold", lifetime_best_league_slug="gold",
    )
    db.add(state)
    db.commit()
    result = record_action(
        db, user, "gold-repair", "repair", today=date(2026, 9, 12),
        reward_points=100,
    )
    assert result["league_reward_multiplier"] == 1.10
    assert result["league_bonus_points"] == 10
    assert result["reward_points_total"] == 115
    assert user.impact_points == 115
    # League points and Carbon Credit Score remain independent balances.
    assert result["season_league_points"] == 120
    assert user.provisional_score == 700
    db.close()
