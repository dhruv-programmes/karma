from __future__ import annotations

import json
import hashlib
import csv
import io
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
    EvidenceSubmissionModel,
    FacilityModel,
    LeagueDefinitionModel,
    OffsetProjectModel,
    ProductModel,
    RecommendationModel,
    RewardModel,
    SustainabilityAssetModel,
    SustainabilityCreditHistoryModel,
    SustainabilityRewardModel,
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
from app.engines.verification import (
    calculate_sustainability_credit,
    compute_image_hash,
    run_deterministic_verification,
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
    UniversalVerificationResponse,
    UserPreferences,
    UserProfile,
    VerificationAnalysis,
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


# Local document integrity checks deliberately use only metadata and bytes
# supplied by the client. They are a fraud *signal* for this prototype, not a
# legal verification service; a provider can replace this seam later.
DOCUMENT_INTEGRITY_RULES_VERSION = "local-document-integrity-v1"
DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
DOCUMENT_MIME_EXTENSIONS: dict[str, set[str]] = {
    "application/pdf": {"pdf"},
    "text/csv": {"csv"},
    "text/plain": {"txt", "text"},
    "image/jpeg": {"jpg", "jpeg"},
    "image/png": {"png"},
}
_FORGED_DOCUMENT_MARKERS = re.compile(
    r"\b(?:fake|forged|photoshopped|edited\s+(?:receipt|invoice|bill)|sample\s+receipt)\b",
    re.IGNORECASE,
)


def inspect_document_integrity(
    *,
    filename: str | None = None,
    mime_type: str | None = None,
    size_bytes: int | None = None,
    content: bytes | str | None = None,
    text: str | None = None,
    items: list[dict] | None = None,
    metadata: dict | None = None,
) -> dict[str, object]:
    """Return a deterministic local fraud decision for a document payload.

    Rules are intentionally conservative around ordinary receipts: malformed
    OCR goes to review in the existing pipeline, while only strong integrity
    signals (bad file signatures, forged markers, duplicate IDs, hash
    mismatch, or unsafe metadata) block rewards/imports. No external API key
    or unverifiable issuer claim is involved.
    """
    reasons: list[str] = []
    score = 0
    metadata = metadata or {}
    clean_name = str(filename or "").strip()
    supplied_mime = str(mime_type or "").strip().lower()
    suffix = clean_name.rsplit(".", 1)[-1].lower() if "." in clean_name else ""

    if clean_name and ("\x00" in clean_name or "/" in clean_name or "\\" in clean_name):
        reasons.append("unsafe_filename")
        score += 60
    if clean_name and re.search(r"\.(?:exe|js|sh|bat|cmd|scr)\.(?:pdf|csv|jpg|jpeg|png)$", clean_name, re.I):
        reasons.append("disguised_executable_filename")
        score += 80
    if supplied_mime and supplied_mime not in DOCUMENT_MIME_EXTENSIONS:
        reasons.append("unsupported_mime_type")
        score += 70
    elif supplied_mime and suffix and suffix not in DOCUMENT_MIME_EXTENSIONS[supplied_mime]:
        reasons.append("mime_extension_mismatch")
        score += 70

    if size_bytes is not None:
        try:
            size = int(size_bytes)
        except (TypeError, ValueError):
            size = 0
        if size <= 0:
            reasons.append("empty_document")
            score += 70
        elif size > DOCUMENT_MAX_BYTES:
            reasons.append("document_too_large")
            score += 70

    raw_bytes: bytes | None = None
    raw_text = text or ""
    if isinstance(content, bytes):
        raw_bytes = content
        if not raw_text:
            raw_text = content.decode("utf-8", errors="replace")
    elif isinstance(content, str):
        raw_text = raw_text or content

    if supplied_mime == "application/pdf" and raw_bytes is not None:
        if not raw_bytes.startswith(b"%PDF-") or b"%%EOF" not in raw_bytes[-2048:]:
            reasons.append("invalid_pdf_signature")
            score += 80
    if supplied_mime == "text/csv" and content is not None:
        try:
            parsed = list(csv.reader(io.StringIO(raw_text)))
            if len(parsed) < 2 or max((len(row) for row in parsed), default=0) < 2:
                reasons.append("malformed_csv")
                score += 70
        except (csv.Error, TypeError, ValueError):
            reasons.append("malformed_csv")
            score += 70

    expected_hash = metadata.get("sha256") or metadata.get("expected_sha256")
    if expected_hash and raw_bytes is not None:
        actual_hash = hashlib.sha256(raw_bytes).hexdigest()
        if str(expected_hash).strip().lower() != actual_hash:
            reasons.append("content_hash_mismatch")
            score += 90
    created = metadata.get("created_at")
    modified = metadata.get("modified_at")
    if created and modified:
        try:
            created_at = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            modified_at = datetime.fromisoformat(str(modified).replace("Z", "+00:00"))
            if modified_at < created_at:
                reasons.append("inconsistent_file_timestamps")
                score += 45
        except ValueError:
            reasons.append("invalid_file_timestamps")
            score += 45

    if raw_text and _FORGED_DOCUMENT_MARKERS.search(raw_text):
        reasons.append("forged_document_marker")
        score += 90
    if raw_text:
        control_count = sum(1 for char in raw_text if ord(char) < 32 and char not in "\n\r\t")
        if control_count > max(4, len(raw_text) // 100):
            reasons.append("suspicious_control_characters")
            score += 45

    if items is not None:
        seen_ids: set[str] = set()
        for item in items:
            item_id = str(item.get("id") or "").strip()
            if not item_id and str(item.get("source_key") or "").startswith("document:"):
                item_id = str(item.get("source_key")).strip()
            if item_id and item_id in seen_ids:
                reasons.append("duplicate_item_id")
                score += 80
                break
            if item_id:
                seen_ids.add(item_id)
            try:
                amount = float(item.get("amount_inr", item.get("amount", 0)) or 0)
                if not math.isfinite(amount) or amount <= 0 or amount > 10_000_000:
                    reasons.append("invalid_item_amount")
                    score += 70
                    break
            except (TypeError, ValueError):
                reasons.append("invalid_item_amount")
                score += 70
                break

    score = min(100, score)
    return {
        "fraud_detected": bool(reasons and score >= 70),
        "fraud_score": score,
        "fraud_reasons": reasons,
        "verification_status": "rejected" if reasons and score >= 70 else "passed",
        "integrity_rules_version": DOCUMENT_INTEGRITY_RULES_VERSION,
    }


# Walking rewards are Impact Points only. Do not add them to KCS inputs or its
# data meter: walking is a healthy incentive, not evidence of carbon footprint.
STEP_REWARD_TIERS: tuple[tuple[int, int, str, str], ...] = (
    # Walking is frequent behavior, so the daily ceiling is intentionally
    # modest. Challenges and verified circular actions remain the larger
    # earning opportunities.
    (10_000, 40, "Daily goal reached", "Excellent"),
    (8_000, 24, "Strong day", "Strong"),
    (5_000, 12, "Active day", "Active"),
    (2_000, 4, "Getting started", "Steady"),
    (0, 0, "Start walking", "Starting"),
)


# Receipt points reward verified footprint data, not arbitrary spending. The
# square-root spend term prevents expensive purchases from dominating, while
# the carbon-efficiency term gives slightly more credit to lower-footprint
# categories. This is intentionally separate from KCS, which uses stored
# emissions as evidence and never reads reward points.
RECEIPT_REWARD_FORMULA_VERSION = "receipt-reward-v1"
RECEIPT_CATEGORY_MULTIPLIERS: dict[ProductCategory, float] = {
    ProductCategory.ELECTRONICS: 0.80,
    ProductCategory.CLOTHING: 1.00,
    ProductCategory.FOOD: 0.70,
    ProductCategory.TRANSPORT: 0.55,
    ProductCategory.ENERGY: 0.60,
    ProductCategory.HOME: 1.00,
    ProductCategory.FURNITURE: 1.05,
    ProductCategory.PERSONAL_CARE: 0.85,
    ProductCategory.OTHER: 0.50,
}
RECEIPT_CONFIDENCE_MULTIPLIERS = {"high": 1.0, "medium": 0.8, "low": 0.6}
RECEIPT_MIN_POINTS = 5
RECEIPT_MAX_POINTS_PER_LINE = 100


def calculate_receipt_reward(
    category: ProductCategory | str,
    amount_inr: float,
    co2e_kg: float,
    confidence: ExtractionConfidence | str = ExtractionConfidence.HIGH,
) -> int:
    """Calculate bounded, deterministic Impact Points for one receipt line.

    Formula (receipt-reward-v1)::

        round(
            sqrt(max(amount_inr, 0) / 100) * 8
            * category_multiplier
            * confidence_multiplier
            * max(0.5, 1 - max(co2e_kg, 0) / 1000)
        )

    A non-positive amount earns no points. Positive lines earn at least five
    points after the calculation and never more than 100 points. ``co2e_kg``
    is the same estimate persisted on the transaction, so the reward and KCS
    always use one carbon estimate without changing KCS math.
    """
    try:
        amount = max(0.0, float(amount_inr))
        carbon = max(0.0, float(co2e_kg))
    except (TypeError, ValueError):
        return 0
    if amount <= 0:
        return 0
    category_key = category if isinstance(category, ProductCategory) else ProductCategory.OTHER
    if isinstance(category, str):
        try:
            category_key = ProductCategory(category)
        except ValueError:
            category_key = ProductCategory.OTHER
    conf_key = confidence.value if isinstance(confidence, ExtractionConfidence) else str(confidence).lower()
    confidence_multiplier = RECEIPT_CONFIDENCE_MULTIPLIERS.get(conf_key, 0.6)
    raw = (
        math.sqrt(amount / 100.0)
        * 8.0
        * RECEIPT_CATEGORY_MULTIPLIERS.get(category_key, RECEIPT_CATEGORY_MULTIPLIERS[ProductCategory.OTHER])
        * confidence_multiplier
        * max(0.5, 1.0 - carbon / 1000.0)
    )
    return min(RECEIPT_MAX_POINTS_PER_LINE, max(RECEIPT_MIN_POINTS, round(raw)))


def _receipt_source_key(row: dict, category: ProductCategory, amount: float, merchant: str, date_value: str) -> str:
    """Return a stable idempotency key, preferring document/line IDs."""
    explicit = row.get("source_key") or row.get("receipt_id")
    if explicit:
        return str(explicit)[:255]
    document_id = row.get("document_id") or row.get("example_id")
    line_id = row.get("line_id") or row.get("item_id") or row.get("id")
    if document_id and line_id:
        return f"document:{document_id}:line:{line_id}"[:255]
    # Real Gemini confirmation currently sends no document ID. A canonical
    # line fingerprint makes retries safe; callers can provide source_key when
    # two genuinely identical purchases occur on the same day.
    canonical = "|".join((merchant.strip().lower(), f"{amount:.2f}", date_value, category.value))
    return "line:" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()


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
        "points_delta": 0,
        "daily_reward_cap": 40,
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
    result = build_steps_metric(user, db, today)
    # Keep the public metric cumulative while exposing the actual increment
    # for callers that award one streak/league event per newly crossed tier.
    result["points_delta"] = points_delta
    return result


def log_commute_trip(
    distance_km: float,
    duration_min: float,
    avg_speed_kmh: float,
    user: UserModel,
    db: Session,
    acceleration_rms_mps2: float | None = None,
) -> dict:
    """Log an individual GPS-detected commute trip, classify mode, award points, and record activity."""
    today = _local_today()
    date_key = today.isoformat()

    mode = classify_commute_mode(avg_speed_kmh, acceleration_rms_mps2)

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


SUSTAINABLE_REWARD_FORMULA_VERSION = "sustainable-purchase-reward-v1"
SUSTAINABLE_CATEGORY_MULTIPLIERS: dict[str, float] = {
    "electric vehicle": 1.25,
    "electric two-wheeler": 1.10,
    "public transport": 0.90,
    "bicycle": 0.85,
    "other": 0.75,
}
SUSTAINABLE_MIN_REWARD = 60
SUSTAINABLE_MAX_REWARD = 300


def calculate_sustainable_purchase_reward(
    size_bytes: int | None,
    category: str = "Electric Vehicle",
) -> int:
    """Calculate a bounded local reward for the demo verification provider.

    This is intentionally a verification-confidence proxy, not a claim that
    file size measures carbon impact. A present, larger document gets a small
    quality factor and the verified purchase category contributes a multiplier:

        reward = clamp(round(120 * (0.75 + 0.25 * size_factor) * category_factor), 60, 300)

    ``size_factor`` is capped at 10 MB so arbitrary upload metadata cannot
    mint unbounded points. The provider and demo vehicle remain explicitly
    marked as mock in the API response.
    """
    try:
        bounded_size = min(max(0, int(size_bytes or 0)), 10 * 1024 * 1024)
    except (TypeError, ValueError):
        bounded_size = 0
    size_factor = bounded_size / float(10 * 1024 * 1024)
    category_key = str(category or "other").strip().lower()
    multiplier = SUSTAINABLE_CATEGORY_MULTIPLIERS.get(category_key, SUSTAINABLE_CATEGORY_MULTIPLIERS["other"])
    reward = round(120.0 * (0.75 + 0.25 * size_factor) * multiplier)
    return min(SUSTAINABLE_MAX_REWARD, max(SUSTAINABLE_MIN_REWARD, reward))


REWARD_PRICING_VERSION = "partner-reward-pricing-v1"
REWARD_MIN_LISTED_COST_FOR_NORMALIZATION = 100
REWARD_MIN_COST = 250
REWARD_MAX_COST = 1_000
REWARD_CATEGORY_BASE_COSTS: tuple[tuple[tuple[str, ...], int], ...] = (
    (("solar", "clean energy"), 400),
    (("samsung", "appliance", "service"), 350),
    (("fashion", "denim", "garment", "clothing"), 350),
    (("repair", "refurbished", "refurb", "accessory", "gear"), 300),
    (("e-waste", "ewaste", "recycling", "recycle", "packaging", "metro", "pass"), 250),
)

# Offset donations use the same Karma Coin wallet as partner rewards. The
# listed INR amount remains visible for transparency; the coin cost is a
# bounded local conversion so every offset has a predictable wallet impact.
OFFSET_POINTS_FORMULA_VERSION = "offset-points-v1"


def offset_points_cost(price_inr: float) -> int:
    """Convert an offset's listed INR price into a stable 10-coin tier."""
    try:
        price = max(0.0, float(price_inr))
    except (TypeError, ValueError):
        return 0
    if price <= 0:
        return 0
    # Use explicit half-up rounding so Python and JavaScript clients agree
    # (e.g. ₹450 becomes 230 coins rather than Python's banker-rounded 220).
    return max(50, int(price / 20.0 + 0.5) * 10)


def effective_reward_cost(
    listed_points: int,
    title: str = "",
    description: str = "",
) -> int:
    """Return the shared partner-offer price used by display and redemption.

    Seeded offers remain data fixtures, but their prices follow bounded local
    tiers. The lower bound is applied to normal catalog prices (100+), which
    prevents accidental 100/150-coin offers while preserving custom test or
    future admin offers below that threshold until explicitly classified.
    """
    try:
        listed = max(0, int(listed_points))
    except (TypeError, ValueError):
        listed = REWARD_MIN_COST
    if listed < REWARD_MIN_LISTED_COST_FOR_NORMALIZATION:
        return listed
    haystack = f"{title} {description}".lower()
    tier_cost = 0
    for keywords, base_cost in REWARD_CATEGORY_BASE_COSTS:
        if any(keyword in haystack for keyword in keywords):
            tier_cost = max(tier_cost, base_cost)
    if tier_cost == 0:
        # Unknown catalog entries retain their listed value but are still
        # prevented from becoming a free/nominal offer once categorized.
        return min(REWARD_MAX_COST, listed)
    return min(REWARD_MAX_COST, max(REWARD_MIN_COST, listed, tier_cost))


def verify_sustainable_purchase(
    filename: str,
    mime_type: str | None,
    size_bytes: int | None,
    user: UserModel,
    db: Session,
    vehicle_make_model: str | None = None,
    registration_number: str | None = None,
    allow_multiple: bool = False,
) -> dict:
    """Verify one EV document and award its bounded reward idempotently.

    The normal flow is idempotent; the explicit multi-asset mode lets each
    distinct document add another vehicle asset. The uploaded file is
    deliberately treated as metadata only, keeping the local prototype honest
    while leaving a provider seam for DigiLocker later.
    """
    default_provider = "UniversalSustainabilityVerificationEngine" if registration_number else "MockVerificationProvider"

    filename_key = str(filename or "").strip().lower()
    existing = None
    existing_events = db.query(ActivityEventModel).filter(
        ActivityEventModel.user_id == user.id,
        ActivityEventModel.kind == "sustainable_purchase_verification",
    ).all()
    for event in existing_events:
        metadata = event.meta or {}
        if str(metadata.get("filename", "")).strip().lower() == filename_key:
            existing = event
            break
    # The default flow remains a one-record demo flow for backwards
    # compatibility. The explicit Add another EV CTA opts into new assets.
    if existing is None and existing_events and not allow_multiple:
        existing = existing_events[0]
    if existing:
        meta = existing.meta or {}
        make_model = vehicle_make_model or meta.get("vehicle_make_model", "Tata Nexon EV")
        return {
            "status": "verified",
            "reward_points": 0,
            "total_points": int(user.impact_points),
            "already_claimed": True,
            "vehicle_make_model": make_model,
            "vehicle_type": "Electric Vehicle",
            "ownership": "Verified",
            "owner_name": meta.get("owner_name", "SARATHKUMAR B"),
            "verification": "Successful",
            "provider": meta.get("provider", default_provider),
            "reward_formula_version": meta.get(
                "reward_formula_version", SUSTAINABLE_REWARD_FORMULA_VERSION
            ),
            "reward_basis": meta.get("reward_basis", "Already claimed"),
            "is_mock": not bool(registration_number),
        }

    category = "Electric Vehicle"
    model_by_keyword = (
        ("nexon", "Tata Nexon EV"),
        ("mg", "MG ZS EV"),
        ("kona", "Hyundai Kona Electric"),
        ("x1", "BMW iX1"),
        ("ev6", "Kia EV6"),
    )
    vehicle_model = next(
        (model for keyword, model in model_by_keyword if keyword in filename_key),
        "Tata Nexon EV" if not existing_events else f"Electric Vehicle {len(existing_events) + 1}",
    )
    make_model = vehicle_make_model or vehicle_model
    reward_points = calculate_sustainable_purchase_reward(size_bytes, category)
    size_mb = round(max(0, int(size_bytes or 0)) / (1024 * 1024), 2)
    user.impact_points = int(user.impact_points) + reward_points

    make_model = vehicle_make_model or "Tata Nexon EV"
    reg_no = registration_number or "MH-12-EV-2024"

    # Register/update real SustainabilityAssetModel
    now = datetime.now(timezone.utc)
    if not ev_asset:
        ev_asset = SustainabilityAssetModel(
            user_id=user.id,
            asset_type="electric_vehicle",
            subtype="4w",
            identifier=reg_no,
            ownership_verified=True,
            ownership_verified_at=now,
            adoption_reward_claimed=True,
            meta_json=json.dumps({
                "vehicle_make_model": make_model,
                "registration_number": reg_no,
                "verified_via": "EV_Verification_Flow",
            }),
        )
        db.add(ev_asset)
        db.flush()
    else:
        ev_asset.ownership_verified = True
        ev_asset.ownership_verified_at = now
        ev_asset.adoption_reward_claimed = True

    # Record reward in ledger
    reward_record = SustainabilityRewardModel(
        user_id=user.id,
        asset_id=ev_asset.id,
        reward_type="ADOPTION",
        points=reward_points,
        co2_saved_kg=120.0,
        breakdown_json=json.dumps({"adoption_points": reward_points, "total_points": reward_points}),
    )
    db.add(reward_record)

    log_activity_event(
        user,
        db,
        "sustainable_purchase_verification",
        f"{make_model} verified",
        f"Verified EV adoption · +{reward_points} Impact Points",
        points_delta=reward_points,
        meta={
            "filename": filename,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "vehicle_type": "Electric Vehicle",
            "vehicle_make_model": make_model,
            "registration_number": registration_number,
            "provider": default_provider,
            "reward_formula_version": SUSTAINABLE_REWARD_FORMULA_VERSION,
            "reward_basis": f"Verified Electric Vehicle adoption ({make_model})",
            "is_mock": not bool(registration_number),
        },
    )

    # Update Sustainability Credit history
    credit = calculate_sustainability_credit(user, db, new_points=reward_points)
    credit_record = SustainabilityCreditHistoryModel(
        user_id=user.id,
        credit_score=credit.sustainability_credit,
        trend=credit.trend,
        consistency_factor=credit.consistency_factor,
        total_verified_generation_kwh=credit.total_verified_kwh,
        total_verified_adoption_count=credit.total_verified_adoptions,
        summary_json=json.dumps({"event": "EV_ADOPTION_VERIFIED", "asset_id": ev_asset.id}),
    )
    db.add(credit_record)

    db.commit()
    db.refresh(user)
    return {
        "status": "verified",
        "reward_points": reward_points,
        "total_points": int(user.impact_points),
        "already_claimed": False,
        "vehicle_make_model": make_model,
        "vehicle_type": "Electric Vehicle",
        "ownership": "Verified",
        "owner_name": "SARATHKUMAR B",
        "verification": "Successful",
        "provider": default_provider,
        "reward_formula_version": SUSTAINABLE_REWARD_FORMULA_VERSION,
        "reward_basis": f"Verified Electric Vehicle adoption ({make_model})",
        "is_mock": not bool(registration_number),
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
    points_to_reverse = sum(int(e.points_delta or 0) for e in events)
    for e in events:
        db.delete(e)

    # Also reset EV adoption flag on SustainabilityAssetModel if exists
    ev_asset = (
        db.query(SustainabilityAssetModel)
        .filter(
            SustainabilityAssetModel.user_id == user.id,
            SustainabilityAssetModel.asset_type == "electric_vehicle",
        )
        .first()
    )
    if ev_asset:
        ev_asset.adoption_reward_claimed = False

    user.impact_points = max(0, int(user.impact_points) - points_to_reverse)
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
        "provider": "MockVerificationProvider",
        "reward_formula_version": SUSTAINABLE_REWARD_FORMULA_VERSION,
        "reward_basis": "No reward claimed",
        "is_mock": True,
    }


def verify_evidence(
    user: UserModel,
    analysis: VerificationAnalysis,
    db: Session,
    image_base64: str | None = None,
) -> UniversalVerificationResponse:
    """Run the deterministic verification engine on VLM analysis."""
    image_hash = compute_image_hash(image_base64)
    return run_deterministic_verification(
        user=user,
        analysis=analysis,
        db=db,
        image_hash=image_hash,
    )


def get_user_sustainability_assets(
    user: UserModel,
    db: Session,
) -> list[SustainabilityAssetModel]:
    return (
        db.query(SustainabilityAssetModel)
        .filter(SustainabilityAssetModel.user_id == user.id)
        .order_by(SustainabilityAssetModel.created_at.desc())
        .all()
    )


def get_user_sustainability_credit(
    user: UserModel,
    db: Session,
) -> dict[str, Any]:
    latest = (
        db.query(SustainabilityCreditHistoryModel)
        .filter(SustainabilityCreditHistoryModel.user_id == user.id)
        .order_by(SustainabilityCreditHistoryModel.recorded_at.desc())
        .first()
    )
    if not latest:
        credit = calculate_sustainability_credit(user, db)
        return {
            "credit_score": credit.sustainability_credit,
            "trend": credit.trend,
            "consistency_factor": credit.consistency_factor,
            "total_verified_generation_kwh": credit.total_verified_kwh,
            "total_verified_adoption_count": credit.total_verified_adoptions,
            "summary": {},
            "recorded_at": datetime.now(timezone.utc),
        }
    return {
        "credit_score": latest.credit_score,
        "trend": latest.trend,
        "consistency_factor": latest.consistency_factor,
        "total_verified_generation_kwh": latest.total_verified_generation_kwh,
        "total_verified_adoption_count": latest.total_verified_adoption_count,
        "summary": latest.summary,
        "recorded_at": latest.recorded_at,
    }


def get_user_sustainability_history(
    user: UserModel,
    db: Session,
) -> list[dict[str, Any]]:
    submissions = (
        db.query(EvidenceSubmissionModel)
        .filter(EvidenceSubmissionModel.user_id == user.id)
        .order_by(EvidenceSubmissionModel.created_at.desc())
        .limit(50)
        .all()
    )
    results = []
    for s in submissions:
        results.append({
            "id": s.id,
            "asset_id": s.asset_id,
            "evidence_type": s.evidence_type,
            "verification_status": s.verification_status,
            "metric_type": s.metric_type,
            "metric_value": s.metric_value,
            "period_key": s.period_key,
            "confidence": s.confidence,
            "created_at": s.created_at.isoformat(),
            "explanation": s.explanation,
        })
    return results



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

        if t.date.startswith(current_prefix):
            this_m += kg
            by_category[cat_str] = round(by_category.get(cat_str, 0.0) + kg, 1)
            if cat_str == ProductCategory.TRANSPORT.value:
                transport += kg
            elif cat_str == ProductCategory.ENERGY.value:
                energy += kg
            else:
                purchases += kg
        elif t.date.startswith(prev_prefix):
            prev_m += kg

    if this_m == 0.0 and txns:
        latest_prefix = txns[0].date[:7]
        for t in txns:
            if t.date.startswith(latest_prefix):
                kg = t.co2e_kg
                cat_str = t.category
                by_category[cat_str] = round(by_category.get(cat_str, 0.0) + kg, 1)
                if cat_str == ProductCategory.TRANSPORT.value:
                    transport += kg
                elif cat_str == ProductCategory.ENERGY.value:
                    energy += kg
                else:
                    purchases += kg
        this_m = purchases + transport + energy

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
        for i, ws in enumerate(sorted(weeks.keys())[-8:])
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


_POINTS_LEDGER_SOURCES = {
    "receipt_reward": "receipt",
    "sustainable_purchase_verification": "sustainable_purchase",
    "steps": "steps",
    "commute": "commute",
    "solar": "solar",
    "challenge": "challenge",
    "complete": "impact_action",
    "redeem": "redemption",
    "streak_bonus": "streak_bonus",
    "league_bonus": "league_bonus",
}


def list_points_ledger(
    user: UserModel | None = None,
    db: Session | None = None,
    limit: int = 100,
) -> dict:
    """Return the server-backed chronological Karma Coins ledger.

    Activity events are the existing append-only points ledger. Balances are
    reconstructed from the current account balance backwards so they remain
    meaningful even for seeded accounts whose initial balance predates events.
    Zero-point activity is retained as ``event`` entries so purchases, scans,
    and other account changes are visible beside earned and spent coins.
    """
    user, db = _resolve_user_and_db(user, db)
    safe_limit = max(1, min(int(limit), 250))
    rows = (
        db.query(ActivityEventModel)
        .filter(ActivityEventModel.user_id == user.id)
        .order_by(ActivityEventModel.created_at.asc(), ActivityEventModel.id.asc())
        .all()
    )

    balances_after: dict[str, int] = {}
    balance = int(user.impact_points or 0)
    for row in reversed(rows):
        balances_after[row.id] = balance
        balance -= int(row.points_delta or 0)

    entries: list[dict] = []
    for row in rows[-safe_limit:]:
        meta = row.meta
        delta = int(row.points_delta or 0)
        source = _POINTS_LEDGER_SOURCES.get(row.kind, row.kind)
        redemption_status = None
        if row.kind == "redeem":
            redemption_status = str(meta.get("redemption_status") or "redeemed")
        entries.append(
            {
                "id": row.id,
                "type": "earned" if delta > 0 else "spent" if delta < 0 else "event",
                "source": source,
                "title": row.title,
                "subtitle": row.subtitle,
                "points_delta": delta,
                "balance_after": balances_after[row.id],
                "timestamp": row.created_at,
                "redemption_status": redemption_status,
                "meta": meta,
            }
        )
    return {
        "balance": int(user.impact_points or 0),
        "entries": list(reversed(entries)),
        "is_demo": True,
    }


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
            co2e_kg=float(r.co2e_kg),
        )
        for r in rows
    ]


def import_transactions(
    rows: list[dict], user: UserModel | None = None, db: Session | None = None
) -> list[Transaction]:
    user, db = _resolve_user_and_db(user, db)
    # Validate the complete batch before mutating the session. This protects
    # the direct CSV/import endpoint as well as the document proxy; callers
    # must not be able to submit negative, non-finite, or absurd amounts and
    # still create footprint records or influence reward calculations.
    for index, row in enumerate(rows):
        try:
            amount = float(row.get("amount_inr", row.get("amount", 0)) or 0)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"Invalid amount for import row {index + 1}") from None
        if not math.isfinite(amount) or amount <= 0 or amount > 10_000_000:
            raise HTTPException(status_code=400, detail=f"Invalid amount for import row {index + 1}")

    created: list[Transaction] = []
    reward_total = 0
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
        source_key = _receipt_source_key(row, cat, amount, merchant, str(row.get("date") or today))
        if db.query(TransactionModel.id).filter(
            TransactionModel.user_id == user.id,
            TransactionModel.source_key == source_key,
        ).first():
            # Receipt confirmation is retriable. Existing lines must not mint
            # another transaction, reward event, or KCS input.
            continue
        confidence = row.get("confidence", ExtractionConfidence.HIGH)
        reward_points = calculate_receipt_reward(cat, amount, est.estimated_co2e_kg, confidence)
        txn_id = uuid4()
        txn_model = TransactionModel(
            id=str(txn_id),
            user_id=user.id,
            date=str(row.get("date") or today),
            merchant=merchant,
            amount_inr=amount,
            category=cat.value,
            co2e_kg=float(est.estimated_co2e_kg),
            source_key=source_key,
        )
        db.add(txn_model)
        db.flush()
        user.impact_points = int(user.impact_points) + reward_points
        reward_total += reward_points
        created.append(
            Transaction(
                id=txn_id,
                date=txn_model.date,
                merchant=merchant,
                amount_inr=amount,
                category=cat,
                co2e_kg=float(est.estimated_co2e_kg),
                reward_points_awarded=reward_points,
            )
        )
    if reward_total:
        log_activity_event(
            user,
            db,
            "receipt_reward",
            f"Earned {reward_total} Impact Points from receipts",
            f"Formula-based reward · {len(created)} new line items",
            points_delta=reward_total,
            meta={
                "formula_version": RECEIPT_REWARD_FORMULA_VERSION,
                "line_items": len(created),
                "reward_points": reward_total,
            },
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
    integrity = inspect_document_integrity(
        filename=f"{example_id}.{'pdf' if example['source'] == 'pdf' else 'jpg'}",
        mime_type="application/pdf" if example["source"] == "pdf" else "image/jpeg",
        size_bytes=len(str(example["ocr_text"]).encode("utf-8")),
        text=str(example["ocr_text"]),
        items=example["extracted_items"],
    )

    # A rejected document never reaches import_transactions, so it cannot
    # mint Karma Coins, a badge, or league points through the route hook.
    if integrity["fraud_detected"]:
        return {
            "example_id": example_id,
            "title": str(example["title"]),
            "pipeline_steps": list(example["pipeline_steps"]),
            "ocr_preview": str(example["ocr_text"]).strip()[:280],
            "auto_import": [],
            "needs_review": [],
            "imported": 0,
            "transactions": [],
            "message": "Document rejected by local integrity checks; no rewards were issued.",
            "badges_unlocked": [],
            "requires_review": False,
            "is_mock": True,
            "co2e_kg_added": 0.0,
            "reward_points_awarded": 0,
            "duplicate_count": 0,
            "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
            **integrity,
        }

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
                "source_key": f"document:{example_id}:line:{i['id']}",
                "merchant": i["merchant"],
                "amount_inr": i["amount_inr"],
                "date": i["date"],
                "category": i["category"],
                "confidence": i.get("confidence", ExtractionConfidence.HIGH),
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
        "co2e_kg_added": round(sum(float(t.co2e_kg or 0) for t in transactions), 3),
        "reward_points_awarded": sum(int(t.reward_points_awarded) for t in transactions),
        "duplicate_count": len(auto_import) - len(transactions),
        "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
        **integrity,
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
    for index, raw in enumerate(items):
        if isinstance(raw, DocumentConfirmItem):
            if raw.discarded:
                continue
            rows.append(
                {
                    "id": raw.id or index,
                    "source_key": f"document:{example_id}:line:{raw.id or index}",
                    "merchant": raw.merchant,
                    "amount_inr": raw.amount_inr,
                    "date": raw.date,
                    "category": raw.category,
                    "confidence": raw.confidence,
                }
            )
        else:
            if raw.get("discarded"):
                continue
            rows.append(
                {
                    "id": raw.get("id") or index,
                    "source_key": f"document:{example_id}:line:{raw.get('id') or index}",
                    "merchant": str(raw.get("merchant", "Unknown")),
                    "amount_inr": float(raw.get("amount_inr", 0) or 0),
                    "date": str(raw.get("date") or date.today().isoformat()),
                    "category": raw.get("category"),
                    "confidence": raw.get("confidence", ExtractionConfidence.HIGH),
                }
            )

    integrity = inspect_document_integrity(items=rows)
    if integrity["fraud_detected"]:
        return {
            "imported": 0,
            "transactions": [],
            "message": "Document rejected by local integrity checks; no rewards were issued.",
            "badges_unlocked": [],
            "is_mock": True,
            "co2e_kg_added": 0.0,
            "reward_points_awarded": 0,
            "duplicate_count": 0,
            "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
            **integrity,
        }
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
        "co2e_kg_added": round(sum(float(t.co2e_kg or 0) for t in created), 3),
        "reward_points_awarded": sum(int(t.reward_points_awarded) for t in created),
        "duplicate_count": len(rows) - len(created),
        "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
        **integrity,
    }


def parse_receipt_text(
    text: str | None = None,
    use_demo: bool = True,
    user: UserModel | None = None,
    db: Session | None = None,
) -> dict:
    user, db = _resolve_user_and_db(user, db)
    raw = (text or "").strip()
    if use_demo:
        raw = DEMO_RECEIPT_TEXT
    elif not raw:
        # A real empty upload is not permission to mint the seeded demo
        # receipt. Keep the result empty so callers can ask for a valid file.
        raw = ""

    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    merchant = "Receipt Import"
    rows: list[dict] = []
    receipt_key = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    amount_re = re.compile(r"(\d+(?:\.\d+)?)\s*$")

    for ln in lines:
        upper = ln.upper()
        matched_merchant = None
        if any(
            k in upper
            for k in (
                "SWIGGY", "ZOMATO", "UBER", "CROMA", "AMAZON",
                "FLIPKART", "BESCOM", "PHILIPS", "BIGBASKET", "BLINKIT",
            )
        ):
            for token in (
                "Swiggy", "Zomato", "Uber", "Croma", "Amazon",
                "Flipkart", "BESCOM", "Philips", "BigBasket", "Blinkit",
            ):
                if token.upper() in upper:
                    matched_merchant = token
                    break
            if matched_merchant:
                merchant = matched_merchant
        if ln.startswith("---"):
            continue
        m = amount_re.search(ln.replace(",", ""))
        if not m:
            continue
        amount = float(m.group(1))
        if amount <= 0:
            continue
        rows.append({
            "source_key": f"receipt-text:{receipt_key}:line:{len(rows)}",
            "merchant": merchant,
            "amount_inr": amount,
            "date": date.today().isoformat(),
        })

    if not rows and use_demo:
        rows = [
            {"source_key": f"receipt-text:{receipt_key}:line:0", "merchant": "Croma", "amount_inr": 899, "date": date.today().isoformat()},
            {"source_key": f"receipt-text:{receipt_key}:line:1", "merchant": "Swiggy", "amount_inr": 320, "date": date.today().isoformat()},
            {"source_key": f"receipt-text:{receipt_key}:line:2", "merchant": "Uber", "amount_inr": 180, "date": date.today().isoformat()},
        ]

    if not rows:
        return {
            "imported": 0,
            "transactions": [],
            "message": "No receipt line items could be read. Nothing was imported.",
            "badges_unlocked": [],
            "co2e_kg_added": 0.0,
            "reward_points_awarded": 0,
            "duplicate_count": 0,
            "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
        }

    integrity = inspect_document_integrity(mime_type="text/plain", text=raw, items=rows)
    if integrity["fraud_detected"]:
        return {
            "imported": 0,
            "transactions": [],
            "message": "Receipt rejected by local integrity checks; no rewards were issued.",
            "badges_unlocked": [],
            "co2e_kg_added": 0.0,
            "reward_points_awarded": 0,
            "duplicate_count": 0,
            "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
            **integrity,
        }

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
        "co2e_kg_added": round(sum(float(t.co2e_kg or 0) for t in created), 3),
        "reward_points_awarded": sum(int(t.reward_points_awarded) for t in created),
        "duplicate_count": len(rows) - len(created),
        "reward_formula_version": RECEIPT_REWARD_FORMULA_VERSION,
        **integrity,
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
        "action_type": inferred.value,
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

    existing = (
        db.query(UserRewardRedemptionModel)
        .filter(
            UserRewardRedemptionModel.user_id == user.id,
            UserRewardRedemptionModel.reward_id == str(reward_id),
        )
        .first()
    )
    if existing:
        claim_code = None
        event_rows = (
            db.query(ActivityEventModel)
            .filter(
                ActivityEventModel.user_id == user.id,
                ActivityEventModel.kind == "redeem",
            )
            .order_by(ActivityEventModel.created_at.desc())
            .all()
        )
        for event in event_rows:
            if str(event.meta.get("reward_id", "")) == str(reward_id):
                claim_code = event.meta.get("claim_code")
                break
        claim_code = str(claim_code or f"LOOP-{str(reward_id)[-4:].upper()}-{user.impact_points}")
        return {
            "reward_id": reward_id,
            "claim_code": claim_code,
            "points_spent": int(existing.points_spent),
            "points_remaining": int(user.impact_points),
            "message": f"Reward already redeemed: {reward.brand or reward.title}",
            "already_redeemed": True,
            "is_mock": True,
        }

    cost = effective_reward_cost(
        reward.points_required,
        reward.title,
        reward.description,
    )

    # ANTI-GAMING: rewards over 300pts require a verified score.
    # A1 owns the score_state/verified_score columns; use getattr so this
    # module does not crash when A1 columns are not yet merged.
    try:
        score_state = getattr(user, "score_state", None)
    except Exception:
        score_state = None
    try:
        cost = int(cost)
    except Exception:
        cost = 0
    if cost > 300 and score_state != "verified":
        raise HTTPException(
            status_code=403,
            detail="Verified score required for rewards over 300pts (upload bills to unlock)",
        )

    if user.impact_points < cost:
        raise ValueError("Not enough impact points")

    user.impact_points -= cost
    user.loop_level = max(1, user.impact_points // 250 + 1)

    db.add(
        UserRewardRedemptionModel(
            user_id=user.id,
            reward_id=str(reward_id),
            points_spent=cost,
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
        f"Code ready · −{cost} pts",
        points_delta=-cost,
        meta={
            "reward_id": str(reward_id),
            "redemption_status": "redeemed",
            "merchant": reward.brand,
            "listed_points_required": int(reward.points_required),
            "points_spent": cost,
            "pricing_version": REWARD_PRICING_VERSION,
            "claim_code": code,
        },
    )
    db.commit()

    return {
        "reward_id": reward_id,
        "claim_code": code,
        "points_spent": cost,
        "points_remaining": user.impact_points,
        "message": f"Demo claim code ready for {reward.brand or reward.title}",
        "already_redeemed": False,
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

    points_cost = offset_points_cost(project.price_inr)
    if int(user.impact_points or 0) < points_cost:
        raise ValueError(
            f"Not enough Karma Coins (need {points_cost}, have {int(user.impact_points or 0)})"
        )

    user.offset_kg_total = round(user.offset_kg_total + project.co2e_kg, 1)
    user.impact_points = int(user.impact_points or 0) - points_cost
    user.loop_level = max(1, user.impact_points // 250 + 1)
    purchase = UserOffsetPurchaseModel(
        user_id=user.id,
        offset_id=str(offset_id),
        co2e_kg=project.co2e_kg,
        amount_inr=project.price_inr,
    )
    db.add(purchase)
    db.flush()

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
        f"Offset purchase: {project.name}",
        f"−{points_cost} Karma Coins · +{int(project.co2e_kg)} kg offset",
        points_delta=-points_cost,
        meta={
            "purchase_id": purchase.id,
            "offset_id": str(offset_id),
            "co2e_kg": float(project.co2e_kg),
            "amount_inr": float(project.price_inr),
            "points_spent": points_cost,
            "points_formula_version": OFFSET_POINTS_FORMULA_VERSION,
            "status": "purchased",
        },
    )
    db.commit()

    impact = user_impact(user, db)
    return {
        "offset_id": offset_id,
        "co2e_kg": project.co2e_kg,
        "price_inr": project.price_inr,
        "points_spent": points_cost,
        "points_remaining": int(user.impact_points),
        "offset_kg_total": user.offset_kg_total,
        "residual_kg": impact["residual_kg"],
        "message": (
            f"Demo purchase: −{points_cost} Karma Coins for +{int(project.co2e_kg)} kg offset. "
            f"{int(user.impact_points)} coins remain. Residual footprint ~{impact['residual_kg']} kg."
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
