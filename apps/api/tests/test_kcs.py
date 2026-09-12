"""A2 KCS scoring math + data meter + anti-gaming tests (pure, no mobile UI)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import ActivityEventModel, RewardModel, TransactionModel, UserModel
from app.db.session import Base
from app.engines.scoring import (
    BASE_SCORE,
    MAX_SCORE,
    MIN_SCORE,
    PROVISIONAL_CAP,
    REF_KG,
    compute_data_meter,
    confidence_for_meter,
    kcs_from_kg,
    provisional_kcs,
    shopping_kg,
    transport_kg,
    verified_kcs,
)


def _mem_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _make_user(db, **kw):
    u = UserModel(
        id=str(uuid4()),
        name=kw.get("name", "Test User"),
        email=kw.get("email", f"t_{uuid4().hex[:8]}@example.com"),
        password_hash="x",
        circularity_score=70,
        impact_points=kw.get("impact_points", 1000),
        streak_days=1,
        trend_delta=0,
        loop_level=1,
        offset_kg_total=0.0,
        monthly_budget_kg=90.0,
        preferences_json="{}",
    )
    db.add(u)
    db.flush()
    return u


def _add_txn(db, user, date, merchant, category, co2e=10.0, amount=500.0):
    db.add(
        TransactionModel(
            id=str(uuid4()),
            user_id=user.id,
            date=date,
            merchant=merchant,
            amount_inr=float(amount),
            category=category,
            co2e_kg=float(co2e),
        )
    )


def _add_act(db, user, kind="scan"):
    db.add(
        ActivityEventModel(
            id=str(uuid4()),
            user_id=user.id,
            kind=kind,
            title=f"{kind} event",
            subtitle="test",
            points_delta=0,
            created_at=datetime.now(timezone.utc).isoformat(),
            meta_json="{}",
        )
    )


PASS_TXNS = [
    ("2026-02-02", "Swiggy", "Food"),
    ("2026-02-03", "Uber", "Transport"),
    ("2026-02-10", "Croma", "Electronics"),
    ("2026-02-11", "BESCOM", "Energy"),
    ("2026-02-18", "Blinkit", "Food"),
    ("2026-02-19", "Rapido", "Transport"),
    ("2026-03-02", "Amazon", "Other"),
    ("2026-03-03", "Zomato", "Food"),
    ("2026-03-10", "Myntra", "Clothing"),
    ("2026-03-11", "IKEA", "Furniture"),
    ("2026-03-18", "Nykaa", "Personal care"),
    ("2026-03-19", "Metro Card", "Transport"),
]


def _seed_passing(db, user):
    for d, m, c in PASS_TXNS:
        _add_txn(db, user, d, m, c, co2e=10.0)
    _add_act(db, user, "scan")
    db.flush()


# ---- KCS math ----

def test_kcs_reference_point():
    assert kcs_from_kg(110.0) == 650
    assert kcs_from_kg(REF_KG) == BASE_SCORE


def test_provisional_cap_40kg():
    assert kcs_from_kg(40) == 804  # raw
    assert provisional_kcs(40) == 680  # shown (capped)
    assert provisional_kcs(40) == PROVISIONAL_CAP


def test_you_case_96kg():
    assert kcs_from_kg(96) == 681  # raw
    assert provisional_kcs(96) == 680  # shown (capped)


def test_heavy_150kg():
    assert kcs_from_kg(150) == 562
    assert verified_kcs(150) == 562


def test_kcs_clamp():
    assert kcs_from_kg(-500) == MAX_SCORE  # 650+(610)*2.2 huge -> clamp 820
    assert kcs_from_kg(1000) == MIN_SCORE  # very heavy -> clamp 480
    assert MIN_SCORE <= kcs_from_kg(110) <= MAX_SCORE


def test_shopping_reverse():
    eco = shopping_kg("never", "often", "often")  # 0 + 0 - 12 -> floor 12
    heavy = shopping_kg("often", "never", "never")  # 40 + 16 - 0 = 56
    assert eco == 12
    assert heavy == 56


def test_shopping_table_spots():
    assert shopping_kg("rarely", "rarely", "rarely") == 10 + 10 - 4
    assert shopping_kg("sometimes", "sometimes", "sometimes") == 22 + 6 - 8
    assert shopping_kg("bogus", "bogus", "bogus") == max(12, 0 + 16 - 0)


def test_transport_maps():
    # all-never -> floor 8
    assert transport_kg("never", "never", "never", "never") == 8
    # rarely row: 4+6+12+2 = 24
    assert transport_kg("rarely", "rarely", "rarely", "rarely") == 24
    # sometimes row: 12+16+26+4 = 58
    assert transport_kg("sometimes", "sometimes", "sometimes", "sometimes") == 58
    # often row: 22+26+44+6 = 98
    assert transport_kg("often", "often", "often", "often") == 98


def test_confidence_levels():
    assert confidence_for_meter(2, 1, 1, False) == (0.4, "Low")
    assert confidence_for_meter(8, 2, 3, False) == (0.6, "Medium")
    assert confidence_for_meter(8, 5, 8, True) == (0.6, "Medium")  # 6-11 -> medium
    assert confidence_for_meter(12, 2, 8, True) == (0.6, "Medium")  # cats<4 -> medium
    assert confidence_for_meter(12, 4, 5, True) == (0.85, "High")
    assert confidence_for_meter(20, 5, 10, True) == (0.85, "High")


# ---- data meter gating ----

def test_meter_passes_with_12_txns():
    db = _mem_db()
    u = _make_user(db)
    _seed_passing(db, u)
    m = compute_data_meter(u, db)
    assert m["signals"] >= 12
    assert len(m["categories_covered"]) >= 4
    assert m["merchants"] >= 5
    assert m["variety_ok"] is True
    assert m["verified"] is True
    assert m["verified_gate"] is True
    assert m["missing"] == [] or "Varied history" not in m["missing"]
    assert m["confidence"] == 0.85
    assert m["confidence_label"] == "High"
    assert m["actual_monthly_kg"] is not None
    db.close()


def test_meter_fails_with_2_txns():
    db = _mem_db()
    u = _make_user(db)
    _add_txn(db, u, "2026-03-10", "Swiggy", "Food", co2e=20.0)
    _add_txn(db, u, "2026-03-10", "Swiggy", "Food", co2e=20.0)
    db.flush()
    m = compute_data_meter(u, db)
    assert m["signals"] < 6
    assert m["variety_ok"] is False
    assert m["verified"] is False
    assert m["confidence"] == 0.4
    assert m["confidence_label"] == "Low"
    assert "Electricity bill" in m["missing"]
    assert "Varied history" in m["missing"]
    db.close()


def test_variety_concentration_fails():
    db = _mem_db()
    u = _make_user(db)
    # 12 txns but all on one day across... single-day share 100% -> variety False
    for i in range(12):
        _add_txn(db, u, "2026-03-10", f"Merchant{i % 6}", "Food", co2e=5.0)
    db.flush()
    m = compute_data_meter(u, db)
    assert m["variety_ok"] is False
    assert m["verified"] is False
    db.close()


def test_actual_monthly_kg_math():
    db = _mem_db()
    u = _make_user(db)
    # 2 distinct days, total 30kg -> (30/2)*30 = 450
    _add_txn(db, u, "2026-03-10", "A", "Food", co2e=10.0)
    _add_txn(db, u, "2026-03-10", "B", "Food", co2e=10.0)
    _add_txn(db, u, "2026-03-11", "C", "Food", co2e=10.0)
    db.flush()
    m = compute_data_meter(u, db)
    assert m["actual_monthly_kg"] == pytest.approx((30.0 / 2) * 30.0)
    db.close()


def test_actual_monthly_none_without_txns():
    db = _mem_db()
    u = _make_user(db)
    db.flush()
    m = compute_data_meter(u, db)
    assert m["actual_monthly_kg"] is None
    assert m["verified"] is False
    db.close()


def test_nudge_only_after_14d():
    db = _mem_db()
    # failing meter + old baseline -> nudge True
    u_old = _make_user(db, email="old@example.com")
    _add_txn(db, u_old, "2026-03-10", "Swiggy", "Food", co2e=20.0)
    db.flush()
    u_old.baseline_created_at = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
    m_old = compute_data_meter(u_old, db)
    assert m_old["verified"] is False
    assert m_old["nudge"] is True

    # failing meter + recent baseline -> nudge False
    u_new = _make_user(db, email="new@example.com")
    _add_txn(db, u_new, "2026-03-10", "Swiggy", "Food", co2e=20.0)
    db.flush()
    u_new.baseline_created_at = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    m_new = compute_data_meter(u_new, db)
    assert m_new["nudge"] is False

    # passing meter + old baseline -> nudge False (gate met)
    u_pass = _make_user(db, email="pass@example.com")
    _seed_passing(db, u_pass)
    u_pass.baseline_created_at = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    m_pass = compute_data_meter(u_pass, db)
    assert m_pass["verified"] is True
    assert m_pass["nudge"] is False

    # missing baseline -> never crash, nudge False
    u_nobase = _make_user(db, email="nobase@example.com")
    _add_txn(db, u_nobase, "2026-03-10", "Swiggy", "Food", co2e=20.0)
    db.flush()
    if hasattr(u_nobase, "baseline_created_at"):
        try:
            delattr(u_nobase, "baseline_created_at")
        except Exception:
            pass
    # UserModel.created_at is set by DB default only on insert; transient may be None
    m_nb = compute_data_meter(u_nobase, db)
    assert m_nb["nudge"] is False
    db.close()


# ---- anti-gaming: redeem gate ----

def _make_reward(db, points):
    r = RewardModel(
        id=str(uuid4()),
        title=f"R{points}",
        description="t",
        points_required=int(points),
        brand="Test",
        is_mock=True,
        expires_on="2026-06-30",
    )
    db.add(r)
    db.flush()
    return r


def test_redeem_gate_blocks_over_300_when_provisional():
    from app.services.core import redeem_reward

    db = _mem_db()
    u = _make_user(db, impact_points=1000)
    # no score_state column yet -> getattr None -> treated as provisional
    big = _make_reward(db, 500)
    with pytest.raises(HTTPException) as ei:
        redeem_reward(big.id, u, db)
    assert ei.value.status_code == 403
    assert "Verified score" in str(ei.value.detail)
    db.close()


def test_redeem_gate_allows_under_300_and_verified():
    from app.services.core import redeem_reward

    db = _mem_db()
    u = _make_user(db, impact_points=1000)
    small = _make_reward(db, 200)
    out = redeem_reward(small.id, u, db)
    assert out["points_spent"] == 200

    u2 = _make_user(db, email="v@example.com", impact_points=1000)
    u2.score_state = "verified"  # transient attr when A1 column missing
    big = _make_reward(db, 500)
    out2 = redeem_reward(big.id, u2, db)
    assert out2["points_spent"] == 500
    db.close()


def test_build_score_response_shape_and_persist():
    from app.services.core import build_score_response

    db = _mem_db()
    u = _make_user(db)
    _seed_passing(db, u)
    u.baseline_created_at = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    resp = build_score_response(u, db)
    assert "provisional" in resp
    assert "verified" in resp
    assert "meter" in resp
    assert "nudge" in resp
    assert "nudge_copy" in resp
    assert resp["meter"]["verified"] is True
    assert resp["verified"] is not None
    assert resp["score_state"] == "verified"
    db.close()
