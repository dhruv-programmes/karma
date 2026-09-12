from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ChallengeModel, UserModel
from app.db.session import Base
from app.services.leaderboard import leaderboard, update_challenge_progress


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db, username: str, points: int, kcs: int):
    row = UserModel(
        id=str(uuid4()), name=username.title(), username=username, email=f"{username}@example.com",
        password_hash="x", circularity_score=70, impact_points=points, streak_days=1,
        trend_delta=0, loop_level=1, offset_kg_total=0, monthly_budget_kg=90,
        preferences_json="{}", provisional_score=kcs, score_state="provisional", score_confidence=.4,
    )
    db.add(row)
    db.flush()
    return row


def test_leaderboard_is_separate_for_points_and_kcs_and_has_deterministic_ties():
    db = _db()
    current = _user(db, "aisha", 100, 700)
    _user(db, "zoe", 100, 650)
    _user(db, "rohan", 50, 800)
    points = leaderboard(db, current, metric="reward_points")
    assert [row["username"] for row in points["entries"]] == ["aisha", "zoe", "rohan"]
    kcs = leaderboard(db, current, metric="carbon_credit_score")
    assert kcs["entries"][0]["username"] == "rohan"
    db.close()


def test_challenge_completion_awards_once_and_uses_period():
    db = _db()
    user = _user(db, "aisha", 100, 700)
    challenge = ChallengeModel(
        id=str(uuid4()), slug="daily-walk", title="Walk", description="Walk",
        cadence="daily", goal_kind="steps", goal_value=2000, reward_points=25,
    )
    db.add(challenge)
    db.flush()
    result = update_challenge_progress(db, user, challenge.id, 2000)
    assert result["progress"]["completed"] is True
    assert result["progress"]["reward_awarded"] is True
    assert result["league_points_awarded"] == 40
    assert result["league"]["current_league"]["slug"] == "bronze"
    # Challenge reward plus the deterministic day-one streak bonus.
    assert user.impact_points == 126
    update_challenge_progress(db, user, challenge.id, 2000)
    assert user.impact_points == 126
    db.close()
