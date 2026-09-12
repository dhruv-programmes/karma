from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.config import settings
from app.db.models import (
    ActivityEventModel,
    ChallengeModel,
    FriendConnectionModel,
    LeagueDefinitionModel,
    UserLeagueStateModel,
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
    ensure_kcs_columns,
    ensure_league_columns,
)

from app.services.leagues import LEAGUE_DEFINITIONS, season_key, week_key
from app.engines.carbon import estimate_from_spend
from app.engines.scoring import provisional_kcs
from app.schemas import ProductCategory
from app.seed.data import (
    BASE_RECOMMENDATIONS,
    COUPON_REWARDS,
    FACILITIES,
    OFFSETS,
    PRODUCTS,
    REWARDS,
    TRANSACTIONS,
    PHONE_ID,
    JEANS_ID,
    HEADPHONES_ID,
    APPLIANCE_ID,
    LAPTOP_ID,
    TEE_ID,
    BOTTLE_ID,
    CHAIR_ID,
    TV_ID,
    POWERBANK_ID,
    KETTLE_ID,
    SHOES_ID,
)


DEMO_USER_DEFAULTS = (
    {
        "id": str(settings.demo_user_id),
        "name": "Aisha Sharma",
        "username": "aisha-sharma",
        "email": "aisha@example.com",
        "circularity_score": 74,
        "impact_points": 420,
        "streak_days": 5,
        "trend_delta": 6,
        "loop_level": 2,
        "offset_kg_total": 0.0,
        "monthly_budget_kg": 90.0,
        "preferences_json": json.dumps({"budget_goal": "on_track", "persona": "balanced_commuter"}),
        # Aisha is the verified demo persona used for reward-gating flows.
        # Keep both score columns aligned so older clients that still render
        # the provisional field also show the canonical CCS of 767.
        "provisional_score": 767,
        "verified_score": 767,
        "score_confidence": 1.0,
        "score_state": "verified",
        "baseline_total_kg": 96.0,
        "baseline_created_at": "2026-03-01T00:00:00Z",
    },
    {
        "id": "11111111-1111-1111-1111-111111111112",
        "name": "Rohan Patel",
        "username": "rohan-patel",
        "email": "rohan@example.com",
        "circularity_score": 88,
        "impact_points": 850,
        "streak_days": 19,
        "trend_delta": 9,
        "loop_level": 4,
        "offset_kg_total": 25.0,
        "monthly_budget_kg": 60.0,
        "preferences_json": json.dumps({"budget_goal": "strict", "persona": "low_carbon_minimalist"}),
        "provisional_score": 740,
        "score_confidence": 0.4,
        "score_state": "provisional",
        "baseline_created_at": "2026-03-01T00:00:00Z",
    },
    {
        "id": "11111111-1111-1111-1111-111111111113",
        "name": "Maya Sen",
        "username": "maya-sen",
        "email": "maya@example.com",
        "circularity_score": 52,
        "impact_points": 110,
        "streak_days": 2,
        "trend_delta": 2,
        "loop_level": 1,
        "offset_kg_total": 0.0,
        "monthly_budget_kg": 140.0,
        "preferences_json": json.dumps({"budget_goal": "starter", "persona": "convenience_shopper"}),
        "provisional_score": 562,
        "score_confidence": 0.4,
        "score_state": "provisional",
        "baseline_created_at": "2026-03-01T00:00:00Z",
    },
)


def _backfill_usernames(db: Session) -> None:
    """Assign stable public handles to pre-feature accounts."""
    users = db.query(UserModel).order_by(UserModel.created_at.asc(), UserModel.id.asc()).all()
    used: set[str] = set()
    changed = False
    for user in users:
        current = (getattr(user, "username", None) or "").strip().lower()
        if current and current not in used:
            used.add(current)
            continue
        base = "-".join((user.name or "member").lower().split())
        candidate = base or "member"
        suffix = 2
        while candidate in used:
            candidate = f"{base}-{suffix}"
            suffix += 1
        user.username = candidate
        used.add(candidate)
        changed = True
    if changed:
        db.commit()


def _seed_challenges_and_friendships(db: Session) -> None:
    """Seed renewable challenge definitions and useful demo relationships."""
    if db.query(ChallengeModel).count() == 0:
        definitions = [
            ("daily-walk", "Walk 2,000 steps", "Take a short walk and turn movement into measurable green impact.", "daily", "steps", 2000, 25),
            ("weekly-repair", "Choose repair first", "Complete one repair or refurbishment action this week.", "weekly", "repair_action", 1, 100),
            ("monthly-circular-actions", "A month of circular choices", "Complete five verified green actions this month.", "monthly", "green_actions", 5, 300),
        ]
        for slug, title, description, cadence, goal_kind, goal_value, reward_points in definitions:
            db.add(ChallengeModel(
                id=str(uuid4()), slug=slug, title=title, description=description,
                cadence=cadence, goal_kind=goal_kind, goal_value=goal_value,
                reward_points=reward_points, active=True,
            ))
        db.flush()

    aisha = db.query(UserModel).filter(UserModel.username == "aisha-sharma").first()
    rohan = db.query(UserModel).filter(UserModel.username == "rohan-patel").first()
    if aisha and rohan:
        for owner, friend in ((aisha.id, rohan.id), (rohan.id, aisha.id)):
            if not db.query(FriendConnectionModel).filter_by(user_id=owner, friend_id=friend).first():
                db.add(FriendConnectionModel(user_id=owner, friend_id=friend, status="accepted"))
    db.commit()


def _seed_coupon_rewards(db: Session) -> None:
    """Backfill the offers-screen catalog into the server reward table.

    The normal reward seed is intentionally insert-if-empty for demo data. A
    separate idempotent backfill is required so databases created by an older
    app version receive the coupon rows without duplicating or resetting any
    existing redemptions.
    """
    changed = False
    existing_ids = {
        row.id for row in db.query(RewardModel.id).filter(
            RewardModel.id.in_([str(reward.id) for reward in COUPON_REWARDS])
        ).all()
    }
    for reward in COUPON_REWARDS:
        if str(reward.id) in existing_ids:
            continue
        db.add(
            RewardModel(
                id=str(reward.id),
                title=reward.title,
                description=reward.description,
                points_required=reward.points_required,
                brand=reward.brand or "Carbon Loop partner",
                is_mock=reward.is_mock,
                expires_on=reward.expires_on or "2026-12-31",
            )
        )
        changed = True
    if changed:
        db.commit()


def _backfill_facility_images(db: Session) -> None:
    """Repair stale demo image URLs without touching custom facilities."""
    seeded = {str(f.id): f.cover_image_url for f in FACILITIES if f.cover_image_url}
    changed = False
    for facility_id, image_url in seeded.items():
        row = db.query(FacilityModel).filter(FacilityModel.id == facility_id).first()
        if row and row.cover_image_url != image_url:
            row.cover_image_url = image_url
            changed = True
    if changed:
        db.commit()


def _seed_league_definitions_and_states(db: Session) -> None:
    """Seed balance/config metadata and attach a visible tier badge to demos."""
    existing = {row.slug: row for row in db.query(LeagueDefinitionModel).all()}
    for definition in LEAGUE_DEFINITIONS:
        if definition["slug"] not in existing:
            db.add(LeagueDefinitionModel(**definition))
    db.flush()
    # Keep the demo personas visually differentiated in the league UI while
    # leaving their reward points and KCS values untouched.
    seeded_leagues = {"aisha-sharma": "silver", "rohan-patel": "gold", "maya-sen": "bronze"}
    current_season = season_key()
    current_week = week_key()
    for username, league in seeded_leagues.items():
        user = db.query(UserModel).filter(UserModel.username == username).first()
        if user is None:
            continue
        state = db.query(UserLeagueStateModel).filter(UserLeagueStateModel.user_id == user.id).first()
        if state is None:
            state = UserLeagueStateModel(
                user_id=user.id, season_key=current_season, weekly_key=current_week,
                current_league_slug=league, lifetime_best_league_slug=league,
                season_points=0, weekly_league_points=0,
            )
            db.add(state)
    db.commit()


def _repair_demo_accounts(db: Session) -> None:
    """Make a partially seeded demo database sign-in-ready without touching members.

    The demo account password is documented as ``password123``. We only add a
    missing demo persona or repair a missing/corrupt demo credential; accounts
    belonging to real users are never assigned a guessed password.
    """
    existing_by_email = {
        user.email.lower(): user
        for user in db.query(UserModel)
        .filter(UserModel.email.in_([item["email"] for item in DEMO_USER_DEFAULTS]))
        .all()
    }
    changed = False
    for defaults in DEMO_USER_DEFAULTS:
        user = existing_by_email.get(defaults["email"])
        if user is None:
            user = UserModel(**defaults, password_hash=hash_password("password123"))
            db.add(user)
            changed = True
        elif not user.password_hash:
            user.password_hash = hash_password("password123")
            changed = True
    if changed:
        db.commit()


def _backfill_kcs_users(db: Session) -> None:
    """Backfill KCS defaults for pre-KCS rows (nullable-safe)."""
    try:
        users = db.query(UserModel).all()
    except Exception:
        return
    changed = False
    for u in users:
        try:
            # The Aisha persona is intentionally the verified demo account so
            # judges can exercise high-value reward redemption without first
            # completing the real data-verification flow.
            if (u.email or "").lower() == "aisha@example.com":
                if getattr(u, "provisional_score", None) != 767:
                    u.provisional_score = 767
                    changed = True
                if getattr(u, "verified_score", None) != 767:
                    u.verified_score = 767
                    changed = True
                if getattr(u, "score_state", None) != "verified":
                    u.score_state = "verified"
                    changed = True
                if getattr(u, "score_confidence", None) != 1.0:
                    u.score_confidence = 1.0
                    changed = True
            if getattr(u, "provisional_score", None) is None:
                email = (u.email or "").lower()
                if email == "aisha@example.com":
                    u.provisional_score = 681
                elif email == "rohan@example.com":
                    u.provisional_score = 740
                elif email == "maya@example.com":
                    u.provisional_score = 562
                else:
                    u.provisional_score = 650
                changed = True
            if getattr(u, "score_state", None) is None:
                u.score_state = (
                    "verified"
                    if getattr(u, "verified_score", None) is not None
                    else "provisional"
                )
                changed = True
            if getattr(u, "score_confidence", None) is None:
                u.score_confidence = 0.4
                changed = True
            if getattr(u, "baseline_created_at", None) is None:
                email = (u.email or "").lower()
                if email in ("aisha@example.com", "rohan@example.com", "maya@example.com"):
                    u.baseline_created_at = "2026-03-01T00:00:00Z"
                    changed = True
            # Aisha baseline total 96 if missing
            if (u.email or "").lower() == "aisha@example.com" and getattr(u, "baseline_total_kg", None) is None:
                u.baseline_total_kg = 96.0
                changed = True

            # Legacy provisional rows may still contain the retired 680 cap.
            # Recompute only provisional users with a real stored baseline;
            # verified users and users without a baseline stay untouched.
            baseline_total = getattr(u, "baseline_total_kg", None)
            is_verified = (
                getattr(u, "score_state", None) == "verified"
                or getattr(u, "verified_score", None) is not None
            )
            if not is_verified and baseline_total is not None:
                baseline_kg = float(baseline_total)
                if math.isfinite(baseline_kg):
                    expected_provisional = provisional_kcs(baseline_kg)
                    if getattr(u, "provisional_score", None) != expected_provisional:
                        u.provisional_score = expected_provisional
                        changed = True
        except Exception:
            continue
    if changed:
        try:
            db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass


def seed_database_if_empty(db: Session) -> None:
    # 0. Ensure auth and KCS columns exist on legacy SQLite files.
    try:
        ensure_kcs_columns(db)
        ensure_league_columns(db)
    except Exception:
        pass
    # Backfill existing rows even when DB is already seeded
    try:
        _backfill_kcs_users(db)
    except Exception:
        pass
    # 1. Seed Products if empty
    if db.query(ProductModel).count() == 0:
        for p in PRODUCTS.values():
            product_row = ProductModel(
                id=str(p.id),
                barcode=p.barcode,
                name=p.name,
                brand=p.brand,
                category=p.category.value,
                image_url=p.image_url,
                estimated_co2e_kg=float(p.estimated_co2e_kg),
                circularity_score=p.circularity_score,
                circularity_breakdown_json=json.dumps(p.circularity_breakdown.model_dump()),
                repairability=p.repairability,
                expected_remaining_life_months=p.expected_remaining_life_months,
                condition=p.condition,
                age_months=p.age_months,
                attributes_json=json.dumps(p.attributes),
                last_action_label=p.last_action_label,
                next_action_label=p.next_action_label,
            )
            db.add(product_row)
        db.flush()

    # 2. Seed Facilities if empty
    if db.query(FacilityModel).count() == 0:
        for f in FACILITIES:
            fac_row = FacilityModel(
                id=str(f.id),
                name=f.name,
                facility_type=f.facility_type,
                lat=f.lat,
                lng=f.lng,
                supported_categories_json=json.dumps([c.value for c in f.supported_categories]),
                open_now=f.open_now,
                verification_status=f.verification_status,
                address=f.address,
                cover_image_url=f.cover_image_url,
            )
            db.add(fac_row)
        db.flush()

    _backfill_facility_images(db)

    # 3. Seed Offsets if empty
    if db.query(OffsetProjectModel).count() == 0:
        for o in OFFSETS:
            off_row = OffsetProjectModel(
                id=str(o.id),
                name=o.name,
                provider=o.provider,
                co2e_kg=float(o.co2e_kg),
                price_inr=float(o.price_inr),
                verification_status=o.verification_status,
                geography=o.geography,
                description=o.description,
                methodology=o.methodology,
                cover_image_url=o.cover_image_url,
            )
            db.add(off_row)
        db.flush()

    # 4. Seed Rewards if empty
    if db.query(RewardModel).count() == 0:
        for r in REWARDS:
            rew_row = RewardModel(
                id=str(r.id),
                title=r.title,
                description=r.description,
                points_required=r.points_required,
                brand=r.brand,
                is_mock=r.is_mock,
                expires_on=r.expires_on,
            )
            db.add(rew_row)
        db.flush()

    # 4b. Backfill government and partner coupons for legacy databases.
    _seed_coupon_rewards(db)

    # 5. Seed Recommendations if empty
    if db.query(RecommendationModel).count() == 0:
        for rec in BASE_RECOMMENDATIONS:
            rec_row = RecommendationModel(
                id=str(rec.id),
                category=rec.category.value,
                action_type=rec.action_type.value,
                title=rec.title,
                subtitle=rec.subtitle,
                co2e_avoided_kg=float(rec.co2e_avoided_kg),
                money_impact_inr=float(rec.money_impact_inr),
                effort=rec.effort.value,
                local_availability=rec.local_availability,
                product_id=str(rec.product_id) if rec.product_id else None,
                explanation=rec.explanation,
                score=rec.score,
            )
            db.add(rec_row)
        db.flush()

    # 6. Seed the 3 User Personas if empty
    if db.query(UserModel).count() == 0:
        # --- USER 1: AISHA SHARMA ---
        aisha = UserModel(
            id=str(settings.demo_user_id),
            name="Aisha Sharma",
            email="aisha@example.com",
            password_hash=hash_password("password123"),
            circularity_score=74,
            impact_points=420,
            streak_days=5,
            trend_delta=6,
            loop_level=2,
            offset_kg_total=0.0,
            monthly_budget_kg=90.0,
            preferences_json=json.dumps({"budget_goal": "on_track", "persona": "balanced_commuter"}),
            provisional_score=767,
            verified_score=767,
            score_confidence=1.0,
            score_state="verified",
            baseline_total_kg=96.0,
            baseline_created_at="2026-03-01T00:00:00Z",
        )
        db.add(aisha)
        db.flush()

        # Aisha's owned products
        for pid in [PHONE_ID, JEANS_ID, HEADPHONES_ID, APPLIANCE_ID]:
            db.add(UserProductModel(user_id=aisha.id, product_id=str(pid), status="active", acquired_date="2025-10-15"))

        # Aisha's transactions
        for t in TRANSACTIONS:
            est = estimate_from_spend(t.category, t.amount_inr)
            db.add(
                TransactionModel(
                    id=str(t.id),
                    user_id=aisha.id,
                    date=t.date,
                    merchant=t.merchant,
                    amount_inr=float(t.amount_inr),
                    category=t.category.value,
                    co2e_kg=float(est.estimated_co2e_kg),
                )
            )

        # Aisha's badges
        db.add(UserBadgeModel(user_id=aisha.id, badge_id="first_repair"))
        db.add(UserBadgeModel(user_id=aisha.id, badge_id="receipt_ranger"))

        # Aisha's activities
        db.add(ActivityEventModel(user_id=aisha.id, kind="scan", title="Scanned Galaxy phone", subtitle="Barcode matched · circularity 78", points_delta=0, created_at="2026-03-25T09:12:00Z"))
        db.add(ActivityEventModel(user_id=aisha.id, kind="insight", title="Energy spike detected", subtitle="BESCOM bill pushed Energy into your top 3", points_delta=0, created_at="2026-03-22T18:40:00Z"))
        db.add(ActivityEventModel(user_id=aisha.id, kind="streak", title="5-day streak", subtitle="Keep going — Week Streak unlocks at 7", points_delta=0, created_at="2026-03-26T08:00:00Z"))

        # --- USER 2: ROHAN PATEL ---
        rohan_id = "11111111-1111-1111-1111-111111111112"
        rohan = UserModel(
            id=rohan_id,
            name="Rohan Patel",
            email="rohan@example.com",
            password_hash=hash_password("password123"),
            circularity_score=88,
            impact_points=850,
            streak_days=19,
            trend_delta=9,
            loop_level=4,
            offset_kg_total=25.0,
            monthly_budget_kg=60.0,
            preferences_json=json.dumps({"budget_goal": "strict", "persona": "low_carbon_minimalist"}),
            provisional_score=740,
            verified_score=None,
            score_confidence=0.4,
            score_state="provisional",
            baseline_created_at="2026-03-01T00:00:00Z",
        )
        db.add(rohan)
        db.flush()

        # Rohan's owned products
        for pid in [LAPTOP_ID, TEE_ID, BOTTLE_ID, CHAIR_ID]:
            db.add(UserProductModel(user_id=rohan.id, product_id=str(pid), status="active", acquired_date="2025-06-10"))

        # Rohan's transactions (low carbon transit & repairs)
        rohan_txns = [
            ("2026-02-04", "Namma Metro Card Recharge", 300, ProductCategory.TRANSPORT),
            ("2026-02-08", "Koramangala Repair Clinic Spare", 450, ProductCategory.ELECTRONICS),
            ("2026-02-12", "Organic Farmers Market Indiranagar", 680, ProductCategory.FOOD),
            ("2026-02-16", "BESCOM Solar Meter Billing", 620, ProductCategory.ENERGY),
            ("2026-02-21", "BMTC Monthly Smart Card", 400, ProductCategory.TRANSPORT),
            ("2026-02-27", "Secondhand Books Church Street", 250, ProductCategory.OTHER),
            ("2026-03-02", "Jayanagar Cobbler Sole Fix", 180, ProductCategory.CLOTHING),
            ("2026-03-05", "Namma Metro Card Recharge", 350, ProductCategory.TRANSPORT),
            ("2026-03-08", "BESCOM Electricity Base", 590, ProductCategory.ENERGY),
            ("2026-03-12", "Saahas Zero Waste Composting Bags", 290, ProductCategory.HOME),
            ("2026-03-15", "BMTC Smart Card Tap", 120, ProductCategory.TRANSPORT),
            ("2026-03-19", "Wildcraft Zipper Repair Service", 200, ProductCategory.CLOTHING),
            ("2026-03-22", "GreenCart Local Refill Station", 420, ProductCategory.FOOD),
            ("2026-03-25", "Namma Metro Pass", 250, ProductCategory.TRANSPORT),
        ]
        for dt, merch, amt, cat in rohan_txns:
            est = estimate_from_spend(cat, amt)
            db.add(
                TransactionModel(
                    user_id=rohan.id,
                    date=dt,
                    merchant=merch,
                    amount_inr=float(amt),
                    category=cat.value,
                    co2e_kg=float(est.estimated_co2e_kg),
                )
            )

        # Rohan's badges
        for b in ["first_repair", "e_waste_hero", "streak_7", "brand_claimer"]:
            db.add(UserBadgeModel(user_id=rohan.id, badge_id=b))

        # Rohan's activities
        db.add(ActivityEventModel(user_id=rohan.id, kind="streak", title="19-day streak active", subtitle="Fastest rising circular loop in Koramangala", points_delta=0, created_at="2026-03-26T07:30:00Z"))
        db.add(ActivityEventModel(user_id=rohan.id, kind="complete", title="Repaired laptop keyboard", subtitle="+100 Impact Points · ~35 kg CO₂e avoided", points_delta=100, created_at="2026-03-24T14:15:00Z"))
        db.add(ActivityEventModel(user_id=rohan.id, kind="redeem", title="Redeemed Eco packaging credit", subtitle="-250 points · GreenCart", points_delta=-250, created_at="2026-03-20T11:00:00Z"))
        db.add(ActivityEventModel(user_id=rohan.id, kind="scan", title="E-waste drop verified", subtitle="Saahas Zero Waste Hub", points_delta=150, created_at="2026-03-16T16:20:00Z"))

        # --- USER 3: MAYA SEN ---
        maya_id = "11111111-1111-1111-1111-111111111113"
        maya = UserModel(
            id=maya_id,
            name="Maya Sen",
            email="maya@example.com",
            password_hash=hash_password("password123"),
            circularity_score=52,
            impact_points=110,
            streak_days=2,
            trend_delta=2,
            loop_level=1,
            offset_kg_total=0.0,
            monthly_budget_kg=140.0,
            preferences_json=json.dumps({"budget_goal": "starter", "persona": "convenience_shopper"}),
            provisional_score=562,
            verified_score=None,
            score_confidence=0.4,
            score_state="provisional",
            baseline_created_at="2026-03-01T00:00:00Z",
        )
        db.add(maya)
        db.flush()

        # Maya's owned products
        for pid in [TV_ID, POWERBANK_ID, KETTLE_ID, SHOES_ID]:
            db.add(UserProductModel(user_id=maya.id, product_id=str(pid), status="active", acquired_date="2026-01-20"))

        # Maya's transactions (high frequency quick-commerce & ride hailing)
        maya_txns = [
            ("2026-02-02", "Uber Premier HSR to Indiranagar", 420, ProductCategory.TRANSPORT),
            ("2026-02-05", "Swiggy Gourmet Dinner", 850, ProductCategory.FOOD),
            ("2026-02-09", "Zepto 10-minute Groceries", 650, ProductCategory.FOOD),
            ("2026-02-13", "Amazon Fast Delivery Electronics", 2499, ProductCategory.ELECTRONICS),
            ("2026-02-17", "Uber Ride Indiranagar", 380, ProductCategory.TRANSPORT),
            ("2026-02-22", "BESCOM High Consumption Bill", 3200, ProductCategory.ENERGY),
            ("2026-02-25", "Blinkit Late Night Order", 720, ProductCategory.FOOD),
            ("2026-03-01", "Uber Premier Airport Ride", 1100, ProductCategory.TRANSPORT),
            ("2026-03-04", "Nykaa Cosmetics & Beauty Care", 1450, ProductCategory.PERSONAL_CARE),
            ("2026-03-07", "Zomato Delivery Bowl", 480, ProductCategory.FOOD),
            ("2026-03-10", "Croma Gadget Charger Replacement", 1299, ProductCategory.ELECTRONICS),
            ("2026-03-13", "Uber Trip Whitefield", 540, ProductCategory.TRANSPORT),
            ("2026-03-16", "BESCOM AC Usage Billing", 3600, ProductCategory.ENERGY),
            ("2026-03-20", "Swiggy Lunch Order", 390, ProductCategory.FOOD),
            ("2026-03-23", "Zepto Snacks & Essentials", 510, ProductCategory.FOOD),
            ("2026-03-25", "Uber Commute", 280, ProductCategory.TRANSPORT),
        ]
        for dt, merch, amt, cat in maya_txns:
            est = estimate_from_spend(cat, amt)
            db.add(
                TransactionModel(
                    user_id=maya.id,
                    date=dt,
                    merchant=merch,
                    amount_inr=float(amt),
                    category=cat.value,
                    co2e_kg=float(est.estimated_co2e_kg),
                )
            )

        # Maya's badges
        db.add(UserBadgeModel(user_id=maya.id, badge_id="receipt_ranger"))

        # Maya's activities
        db.add(ActivityEventModel(user_id=maya.id, kind="receipt", title="Receipt parsed successfully", subtitle="Croma spare cable + Swiggy order logged", points_delta=50, created_at="2026-03-25T19:00:00Z"))
        db.add(ActivityEventModel(user_id=maya.id, kind="streak", title="2-day streak started", subtitle="Targeting first repair milestone", points_delta=0, created_at="2026-03-26T09:00:00Z"))

        db.commit()

    # Existing installations may contain only a subset of demo accounts or a
    # pre-auth demo row with no credential. Repair those known fixtures after
    # the full seed path without assigning passwords to non-demo accounts.
    _repair_demo_accounts(db)
    _backfill_usernames(db)
    _seed_challenges_and_friendships(db)
    _seed_league_definitions_and_states(db)
