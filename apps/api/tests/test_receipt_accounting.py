"""Formula-based receipt rewards and replay-safe transaction accounting."""
from __future__ import annotations

from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ActivityEventModel, Base, TransactionModel, UserModel
from app.engines.carbon import estimate_from_spend
from app.schemas import ProductCategory
from app.services.core import (
    RECEIPT_REWARD_FORMULA_VERSION,
    build_score_response,
    calculate_receipt_reward,
    import_transactions,
    parse_receipt_text,
)
from fastapi import HTTPException


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db):
    user = UserModel(
        id=str(uuid4()), name="Receipt Tester", email=f"{uuid4().hex}@example.com",
        password_hash="x", circularity_score=70, impact_points=100,
        streak_days=1, trend_delta=0, loop_level=1, offset_kg_total=0,
        monthly_budget_kg=90, preferences_json="{}",
        provisional_score=650, score_state="provisional", score_confidence=0.4,
    )
    db.add(user)
    db.flush()
    return user


def test_receipt_reward_is_bounded_and_confidence_aware():
    high = calculate_receipt_reward("Clothing", 1000, 100, "high")
    medium = calculate_receipt_reward("Clothing", 1000, 100, "medium")
    assert high == 23
    assert 0 < medium < high
    assert calculate_receipt_reward("Clothing", 0, 0, "high") == 0
    assert calculate_receipt_reward("unknown", 1_000_000, 0, "high") <= 100


def test_unknown_category_uses_other_carbon_factor_and_reward_multiplier():
    estimate = estimate_from_spend("not-a-category", 100)
    assert estimate.estimated_co2e_kg == 0.3
    assert calculate_receipt_reward("not-a-category", 100, estimate.estimated_co2e_kg, "high") == 5


def test_import_calculates_carbon_and_rewards_once_on_replay():
    db = _db()
    user = _user(db)
    row = {
        "source_key": "gemini-document-1:line-1",
        "merchant": "Croma",
        "amount_inr": 1000,
        "date": date.today().isoformat(),
        "category": ProductCategory.ELECTRONICS,
        "confidence": "high",
    }
    before_points = user.impact_points
    first = import_transactions([row], user, db)
    db.refresh(user)
    expected = estimate_from_spend(ProductCategory.ELECTRONICS, 1000)
    assert len(first) == 1
    assert first[0].co2e_kg == expected.estimated_co2e_kg
    assert first[0].reward_points_awarded == calculate_receipt_reward("Electronics", 1000, expected.estimated_co2e_kg, "high")
    assert user.impact_points > before_points
    events_after_first = db.query(ActivityEventModel).filter(
        ActivityEventModel.user_id == user.id,
        ActivityEventModel.kind == "receipt_reward",
    ).count()

    second = import_transactions([row], user, db)
    db.refresh(user)
    assert second == []
    assert user.impact_points == before_points + first[0].reward_points_awarded
    assert db.query(TransactionModel).filter(TransactionModel.user_id == user.id).count() == 1
    assert db.query(ActivityEventModel).filter(
        ActivityEventModel.user_id == user.id,
        ActivityEventModel.kind == "receipt_reward",
    ).count() == events_after_first
    db.close()


def test_distinct_explicit_line_keys_allow_identical_legitimate_purchases():
    db = _db()
    user = _user(db)
    base = {
        "merchant": "Croma", "amount_inr": 1000,
        "date": date.today().isoformat(), "category": "Electronics",
    }
    first = import_transactions([{**base, "source_key": "doc-a:line-1"}], user, db)
    second = import_transactions([{**base, "source_key": "doc-b:line-1"}], user, db)
    assert len(first) == len(second) == 1
    assert db.query(TransactionModel).filter(TransactionModel.user_id == user.id).count() == 2
    db.close()


def test_imported_carbon_is_visible_to_score_meter_on_next_query():
    db = _db()
    user = _user(db)
    before = build_score_response(user, db)
    assert before["meter"]["actual_monthly_kg"] is None

    imported = import_transactions([{
        "source_key": "score-refresh:line-1",
        "merchant": "BESCOM",
        "amount_inr": 100,
        "date": date.today().isoformat(),
        "category": ProductCategory.ENERGY,
    }], user, db)
    after = build_score_response(user, db)
    assert imported[0].co2e_kg == 1.2
    assert after["meter"]["actual_monthly_kg"] == 36.0
    # Reward points change independently; KCS math is still owned by the
    # score engine and receives only the persisted carbon evidence.
    assert after["score"] == before["score"]
    db.close()


def test_formula_version_is_stable_for_ui_metadata():
    assert RECEIPT_REWARD_FORMULA_VERSION == "receipt-reward-v1"


def test_plain_receipt_parser_uses_stable_line_keys_and_handles_same_lines():
    db = _db()
    user = _user(db)
    text = "CROMA ELECTRONICS\nUSB cable 100.00\nUSB cable 100.00"

    first = parse_receipt_text(text, False, user, db)
    replay = parse_receipt_text(text, False, user, db)

    assert first["imported"] == 2
    assert replay["imported"] == 0
    assert replay["duplicate_count"] == 2
    assert db.query(TransactionModel).filter(TransactionModel.user_id == user.id).count() == 2
    db.close()


def test_empty_real_receipt_does_not_import_seeded_demo_or_award_badge():
    db = _db()
    user = _user(db)
    db.commit()
    before = user.impact_points

    result = parse_receipt_text("", False, user, db)

    assert result["imported"] == 0
    assert result["reward_points_awarded"] == 0
    assert result["badges_unlocked"] == []
    assert user.impact_points == before
    assert db.query(TransactionModel).filter(TransactionModel.user_id == user.id).count() == 0
    db.close()


def test_import_rejects_invalid_amounts_atomically():
    db = _db()
    user = _user(db)
    db.commit()
    before = user.impact_points

    try:
        import_transactions([
            {"source_key": "valid-line", "merchant": "Croma", "amount_inr": 100},
            {"source_key": "bad-line", "merchant": "Croma", "amount_inr": -1},
        ], user, db)
    except HTTPException as exc:
        assert exc.status_code == 400
    else:  # pragma: no cover - assertion documents the contract
        raise AssertionError("invalid import row was accepted")

    db.rollback()
    db.refresh(user)
    assert user.impact_points == before
    assert db.query(TransactionModel).filter(TransactionModel.user_id == user.id).count() == 0
    db.close()
