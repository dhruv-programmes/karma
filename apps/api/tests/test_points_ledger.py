"""Server-backed Karma Coins history tests."""
from __future__ import annotations

import json
from uuid import UUID, uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ActivityEventModel, Base, OffsetProjectModel, RewardModel, UserModel
from app.services.core import (
    effective_reward_cost,
    list_points_ledger,
    offset_points_cost,
    purchase_offset,
    redeem_reward,
)
from app.seed.data import COUPON_REWARDS


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db):
    user = UserModel(
        id=str(uuid4()), name="Ledger Tester", email=f"{uuid4().hex}@example.com",
        password_hash="x", circularity_score=70, impact_points=100,
        streak_days=1, trend_delta=0, loop_level=1, offset_kg_total=0,
        monthly_budget_kg=90, preferences_json="{}",
    )
    db.add(user)
    db.flush()
    return user


def test_ledger_is_typed_and_reconstructs_balance_after_each_event():
    db = _db()
    user = _user(db)
    events = [
        ("2026-01-01T09:00:00Z", "receipt_reward", "Receipt reward", 20, {"receipt_id": "r1"}),
        ("2026-01-02T09:00:00Z", "steps", "Walking reward", 30, {"steps": 8000}),
        ("2026-01-03T09:00:00Z", "challenge", "Challenge complete", 40, {"challenge_id": "c1"}),
        ("2026-01-04T09:00:00Z", "redeem", "Redeemed repair voucher", -15, {
            "reward_id": "reward-1", "redemption_status": "redeemed",
        }),
    ]
    for timestamp, kind, title, delta, meta in events:
        db.add(ActivityEventModel(
            user_id=user.id, kind=kind, title=title, subtitle="test",
            points_delta=delta, created_at=timestamp, meta_json=json.dumps(meta),
        ))
    user.impact_points = 175
    db.commit()

    result = list_points_ledger(user, db)
    assert result["balance"] == 175
    assert [entry["source"] for entry in result["entries"]] == ["redemption", "challenge", "steps", "receipt"]
    assert [entry["type"] for entry in result["entries"]] == ["spent", "earned", "earned", "earned"]
    # Newest-first response: balances after each event remain chronological.
    assert [entry["balance_after"] for entry in result["entries"]] == [175, 190, 150, 120]
    assert result["entries"][0]["redemption_status"] == "redeemed"
    assert result["entries"][0]["meta"]["reward_id"] == "reward-1"
    db.close()


def test_ledger_includes_account_activity_and_honors_limit():
    db = _db()
    user = _user(db)
    db.add(ActivityEventModel(user_id=user.id, kind="scan", title="Scanned phone", subtitle="No points", points_delta=0, created_at="2026-01-01T09:00:00Z", meta_json="{}"))
    db.add(ActivityEventModel(user_id=user.id, kind="solar", title="Solar reward", subtitle="+12", points_delta=12, created_at="2026-01-02T09:00:00Z", meta_json="{}"))
    db.add(ActivityEventModel(user_id=user.id, kind="commute", title="Green commute", subtitle="+8", points_delta=8, created_at="2026-01-03T09:00:00Z", meta_json="{}"))
    user.impact_points = 120
    db.commit()

    result = list_points_ledger(user, db, limit=3)
    assert result["balance"] == 120
    assert len(result["entries"]) == 3
    assert result["entries"][0]["source"] == "commute"
    assert result["entries"][0]["points_delta"] == 8
    assert result["entries"][-1]["source"] == "scan"
    assert result["entries"][-1]["type"] == "event"
    db.close()


def test_redemption_is_idempotent_and_creates_one_spend_entry():
    db = _db()
    user = _user(db)
    reward = RewardModel(
        id=str(uuid4()), title="Repair voucher", description="test",
        points_required=50, brand="Repair Co", is_mock=True, expires_on="2099-01-01",
    )
    db.add(reward)
    user.impact_points = 100
    db.commit()

    first = redeem_reward(UUID(reward.id), user, db)
    second = redeem_reward(UUID(reward.id), user, db)
    assert first["already_redeemed"] is False
    assert second["already_redeemed"] is True
    assert second["claim_code"] == first["claim_code"]
    assert user.impact_points == 50
    ledger = list_points_ledger(user, db)
    spend_entries = [e for e in ledger["entries"] if e["source"] == "redemption"]
    assert len(spend_entries) == 1
    assert spend_entries[0]["points_delta"] == -50
    assert spend_entries[0]["redemption_status"] == "redeemed"
    db.close()


def test_government_coupon_uses_server_wallet_and_ledger():
    db = _db()
    user = _user(db)
    catalog_reward = COUPON_REWARDS[2]  # Home Aeration Composter Kit
    db.add(RewardModel(
        id=str(catalog_reward.id), title=catalog_reward.title,
        description=catalog_reward.description,
        points_required=catalog_reward.points_required,
        brand=catalog_reward.brand, is_mock=True,
        expires_on=catalog_reward.expires_on or "2099-01-01",
    ))
    user.impact_points = 200
    db.commit()

    result = redeem_reward(catalog_reward.id, user, db)
    assert result["points_spent"] == 140
    assert result["points_remaining"] == 60
    assert user.impact_points == 60
    ledger = list_points_ledger(user, db)
    assert ledger["entries"][0]["source"] == "redemption"
    assert ledger["entries"][0]["points_delta"] == -140
    assert ledger["entries"][0]["meta"]["reward_id"] == str(catalog_reward.id)
    db.close()


def test_partner_pricing_removes_nominal_seed_cost_anomalies():
    assert effective_reward_cost(100, "e-Waste drop bonus", "verified recycling check-in") == 250
    assert effective_reward_cost(150, "Metro week pass nudge", "transport reduce perk") == 250
    assert effective_reward_cost(300, "₹200 repair voucher", "phone repair") == 300
    assert effective_reward_cost(500, "Refurbished accessory discount", "circular accessory") == 500
    assert effective_reward_cost(200, "R200", "test") == 200


def test_redemption_rejects_insufficient_balance_without_ledger_entry():
    db = _db()
    user = _user(db)
    reward = RewardModel(
        id=str(uuid4()), title="Repair voucher", description="test",
        points_required=300, brand="Repair Co", is_mock=True, expires_on="2099-01-01",
    )
    db.add(reward)
    user.impact_points = 100
    db.commit()

    try:
        redeem_reward(UUID(reward.id), user, db)
    except ValueError as error:
        assert str(error) == "Not enough impact points"
    else:
        raise AssertionError("insufficient balance should reject redemption")
    assert user.impact_points == 100
    assert list_points_ledger(user, db)["entries"] == []
    db.close()


def test_offset_purchase_debits_wallet_and_records_spend():
    db = _db()
    user = _user(db)
    user.impact_points = 300
    project = OffsetProjectModel(
        id=str(uuid4()), name="Mangrove test", provider="Demo", co2e_kg=100,
        price_inr=450, verification_status="Verified", geography="IN",
        description="test", methodology="test", cover_image_url="demo://mangrove",
    )
    db.add(project)
    db.commit()

    result = purchase_offset(UUID(project.id), user, db)
    expected_cost = offset_points_cost(450)
    assert result["points_spent"] == expected_cost == 230
    assert result["points_remaining"] == 70
    assert user.impact_points == 70
    ledger = list_points_ledger(user, db)
    assert ledger["entries"][0]["source"] == "offset"
    assert ledger["entries"][0]["points_delta"] == -expected_cost
    db.close()
