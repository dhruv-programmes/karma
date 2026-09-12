from __future__ import annotations

from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import UserModel
from app.db.session import Base
from app.schemas import SolarImpactResponse
from app.services.solar import (
    SOLAR_REC_ID,
    accept_recommendation,
    build_solar_impact,
    complete_recommendation,
)


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _user(db):
    user = UserModel(
        id=str(uuid4()), name="Solar Tester", email="solar@example.com", password_hash="x",
        circularity_score=68, impact_points=420, streak_days=1, trend_delta=0,
        loop_level=1, offset_kg_total=0, monthly_budget_kg=90, preferences_json="{}",
        provisional_score=700, score_state="provisional", score_confidence=0.4,
        baseline_total_kg=80,
    )
    db.add(user)
    db.flush()
    return user


def test_solar_contract_is_coherent_and_validates():
    db = _db()
    user = _user(db)
    payload = build_solar_impact(user, db)
    parsed = SolarImpactResponse.model_validate(payload)

    assert parsed.is_demo is True
    assert parsed.generated_kwh == 20.4
    assert parsed.directly_consumed_kwh + parsed.exported_kwh == parsed.generated_kwh
    assert parsed.self_consumption_pct < parsed.solar_contribution_pct
    assert len(parsed.hourly_series) == 17
    assert parsed.recommendations[0].status == "suggested"
    assert parsed.solar_score.score == 42
    assert parsed.import_tariff_inr_per_kwh == 8.2
    db.close()


def test_solar_recommendation_accept_complete_is_idempotent_and_separate_from_kcs():
    db = _db()
    user = _user(db)
    before_kcs = build_solar_impact(user, db)["solar_score"]["score"]
    before_points = user.impact_points

    accepted = accept_recommendation(user, db, SOLAR_REC_ID)
    assert accepted["status"] == "accepted"
    assert user.impact_points == before_points

    completed = complete_recommendation(user, db, SOLAR_REC_ID)
    assert completed["points_awarded"] == 50
    assert user.impact_points == before_points + 50
    after = build_solar_impact(user, db)
    assert after["recommendations"][0]["status"] == "completed"
    assert after["green_points_earned"] == 50
    assert after["solar_score"]["score"] > before_kcs
    assert after["comparison"]["additional_solar_used_kwh"] == 6.5

    repeat = complete_recommendation(user, db, SOLAR_REC_ID)
    assert repeat["points_awarded"] == 0
    assert user.impact_points == before_points + 50
    db.close()
