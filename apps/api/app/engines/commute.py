from __future__ import annotations

# Speed thresholds in km/h:
# - Under 7.0 km/h: Walking / jogging
# - 7.0 to 25.0 km/h: Cycling
# - Over 25.0 km/h: Motor vehicle (car/bike/auto/bus - no reward)
WALK_SPEED_MAX_KMH = 7.0
CYCLE_SPEED_MAX_KMH = 25.0

# Minimum trip distance to qualify for rewards (300 meters)
MIN_COMMUTE_DISTANCE_KM = 0.3

# Points conversion rates & daily caps
WALK_POINTS_PER_KM = 4
CYCLE_POINTS_PER_KM = 2

WALK_DAILY_CAP_POINTS = 40
CYCLE_DAILY_CAP_POINTS = 30
TOTAL_COMMUTE_DAILY_CAP_POINTS = 40


def classify_commute_mode(
    avg_speed_kmh: float,
    acceleration_rms_mps2: float | None = None,
) -> str:
    """Classify a trip from GPS speed and an optional phone-motion signal.

    This is intentionally a transparent heuristic rather than a claimed ML
    model. Sustained high speed is enough to classify a motor trip. When the
    GPS average is ambiguous, a high *sustained* acceleration RMS at cycling
    speeds is a second signal for motorised travel. A short burst of
    acceleration is not enough, so runners and cyclists are not penalised for
    normal starts or hills.
    """
    speed = max(0.0, float(avg_speed_kmh or 0.0))
    acceleration = (
        None
        if acceleration_rms_mps2 is None
        else max(0.0, float(acceleration_rms_mps2))
    )
    if speed > CYCLE_SPEED_MAX_KMH:
        return "motor"
    # Sustained 3.5 m/s² motion at 15+ km/h is unlikely to be ordinary
    # walking/cycling, while preserving a conservative false-positive guard.
    if acceleration is not None and acceleration >= 3.5 and speed >= 15.0:
        return "motor"
    if speed <= 0.0:
        return "walk"
    if speed <= WALK_SPEED_MAX_KMH:
        return "walk"
    if speed <= CYCLE_SPEED_MAX_KMH:
        return "cycle"
    return "motor"


def calculate_commute_points(
    mode: str,
    distance_km: float,
    current_daily_points: int = 0,
) -> tuple[int, str]:
    """
    Calculate Impact Points awarded for a commute trip.
    Returns (points_awarded, explanation_message).
    """
    if distance_km < MIN_COMMUTE_DISTANCE_KM:
        return 0, f"Distance ({distance_km:.2f} km) below minimum 0.30 km threshold."

    if mode == "motor":
        return 0, "Motorized transit detected (>25 km/h). No green commute points awarded."

    if mode == "walk":
        rate = WALK_POINTS_PER_KM
        label = "Walking"
    elif mode == "cycle":
        rate = CYCLE_POINTS_PER_KM
        label = "Cycling"
    else:
        return 0, f"Unknown mode '{mode}'."

    raw_points = int(round(distance_km * rate))
    remaining_cap = max(0, TOTAL_COMMUTE_DAILY_CAP_POINTS - current_daily_points)
    awarded = min(raw_points, remaining_cap)

    if awarded == 0 and raw_points > 0:
        return 0, f"Daily commute reward limit of {TOTAL_COMMUTE_DAILY_CAP_POINTS} pts reached for today."

    msg = f"{label} commute ({distance_km:.2f} km) rewarded with {awarded} Impact Points."
    return awarded, msg
