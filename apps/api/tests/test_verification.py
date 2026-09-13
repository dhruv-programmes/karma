import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, UserModel
from app.engines.verification import (
    calculate_deterministic_impact,
    calculate_sustainability_credit,
    compute_image_hash,
    run_deterministic_verification,
)
from app.schemas import (
    AssetBlock,
    FraudBlock,
    ImpactInputsBlock,
    LongRunBlock,
    ObservationsBlock,
    ShortRunBlock,
    TemporalBlock,
    VerificationAnalysis,
    VerificationBlock,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    user = UserModel(
        id="test-user-1",
        name="Test User",
        email="test@example.com",
        password_hash="fake-hash",
        impact_points=100,
    )
    session.add(user)
    session.commit()

    yield session
    session.close()


def test_solar_generation_scoring_and_credit(db_session):
    user = db_session.query(UserModel).filter_by(id="test-user-1").first()

    analysis = VerificationAnalysis(
        verification=VerificationBlock(
            legitimate=True,
            evidence_type="SOLAR_ELECTRICITY_BILL",
            evidence_quality="HIGH",
            confidence=0.96,
            sufficient_for_claim=True,
            reason="Clear solar net-metering statement",
            routing_hint="solar_section",
        ),
        asset=AssetBlock(
            type="solar_pv",
            subtype="rooftop_solar",
            identifier="CA-992837",
            ownership_verified=True,
        ),
        temporal=TemporalBlock(
            evidence_date="2026-08-15",
            billing_period_start="2026-08-01",
            billing_period_end="2026-08-31",
            recency_status="CURRENT",
        ),
        fraud=FraudBlock(
            duplicate_risk=0.01,
            screen_photo_risk=0.02,
            manipulation_risk=0.01,
            needs_manual_review=False,
        ),
        impact_inputs=ImpactInputsBlock(
            capacity_kw=5.0,
            generation_kwh=612.0,
        ),
        short_run=ShortRunBlock(
            eligible=True,
            reward_type="GENERATION",
        ),
        long_run=LongRunBlock(
            eligible=True,
            measurement_type="GENERATION",
        ),
        explanation="Solar generation of 612 kWh verified for August 2026",
    )

    res = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
        image_hash=compute_image_hash("test-solar-image-bytes"),
    )

    assert res.status == "VERIFIED"
    assert res.rewards.generation_points == 612
    # Performance bonus because 612 > 5 * 110 (550)
    assert res.rewards.performance_bonus > 0
    assert res.rewards.total_points > 612
    assert user.impact_points > 100
    assert res.long_term.sustainability_credit >= 50
    assert res.long_term.total_verified_kwh == 612.0


def test_duplicate_image_prevention(db_session):
    user = db_session.query(UserModel).filter_by(id="test-user-1").first()

    analysis = VerificationAnalysis(
        verification=VerificationBlock(
            legitimate=True,
            evidence_type="ELECTRIC_VEHICLE_RC",
            confidence=0.98,
            routing_hint="ev_section",
        ),
        asset=AssetBlock(
            type="electric_vehicle",
            subtype="4w",
            identifier="DL-01-EV-9999",
            ownership_verified=True,
        ),
        short_run=ShortRunBlock(
            eligible=True,
            reward_type="ADOPTION",
        ),
        explanation="Verified EV Registration",
    )

    img_hash = compute_image_hash("unique-image-payload-1")

    res1 = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
        image_hash=img_hash,
    )
    assert res1.status == "VERIFIED"
    assert res1.rewards.adoption_points == 500
    first_total = user.impact_points

    # Re-submitting the exact same image hash
    res2 = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
        image_hash=img_hash,
    )
    assert res2.status == "DUPLICATE"
    assert res2.already_claimed is True
    assert res2.rewards.total_points == 0
    # No duplicate points awarded
    assert user.impact_points == first_total


def test_duplicate_period_prevention(db_session):
    user = db_session.query(UserModel).filter_by(id="test-user-1").first()

    analysis = VerificationAnalysis(
        verification=VerificationBlock(
            legitimate=True,
            evidence_type="SOLAR_ELECTRICITY_BILL",
            routing_hint="solar_section",
        ),
        asset=AssetBlock(
            type="solar_pv",
            identifier="SOLAR-METER-123",
            ownership_verified=True,
        ),
        temporal=TemporalBlock(
            billing_period_start="2026-07-01",
            billing_period_end="2026-07-31",
        ),
        impact_inputs=ImpactInputsBlock(
            generation_kwh=400.0,
            capacity_kw=3.0,
        ),
        short_run=ShortRunBlock(
            eligible=True,
            reward_type="GENERATION",
        ),
    )

    res1 = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
        image_hash="hash-period-1",
    )
    assert res1.status == "VERIFIED"
    assert res1.rewards.generation_points == 400

    # Re-submitting different image but same billing period
    res2 = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
        image_hash="hash-period-2-different",
    )
    assert res2.status == "DUPLICATE"
    assert res2.already_claimed is True
    assert res2.rewards.total_points == 0


def test_implausible_generation_flagged_as_suspicious(db_session):
    user = db_session.query(UserModel).filter_by(id="test-user-1").first()

    # 5000 kWh from a 3 kW solar system in 1 month is physically impossible
    analysis = VerificationAnalysis(
        verification=VerificationBlock(
            legitimate=True,
            evidence_type="SOLAR_ELECTRICITY_BILL",
            routing_hint="solar_section",
        ),
        asset=AssetBlock(
            type="solar_pv",
            capacity_kw=3.0,
            identifier="IMPLAUSIBLE-SOLAR",
        ),
        impact_inputs=ImpactInputsBlock(
            capacity_kw=3.0,
            generation_kwh=5000.0,
        ),
        short_run=ShortRunBlock(
            eligible=True,
            reward_type="GENERATION",
        ),
    )

    res = run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db_session,
    )
    assert res.status == "SUSPICIOUS"
    assert res.rewards.total_points == 0
