from __future__ import annotations

import json
import math
import re
from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import (
    ActivityEventModel,
    FacilityModel,
    OffsetProjectModel,
    ProductModel,
    RecommendationModel,
    RewardModel,
    TransactionModel,
    UserBadgeModel,
    UserCompletedActionModel,
    UserModel,
    UserOffsetPurchaseModel,
    UserProductModel,
    UserRewardRedemptionModel,
)
from app.db.session import SessionLocal
from app.engines.carbon import estimate_from_spend
from app.engines.scoring import ACTION_POINTS, ACTION_SCORE_BUMP
from app.schemas import (
    ActionType,
    CircularityBreakdown,
    EffortLevel,
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
    FACILITIES,
    MERCHANT_CATEGORY_RULES,
    OFFSETS,
    PHONE_ID,
    PRODUCTS,
    REWARDS,
    demo_state,
    get_product as seed_get_product,
    get_product_by_barcode as seed_get_product_by_barcode,
    unlock_badge,
)


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

    return UserProfile(
        id=UUID(user.id),
        name=user.name,
        email=user.email,
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
    )


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
