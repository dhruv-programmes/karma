from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app.schemas import ActionType, CircularityBreakdown, Product
from app.seed.data import demo_state, unlock_badge

# ---- KCS (Khabarchakra Score) constants ----
# A1 owns DB columns/routes; A2 owns this math. Keep pure & import-safe.
REF_KG = 110.0
BASE_SCORE = 650
SLOPE = 2.2
PROVISIONAL_CAP = 680
MIN_SCORE = 480
MAX_SCORE = 820

ACTION_POINTS = {
    ActionType.REPAIR: 100,
    ActionType.RECYCLE: 150,
    ActionType.REFURBISH: 120,
    ActionType.DONATE: 100,
    ActionType.RESELL: 90,
    ActionType.REDUCE: 80,
    ActionType.REPLACE: 0,
}

ACTION_SCORE_BUMP = {
    ActionType.REPAIR: 3,
    ActionType.RECYCLE: 2,
    ActionType.REFURBISH: 3,
    ActionType.DONATE: 2,
    ActionType.RESELL: 2,
    ActionType.REDUCE: 2,
    ActionType.REPLACE: 0,
}


def product_circularity_score(product: Product) -> tuple[int, CircularityBreakdown]:
    b = product.circularity_breakdown
    score = round(
        (
            b.repairability
            + b.longevity
            + b.recyclability
            + b.reuse_potential
            + b.circular_options
        )
        / 5.0
    )
    return score, b


def user_circularity_score() -> int:
    """Based on measurable behavior — opening the app does not earn points."""
    return demo_state.user.circularity_score


def complete_action(action_id: UUID, action_type: ActionType | None = None) -> dict:
    user = demo_state.user
    if action_id in demo_state.completed_action_ids:
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
        for rec in demo_state.recommendations:
            if rec.id == action_id:
                inferred = rec.action_type
                break
    if inferred is None:
        inferred = ActionType.REPAIR

    points = ACTION_POINTS.get(inferred, 50)
    bump = ACTION_SCORE_BUMP.get(inferred, 1)
    previous = user.circularity_score

    demo_state.completed_action_ids.add(action_id)
    user.impact_points += points
    user.circularity_score = min(100, previous + bump)
    user.streak_days += 1
    user.trend_delta = max(user.trend_delta, bump)
    demo_state.sync_level()

    badges: list[str] = []
    if inferred == ActionType.REPAIR and unlock_badge("first_repair"):
        badges.append("first_repair")
    if inferred == ActionType.RECYCLE and unlock_badge("e_waste_hero"):
        badges.append("e_waste_hero")
    if user.streak_days >= 7 and unlock_badge("streak_7"):
        badges.append("streak_7")

    from app.seed.data import log_activity

    log_activity(
        "complete",
        f"Completed {inferred.value.title()}",
        f"+{points} Impact Points",
        points_delta=points,
        meta={"action_id": str(action_id)},
    )

    return {
        "action_id": action_id,
        "points_awarded": points,
        "previous_score": previous,
        "new_score": user.circularity_score,
        "message": f"+{points} Impact Points",
        "badges_unlocked": badges,
        "loop_level": user.loop_level,
    }


# ============================================================
# KCS scoring math (PURE — no DB, no I/O). A2 owns math.
# A1 owns DB columns/routes and imports these helpers.
# ============================================================

_FREQUENT_MAP = {"never": 0, "rarely": 10, "sometimes": 22, "often": 40}
_SELECTIVE_REV_MAP = {"never": 16, "rarely": 10, "sometimes": 6, "often": 0}
_REPAIR_CREDIT_MAP = {"never": 0, "rarely": 4, "sometimes": 8, "often": 12}

_TRANSPORT_MAPS = {
    # mode -> {never, rarely, sometimes, often}
    "public": {"never": 0, "rarely": 4, "sometimes": 12, "often": 22},
    "twowheeler": {"never": 0, "rarely": 6, "sometimes": 16, "often": 26},
    "car": {"never": 0, "rarely": 12, "sometimes": 26, "often": 44},
    "walk": {"never": 0, "rarely": 2, "sometimes": 4, "often": 6},
}

# Category -> 5-bucket data-meter mapping.
_CATEGORY_BUCKET_MAP = {
    "food": "Food",
    "electronics": "Shopping",
    "clothing": "Shopping",
    "transport": "Transport",
    "energy": "Energy",
    # catch-all bucket:
    "home": "Home",
    "other": "Home",
    "furniture": "Home",
    "personal": "Home",
    "personal care": "Home",
}

# Missing-label mapping (order matters for stable UI):
#   Energy missing      -> "Electricity bill"
#   Shopping missing    -> "Shopping history"
#   Food missing        -> "Food delivery history"
#   Transport missing   -> "Travel history"
#   variety_ok False    -> "Varied history"
# Home bucket counts toward coverage (>=4 buckets) but has no
# dedicated missing label (catch-all bucket).


def kcs_from_kg(kg: float) -> int:
    """Map monthly kgCO2e to Khabarchakra Score.

    Formula: clamp(round(650 + (110 - kg) * 2.2), 480, 820).
    Pure function. Never raises on numeric input; coerces bad input to REF_KG.
    """
    try:
        v = float(kg)
    except Exception:
        v = REF_KG
    # guard NaN/inf
    try:
        import math as _math

        if not _math.isfinite(v):
            v = REF_KG
    except Exception:
        v = REF_KG
    raw = round(BASE_SCORE + (REF_KG - v) * SLOPE)
    return max(MIN_SCORE, min(MAX_SCORE, int(raw)))


def provisional_kcs(totalKg: float) -> int:
    """Provisional (baseline-estimate) score: capped at 680.

    Shown = min(kcs_from_kg(totalKg), PROVISIONAL_CAP).
    """
    return min(kcs_from_kg(totalKg), PROVISIONAL_CAP)


def verified_kcs(actual_monthly_kg: float) -> int:
    """Verified (measured) score: uncapped KCS mapping."""
    return kcs_from_kg(actual_monthly_kg)


def _norm_freq(value: Any) -> str:
    try:
        s = str(value or "never").strip().lower()
    except Exception:
        return "never"
    return s if s in ("never", "rarely", "sometimes", "often") else "never"


def shopping_kg(frequent: str, selective: str, repair: str) -> int:
    """Estimate shopping monthly kg from baseline frequency answers.

    Table (all inputs case-insensitive; unknown -> "never"):

    | answer    | frequent (buy often) | selective_rev (buy selectively) | repair_credit (repair/reuse, SUBTRACT) |
    |-----------|----------------------|---------------------------------|----------------------------------------|
    | never     | 0                    | 16                              | 0                                      |
    | rarely    | 10                   | 10                              | 4                                      |
    | sometimes | 22                   | 6                               | 8                                      |
    | often     | 40                   | 0                               | 12                                     |

    selective is REVERSED (selective shoppers emit less).
    repair is a CREDIT (subtracted).
    Returns max(12, frequent + selective - repair).
    """
    f = _FREQUENT_MAP[_norm_freq(frequent)]
    s = _SELECTIVE_REV_MAP[_norm_freq(selective)]
    r = _REPAIR_CREDIT_MAP[_norm_freq(repair)]
    return max(12, f + s - r)


def transport_kg(public: str, twowheeler: str, car: str, walk: str) -> int:
    """Estimate transport monthly kg from baseline frequency answers.

    Per-mode maps (case-insensitive; unknown -> "never"):

    | answer    | public | twowheeler | car | walk |
    |-----------|--------|------------|-----|------|
    | never     | 0      | 0          | 0   | 0    |
    | rarely    | 4      | 6          | 12  | 2    |
    | sometimes | 12     | 16         | 26  | 4    |
    | often     | 22     | 26         | 44  | 6    |

    Returns max(8, public + twowheeler + car + walk).
    """
    total = (
        _TRANSPORT_MAPS["public"][_norm_freq(public)]
        + _TRANSPORT_MAPS["twowheeler"][_norm_freq(twowheeler)]
        + _TRANSPORT_MAPS["car"][_norm_freq(car)]
        + _TRANSPORT_MAPS["walk"][_norm_freq(walk)]
    )
    return max(8, total)


def confidence_for_meter(
    signals: Any, cats_covered: Any, merchants: Any, variety_ok: Any
) -> tuple[float, str]:
    """Map data-meter inputs to (confidence, label). Pure.

    - verified gate (signals>=12, cats>=4, merchants>=5, variety_ok) -> (0.85, "High")
    - signals < 6 -> (0.4, "Low")
    - else (6-11 signals, or cats<4, or gate not met) -> (0.6, "Medium")

    cats_covered/merchants accept int counts OR sized collections.
    variety_ok is truthy/falsy. Never raises.
    """
    try:
        n_signals = int(signals)
    except Exception:
        try:
            n_signals = len(signals)  # type: ignore[arg-type]
        except Exception:
            n_signals = 0
    try:
        n_cats = int(cats_covered)
    except Exception:
        try:
            n_cats = len(cats_covered)  # type: ignore[arg-type]
        except Exception:
            n_cats = 0
    try:
        n_merchants = int(merchants)
    except Exception:
        try:
            n_merchants = len(merchants)  # type: ignore[arg-type]
        except Exception:
            n_merchants = 0
    try:
        varied = bool(variety_ok)
    except Exception:
        varied = False

    if n_signals >= 12 and n_cats >= 4 and n_merchants >= 5 and varied:
        return (0.85, "High")
    if n_signals < 6:
        return (0.4, "Low")
    return (0.6, "Medium")


def _bucket_for_category(category: Any) -> str:
    try:
        key = str(category or "").strip().lower()
    except Exception:
        return "Home"
    if key in _CATEGORY_BUCKET_MAP:
        return _CATEGORY_BUCKET_MAP[key]
    if key.startswith("personal"):
        return "Home"
    return "Home"


def _parse_dt(value: Any) -> datetime | None:
    """Best-effort parse of ISO strings / datetimes. Never raises."""
    try:
        if value is None:
            return None
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, (int, float)):
            dt = datetime.fromtimestamp(float(value), tz=timezone.utc)
        else:
            s = str(value).strip()
            if not s:
                return None
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            try:
                dt = datetime.fromisoformat(s)
            except Exception:
                dt = None
                for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                    try:
                        dt = datetime.strptime(s[: len(fmt)], fmt)
                        break
                    except Exception:
                        continue
            if dt is None:
                return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _parse_day(value: Any) -> datetime | None:
    try:
        s = str(value or "").strip()[:10]
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        try:
            dt = _parse_dt(value)
            if dt is None:
                return None
            return datetime(dt.year, dt.month, dt.day)
        except Exception:
            return None


def compute_data_meter(user: Any, db: Any) -> dict:
    """Build the data-meter dict for verified-gate decisions. Never crashes.

    signals = #TransactionModel(user) + #ActivityEventModel(user, kind in scan/complete/receipt)
    categories_covered: Transaction.category -> 5 buckets
        {Food, Shopping(Electronics/Clothing), Transport, Energy,
         Home(Home/Other/Furniture/Personal[ care])} + scan activity -> Shopping.
    merchants: distinct Transaction.merchant count (merchant_list capped at 50).
    variety_ok: distinct ISO weeks from Transaction.date >= 3 AND
        largest single-day share <= 50%. (<3 txns -> False.)
    verified_gate: signals>=12 and len(cats)>=4 and merchants>=5 and variety_ok.
    missing: ordered subset of
        ["Electricity bill", "Shopping history", "Food delivery history",
         "Travel history", "Varied history"].
    nudge: (now - baseline_created_at >= 14d) and not verified_gate.
        baseline from getattr(user, "baseline_created_at", None), fallback to
        getattr(user, "created_at", None); unparseable/missing -> False.
    actual_monthly_kg: (sum co2e_kg / max(1, distinct_days)) * 30, or None if no txns.
    confidence/confidence_label via confidence_for_meter.
    Returns aliases (verified == verified_gate, cats_covered == categories_covered,
    etc.) so A1 routes are key-name tolerant.
    """
    try:
        from app.db.models import ActivityEventModel, TransactionModel
    except Exception:  # pragma: no cover - import-safe fallback
        TransactionModel = None  # type: ignore[assignment]
        ActivityEventModel = None  # type: ignore[assignment]

    txns: list[Any] = []
    acts: list[Any] = []
    try:
        if db is not None and TransactionModel is not None and user is not None:
            uid = getattr(user, "id", None)
            txns = (
                db.query(TransactionModel)
                .filter(TransactionModel.user_id == uid)
                .all()
            ) or []
    except Exception:
        txns = []
    try:
        if db is not None and ActivityEventModel is not None and user is not None:
            uid = getattr(user, "id", None)
            acts = (
                db.query(ActivityEventModel)
                .filter(
                    ActivityEventModel.user_id == uid,
                    ActivityEventModel.kind.in_(["scan", "complete", "receipt"]),
                )
                .all()
            ) or []
    except Exception:
        acts = []

    # Also fetch ALL activity kinds for scan->Shopping bucket (cheap, same user).
    scan_present = False
    try:
        for a in acts or []:
            if str(getattr(a, "kind", "")).strip().lower() == "scan":
                scan_present = True
                break
        if not scan_present and db is not None and ActivityEventModel is not None and user is not None:
            uid = getattr(user, "id", None)
            try:
                all_acts = (
                    db.query(ActivityEventModel)
                    .filter(ActivityEventModel.user_id == uid)
                    .all()
                ) or []
                for a in all_acts:
                    if str(getattr(a, "kind", "")).strip().lower() == "scan":
                        scan_present = True
                        break
            except Exception:
                pass
    except Exception:
        scan_present = False

    try:
        signals = len(txns) + len(acts)
    except Exception:
        signals = 0

    buckets: set[str] = set()
    for t in txns or []:
        try:
            buckets.add(_bucket_for_category(getattr(t, "category", "")))
        except Exception:
            continue
    if scan_present:
        buckets.add("Shopping")
    categories_covered = sorted(buckets)

    merchants_set: set[str] = set()
    for t in txns or []:
        try:
            m = str(getattr(t, "merchant", "") or "").strip()
            if m:
                merchants_set.add(m)
        except Exception:
            continue
    merchant_list = sorted(merchants_set)[:50]
    merchants_count = len(merchants_set)

    # variety: distinct ISO weeks + single-day concentration
    distinct_weeks = 0
    distinct_days = 0
    variety_ok = False
    try:
        n_tx = len(txns)
        if n_tx >= 3:
            weeks: set[tuple[int, int]] = set()
            day_counter: Counter[str] = Counter()
            for t in txns:
                raw_date = getattr(t, "date", "")
                d = _parse_day(raw_date)
                if d is not None:
                    try:
                        iso = d.isocalendar()
                        weeks.add((int(iso[0]), int(iso[1])))
                    except Exception:
                        pass
                try:
                    day_key = str(raw_date or "").strip()[:10] or "unknown"
                except Exception:
                    day_key = "unknown"
                day_counter[day_key] += 1
            distinct_weeks = len(weeks)
            distinct_days = len(day_counter)
            total = max(1, sum(day_counter.values()))
            largest_share = (max(day_counter.values()) / total) if day_counter else 1.0
            variety_ok = bool(distinct_weeks >= 3 and largest_share <= 0.5)
        else:
            # still report distinct counts best-effort
            try:
                day_counter = Counter(
                    str(getattr(t, "date", "") or "").strip()[:10] for t in txns
                )
                distinct_days = len(day_counter)
            except Exception:
                distinct_days = 0
            variety_ok = False
    except Exception:
        variety_ok = False

    try:
        verified_gate = bool(
            signals >= 12
            and len(categories_covered) >= 4
            and merchants_count >= 5
            and variety_ok
        )
    except Exception:
        verified_gate = False

    missing: list[str] = []
    try:
        if "Energy" not in categories_covered:
            missing.append("Electricity bill")
        if "Shopping" not in categories_covered:
            missing.append("Shopping history")
        if "Food" not in categories_covered:
            missing.append("Food delivery history")
        if "Transport" not in categories_covered:
            missing.append("Travel history")
        if not variety_ok:
            missing.append("Varied history")
    except Exception:
        missing = []

    # nudge: 14d since baseline and gate not met. Never crash.
    nudge = False
    try:
        baseline_raw = getattr(user, "baseline_created_at", None)
        if baseline_raw is None:
            baseline_raw = getattr(user, "created_at", None)
        baseline_dt = _parse_dt(baseline_raw)
        if baseline_dt is not None:
            now = datetime.now(timezone.utc)
            nudge = bool((now - baseline_dt) >= timedelta(days=14) and not verified_gate)
        else:
            nudge = False
    except Exception:
        nudge = False

    actual_monthly_kg: float | None = None
    try:
        if txns:
            total_kg = 0.0
            days: set[str] = set()
            for t in txns:
                try:
                    total_kg += float(getattr(t, "co2e_kg", 0.0) or 0.0)
                except Exception:
                    continue
                try:
                    days.add(str(getattr(t, "date", "") or "").strip()[:10])
                except Exception:
                    continue
            days.discard("")
            n_days = max(1, len(days))
            actual_monthly_kg = round((total_kg / n_days) * 30.0, 1)
        else:
            actual_monthly_kg = None
    except Exception:
        actual_monthly_kg = None

    try:
        confidence, confidence_label = confidence_for_meter(
            signals, len(categories_covered), merchants_count, variety_ok
        )
    except Exception:
        confidence, confidence_label = (0.4, "Low")

    return {
        "signals": int(signals),
        "categories_covered": categories_covered,
        "cats_covered": categories_covered,
        "categories_count": len(categories_covered),
        "cats_count": len(categories_covered),
        "merchants": int(merchants_count),
        "merchants_count": int(merchants_count),
        "merchant_list": merchant_list,
        "variety_ok": bool(variety_ok),
        "distinct_weeks": int(distinct_weeks),
        "distinct_days": int(distinct_days),
        "verified_gate": bool(verified_gate),
        "verified": bool(verified_gate),
        "missing": missing,
        "nudge": bool(nudge),
        "actual_monthly_kg": actual_monthly_kg,
        "confidence": float(confidence),
        "confidence_label": str(confidence_label),
    }
