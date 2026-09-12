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
    UserPreferences,
)
from app.seed.data import PHONE_ID
from app.services import core as services

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

    user_id = str(uuid4())
    _now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    user = UserModel(
        id=user_id,
        name=body.name.strip(),
        email=email_clean,
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
    return services.sync_steps(body.steps, current_user, db)


# ==========================================
# GPS COMMUTE REWARDS
# ==========================================


@router.post("/commute/log", response_model=CommuteTripResult)
def log_commute(
    body: CommuteTripRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.log_commute_trip(
        distance_km=body.distance_km,
        duration_min=body.duration_min,
        avg_speed_kmh=body.avg_speed_kmh,
        user=current_user,
        db=db,
    )


@router.get("/commute/summary", response_model=CommuteSummaryResponse)
def commute_summary(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return services.build_commute_summary(current_user, db)


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
    return {
        "imported": len(created),
        "transactions": created,
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
                points_required=r.points_required,
                brand=r.brand,
                is_mock=r.is_mock,
                expires_on=r.expires_on,
            )
            for r in rows
        ]
    from app.seed.data import REWARDS
    return REWARDS


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
            .filter(RewardModel.points_required <= current_user.impact_points)
            .first()
        )
        if not aff:
            aff = db.query(RewardModel).first()
        data = {"reward": {"title": aff.title, "points": aff.points_required} if aff else {}, "points": current_user.impact_points}
        answer = (
            f"You have {current_user.impact_points} pts (Loop Level {current_user.loop_level}). "
            f"Suggested demo reward: {aff.title} ({aff.points_required} pts)."
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
