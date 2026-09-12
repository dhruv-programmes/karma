from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import (
    ActivityEventModel,
    FacilityModel,
    LeagueDefinitionModel,
    OffsetProjectModel,
    ProductModel,
    RecommendationModel,
    RewardModel,
    TransactionModel,
    UserBadgeModel,
    UserCompletedActionModel,
    UserCommuteTripModel,
    UserDailyStepsModel,
    UserModel,
    UserOffsetPurchaseModel,
    UserLeagueStateModel,
    UserProductModel,
    UserRewardRedemptionModel,
)
from app.db.session import SessionLocal
from app.engines.carbon import estimate_from_spend
from app.engines.commute import (
    TOTAL_COMMUTE_DAILY_CAP_POINTS,
    calculate_commute_points,
    classify_commute_mode,
)
from app.engines.scoring import (
    ACTION_POINTS,
    ACTION_SCORE_BUMP,
    BASE_SCORE,
    REF_KG,
    compute_data_meter,
    provisional_kcs,
    verified_kcs,
)
from app.schemas import (
    ActionType,
    CircularityBreakdown,
    DocumentConfirmItem,
    EffortLevel,
    ExtractionConfidence,
    Facility,
    OffsetProject,
    Product,
    ProductCategory,
    Recommendation,
    Reward,
    Transaction,
    UserPreferences,
    UserProfile,
)
from app.seed.data import (
    BADGE_CATALOG,
    DEMO_RECEIPT_TEXT,
    DOCUMENT_EXAMPLES,
    FACILITIES,
    MERCHANT_CATEGORY_RULES,
    OFFSETS,
    PHONE_ID,
    PRODUCTS,
    REWARDS,
    demo_state,
    get_document_example,
    get_product as seed_get_product,
    get_product_by_barcode as seed_get_product_by_barcode,
    unlock_badge,
)

# Copy shown when the data-meter nudge fires (A1 routes import via build_score_response).
# A1 contract requires this exact string.
SCORE_NUDGE_COPY = "We need more data to calculate your Carbon Score (Upload electricity, shopping, food + travel bills to improve accuracy)"
NUDGE_COPY = SCORE_NUDGE_COPY  # alias for A1 convenience


# Walking rewards are Impact Points only. Do not add them to KCS inputs or its
# data meter: walking is a healthy incentive, not evidence of carbon footprint.
STEP_REWARD_TIERS: tuple[tuple[int, int, str, str], ...] = (
    (10_000, 100, "Daily goal reached", "Excellent"),
    (8_000, 60, "Strong day", "Strong"),
    (5_000, 30, "Active day", "Active"),
    (2_000, 10, "Getting started", "Steady"),
    (0, 0, "Start walking", "Starting"),
)


def _local_today() -> date:
    """Use the API host's local calendar day for the one permitted sync date."""
    return datetime.now().astimezone().date()


def _step_tier(steps: int) -> tuple[int, str, str]:
    for threshold, points, status, rating in STEP_REWARD_TIERS:
        if steps >= threshold:
            return points, status, rating
    return 0, "Start walking", "Starting"


def _next_step_tier(steps: int, earned_points: int) -> tuple[int | None, int]:
    for threshold, points, _status, _rating in reversed(STEP_REWARD_TIERS[:-1]):
        if steps < threshold:
            return threshold, max(0, points - earned_points)
    return None, 0


def build_steps_metric(user: UserModel, db: Session, today: date | None = None) -> dict:
    """Return today's walking metric plus an honest, zero-filled seven-day history."""
    current_day = today or _local_today()
    first_day = current_day - timedelta(days=6)
    start = first_day.isoformat()
    end = current_day.isoformat()
    rows = (
        db.query(UserDailyStepsModel)
        .filter(
            UserDailyStepsModel.user_id == user.id,
            UserDailyStepsModel.date >= start,
            UserDailyStepsModel.date <= end,
        )
        .all()
    )
    rows_by_date = {row.date: row for row in rows}
    today_row = rows_by_date.get(end)
    steps = int(today_row.steps) if today_row else 0
    earned_points = int(today_row.points_awarded) if today_row else 0
    _tier_points, status, rating = _step_tier(steps)
    next_threshold, next_points = _next_step_tier(steps, earned_points)

    series = []
    for offset in range(7):
        day = first_day + timedelta(days=offset)
        row = rows_by_date.get(day.isoformat())
        series.append(
            {
                "date": day.isoformat(),
                "steps": int(row.steps) if row else 0,
                "points_awarded": int(row.points_awarded) if row else 0,
            }
        )

    return {
        "date": end,
        "steps": steps,
        "points_awarded": earned_points,
        "daily_reward_cap": 100,
        "next_threshold": next_threshold,
        "next_points": next_points,
        "status": status,
        "rating": rating,
        "series": series,
    }


def sync_steps(steps: int, user: UserModel, db: Session) -> dict:
    """Sync today's total and award only the unearned positive tier difference."""
    today = _local_today()
    date_key = today.isoformat()
    row = (
        db.query(UserDailyStepsModel)
        .filter(
            UserDailyStepsModel.user_id == user.id,
            UserDailyStepsModel.date == date_key,
        )
        .first()
    )
    if row is None:
        row = UserDailyStepsModel(user_id=user.id, date=date_key, steps=0, points_awarded=0)
        db.add(row)
        db.flush()

    # Device counters can briefly regress. Preserve the highest total observed
    # today so a later lower sync cannot erase progress or revoke points.
    row.steps = max(int(row.steps), int(steps))
    target_points, _status, _rating = _step_tier(row.steps)
    points_delta = max(0, target_points - int(row.points_awarded))
    if points_delta:
        row.points_awarded = int(row.points_awarded) + points_delta
        user.impact_points = int(user.impact_points) + points_delta
        log_activity_event(
            user,
            db,
            "steps",
            f"Walked {row.steps:,} steps",
            f"Earned {points_delta} Impact Points from today's walking tier.",
            points_delta=points_delta,
            meta={"date": date_key, "steps": row.steps, "tier_points": row.points_awarded},
        )

    db.commit()
    db.refresh(user)
    return build_steps_metric(user, db, today)


def log_commute_trip(
    distance_km: float,
    duration_min: float,
    avg_speed_kmh: float,
    user: UserModel,
    db: Session,
) -> dict:
    """Log an individual GPS-detected commute trip, classify mode, award points, and record activity."""
    today = _local_today()
    date_key = today.isoformat()

    mode = classify_commute_mode(avg_speed_kmh)

    # Calculate today's existing commute points to respect daily cap
    todays_trips = (
        db.query(UserCommuteTripModel)
        .filter(
            UserCommuteTripModel.user_id == user.id,
            UserCommuteTripModel.date == date_key,
        )
        .all()
    )
    current_daily_points = sum(int(t.points_awarded) for t in todays_trips)

    points_awarded, message = calculate_commute_points(
        mode=mode,
        distance_km=distance_km,
        current_daily_points=current_daily_points,
    )

    trip = UserCommuteTripModel(
        id=str(uuid4()),
        user_id=user.id,
        date=date_key,
        mode=mode,
        distance_km=round(distance_km, 3),
        duration_min=round(duration_min, 1),
        avg_speed_kmh=round(avg_speed_kmh, 1),
        points_awarded=points_awarded,
    )
    db.add(trip)

    if points_awarded > 0:
        user.impact_points = int(user.impact_points) + points_awarded
        mode_title = "Walked" if mode == "walk" else "Cycled"
        log_activity_event(
            user,
            db,
            "commute",
            f"{mode_title} {distance_km:.2f} km",
            f"Earned {points_awarded} Impact Points for green commute.",
            points_delta=points_awarded,
            meta={
                "date": date_key,
                "trip_id": trip.id,
                "mode": mode,
                "distance_km": round(distance_km, 3),
                "duration_min": round(duration_min, 1),
                "avg_speed_kmh": round(avg_speed_kmh, 1),
            },
        )

    db.commit()
    db.refresh(user)

    daily_total = current_daily_points + points_awarded

    return {
        "trip_id": trip.id,
        "mode": mode,
        "distance_km": round(distance_km, 3),
        "duration_min": round(duration_min, 1),
        "avg_speed_kmh": round(avg_speed_kmh, 1),
        "points_awarded": points_awarded,
        "daily_total_points": daily_total,
        "daily_cap": TOTAL_COMMUTE_DAILY_CAP_POINTS,
        "message": message,
    }


def build_commute_summary(user: UserModel, db: Session, today: date | None = None) -> dict:
    """Return today's commute stats and 7-day distance & points history."""
    current_day = today or _local_today()
    first_day = current_day - timedelta(days=6)
    start = first_day.isoformat()
    end = current_day.isoformat()

    trips = (
        db.query(UserCommuteTripModel)
        .filter(
            UserCommuteTripModel.user_id == user.id,
            UserCommuteTripModel.date >= start,
            UserCommuteTripModel.date <= end,
        )
        .all()
    )

    by_date: dict[str, list[UserCommuteTripModel]] = {}
    for t in trips:
        by_date.setdefault(t.date, []).append(t)

    series = []
    for offset in range(7):
        day = first_day + timedelta(days=offset)
        day_str = day.isoformat()
        day_trips = by_date.get(day_str, [])
        total_dist = sum(float(t.distance_km) for t in day_trips if t.mode in ("walk", "cycle"))
        total_pts = sum(int(t.points_awarded) for t in day_trips)
        series.append(
            {
                "date": day_str,
                "label": day.strftime("%a") if offset < 6 else "Today",
                "distance_km": round(total_dist, 2),
                "points_awarded": total_pts,
                "trips": len(day_trips),
            }
        )

    today_trips = by_date.get(end, [])
    today_dist = sum(float(t.distance_km) for t in today_trips if t.mode in ("walk", "cycle"))
    today_pts = sum(int(t.points_awarded) for t in today_trips)

    return {
        "date": end,
        "today_distance_km": round(today_dist, 2),
        "today_points": today_pts,
        "daily_reward_cap": TOTAL_COMMUTE_DAILY_CAP_POINTS,
        "trips_today": len(today_trips),
        "series": series,
    }


def verify_sustainable_purchase(
    filename: str,
    mime_type: str | None,
    size_bytes: int | None,
    user: UserModel,
    db: Session,
) -> dict:
    """Award the one-time demo EV verification reward idempotently.

    The uploaded file is deliberately treated as metadata only. This keeps the
    prototype honest while leaving a provider seam for DigiLocker later.
    """
    existing = (
        db.query(ActivityEventModel)
        .filter(
            ActivityEventModel.user_id == user.id,
            ActivityEventModel.kind == "sustainable_purchase_verification",
        )
        .first()
    )
    if existing:
        return {
            "status": "verified",
            "reward_points": 0,
            "total_points": int(user.impact_points),
            "already_claimed": True,
        }

    reward_points = 1500
    user.impact_points = int(user.impact_points) + reward_points
    log_activity_event(
        user,
        db,
        "sustainable_purchase_verification",
        "EV purchase verified",
        "Verified sustainable purchase · +1,500 Karma Coins",
        points_delta=reward_points,
        meta={
            "filename": filename,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "vehicle_type": "Electric Vehicle",
            "provider": "MockVerificationProvider",
            "is_mock": True,
        },
    )
    db.commit()
    db.refresh(user)
    return {
        "status": "verified",
        "reward_points": reward_points,
        "total_points": int(user.impact_points),
        "already_claimed": False,
        "vehicle_make_model": "Tata Nexon EV",
        "vehicle_type": "Electric Vehicle",
        "ownership": "Verified",
        "verification": "Successful",
        "is_mock": True,
    }


def reset_sustainable_purchase(user: UserModel, db: Session) -> dict:
    events = (
        db.query(ActivityEventModel)
        .filter(
            ActivityEventModel.user_id == user.id,
            ActivityEventModel.kind == "sustainable_purchase_verification",
        )
        .all()
    )
    for e in events:
        db.delete(e)
    user.impact_points = max(420, int(user.impact_points) - 1500)
    db.commit()
    db.refresh(user)
    return {
        "status": "reset",
        "reward_points": 0,
        "total_points": int(user.impact_points),
        "already_claimed": False,
        "vehicle_make_model": "Tata Nexon EV",
        "vehicle_type": "Electric Vehicle",
        "ownership": "Pending",
        "verification": "Reset",
        "is_mock": True,
    }


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def categorize_merchant(merchant: str) -> ProductCategory:
    key = merchant.strip().lower()
    for rule, cat in MERCHANT_CATEGORY_RULES.items():
        if rule in key:
            return cat
    return ProductCategory.OTHER


def _resolve_user_and_db(
    user: UserModel | None = None, db: Session | None = None
) -> tuple[UserModel, Session]:
    if db is None:
        db = SessionLocal()
    if user is None:
        user = db.query(UserModel).filter(UserModel.id == settings.demo_user_id).first()
        if not user:
            user = db.query(UserModel).first()
        if not user:
            # Create transient demo user fallback if DB was empty
            from app.db.seed import seed_database_if_empty

            seed_database_if_empty(db)
            user = db.query(UserModel).first()
    return user, db


def product_model_to_schema(p: ProductModel) -> Product:
    breakdown_data = p.circularity_breakdown
    cb = CircularityBreakdown(
        repairability=breakdown_data.get("repairability", p.repairability),
        longevity=breakdown_data.get("longevity", 70),
        recyclability=breakdown_data.get("recyclability", 65),
        reuse_potential=breakdown_data.get("reuse_potential", 70),
        circular_options=breakdown_data.get("circular_options", 75),
    )
    return Product(
        id=UUID(p.id),
        barcode=p.barcode,
        name=p.name,
        brand=p.brand,
        category=ProductCategory(p.category),
        image_url=p.image_url,
        estimated_co2e_kg=p.estimated_co2e_kg,
        circularity_score=p.circularity_score,
        circularity_breakdown=cb,
        repairability=p.repairability,
        expected_remaining_life_months=p.expected_remaining_life_months,
        condition=p.condition,
        age_months=p.age_months,
        attributes=p.attributes,
        last_action_label=p.last_action_label,
        next_action_label=p.next_action_label,
    )


def user_model_to_profile(user: UserModel, db: Session | None = None) -> UserProfile:
    owned_ids: list[UUID] = []
    badge_ids: list[str] = []
    current_league = "bronze"
    league_badge_id = "league_bronze"
    league_season_points = 0

    if db is not None:
        user_prods = (
            db.query(UserProductModel.product_id)
            .filter(UserProductModel.user_id == user.id)
            .all()
        )
        owned_ids = [UUID(row[0]) for row in user_prods]

        badges = (
            db.query(UserBadgeModel.badge_id)
            .filter(UserBadgeModel.user_id == user.id)
            .all()
        )
        badge_ids = [row[0] for row in badges]
        league_state = db.query(UserLeagueStateModel).filter(
            UserLeagueStateModel.user_id == user.id
        ).first()
        if league_state is not None:
            current_league = league_state.current_league_slug or current_league
            league_season_points = int(league_state.season_points or 0)
            league_definition = db.query(LeagueDefinitionModel).filter(
                LeagueDefinitionModel.slug == current_league
            ).first()
            if league_definition is not None:
                league_badge_id = league_definition.badge_id
    else:
        owned_ids = [UUID(up.product_id) for up in user.user_products] if user.user_products else []
        badge_ids = [b.badge_id for b in user.badges] if user.badges else []

    pref_data = user.preferences
    prefs = UserPreferences(
        budget_sensitivity=pref_data.get("budget_sensitivity", 0.7),
        convenience_preference=pref_data.get("convenience_preference", 0.6),
        eco_priority=pref_data.get("eco_priority", 0.8),
        city=pref_data.get("city", "Bengaluru"),
    )

    # --- KCS fields (nullable-safe for pre-KCS rows) ---
    _prov = getattr(user, "provisional_score", None)
    if _prov is None:
        _prov = 650
    try:
        _prov = int(_prov)
    except Exception:
        _prov = 650
    _ver = getattr(user, "verified_score", None)
    if _ver is not None:
        try:
            _ver = int(_ver)
        except Exception:
            _ver = None
    _state = getattr(user, "score_state", None) or "provisional"
    if _state not in ("provisional", "verified"):
        _state = "provisional"
    _conf = getattr(user, "score_confidence", None)
    if _conf is None:
        _conf = 0.4
    try:
        _conf = float(_conf)
    except Exception:
        _conf = 0.4
    _btotal = getattr(user, "baseline_total_kg", None)
    if _btotal is not None:
        try:
            _btotal = float(_btotal)
        except Exception:
            _btotal = None
    _bcreated = getattr(user, "baseline_created_at", None)

    return UserProfile(
        id=UUID(user.id),
        name=user.name,
        email=user.email,
        username=getattr(user, "username", None) or user.email.split("@", 1)[0],
        circularity_score=user.circularity_score,
        impact_points=user.impact_points,
        streak_days=user.streak_days,
        preferences=prefs,
        trend_delta=user.trend_delta,
        loop_level=user.loop_level,
        offset_kg_total=user.offset_kg_total,
        owned_product_ids=owned_ids,
        unlocked_badge_ids=badge_ids,
        monthly_budget_kg=user.monthly_budget_kg,
        provisional_score=_prov,
        verified_score=_ver,
        score_state=_state,
        score_confidence=_conf,
        baseline_total_kg=_btotal,
        baseline_created_at=_bcreated,
        current_league=current_league,
        league_badge_id=league_badge_id,
        league_season_points=league_season_points,
    )


# ==========================================
# KCS provisional->verified shared helper (A1)
# A2 engine hooks: app.engines.scoring.compute_data_meter,
#                  app.engines.scoring.confidence_for_meter
# ==========================================

NUDGE_COPY = (
    "We need more data to calculate your Carbon Score "
    "(Upload electricity, shopping, food + travel bills to improve accuracy)"
)

_FALLBACK_MISSING: list[str] = ["electricity", "shopping", "food delivery", "travel"]


def _confidence_label(confidence: float) -> str:
    try:
        c = float(confidence)
    except Exception:
        return "low"
    if c < 0.5:
        return "low"
    if c < 0.8:
        return "medium"
    return "high"


def build_score_response(user: UserModel, db: Session | None = None) -> dict:
    """Shared helper for GET /users/me/score and GET /users/me/data-meter.

    Calls into A2 engine functions if they exist, else inline fallback
    that A2 will replace. Always returns a ScoreResponse-compatible dict.
    """
    # --- null-safe KCS fields (pre-KCS rows may have NULL) ---
    provisional = getattr(user, "provisional_score", None)
    if provisional is None:
        provisional = 650
    try:
        provisional = int(provisional)
    except Exception:
        provisional = 650

    verified = getattr(user, "verified_score", None)
    if verified is not None:
        try:
            verified = int(verified)
        except Exception:
            verified = None

    state = getattr(user, "score_state", None) or "provisional"
    if state not in ("provisional", "verified"):
        state = "provisional"

    confidence = getattr(user, "score_confidence", None)
    if confidence is None:
        confidence = 0.4
    try:
        confidence = float(confidence)
    except Exception:
        confidence = 0.4

    baseline_total = getattr(user, "baseline_total_kg", None)
    if baseline_total is not None:
        try:
            baseline_total = float(baseline_total)
        except Exception:
            baseline_total = None

    target = None
    if baseline_total is not None:
        try:
            target = float(user.monthly_budget_kg)
        except Exception:
            target = None

    # --- inline fallback (A2 will replace) ---
    signals = 0
    signals_needed = 12
    categories_covered: list[str] = []
    categories_needed = 4
    merchants = 0
    merchants_needed = 5
    missing: list[str] = list(_FALLBACK_MISSING)
    nudge = False
    nudge_copy: str | None = None

    # --- try A2 engine if present ---
    try:
        from app.engines.scoring import (  # type: ignore
            compute_data_meter as _cdm,
            confidence_for_meter as _cfm,
        )

        meter = None
        for _args in ((user, db), (user,), (db,)):
            try:
                meter = _cdm(*_args)  # type: ignore
                break
            except TypeError:
                continue
            except Exception:
                meter = None
                break
        if isinstance(meter, dict):
            try:
                signals = int(meter.get("signals", signals))
            except Exception:
                pass
            try:
                signals_needed = int(meter.get("signals_needed", signals_needed))
            except Exception:
                pass
            try:
                categories_covered = list(meter.get("categories_covered", categories_covered))
            except Exception:
                pass
            try:
                categories_needed = int(meter.get("categories_needed", categories_needed))
            except Exception:
                pass
            try:
                merchants = int(meter.get("merchants", merchants))
            except Exception:
                pass
            try:
                merchants_needed = int(meter.get("merchants_needed", merchants_needed))
            except Exception:
                pass
            try:
                missing = list(meter.get("missing", missing))
            except Exception:
                pass
            try:
                nudge = bool(meter.get("nudge", nudge))
            except Exception:
                pass
            if "confidence" in meter:
                try:
                    confidence = float(meter["confidence"])
                except Exception:
                    pass
            if meter.get("nudge_copy"):
                try:
                    nudge_copy = str(meter.get("nudge_copy"))
                except Exception:
                    pass

        try:
            conf_res = None
            _got_conf = False
            for _args in ((user, db), (meter,), (user,), ()):
                try:
                    conf_res = _cfm(*_args)  # type: ignore
                    _got_conf = True
                    break
                except TypeError:
                    continue
                except Exception:
                    break
            if _got_conf:
                if isinstance(conf_res, dict) and "confidence" in conf_res:
                    confidence = float(conf_res["confidence"])
                elif isinstance(conf_res, (int, float)):
                    confidence = float(conf_res)
        except Exception:
            pass
    except Exception:
        # A2 not done yet — keep inline fallback
        pass

    confidence_label = _confidence_label(confidence)

    if nudge and not nudge_copy:
        nudge_copy = NUDGE_COPY
    if not nudge and nudge_copy is None:
        nudge_copy = None

    return {
        "provisional": provisional,
        "verified": verified,
        "state": state,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "signals": signals,
        "signals_needed": signals_needed,
        "categories_covered": categories_covered,
        "categories_needed": categories_needed,
        "merchants": merchants,
        "merchants_needed": merchants_needed,
        "missing": missing,
        "nudge": nudge,
        "nudge_copy": nudge_copy,
        "baseline_total_kg": baseline_total,
        "target_kg": target,
    }


def get_product(product_id: UUID, db: Session | None = None) -> Product | None:
    if db is not None:
        p = db.query(ProductModel).filter(ProductModel.id == str(product_id)).first()
        if p:
            return product_model_to_schema(p)
    return seed_get_product(product_id)


def log_activity_event(
    user: UserModel,
    db: Session,
    kind: str,
    title: str,
    subtitle: str,
    points_delta: int = 0,
    meta: dict | None = None,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    event_id = str(uuid4())
    act = ActivityEventModel(
        id=event_id,
        user_id=user.id,
        kind=kind,
        title=title,
        subtitle=subtitle,
        points_delta=points_delta,
        created_at=now_iso,
        meta_json=json.dumps(meta or {}),
    )
    db.add(act)
    db.flush()
    return {
        "id": event_id,
        "kind": kind,
        "title": title,
        "subtitle": subtitle,
        "points_delta": points_delta,
        "created_at": now_iso,
        "meta": meta or {},
    }


async def lookup_barcode(
    barcode: str, user: UserModel | None = None, db: Session | None = None
) -> Product:
    clean = barcode.strip()
    if db is not None:
        p_row = db.query(ProductModel).filter(ProductModel.barcode == clean).first()
        if p_row:
            product = product_model_to_schema(p_row)
            if user is not None:
                log_activity_event(
                    user,
                    db,
                    "scan",
                    f"Scanned {product.name}",
                    f"{product.brand} · circularity {product.circularity_score}",
                )
                db.commit()
            return product

    local = seed_get_product_by_barcode(clean)
    if local:
        if user is not None and db is not None:
            log_activity_event(
                user,
                db,
                "scan",
                f"Scanned {local.name}",
                f"{local.brand} · circularity {local.circularity_score}",
            )
            db.commit()
        return local

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for base in (settings.open_products_facts_url, settings.open_food_facts_url):
                resp = await client.get(f"{base}/{clean}.json")
                if resp.status_code != 200:
                    continue
                payload = resp.json()
                if payload.get("status") != 1:
                    continue
                p = payload.get("product", {})
                name = p.get("product_name") or p.get("generic_name") or "Unknown product"
                brand = (p.get("brands") or "Unknown").split(",")[0].strip()
                seeded = get_product(PHONE_ID, db)
                if seeded:
                    product = seeded.model_copy(
                        update={
                            "name": name[:80],
                            "brand": brand[:40],
                            "barcode": clean,
                        }
                    )
                    if user is not None and db is not None:
                        log_activity_event(
                            user,
                            db,
                            "scan",
                            f"Scanned {product.name}",
                            "Matched via Open Facts",
                        )
                        db.commit()
                    return product
    except Exception:
        pass

    fallback = get_product(PHONE_ID, db) or PRODUCTS[PHONE_ID]
    return fallback


def nearby_facilities(
    facility_type: str | None = None,
    lat: float = 12.9716,
    lng: float = 77.5946,
    category: ProductCategory | None = None,
    db: Session | None = None,
) -> list[Facility]:
    facility_list: list[Facility] = []
    if db is not None:
        rows = db.query(FacilityModel).all()
        for r in rows:
            cats = [ProductCategory(c) for c in r.supported_categories if c in ProductCategory.__members__.values()]
            fac = Facility(
                id=UUID(r.id),
                name=r.name,
                facility_type=r.facility_type,
                lat=r.lat,
                lng=r.lng,
                supported_categories=cats,
                open_now=r.open_now,
                verification_status=r.verification_status,
                address=r.address,
                cover_image_url=r.cover_image_url,
            )
            facility_list.append(fac)
    else:
        facility_list = FACILITIES

    results: list[Facility] = []
    for f in facility_list:
        if facility_type and f.facility_type != facility_type:
            continue
        if category and category not in f.supported_categories:
            continue
        dist = round(haversine_km(lat, lng, f.lat, f.lng), 1)
        results.append(f.model_copy(update={"distance_km": dist}))

    results.sort(key=lambda x: x.distance_km or 999)
    return results


def user_impact(user: UserModel | None = None, db: Session | None = None) -> dict:
    user, db = _resolve_user_and_db(user, db)
    txns = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user.id)
        .order_by(TransactionModel.date.desc())
        .all()
    )

    purchases = 0.0
    transport = 0.0
    energy = 0.0
    by_category: dict[str, float] = {}
    this_m = 0.0
    prev_m = 0.0

    current_prefix = "2026-03"
    prev_prefix = "2026-02"

    for t in txns:
        kg = t.co2e_kg
        cat_str = t.category
        by_category[cat_str] = round(by_category.get(cat_str, 0.0) + kg, 1)

        if cat_str == ProductCategory.TRANSPORT.value:
            transport += kg
        elif cat_str == ProductCategory.ENERGY.value:
            energy += kg
        else:
            purchases += kg

        if t.date.startswith(current_prefix):
            this_m += kg
        elif t.date.startswith(prev_prefix):
            prev_m += kg

    total = purchases + transport + energy
    buckets = {
        "Purchases": purchases,
        "Transport": transport,
        "Energy": energy,
    }
    biggest = max(buckets, key=buckets.get) if buckets else "Purchases"
    if by_category:
        top_cat = max(by_category, key=by_category.get)
        if by_category[top_cat] >= max(buckets.values()) * 0.45:
            biggest = top_cat

    offset_total = user.offset_kg_total
    residual = max(0.0, round(total - offset_total, 1))
    budget = user.monthly_budget_kg
    used_pct = round(min(200.0, (this_m / budget) * 100), 1) if budget else 0.0
    status = "on_track" if used_pct <= 90 else ("watch" if used_pct <= 110 else "over")
    insight = (
        f"Biggest lever right now: {biggest}. "
        f"Monthly spend is ~{int(this_m)} kg vs budget {int(budget)} kg ({status.replace('_', ' ')})."
    )

    return {
        "purchases_kg": round(purchases, 1),
        "transport_kg": round(transport, 1),
        "energy_kg": round(energy, 1),
        "total_kg": round(total, 1),
        "month_label": "Feb–Mar 2026",
        "biggest_opportunity": biggest,
        "insight": insight,
        "offset_kg_total": round(offset_total, 1),
        "residual_kg": residual,
        "by_category": by_category,
        "monthly_budget_kg": budget,
        "budget_used_pct": used_pct,
        "budget_status": status,
        "previous_month_kg": round(prev_m, 1),
        "this_month_kg": round(this_m, 1),
    }


def impact_timeseries(user: UserModel | None = None, db: Session | None = None) -> dict:
    user, db = _resolve_user_and_db(user, db)
    txns = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user.id)
        .order_by(TransactionModel.date.asc())
        .all()
    )

    weeks: dict[str, float] = {}
    purchases = transport = energy = 0.0
    this_m = 0.0
    prev_m = 0.0

    for t in txns:
        kg = t.co2e_kg
        if t.category == ProductCategory.TRANSPORT.value:
            transport += kg
        elif t.category == ProductCategory.ENERGY.value:
            energy += kg
        else:
            purchases += kg

        try:
            d = datetime.strptime(t.date, "%Y-%m-%d")
            ws = (d - timedelta(days=d.weekday())).date().isoformat()
            weeks[ws] = round(weeks.get(ws, 0.0) + kg, 1)
        except Exception:
            pass

        if t.date.startswith("2026-03"):
            this_m += kg
        elif t.date.startswith("2026-02"):
            prev_m += kg

    points = [
        {"label": f"W{i+1}", "week_start": ws, "kg": weeks[ws]}
        for i, ws in enumerate(sorted(weeks.keys()))
    ]

    return {
        "points": points,
        "purchases_kg": round(purchases, 1),
        "transport_kg": round(transport, 1),
        "energy_kg": round(energy, 1),
        "this_month_kg": round(this_m, 1),
        "previous_month_kg": round(prev_m, 1),
    }


def list_activity(
    user: UserModel | None = None, db: Session | None = None, limit: int = 30
) -> list[dict]:
    user, db = _resolve_user_and_db(user, db)
    rows = (
        db.query(ActivityEventModel)
        .filter(ActivityEventModel.user_id == user.id)
        .order_by(ActivityEventModel.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "title": r.title,
            "subtitle": r.subtitle,
            "points_delta": r.points_delta,
            "created_at": r.created_at,
            "meta": r.meta,
        }
        for r in rows
    ]


def get_recommendations(
    user: UserModel | None = None, db: Session | None = None
) -> list[Recommendation]:
    if db is not None:
        rows = db.query(RecommendationModel).order_by(RecommendationModel.score.desc()).all()
        return [
            Recommendation(
                id=UUID(r.id),
                category=ProductCategory(r.category),
                action_type=ActionType(r.action_type),
                title=r.title,
                subtitle=r.subtitle,
                co2e_avoided_kg=r.co2e_avoided_kg,
                money_impact_inr=r.money_impact_inr,
                effort=EffortLevel(r.effort),
                local_availability=r.local_availability,
                product_id=UUID(r.product_id) if r.product_id else None,
                explanation=r.explanation,
                score=r.score,
            )
            for r in rows
        ]
    return sorted(demo_state.recommendations, key=lambda r: r.score, reverse=True)


def owned_products(user: UserModel | None = None, db: Session | None = None) -> list[Product]:
    user, db = _resolve_user_and_db(user, db)
    user_prods = (
        db.query(ProductModel)
        .join(UserProductModel, UserProductModel.product_id == ProductModel.id)
        .filter(UserProductModel.user_id == user.id)
        .all()
    )
    return [product_model_to_schema(p) for p in user_prods]


def list_transactions(user: UserModel | None = None, db: Session | None = None) -> list[Transaction]:
    user, db = _resolve_user_and_db(user, db)
    rows = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user.id)
        .order_by(TransactionModel.date.desc())
        .all()
    )
    return [
        Transaction(
            id=UUID(r.id),
            date=r.date,
            merchant=r.merchant,
            amount_inr=r.amount_inr,
            category=ProductCategory(r.category),
        )
        for r in rows
    ]


def import_transactions(
    rows: list[dict], user: UserModel | None = None, db: Session | None = None
) -> list[Transaction]:
    user, db = _resolve_user_and_db(user, db)
    created: list[Transaction] = []
    today = date.today().isoformat()
    for row in rows:
        merchant = str(row.get("merchant", "Unknown"))
        amount = float(row.get("amount_inr", row.get("amount", 0)) or 0)
        raw_cat = row.get("category")
        if isinstance(raw_cat, ProductCategory):
            cat = raw_cat
        elif isinstance(raw_cat, str) and raw_cat.strip():
            try:
                cat = ProductCategory(raw_cat)
            except ValueError:
                cat = categorize_merchant(merchant)
        else:
            cat = categorize_merchant(merchant)
        est = estimate_from_spend(cat, amount)
        txn_id = uuid4()
        txn_model = TransactionModel(
            id=str(txn_id),
            user_id=user.id,
            date=str(row.get("date") or today),
            merchant=merchant,
            amount_inr=amount,
            category=cat.value,
            co2e_kg=float(est.estimated_co2e_kg),
        )
        db.add(txn_model)
        created.append(
            Transaction(
                id=txn_id,
                date=txn_model.date,
                merchant=merchant,
                amount_inr=amount,
                category=cat,
            )
        )
    db.commit()
    return created


def _split_extracted_items(items: list[dict]) -> tuple[list[dict], list[dict]]:
    auto_import: list[dict] = []
    needs_review: list[dict] = []
    for item in items:
        conf = item.get("confidence", ExtractionConfidence.HIGH)
        if isinstance(conf, ExtractionConfidence):
            conf_val = conf.value
        else:
            conf_val = str(conf)
        if conf_val == ExtractionConfidence.HIGH.value:
            auto_import.append(item)
        else:
            needs_review.append(item)
    return auto_import, needs_review


def _item_to_schema(item: dict) -> dict:
    cat = item["category"]
    if isinstance(cat, ProductCategory):
        cat_val = cat
    else:
        cat_val = ProductCategory(cat)
    conf = item.get("confidence", ExtractionConfidence.HIGH)
    if isinstance(conf, ExtractionConfidence):
        conf_val = conf
    else:
        conf_val = ExtractionConfidence(str(conf))
    return {
        "id": str(item["id"]),
        "merchant": str(item["merchant"]),
        "amount_inr": float(item["amount_inr"]),
        "date": str(item["date"]),
        "category": cat_val,
        "confidence": conf_val,
        "needs_review_reason": item.get("needs_review_reason"),
    }


def list_document_examples() -> list[dict]:
    out: list[dict] = []
    for ex in DOCUMENT_EXAMPLES:
        _, review = _split_extracted_items(ex["extracted_items"])
        out.append(
            {
                "id": ex["id"],
                "title": ex["title"],
                "subtitle": ex["subtitle"],
                "doc_type": ex["doc_type"],
                "source": ex["source"],
                "forces_review": len(review) > 0,
            }
        )
    return out


def _unlock_receipt_ranger(user: UserModel, db: Session) -> list[str]:
    badges: list[str] = []
    has_badge = db.query(UserBadgeModel).filter(
        UserBadgeModel.user_id == user.id,
        UserBadgeModel.badge_id == "receipt_ranger",
    ).first()
    if not has_badge:
        db.add(UserBadgeModel(user_id=user.id, badge_id="receipt_ranger"))
        badges.append("receipt_ranger")
    unlock_badge("receipt_ranger")
    return badges


def process_document_example(
    example_id: str,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    """Simulate OCR→LLM on a seeded document. Auto-imports when all items are high confidence."""
    user, db = _resolve_user_and_db(user, db)
    example = get_document_example(example_id)
    if not example:
        raise HTTPException(status_code=404, detail=f"Unknown document example: {example_id}")

    auto_raw, review_raw = _split_extracted_items(example["extracted_items"])
    auto_import = [_item_to_schema(i) for i in auto_raw]
    needs_review = [_item_to_schema(i) for i in review_raw]
    requires_review = len(needs_review) > 0

    imported = 0
    transactions: list[Transaction] = []
    badges: list[str] = []
    message: str

    if requires_review:
        message = (
            f"Found {len(auto_import) + len(needs_review)} items — "
            f"{len(needs_review)} need a quick check before import."
        )
    else:
        rows = [
            {
                "merchant": i["merchant"],
                "amount_inr": i["amount_inr"],
                "date": i["date"],
                "category": i["category"],
            }
            for i in auto_import
        ]
        transactions = import_transactions(rows, user, db)
        imported = len(transactions)
        badges = _unlock_receipt_ranger(user, db)
        log_activity_event(
            user,
            db,
            "receipt",
            f"Imported document · {imported} items",
            f"{example['title']}",
            meta={"example_id": example_id, "imported": imported},
        )
        db.commit()
        message = f"Added {imported} items from {example['title']} to your footprint."

    return {
        "example_id": example_id,
        "title": example["title"],
        "pipeline_steps": list(example["pipeline_steps"]),
        "ocr_preview": str(example["ocr_text"]).strip()[:280],
        "auto_import": auto_import,
        "needs_review": needs_review,
        "imported": imported,
        "transactions": transactions,
        "message": message,
        "badges_unlocked": badges,
        "requires_review": requires_review,
        "is_mock": True,
    }


def confirm_document_import(
    example_id: str,
    items: list[DocumentConfirmItem] | list[dict],
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    user, db = _resolve_user_and_db(user, db)
    example = get_document_example(example_id)
    if not example:
        raise HTTPException(status_code=404, detail=f"Unknown document example: {example_id}")

    rows: list[dict] = []
    for raw in items:
        if isinstance(raw, DocumentConfirmItem):
            if raw.discarded:
                continue
            rows.append(
                {
                    "merchant": raw.merchant,
                    "amount_inr": raw.amount_inr,
                    "date": raw.date,
                    "category": raw.category,
                }
            )
        else:
            if raw.get("discarded"):
                continue
            rows.append(
                {
                    "merchant": str(raw.get("merchant", "Unknown")),
                    "amount_inr": float(raw.get("amount_inr", 0) or 0),
                    "date": str(raw.get("date") or date.today().isoformat()),
                    "category": raw.get("category"),
                }
            )

    created = import_transactions(rows, user, db)
    badges = _unlock_receipt_ranger(user, db)
    log_activity_event(
        user,
        db,
        "receipt",
        f"Confirmed document · {len(created)} items",
        f"{example['title']}",
        meta={"example_id": example_id, "imported": len(created)},
    )
    db.commit()

    return {
        "imported": len(created),
        "transactions": created,
        "message": f"Imported {len(created)} items from {example['title']}.",
        "badges_unlocked": badges,
        "is_mock": True,
    }


def parse_receipt_text(
    text: str | None = None,
    use_demo: bool = True,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    user, db = _resolve_user_and_db(user, db)
    raw = (text or "").strip()
    if use_demo or not raw:
        raw = DEMO_RECEIPT_TEXT

    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    merchant = "Receipt Import"
    rows: list[dict] = []
    amount_re = re.compile(r"(\d+(?:\.\d+)?)\s*$")

    for ln in lines:
        upper = ln.upper()
        if any(
            k in upper
            for k in (
                "SWIGGY", "ZOMATO", "UBER", "CROMA", "AMAZON",
                "FLIPKART", "BESCOM", "PHILIPS", "BIGBASKET", "BLINKIT",
            )
        ):
            merchant = ln.title() if len(ln) < 40 else merchant
            for token in (
                "Swiggy", "Zomato", "Uber", "Croma", "Amazon",
                "Flipkart", "BESCOM", "Philips", "BigBasket", "Blinkit",
            ):
                if token.upper() in upper:
                    merchant = token
                    break
            continue
        if ln.startswith("---"):
            continue
        m = amount_re.search(ln.replace(",", ""))
        if not m:
            continue
        amount = float(m.group(1))
        if amount <= 0:
            continue
        rows.append({"merchant": merchant, "amount_inr": amount, "date": date.today().isoformat()})

    if not rows:
        rows = [
            {"merchant": "Croma", "amount_inr": 899, "date": date.today().isoformat()},
            {"merchant": "Swiggy", "amount_inr": 320, "date": date.today().isoformat()},
            {"merchant": "Uber", "amount_inr": 180, "date": date.today().isoformat()},
        ]

    created = import_transactions(rows, user, db)
    badges: list[str] = []

    has_badge = db.query(UserBadgeModel).filter(
        UserBadgeModel.user_id == user.id,
        UserBadgeModel.badge_id == "receipt_ranger",
    ).first()
    if not has_badge:
        db.add(UserBadgeModel(user_id=user.id, badge_id="receipt_ranger"))
        badges.append("receipt_ranger")
    unlock_badge("receipt_ranger")

    log_activity_event(
        user,
        db,
        "receipt",
        f"Parsed receipt · {len(created)} items",
        "Added to footprint (demo NLP)",
        meta={"imported": len(created)},
    )
    db.commit()

    return {
        "imported": len(created),
        "transactions": created,
        "message": f"Parsed {len(created)} line items into your footprint (demo NLP stub).",
        "badges_unlocked": badges,
    }


def complete_action(
    action_id: UUID,
    action_type: ActionType | None = None,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    # ANTI-GAMING (verified 2026-09-12): this is the ONLY points-awarding path
    # for circular actions. There is no baseline-edit path that awards points —
    # baseline/onboarding writes must never call this function and never mint
    # impact_points. Do not add points for profile/baseline edits here.
    user, db = _resolve_user_and_db(user, db)
    existing = (
        db.query(UserCompletedActionModel)
        .filter(
            UserCompletedActionModel.user_id == user.id,
            UserCompletedActionModel.action_id == str(action_id),
        )
        .first()
    )
    if existing:
        return {
            "action_id": action_id,
            "points_awarded": 0,
            "previous_score": user.circularity_score,
            "new_score": user.circularity_score,
            "message": "Action already completed",
            "badges_unlocked": [],
            "loop_level": user.loop_level,
        }

    inferred = action_type
    if inferred is None:
        rec = db.query(RecommendationModel).filter(RecommendationModel.id == str(action_id)).first()
        if rec:
            inferred = ActionType(rec.action_type)
    if inferred is None:
        inferred = ActionType.REPAIR

    points = ACTION_POINTS.get(inferred, 50)
    bump = ACTION_SCORE_BUMP.get(inferred, 1)
    previous = user.circularity_score

    user.impact_points += points
    user.circularity_score = min(100, previous + bump)
    user.streak_days += 1
    user.trend_delta = max(user.trend_delta, bump)
    user.loop_level = max(1, user.impact_points // 250 + 1)

    db.add(
        UserCompletedActionModel(
            user_id=user.id,
            action_id=str(action_id),
            action_type=inferred.value,
            points_awarded=points,
        )
    )

    badges: list[str] = []
    if inferred == ActionType.REPAIR:
        b = db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user.id, UserBadgeModel.badge_id == "first_repair").first()
        if not b:
            db.add(UserBadgeModel(user_id=user.id, badge_id="first_repair"))
            badges.append("first_repair")
    if inferred == ActionType.RECYCLE:
        b = db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user.id, UserBadgeModel.badge_id == "e_waste_hero").first()
        if not b:
            db.add(UserBadgeModel(user_id=user.id, badge_id="e_waste_hero"))
            badges.append("e_waste_hero")
    if user.streak_days >= 7:
        b = db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user.id, UserBadgeModel.badge_id == "streak_7").first()
        if not b:
            db.add(UserBadgeModel(user_id=user.id, badge_id="streak_7"))
            badges.append("streak_7")

    log_activity_event(
        user,
        db,
        "complete",
        f"Completed {inferred.value.title()}",
        f"+{points} Impact Points",
        points_delta=points,
        meta={"action_id": str(action_id)},
    )
    db.commit()

    return {
        "action_id": action_id,
        "points_awarded": points,
        "previous_score": previous,
        "new_score": user.circularity_score,
        "message": f"+{points} Impact Points",
        "badges_unlocked": badges,
        "loop_level": user.loop_level,
    }


def redeem_reward(
    reward_id: UUID,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    user, db = _resolve_user_and_db(user, db)
    reward = db.query(RewardModel).filter(RewardModel.id == str(reward_id)).first()
    if not reward:
        raise ValueError("Reward not found")

    # ANTI-GAMING: rewards over 300pts require a verified score.
    # A1 owns the score_state/verified_score columns; use getattr so this
    # module does not crash when A1 columns are not yet merged.
    try:
        score_state = getattr(user, "score_state", None)
    except Exception:
        score_state = None
    try:
        cost = int(reward.points_required)
    except Exception:
        cost = 0
    if cost > 300 and score_state != "verified":
        raise HTTPException(
            status_code=403,
            detail="Verified score required for rewards over 300pts (upload bills to unlock)",
        )

    existing = (
        db.query(UserRewardRedemptionModel)
        .filter(
            UserRewardRedemptionModel.user_id == user.id,
            UserRewardRedemptionModel.reward_id == str(reward_id),
        )
        .first()
    )
    if existing:
        raise ValueError("Reward already redeemed")

    if user.impact_points < reward.points_required:
        raise ValueError("Not enough impact points")

    user.impact_points -= reward.points_required
    user.loop_level = max(1, user.impact_points // 250 + 1)

    db.add(
        UserRewardRedemptionModel(
            user_id=user.id,
            reward_id=str(reward_id),
            points_spent=reward.points_required,
        )
    )

    code = f"LOOP-{str(reward_id)[-4:].upper()}-{user.impact_points}"
    badges: list[str] = []
    b = db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user.id, UserBadgeModel.badge_id == "brand_claimer").first()
    if not b:
        db.add(UserBadgeModel(user_id=user.id, badge_id="brand_claimer"))
        badges.append("brand_claimer")

    log_activity_event(
        user,
        db,
        "redeem",
        f"Redeemed {reward.title}",
        f"Code ready · −{reward.points_required} pts",
        points_delta=-reward.points_required,
    )
    db.commit()

    return {
        "reward_id": reward_id,
        "claim_code": code,
        "points_spent": reward.points_required,
        "points_remaining": user.impact_points,
        "message": f"Demo claim code ready for {reward.brand or reward.title}",
        "is_mock": True,
        "badges_unlocked": badges,
    }


def purchase_offset(
    offset_id: UUID,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    user, db = _resolve_user_and_db(user, db)
    project = db.query(OffsetProjectModel).filter(OffsetProjectModel.id == str(offset_id)).first()
    if not project:
        raise ValueError("Offset not found")

    user.offset_kg_total = round(user.offset_kg_total + project.co2e_kg, 1)
    db.add(
        UserOffsetPurchaseModel(
            user_id=user.id,
            offset_id=str(offset_id),
            co2e_kg=project.co2e_kg,
            amount_inr=project.price_inr,
        )
    )

    badges: list[str] = []
    b = db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user.id, UserBadgeModel.badge_id == "offset_starter").first()
    if not b:
        db.add(UserBadgeModel(user_id=user.id, badge_id="offset_starter"))
        badges.append("offset_starter")
    unlock_badge("offset_starter")

    log_activity_event(
        user,
        db,
        "offset",
        f"Offset +{int(project.co2e_kg)} kg",
        project.name,
    )
    db.commit()

    impact = user_impact(user, db)
    return {
        "offset_id": offset_id,
        "co2e_kg": project.co2e_kg,
        "price_inr": project.price_inr,
        "offset_kg_total": user.offset_kg_total,
        "residual_kg": impact["residual_kg"],
        "message": (
            f"Demo purchase: +{int(project.co2e_kg)} kg offset. "
            f"Residual footprint ~{impact['residual_kg']} kg."
        ),
        "badges_unlocked": badges,
        "is_mock": True,
    }


def list_badges(user: UserModel | None = None, db: Session | None = None) -> list[dict]:
    user, db = _resolve_user_and_db(user, db)
    unlocked_rows = (
        db.query(UserBadgeModel.badge_id)
        .filter(UserBadgeModel.user_id == user.id)
        .all()
    )
    unlocked_set = {r[0] for r in unlocked_rows}
    return [{**b, "unlocked": b["id"] in unlocked_set} for b in BADGE_CATALOG]


def build_score_response(user: UserModel | None = None, db: Session | None = None) -> dict:
    """Combine provisional + verified KCS with the data meter. For A1 routes.

    - provisional: getattr(user, "provisional_score", None) or
      provisional_kcs(actual_monthly_kg) fallback (BASE_SCORE when no data).
      Also exposes provisional_raw = kcs_from_kg(actual) for cap transparency.
    - verified: getattr(user, "verified_score", None), recomputed as
      verified_kcs(actual) when the meter gate passes AND actual is not None.
      On gate pass, sets user.verified_score / score_state="verified" /
      confidence=0.85 via setattr (never crashes if A1 columns missing) and
      flushes (caller commits).
    - meter: compute_data_meter(user, db) dict.
    - nudge / nudge_copy: meter nudge flag + SCORE_NUDGE_COPY constant
      (nudge_copy is None when no nudge).
    Never raises on missing A1 columns or empty data (defensive getattr).
    """
    user, db = _resolve_user_and_db(user, db)
    try:
        meter = compute_data_meter(user, db)
    except Exception:
        meter = {
            "signals": 0,
            "categories_covered": [],
            "cats_covered": [],
            "categories_count": 0,
            "cats_count": 0,
            "merchants": 0,
            "merchants_count": 0,
            "merchant_list": [],
            "variety_ok": False,
            "distinct_weeks": 0,
            "distinct_days": 0,
            "verified_gate": False,
            "verified": False,
            "missing": [],
            "nudge": False,
            "actual_monthly_kg": None,
            "confidence": 0.4,
            "confidence_label": "Low",
        }

    actual = meter.get("actual_monthly_kg")
    gate = bool(meter.get("verified", meter.get("verified_gate", False)))

    # Provisional (stored or KCS fallback).
    try:
        provisional_stored = getattr(user, "provisional_score", None)
    except Exception:
        provisional_stored = None
    try:
        if provisional_stored is not None:
            provisional = int(provisional_stored)
        elif actual is not None:
            provisional = int(provisional_kcs(float(actual)))
        else:
            provisional = int(BASE_SCORE)
    except Exception:
        provisional = int(BASE_SCORE)
    try:
        provisional_raw = (
            int(verified_kcs(float(actual)))
            if actual is not None
            else int(verified_kcs(float(REF_KG)))
        )
    except Exception:
        provisional_raw = int(BASE_SCORE)

    # Verified (stored, or computed+persisted when gate passes).
    try:
        verified_stored = getattr(user, "verified_score", None)
    except Exception:
        verified_stored = None
    verified: int | None = None
    try:
        if verified_stored is not None and not gate:
            verified = int(verified_stored)
        elif gate and actual is not None:
            computed = int(verified_kcs(float(actual)))
            verified = computed
            # Persist verified state; never crash if A1 columns missing.
            # Caller owns commit; flush here only.
            # NOTE: A1 column is `score_confidence` (not `confidence`).
            try:
                user.verified_score = computed  # type: ignore[attr-defined]
            except Exception:
                pass
            try:
                user.score_state = "verified"  # type: ignore[attr-defined]
            except Exception:
                pass
            try:
                user.score_confidence = 0.85  # type: ignore[attr-defined]
            except Exception:
                pass
            try:
                db.flush()
            except Exception:
                pass
        elif verified_stored is not None:
            verified = int(verified_stored)
        else:
            verified = None
    except Exception:
        verified = None

    try:
        score_state = getattr(user, "score_state", None)
    except Exception:
        score_state = None
    if not score_state:
        score_state = "verified" if gate else "provisional"

    try:
        confidence = float(meter.get("confidence", 0.4))
    except Exception:
        confidence = 0.4
    try:
        confidence_label = str(meter.get("confidence_label", "Low"))
    except Exception:
        confidence_label = "Low"
    if gate:
        confidence, confidence_label = 0.85, "High"

    try:
        nudge = bool(meter.get("nudge", False))
    except Exception:
        nudge = False

    # A1 ScoreResponse/DataMeterResponse flat contract (routes import this).
    # Keep nested `meter` + `score_state` aliases too for backward compat.
    try:
        signals = int(meter.get("signals", 0))
    except Exception:
        signals = 0
    try:
        cats = list(meter.get("categories_covered", []) or [])
    except Exception:
        cats = []
    try:
        n_merchants = int(meter.get("merchants", meter.get("merchants_count", 0)))
    except Exception:
        n_merchants = 0
    try:
        missing = list(meter.get("missing", []) or [])
    except Exception:
        missing = []
    try:
        baseline_total = getattr(user, "baseline_total_kg", None)
        baseline_total = float(baseline_total) if baseline_total is not None else None
    except Exception:
        baseline_total = None
    try:
        target_kg = getattr(user, "monthly_budget_kg", None)
        target_kg = float(target_kg) if target_kg is not None else None
    except Exception:
        target_kg = None

    return {
        "provisional": int(provisional),
        "provisional_raw": int(provisional_raw),
        "verified": verified,
        "score": verified if (gate and verified is not None) else int(provisional),
        "state": str(score_state),
        "score_state": str(score_state),
        "confidence": float(confidence),
        "confidence_label": str(confidence_label),
        "signals": int(signals),
        "signals_needed": 12,
        "categories_covered": cats,
        "cats_covered": cats,
        "categories_needed": 4,
        "merchants": int(n_merchants),
        "merchants_needed": 5,
        "missing": missing,
        "meter": meter,
        "nudge": bool(nudge),
        "nudge_copy": str(SCORE_NUDGE_COPY) if nudge else None,
        "baseline_total_kg": baseline_total,
        "target_kg": target_kg,
    }
