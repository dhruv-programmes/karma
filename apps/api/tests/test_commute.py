import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import ActivityEventModel, Base, UserCommuteTripModel, UserModel
from app.engines.commute import (
    MIN_COMMUTE_DISTANCE_KM,
    TOTAL_COMMUTE_DAILY_CAP_POINTS,
    calculate_commute_points,
    classify_commute_mode,
)
from app.services.core import build_commute_summary, log_commute_trip


def test_classify_commute_mode():
    assert classify_commute_mode(0.0) == "walk"
    assert classify_commute_mode(4.5) == "walk"
    assert classify_commute_mode(7.0) == "walk"
    assert classify_commute_mode(7.1) == "cycle"
    assert classify_commute_mode(18.0) == "cycle"
    assert classify_commute_mode(25.0) == "cycle"
    assert classify_commute_mode(25.1) == "motor"
    assert classify_commute_mode(60.0) == "motor"


def test_calculate_commute_points_thresholds_and_caps():
    # Below min distance
    pts, msg = calculate_commute_points("walk", 0.2)
    assert pts == 0
    assert "below minimum" in msg

    # Motor vehicle: 0 points
    pts, msg = calculate_commute_points("motor", 5.0)
    assert pts == 0
    assert "Motorized" in msg

    # Walk 2.0 km -> 20 points
    pts, msg = calculate_commute_points("walk", 2.0)
    assert pts == 20
    assert "Walking" in msg

    # Cycle 4.0 km -> 20 points
    pts, msg = calculate_commute_points("cycle", 4.0)
    assert pts == 20
    assert "Cycling" in msg

    # Reaching daily cap (cap = 150)
    pts, msg = calculate_commute_points("walk", 20.0, current_daily_points=140)
    assert pts == 10  # Only 10 points left till 150 cap

    # Cap exhausted
    pts, msg = calculate_commute_points("walk", 2.0, current_daily_points=150)
    assert pts == 0
    assert "limit" in msg


@pytest.fixture
def in_memory_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def test_log_commute_trip_and_summary(in_memory_db):
    db = in_memory_db
    user = UserModel(
        id="test-commute-user",
        name="Test Commuter",
        email="commuter@example.com",
        password_hash="hash",
        impact_points=50,
    )
    db.add(user)
    db.commit()

    # Log 1.5 km walking trip at 4 km/h (duration 22 min)
    res = log_commute_trip(
        distance_km=1.5,
        duration_min=22.5,
        avg_speed_kmh=4.0,
        user=user,
        db=db,
    )

    assert res["mode"] == "walk"
    assert res["points_awarded"] == 15  # 1.5 * 10
    assert res["daily_total_points"] == 15
    assert user.impact_points == 65

    # Check activity event was logged
    event = db.query(ActivityEventModel).filter(ActivityEventModel.user_id == user.id).first()
    assert event is not None
    assert event.kind == "commute"
    assert "Walked 1.50 km" in event.title

    # Summary
    summary = build_commute_summary(user, db)
    assert summary["today_distance_km"] == 1.5
    assert summary["today_points"] == 15
    assert summary["trips_today"] == 1
    assert len(summary["series"]) == 7
