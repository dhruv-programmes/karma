"""Deterministic, bounded rewards for the locally mocked verification flow."""
from __future__ import annotations

from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ActivityEventModel, Base, UserModel
from app.services.core import (
    SUSTAINABLE_REWARD_FORMULA_VERSION,
    calculate_sustainable_purchase_reward,
    reset_sustainable_purchase,
    verify_sustainable_purchase,
)


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db, points=420):
    user = UserModel(
        id=str(uuid4()), name="Sustainable Tester", email=f"{uuid4().hex}@example.com",
        password_hash="x", circularity_score=70, impact_points=points,
        streak_days=1, trend_delta=0, loop_level=1, offset_kg_total=0,
        monthly_budget_kg=90, preferences_json="{}",
    )
    db.add(user)
    db.flush()
    return user


def test_sustainable_reward_is_bounded_and_metadata_sensitive():
    small = calculate_sustainable_purchase_reward(1_000, "Electric Vehicle")
    large = calculate_sustainable_purchase_reward(10_000_000, "Electric Vehicle")
    other = calculate_sustainable_purchase_reward(10_000_000, "Other")
    assert 60 <= small < large <= 300
    assert other < large
    assert calculate_sustainable_purchase_reward(10_000_000_000, "Electric Vehicle") <= 300
    assert calculate_sustainable_purchase_reward(10_000_000_000, "Electric Vehicle") > large


def test_verification_awards_formula_points_once_and_preserves_demo_label():
    db = _db()
    user = _user(db)
    result = verify_sustainable_purchase("ev-receipt.pdf", "application/pdf", 2_450_000, user, db)
    expected = calculate_sustainable_purchase_reward(2_450_000, "Electric Vehicle")
    assert result["reward_points"] == expected
    assert result["reward_points"] != 1_500
    assert result["provider"] == "MockVerificationProvider"
    assert result["is_mock"] is True
    assert result["vehicle_make_model"] == "Tata Nexon EV"
    assert result["reward_formula_version"] == SUSTAINABLE_REWARD_FORMULA_VERSION
    assert user.impact_points == 420 + expected

    replay = verify_sustainable_purchase("different-name.pdf", "application/pdf", 99, user, db)
    assert replay["already_claimed"] is True
    assert replay["reward_points"] == 0
    assert user.impact_points == 420 + expected
    assert db.query(ActivityEventModel).filter(
        ActivityEventModel.user_id == user.id,
        ActivityEventModel.kind == "sustainable_purchase_verification",
    ).count() == 1
    db.close()


def test_reset_reverses_actual_award_not_a_hardcoded_amount():
    db = _db()
    user = _user(db, points=900)
    result = verify_sustainable_purchase("ev.pdf", "application/pdf", 5_000_000, user, db)
    awarded = result["reward_points"]
    assert user.impact_points == 900 + awarded
    reset = reset_sustainable_purchase(user, db)
    assert reset["status"] == "reset"
    assert user.impact_points == 900
    assert reset["reward_points"] == 0
    assert reset["provider"] == "MockVerificationProvider"
    db.close()
