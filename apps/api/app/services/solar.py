"""Deterministic Solar Intelligence demo domain.

The product can later replace this provider with inverter/weather integrations.
For now it deliberately has no external dependency: every value is coherent,
labelled as demo/estimated, and recommendation state is persisted per user.
Solar rewards update Impact Points only; they never contribute to KCS.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import SolarRecommendationStateModel, UserModel
from app.services import core

SOLAR_REC_ID = "solar-ev-midday"
IMPORT_TARIFF = 8.2
EXPORT_TARIFF = 3.0
EMISSIONS_FACTOR = 0.58


def _round(value: float, places: int = 1) -> float:
    return round(float(value), places)


def _state(user: UserModel, db: Session) -> SolarRecommendationStateModel | None:
    return (
        db.query(SolarRecommendationStateModel)
        .filter(
            SolarRecommendationStateModel.user_id == user.id,
            SolarRecommendationStateModel.recommendation_id == SOLAR_REC_ID,
        )
        .first()
    )


def _hourly(optimized: bool) -> list[dict]:
    # 06:00-22:00, a modest 5 kW Ahmedabad rooftop demo profile.
    generation = [0, 0.4, 1.1, 2.0, 2.8, 3.2, 3.4, 3.0, 2.1, 1.2, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    demand = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.4, 1.3, 1.2, 1.1, 1.0, 1.1, 1.3, 1.7, 1.9, 1.5]
    if optimized:
        # The accepted load shift moves EV demand into 12:00-15:00.
        demand[6] += 0.1
        demand[7] += 0.2
        demand[8] += 0.5
        demand[9] += 0.7
        demand[14] -= 0.7
        demand[15] -= 0.5
        demand[16] -= 0.3
    result = []
    for hour, (solar, home) in enumerate(zip(generation, demand), start=6):
        direct = min(solar, home)
        result.append(
            {
                "hour": f"{hour:02d}:00",
                "solar_generation_kwh": _round(solar),
                "home_consumption_kwh": _round(home),
                "grid_import_kwh": _round(max(0.0, home - solar)),
                "grid_export_kwh": _round(max(0.0, solar - home)),
            }
        )
    return result


def _base_metrics(optimized: bool) -> dict[str, float]:
    generated = 20.4
    home = 16.3
    direct = 13.7 if optimized else 7.2
    exported = generated - direct
    grid_import = home - direct
    return {
        "generated": generated,
        "home": home,
        "direct": direct,
        "exported": exported,
        "grid_import": grid_import,
        "self_consumption": direct / generated * 100,
        "contribution": direct / home * 100,
        "co2": direct * EMISSIONS_FACTOR,
        "self_value": direct * IMPORT_TARIFF,
        "export_value": exported * EXPORT_TARIFF,
    }


def build_solar_impact(user: UserModel, db: Session) -> dict:
    state = _state(user, db)
    optimized = bool(state and state.status == "completed")
    metrics = _base_metrics(optimized)
    current = _base_metrics(False)
    optimized_metrics = _base_metrics(True)
    current_score = 42
    optimized_score = 76
    score = optimized_score if optimized else current_score
    state_status = state.status if state else "suggested"
    now = datetime.now(timezone.utc)
    tomorrow = (now.astimezone().date() + timedelta(days=1)).isoformat()

    recommendation = {
        "id": SOLAR_REC_ID,
        "title": "Move EV charging to solar hours",
        "subtitle": "Use tomorrow's midday rooftop generation instead of evening grid power.",
        "status": state_status,
        "recommended_window": "12:30 PM – 3:00 PM",
        "action_kwh": 6.5,
        "expected_savings_inr": 42.0,
        "co2_avoided_kg": 3.8,
        "green_points": 50,
        "explanation": "Shift 6.5 kWh of flexible EV charging into the forecast solar peak.",
    }

    rewards = [
        {
            "id": "solar-self-consumption",
            "title": "70% self-consumption day",
            "points": 25,
            "status": "earned" if optimized else "available",
            "description": "Use most of your generated solar at home.",
        },
        {
            "id": "solar-ev-charge",
            "title": "EV charged using solar",
            "points": 50,
            "status": "earned" if optimized else "available",
            "description": "Move a flexible EV load into the renewable window.",
        },
    ]

    timeline = [
        {"id": "surplus", "time": "12:20 PM", "title": "Solar surplus detected", "description": "A renewable window is available.", "status": "completed", "points": 0},
        {"id": "recommendation", "time": "12:30 PM", "title": "EV charging recommendation sent", "description": "Shift charging to the solar peak.", "status": "completed", "points": 0},
    ]
    if state and state.accepted_at:
        timeline.append({"id": "accepted", "time": state.accepted_at.astimezone().strftime("%I:%M %p"), "title": "Recommendation accepted", "description": "The solar load shift is planned.", "status": "completed", "points": 0})
    if state and state.completed_at:
        timeline.extend([
            {"id": "started", "time": state.completed_at.astimezone().strftime("%I:%M %p"), "title": "EV charging started", "description": "The flexible load ran in the renewable window.", "status": "completed", "points": 0},
            {"id": "reward", "time": state.completed_at.astimezone().strftime("%I:%M %p"), "title": "+50 Green Points awarded", "description": "Solar recommendation verified.", "status": "completed", "points": 50},
        ])

    score_components = {
        "self_consumption": 82 if optimized else 35,
        "smart_load_shifting": 84 if optimized else 40,
        "solar_ev_charging": 91 if optimized else 15,
        "peak_grid_avoidance": 74 if optimized else 46,
        "consistency": 62,
    }
    savings = metrics["self_value"] + metrics["export_value"]
    additional_savings = max(0.0, optimized_metrics["self_value"] - current["self_value"])
    return {
        "generated_kwh": _round(metrics["generated"]),
        "directly_consumed_kwh": _round(metrics["direct"]),
        "exported_kwh": _round(metrics["exported"]),
        "grid_import_kwh": _round(metrics["grid_import"]),
        "home_consumption_kwh": _round(metrics["home"]),
        "self_consumption_pct": _round(metrics["self_consumption"], 1),
        "solar_contribution_pct": _round(metrics["contribution"], 1),
        "co2_avoided_kg": _round(metrics["co2"], 1),
        "estimated_savings_inr": _round(savings, 2),
        "green_points_earned": int(state.points_awarded) if state else 0,
        "import_tariff_inr_per_kwh": IMPORT_TARIFF,
        "export_tariff_inr_per_kwh": EXPORT_TARIFF,
        "emissions_factor_kg_per_kwh": EMISSIONS_FACTOR,
        "is_demo": True,
        "household": {"location": "Ahmedabad", "system_size_kw": 5.0, "appliances": ["EV", "washing machine", "AC", "water heater", "battery"], "demo_mode": True},
        "solar_score": {"score": score, "max_score": 100, "components": score_components},
        "live_flow": {"solar_generation_kw": 3.8, "home_usage_kw": 2.4, "grid_export_kw": 1.4 if not optimized else 0.0, "grid_import_kw": 0.0 if not optimized else 0.0, "battery_kw": 0.0, "ev_kw": 0.0 if not optimized else 2.2, "is_demo": True},
        "hourly_series": _hourly(optimized),
        "best_surplus_window": "12:15 PM – 2:45 PM",
        "forecast": {"date": tomorrow, "expected_generation_kwh": 21.2, "peak_start": "12:15 PM", "peak_end": "2:45 PM", "weather": "Mostly Sunny", "opportunity": "High", "advice": "Schedule EV charging, laundry and battery charging between 12 PM and 3 PM."},
        "environmental_impact": {"renewable_energy_used_kwh": _round(metrics["direct"]), "grid_electricity_avoided_kwh": _round(metrics["direct"]), "co2_avoided_kg": _round(metrics["co2"], 1), "solar_exported_kwh": _round(metrics["exported"]), "renewable_ev_charging_kwh": 0.0 if not optimized else 6.5, "emissions_factor_kg_per_kwh": EMISSIONS_FACTOR},
        "financial_impact": {"actual_savings_inr": _round(savings, 2), "self_consumed_value_inr": _round(metrics["self_value"], 2), "export_value_inr": _round(metrics["export_value"], 2), "smart_load_shift_savings_inr": 42.0 if optimized else 0.0, "additional_possible_savings_inr": _round(additional_savings, 2), "potential_optimized_savings_inr": _round(optimized_metrics["self_value"] + optimized_metrics["export_value"], 2), "import_tariff_inr_per_kwh": IMPORT_TARIFF, "export_tariff_inr_per_kwh": EXPORT_TARIFF},
        "rewards": rewards,
        "recommendations": [recommendation],
        "comparison": {"current": {"generated_kwh": current["generated"], "solar_used_kwh": current["direct"], "exported_kwh": current["exported"], "self_consumption_pct": current["self_consumption"], "grid_import_kwh": current["grid_import"]}, "optimized": {"generated_kwh": optimized_metrics["generated"], "solar_used_kwh": optimized_metrics["direct"], "exported_kwh": optimized_metrics["exported"], "self_consumption_pct": optimized_metrics["self_consumption"], "grid_import_kwh": optimized_metrics["grid_import"]}, "additional_solar_used_kwh": _round(optimized_metrics["direct"] - current["direct"]), "self_consumption_improvement_pct_points": _round(optimized_metrics["self_consumption"] - current["self_consumption"], 1), "additional_savings_inr": _round(additional_savings, 2), "additional_co2_avoided_kg": _round(optimized_metrics["co2"] - current["co2"], 1)},
        "timeline": timeline,
    }


def accept_recommendation(user: UserModel, db: Session, recommendation_id: str) -> dict:
    if recommendation_id != SOLAR_REC_ID:
        raise HTTPException(status_code=404, detail="Solar recommendation not found")
    state = _state(user, db)
    if state is None:
        state = SolarRecommendationStateModel(user_id=user.id, recommendation_id=SOLAR_REC_ID)
        db.add(state)
    if state.status != "completed":
        state.status = "accepted"
        state.accepted_at = state.accepted_at or datetime.now(timezone.utc)
    db.commit()
    return {"recommendation_id": recommendation_id, "status": state.status, "points_awarded": 0, "message": "Recommendation accepted. The next renewable window is ready."}


def complete_recommendation(user: UserModel, db: Session, recommendation_id: str) -> dict:
    if recommendation_id != SOLAR_REC_ID:
        raise HTTPException(status_code=404, detail="Solar recommendation not found")
    state = _state(user, db)
    if state is None:
        state = SolarRecommendationStateModel(user_id=user.id, recommendation_id=SOLAR_REC_ID)
        db.add(state)
        db.flush()
    points = 0
    if state.status != "completed":
        state.status = "completed"
        state.accepted_at = state.accepted_at or datetime.now(timezone.utc)
        state.completed_at = datetime.now(timezone.utc)
        points = 50
        state.points_awarded = points
        user.impact_points = int(user.impact_points) + points
        core.log_activity_event(user, db, "solar", "Solar EV charging completed", "6.5 kWh shifted into the solar window.", points_delta=points, meta={"recommendation_id": recommendation_id, "solar": True})
    db.commit()
    return {"recommendation_id": recommendation_id, "status": state.status, "points_awarded": points, "message": "Completed and verified: +50 Green Points awarded." if points else "Already completed; no duplicate points awarded."}
