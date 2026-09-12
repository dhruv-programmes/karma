from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import settings
from app.db.models import (
    ActivityEventModel,
    ChallengeModel,
    OffsetProjectModel,
    ProductModel,
    RewardModel,
    UserModel,
    UserProductModel,
)
from app.db.session import get_db
from app.engines.scoring import provisional_kcs
from app.engines.repair_replace import build_circular_options
from app.schemas import (
    ActionType,
    AskRequest,
    AskResponse,
    AuthResponse,
    BarcodeLookupRequest,
    BaselineRequest,
    CommuteSummaryResponse,
    CommuteTripRequest,
    CommuteTripResult,
    ChallengeProgressRequest,
    LeagueActionRequest,
    LeagueActionSyncRequest,
    LeagueRolloverRequest,
    LeagueStatusResponse,
    LeagueStandingsResponse,
    CompletedActionResult,
    DataMeterResponse,
    DemoUserSummary,
    DocumentConfirmRequest,
    DocumentConfirmResult,
    DocumentExampleSummary,
    DocumentProcessRequest,
    DocumentProcessResult,
    OffsetProject,
    OffsetPurchaseResult,
    PointsLedgerResponse,
    ProductCategory,
    ReceiptParseRequest,
    ReceiptParseResult,
    RedeemResult,
    Reward,
    ScoreResponse,
    SignInRequest,
    SignUpRequest,
    StepsMetricResponse,
    StepsSyncRequest,
    SustainablePurchaseVerifyRequest,
    SustainablePurchaseVerifyResponse,
    UserPreferences,
    SolarImpactResponse,
    SolarRecommendationActionResponse,
)
from app.seed.data import PHONE_ID
from app.services import core as services
from app.services import solar as solar_service
from app.services import leaderboard as leaderboard_service
from app.services import leagues as league_service

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================


@router.post("/auth/signup", response_model=AuthResponse)
def signup(body: SignUpRequest, db: Session = Depends(get_db)):
    email_clean = body.email.strip().lower()
    existing = db.query(UserModel).filter(UserModel.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    requested_username = (body.username or body.name).strip().lower().replace(" ", "-")
    username_taken = db.query(UserModel).filter(UserModel.username == requested_username).first()
    if username_taken:
        if body.username:
            raise HTTPException(status_code=400, detail="That username is already taken")
        base_username = requested_username
        suffix = 2
        while db.query(UserModel).filter(UserModel.username == requested_username).first():
            requested_username = f"{base_username}-{suffix}"
            suffix += 1
    user_id = str(uuid4())
    _now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    user = UserModel(
        id=user_id,
        name=body.name.strip(),
        email=email_clean,
        username=requested_username,
        password_hash=hash_password(body.password),
        circularity_score=68,
        impact_points=100,
        streak_days=1,
        trend_delta=3,
        loop_level=1,
        offset_kg_total=0.0,
        monthly_budget_kg=body.monthly_budget_kg,
        preferences_json=json.dumps({"persona": body.persona or "custom", "budget_goal": "on_track"}),
        provisional_score=650,
        verified_score=None,
        score_confidence=0.4,
        score_state="provisional",
        baseline_created_at=_now_iso,
    )
    db.add(user)
    db.flush()

    # Seed default starter products in closet (e.g. Phone, Jeans)
    for pid in [PHONE_ID, UUID("22222222-2222-2222-2222-222222222202")]:
        db.add(UserProductModel(user_id=user.id, product_id=str(pid), status="active", acquired_date="2026-01-01"))

    # Add welcome activity
    services.log_activity_event(
        user,
        db,
        "streak",
        "Joined Carbon Loop",
        f"Welcome {user.name}! 1-day loop started.",
        points_delta=100,
    )
    db.commit()

    token = create_access_token(user.id, user.email)
    profile = services.user_model_to_profile(user, db)
    return AuthResponse(access_token=token, token_type="bearer", user=profile)


@router.post("/auth/signin", response_model=AuthResponse)
def signin(body: SignInRequest, db: Session = Depends(get_db)):
    email_clean = body.email.strip().lower()
    user = db.query(UserModel).filter(UserModel.email == email_clean).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id, user.email)
    profile = services.user_model_to_profile(user, db)
    return AuthResponse(access_token=token, token_type="bearer", user=profile)


@router.get("/auth/demo-users", response_model=list[DemoUserSummary])
def list_demo_users(db: Session = Depends(get_db)):
    descriptions = {
        "aisha@example.com": "Urban Commuter · Balanced tech & transit circularity",
        "rohan@example.com": "Eco Minimalist · Public transit & repair-first lifestyle",
        "maya@example.com": "Convenience Shopper · High-velocity consumer starting her loop",
    }
    users = (
        db.query(UserModel)
        .filter(UserModel.email.in_(["aisha@example.com", "rohan@example.com", "maya@example.com"]))
        .all()
    )
    result = []
    for u in users:
        result.append(
            DemoUserSummary(
                id=u.id,
                name=u.name,
                email=u.email,
                role_description=descriptions.get(u.email, "Carbon Loop Member"),
                circularity_score=u.circularity_score,
                impact_points=u.impact_points,
                streak_days=u.streak_days,
                monthly_budget_kg=u.monthly_budget_kg,
            )
        )
    return result


@router.get("/auth/me")
def auth_me(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.user_model_to_profile(current_user, db)


# ==========================================
# USER METRICS & PROFILE ENDPOINTS
# ==========================================


@router.get("/users/me")
def users_me(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.user_model_to_profile(current_user, db)


@router.get("/users/me/impact")
def users_impact(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.user_impact(current_user, db)


@router.get("/users/me/impact/timeseries")
def users_impact_timeseries(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.impact_timeseries(current_user, db)


@router.get("/users/me/activity")
def users_activity(
    limit: int = Query(30, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.list_activity(current_user, db, limit)


@router.get("/users/me/points-ledger", response_model=PointsLedgerResponse)
def users_points_ledger(
    limit: int = Query(100, ge=1, le=250),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return earned/spent Karma Coins with a server-derived balance trail."""
    return services.list_points_ledger(current_user, db, limit)


@router.get("/users/me/recommendations")
def users_recommendations(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.get_recommendations(current_user, db)


@router.get("/users/me/closet")
def users_closet(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.owned_products(current_user, db)


@router.get("/users/me/badges")
def users_badges(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.list_badges(current_user, db)


@router.get("/profile/circularity-score")
def circularity_score(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        "score": current_user.circularity_score,
        "impact_points": current_user.impact_points,
        "streak_days": current_user.streak_days,
        "trend_delta": current_user.trend_delta,
        "loop_level": current_user.loop_level,
        "offset_kg_total": current_user.offset_kg_total,
    }


# ==========================================
# FRIENDS, LEADERBOARD & CHALLENGES
# ==========================================


@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1, max_length=80),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leaderboard_service.search_users(db, q, current_user)


@router.get("/friends")
def friends(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leaderboard_service.list_friends(db, current_user)


@router.post("/friends/{username}")
def add_friend(
    username: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return leaderboard_service.add_friend(db, current_user, username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/friends/{username}")
def remove_friend(
    username: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leaderboard_service.remove_friend(db, current_user, username)
    return {"status": "removed"}


@router.get("/leaderboard")
def get_leaderboard(
    scope: str = Query("global", pattern="^(global|friends)$"),
    metric: str = Query("reward_points", pattern="^(reward_points|carbon_credit_score)$"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leaderboard_service.leaderboard(db, current_user, scope, metric)


@router.get("/challenges")
def get_challenges(
    cadence: str | None = Query(default=None, pattern="^(daily|weekly|monthly)$"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return leaderboard_service.list_challenges(db, current_user, cadence)


@router.post("/challenges/{challenge_id}/progress")
def update_challenge(
    challenge_id: UUID,
    body: ChallengeProgressRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return leaderboard_service.update_challenge_progress(db, current_user, challenge_id, body.progress)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/challenges/{challenge_id}/complete")
def complete_challenge(
    challenge_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Convenience endpoint for UI actions that complete a challenge at once."""
    try:
        challenge = db.query(ChallengeModel).filter(ChallengeModel.id == str(challenge_id)).first()
        if challenge is None:
            raise ValueError("Challenge not found")
        return leaderboard_service.update_challenge_progress(db, current_user, challenge_id, challenge.goal_value)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ==========================================
# MONTHLY CCS-ACTION LEAGUES
# ==========================================


@router.get("/league/status", response_model=LeagueStatusResponse)
@router.get("/leagues/me", response_model=LeagueStatusResponse)
def get_league_status(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return league_service.get_status(db, current_user)


@router.get("/league/standings", response_model=LeagueStandingsResponse)
@router.get("/leagues/standings", response_model=LeagueStandingsResponse)
def get_league_standings(
    scope: str = Query("global", pattern="^(global|friends)$"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return league_service.standings(db, current_user, scope)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/league/actions", response_model=LeagueStatusResponse)
@router.post("/leagues/actions/record")
def record_league_action(
    body: LeagueActionRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return league_service.record_action(db, current_user, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/league/actions/sync")
@router.post("/leagues/actions/sync")
def sync_league_actions(
    body: LeagueActionSyncRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        actions = [item.model_dump() for item in body.actions]
        return league_service.sync_actions(db, current_user, actions)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/league/rollover")
@router.post("/leagues/rollover")
def evaluate_league_rollover(
    body: LeagueRolloverRequest | None = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Rollover is deliberately request-driven rather than scheduler-driven.
    count = league_service.rollover_all(db)
    return {"status": "evaluated", "users_evaluated": count,
            "league": league_service.get_status(db, current_user)}


# ==========================================
# KCS SCORE & ONBOARDING BASELINE
# ==========================================


@router.post("/onboarding/baseline", response_model=ScoreResponse)
def onboarding_baseline(
    body: BaselineRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    canonical = json.dumps(
        {"shopping": body.shopping, "transport": body.transport},
        sort_keys=True,
        separators=(",", ":"),
    )
    baseline_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    target = round(float(body.totalKg) * (1 - float(body.reductionPct) / 100))

    # Derive the provisional estimate from the submitted baseline instead of
    # trusting the client-provided display value.
    current_user.provisional_score = provisional_kcs(body.totalKg)
    current_user.baseline_total_kg = float(body.totalKg)
    current_user.baseline_hash = baseline_hash
    current_user.baseline_created_at = now_iso
    current_user.monthly_budget_kg = float(target)
    current_user.score_confidence = 0.4
    # Keep verified state if already verified
    if getattr(current_user, "score_state", None) != "verified":
        current_user.score_state = "provisional"
    db.commit()
    db.refresh(current_user)
    return services.build_score_response(current_user, db)


@router.get("/users/me/score", response_model=ScoreResponse)
def users_me_score(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.build_score_response(current_user, db)


@router.get("/users/me/data-meter", response_model=DataMeterResponse)
def users_me_data_meter(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.build_score_response(current_user, db)


@router.get("/users/me/steps", response_model=StepsMetricResponse)
def users_me_steps(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.build_steps_metric(current_user, db)


@router.post("/users/me/steps/sync", response_model=StepsMetricResponse)
def sync_users_me_steps(
    body: StepsSyncRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = services.sync_steps(body.steps, current_user, db)
    if result.get("points_awarded", 0):
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"steps:{result['date']}:{result['steps']}",
                action_type="steps", source="steps", evidence={"steps": result["steps"]},
            )
        except Exception:
            db.rollback()
    return result


# ==========================================
# IMPACT / SOLAR INTELLIGENCE + GREEN REWARDS
#

# ==========================================


@router.get("/users/me/solar-impact", response_model=SolarImpactResponse)
@router.get("/users/me/impact/solar", response_model=SolarImpactResponse)
def users_me_solar_impact(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the demo household solar dashboard and current recommendation state."""
    return solar_service.build_solar_impact(current_user, db)


@router.post(
    "/users/me/solar-impact/recommendations/{recommendation_id}/accept",
    response_model=SolarRecommendationActionResponse,
)
def accept_solar_recommendation(
    recommendation_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return solar_service.accept_recommendation(current_user, db, recommendation_id)


@router.post(
    "/users/me/solar-impact/recommendations/{recommendation_id}/complete",
    response_model=SolarRecommendationActionResponse,
)
def complete_solar_recommendation(
    recommendation_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = solar_service.complete_recommendation(current_user, db, recommendation_id)
    if result.get("points_awarded", 0):
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"solar:{recommendation_id}",
                action_type="solar", source="solar", evidence={"recommendation_id": recommendation_id},
            )
        except Exception:
            db.rollback()
    return result
# ==========================================
# GPS COMMUTE REWARDS
# ==========================================


@router.post("/commute/log", response_model=CommuteTripResult)
def log_commute(
    body: CommuteTripRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = services.log_commute_trip(
        distance_km=body.distance_km,
        duration_min=body.duration_min,
        avg_speed_kmh=body.avg_speed_kmh,
        user=current_user,
        db=db,
    )
    if result.get("points_awarded", 0):
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"commute:{result['trip_id']}",
                action_type="commute", source="commute",
                evidence={"trip_id": result["trip_id"], "mode": result["mode"]},
            )
        except Exception:
            db.rollback()
    return result


@router.get("/commute/summary", response_model=CommuteSummaryResponse)
def commute_summary(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.build_commute_summary(current_user, db)


# ==========================================
# SUSTAINABLE PURCHASE VERIFICATION (DEMO)
# ==========================================


@router.post(
    "/sustainable-purchases/verify",
    response_model=SustainablePurchaseVerifyResponse,
)
def verify_sustainable_purchase(
    body: SustainablePurchaseVerifyRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the mock provider; no document bytes are uploaded or parsed yet."""
    result = services.verify_sustainable_purchase(
        filename=body.filename,
        mime_type=body.mime_type,
        size_bytes=body.size_bytes,
        user=current_user,
        db=db,
    )
    if result.get("reward_points", 0):
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"sustainable-purchase:{body.filename.strip().lower()}",
                action_type="sustainable_purchase", source="sustainable_purchase",
                evidence={"filename": body.filename, "provider": result.get("provider")},
            )
        except Exception:
            db.rollback()
    return result


@router.post(
    "/sustainable-purchases/reset",
    response_model=SustainablePurchaseVerifyResponse,
)
def reset_sustainable_purchase(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset the demo EV verification so judges/evaluators can replay the flow."""
    return services.reset_sustainable_purchase(user=current_user, db=db)



# ==========================================
# PRODUCTS & SCANNING
# ==========================================


@router.post("/products/lookup/barcode")
async def lookup_barcode(
    body: BarcodeLookupRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await services.lookup_barcode(body.barcode, current_user, db)


@router.get("/products/{product_id}")
def get_product_endpoint(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    product = services.get_product(product_id, db)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{product_id}/circular-options")
def circular_options(
    product_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = services.get_product(product_id, db)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    prefs = UserPreferences(**current_user.preferences)
    return build_circular_options(product, prefs)


# ==========================================
# TRANSACTIONS & RECEIPTS
# ==========================================


@router.get("/transactions")
def list_transactions(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.list_transactions(current_user, db)


class ImportBody(BaseModel):
    rows: list[dict]


@router.post("/transactions/import")
def import_transactions(
    body: ImportBody,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    created = services.import_transactions(body.rows, current_user, db)
    reward_points_awarded = sum(
        int(getattr(transaction, "reward_points_awarded", 0) or 0)
        for transaction in created
    )
    if reward_points_awarded:
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"receipt-import:{datetime.now(timezone.utc).isoformat()}",
                action_type="receipt", source="receipt",
                evidence={"line_items": len(created), "reward_points": reward_points_awarded},
            )
        except Exception:
            db.rollback()
    return {
        "imported": len(created),
        "transactions": created,
        # Preserve the accounting result through the AI confirmation proxy so
        # the document result can report the same formula-based reward and
        # carbon totals that were applied to the account.
        "co2e_kg_added": round(
            sum(float(getattr(transaction, "co2e_kg", 0) or 0) for transaction in created),
            3,
        ),
        "reward_points_awarded": reward_points_awarded,
        "duplicate_count": max(0, len(body.rows) - len(created)),
        "reward_formula_version": services.RECEIPT_REWARD_FORMULA_VERSION,
    }


@router.post("/receipts/parse", response_model=ReceiptParseResult)
def parse_receipt(
    body: ReceiptParseRequest | None = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = body or ReceiptParseRequest()
    result = services.parse_receipt_text(payload.text, payload.use_demo, current_user, db)
    return ReceiptParseResult(**result)


# ==========================================
# SEEDED DOCUMENT UPLOAD (OCR→LLM demo)
# ==========================================


@router.get("/documents/examples", response_model=list[DocumentExampleSummary])
def list_document_examples(
    current_user: UserModel = Depends(get_current_user),
):
    return [DocumentExampleSummary(**ex) for ex in services.list_document_examples()]


@router.post("/documents/process", response_model=DocumentProcessResult)
def process_document(
    body: DocumentProcessRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = services.process_document_example(body.example_id, current_user, db)
    return DocumentProcessResult(**result)


@router.post("/documents/confirm", response_model=DocumentConfirmResult)
def confirm_document(
    body: DocumentConfirmRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = services.confirm_document_import(
        body.example_id, body.items, current_user, db
    )
    return DocumentConfirmResult(**result)


# ==========================================
# FACILITIES & MAP
# ==========================================


@router.get("/facilities/nearby")
def facilities_nearby(
    type: str | None = Query(default=None, alias="type"),
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    category: ProductCategory | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return services.nearby_facilities(type, lat, lng, category, db)


@router.get("/repair/nearby")
def repair_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    db: Session = Depends(get_db),
):
    return services.nearby_facilities("repair", lat, lng, None, db)


@router.get("/recycling/nearby")
def recycling_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    db: Session = Depends(get_db),
):
    return services.nearby_facilities("recycling", lat, lng, None, db)


@router.get("/donation/nearby")
def donation_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    db: Session = Depends(get_db),
):
    return services.nearby_facilities("donation", lat, lng, None, db)


@router.get("/resale/nearby")
def resale_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    db: Session = Depends(get_db),
):
    return services.nearby_facilities("resale", lat, lng, None, db)


# ==========================================
# ACTIONS, REWARDS, OFFSETS
# ==========================================


class CompleteActionBody(BaseModel):
    action_type: ActionType | None = None


@router.post("/actions/{action_id}/complete", response_model=CompletedActionResult)
def complete_action_endpoint(
    action_id: UUID,
    body: CompleteActionBody | None = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    action_type = body.action_type if body else None
    result = services.complete_action(action_id, action_type, current_user, db)
    if result.get("points_awarded", 0):
        try:
            league_service.record_action(
                db, current_user,
                action_key=f"action:{action_id}",
                action_type=str(result.get("action_type") or (action_type.value if action_type else "repair")).lower(),
                source="action", evidence={"action_id": str(action_id)},
            )
        except Exception:
            db.rollback()
    return CompletedActionResult(**result)


@router.get("/rewards")
def get_rewards(db: Session = Depends(get_db)):
    rows = db.query(RewardModel).all()
    if rows:
        return [
            Reward(
                id=UUID(r.id),
                title=r.title,
                description=r.description,
                points_required=services.effective_reward_cost(
                    r.points_required, r.title, r.description
                ),
                brand=r.brand,
                is_mock=r.is_mock,
                expires_on=r.expires_on,
            )
            for r in rows
        ]
    from app.seed.data import REWARDS
    return [
        reward.model_copy(update={
            "points_required": services.effective_reward_cost(
                reward.points_required, reward.title, reward.description
            )
        })
        for reward in REWARDS
    ]


@router.post("/rewards/{reward_id}/redeem", response_model=RedeemResult)
def redeem_reward(
    reward_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = services.redeem_reward(reward_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedeemResult(**{k: v for k, v in result.items() if k != "badges_unlocked"})


@router.get("/offsets")
def get_offsets(db: Session = Depends(get_db)):
    rows = db.query(OffsetProjectModel).all()
    if rows:
        return [
            OffsetProject(
                id=UUID(r.id),
                name=r.name,
                provider=r.provider,
                co2e_kg=r.co2e_kg,
                price_inr=r.price_inr,
                verification_status=r.verification_status,
                geography=r.geography,
                description=r.description,
                methodology=r.methodology,
                cover_image_url=r.cover_image_url,
            )
            for r in rows
        ]
    from app.seed.data import OFFSETS
    return OFFSETS


@router.post("/offsets/{offset_id}/purchase", response_model=OffsetPurchaseResult)
def purchase_offset(
    offset_id: UUID,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = services.purchase_offset(offset_id, current_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return OffsetPurchaseResult(**result)



# ==========================================
# ASK / ASSISTANT & RESET
# ==========================================


@router.post("/ask", response_model=AskResponse)
def ask_assistant(
    body: AskRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = body.query.lower()
    tools: list[str] = []
    data: dict = {}

    if "biggest" in q or "carbon source" in q or "energy" in q:
        tools.append("get_carbon_breakdown")
        data = services.user_impact(current_user, db)
        answer = (
            f"Your biggest opportunity is {data['biggest_opportunity']}. "
            f"Estimated total ~{int(data['total_kg'])} kg CO₂e "
            f"(residual ~{int(data['residual_kg'])} kg after offsets). {data['insight']}"
        )
    elif "offset" in q:
        tools.append("list_offsets")
        offsets_list = (
            db.query(OffsetProjectModel)
            .filter(OffsetProjectModel.verification_status == "Verified")
            .all()
        )
        top = offsets_list[0] if offsets_list else db.query(OffsetProjectModel).first()
        data = {"offset": {"name": top.name, "co2e_kg": top.co2e_kg, "price_inr": top.price_inr} if top else {}}
        answer = (
            f"Try verified offset “{top.name}” (~{int(top.co2e_kg)} kg for ₹{int(top.price_inr)}). "
            "Demo purchase only — not a real climate claim."
            if top
            else "No verified offsets found."
        )
    elif "reward" in q or "points" in q:
        tools.append("list_rewards")
        aff = (
            db.query(RewardModel)
            .first()
        )
        affordable = None
        for candidate in db.query(RewardModel).all():
            if services.effective_reward_cost(
                candidate.points_required, candidate.title, candidate.description
            ) <= current_user.impact_points:
                affordable = candidate
                break
        aff = affordable or aff
        aff_cost = (
            services.effective_reward_cost(aff.points_required, aff.title, aff.description)
            if aff else None
        )
        data = {"reward": {"title": aff.title, "points": aff_cost} if aff else {}, "points": current_user.impact_points}
        answer = (
            f"You have {current_user.impact_points} pts (Loop Level {current_user.loop_level}). "
            f"Suggested demo reward: {aff.title} ({aff_cost} pts)."
            if aff
            else f"You have {current_user.impact_points} pts."
        )
    elif "streak" in q:
        tools.append("get_profile")
        answer = (
            f"Your streak is {current_user.streak_days} days. "
            "Complete a real circular action today to keep it going."
        )
        data = {"streak_days": current_user.streak_days}
    elif "repair" in q:
        tools.extend(["get_product", "compare_actions"])
        product = services.get_product(body.product_id or PHONE_ID, db)
        assert product
        prefs = UserPreferences(**current_user.preferences)
        opts = build_circular_options(product, prefs)
        best = opts.best_option
        data = {"best": best.model_dump(), "product": product.model_dump()}
        answer = (
            f"Best option for {product.name}: {best.title}. "
            f"~{int(best.co2e_avoided_kg)} kg CO₂e avoided, "
            f"estimated cost ₹{int(best.estimated_cost_inr)}."
        )
    elif "recycl" in q:
        tools.append("find_local_facilities")
        facilities = services.nearby_facilities("recycling", db=db)
        data = {"facilities": [f.model_dump() for f in facilities[:3]]}
        top = facilities[0] if facilities else None
        answer = (
            f"Nearest recycling: {top.name} ({top.distance_km} km). Status: {top.verification_status}."
            if top
            else "No seeded recycling facilities found."
        )
    elif "refurb" in q or "money" in q:
        tools.extend(["get_user_recommendations", "compare_actions"])
        recs = services.get_recommendations(current_user, db)
        best_money = max(recs, key=lambda r: r.money_impact_inr) if recs else None
        data = {"recommendation": best_money.model_dump() if best_money else {}}
        answer = (
            f"{best_money.title} saves the most money among current recommendations "
            f"(~₹{int(best_money.money_impact_inr)})."
            if best_money
            else "No recommendations available."
        )
    else:
        tools.append("get_user_recommendations")
        recs = services.get_recommendations(current_user, db)
        top = recs[0] if recs else None
        data = {"recommendation": top.model_dump() if top else {}}
        answer = (
            f"Your best next action: {top.title} (~{int(top.co2e_avoided_kg)} kg CO₂e avoided)."
            if top
            else "All actions up to date."
        )

    return AskResponse(answer=answer, tools_used=tools, data=data)


@router.post("/demo/reset")
def reset_demo(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.impact_points = 420
    current_user.circularity_score = 74
    current_user.streak_days = 5
    current_user.loop_level = 2
    current_user.offset_kg_total = 0.0
    db.commit()
    return {"status": "reset", "score": current_user.circularity_score}
