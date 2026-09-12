"""Daily walking reward tests. Walking awards Impact Points, never KCS evidence."""
from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ActivityEventModel, UserDailyStepsModel, UserModel
from app.db.session import Base
from app.services.core import build_score_response, build_steps_metric, sync_steps


def _mem_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db, email: str, points: int = 200) -> UserModel:
    user = UserModel(
        id=str(uuid4()),
        name="Steps Tester",
        email=email,
        password_hash="x",
        circularity_score=68,
        impact_points=points,
        streak_days=1,
        trend_delta=0,
        loop_level=1,
        offset_kg_total=0,
        monthly_budget_kg=90,
        preferences_json="{}",
        provisional_score=701,
        score_state="provisional",
        score_confidence=0.4,
        baseline_total_kg=88,
    )
    db.add(user)
    db.flush()
    return user


def test_tier_progression_awards_only_new_tier_difference(monkeypatch):
    db = _mem_db()
    user = _user(db, "tiers@example.com")
    monkeypatch.setattr("app.services.core._local_today", lambda: date(2026, 9, 12))

    assert sync_steps(1_999, user, db)["points_awarded"] == 0
    assert user.impact_points == 200

    assert sync_steps(2_000, user, db)["points_awarded"] == 4
    assert user.impact_points == 204

    assert sync_steps(5_000, user, db)["points_awarded"] == 12
    assert user.impact_points == 212

    result = sync_steps(10_000, user, db)
    assert result["points_awarded"] == 40
    assert result["next_threshold"] is None
    assert user.impact_points == 240
    db.close()


def test_same_or_lower_sync_is_idempotent_and_never_reverses_points(monkeypatch):
    db = _mem_db()
    user = _user(db, "idempotent@example.com")
    monkeypatch.setattr("app.services.core._local_today", lambda: date(2026, 9, 12))

    sync_steps(8_000, user, db)
    assert user.impact_points == 224
    assert sync_steps(8_000, user, db)["points_awarded"] == 24
    assert sync_steps(3_000, user, db)["steps"] == 8_000
    assert user.impact_points == 224

    events = db.query(ActivityEventModel).filter(ActivityEventModel.user_id == user.id).all()
    assert len(events) == 1
    assert events[0].kind == "steps"
    db.close()


def test_steps_are_isolated_per_user_and_series_is_honest(monkeypatch):
    db = _mem_db()
    first = _user(db, "first@example.com")
    second = _user(db, "second@example.com")
    today = date(2026, 9, 12)
    monkeypatch.setattr("app.services.core._local_today", lambda: today)

    sync_steps(5_000, first, db)
    second_metric = build_steps_metric(second, db, today)

    assert first.impact_points == 212
    assert second.impact_points == 200
    assert second_metric["steps"] == 0
    assert len(second_metric["series"]) == 7
    assert all(point["steps"] == 0 and point["points_awarded"] == 0 for point in second_metric["series"])
    assert db.query(UserDailyStepsModel).filter(UserDailyStepsModel.user_id == second.id).count() == 0
    db.close()


def test_steps_do_not_change_kcs_or_its_data_meter(monkeypatch):
    db = _mem_db()
    user = _user(db, "kcs@example.com")
    monkeypatch.setattr("app.services.core._local_today", lambda: date(2026, 9, 12))
    before = build_score_response(user, db)

    sync_steps(10_000, user, db)
    after = build_score_response(user, db)

    assert after == before
    assert user.impact_points == 240
    db.close()
