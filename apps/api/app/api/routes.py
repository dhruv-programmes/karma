from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.config import settings
from app.engines.repair_replace import build_circular_options
from app.engines.scoring import complete_action, user_circularity_score
from app.schemas import (
    ActionType,
    AskRequest,
    AskResponse,
    BarcodeLookupRequest,
    CompletedActionResult,
    OffsetPurchaseResult,
    ProductCategory,
    ReceiptParseRequest,
    ReceiptParseResult,
    RedeemResult,
)
from app.seed.data import (
    OFFSETS,
    REWARDS,
    demo_state,
    get_product,
    list_badges,
)
from app.services import core as services

router = APIRouter(prefix="/api/v1")


def require_demo_auth(authorization: str | None) -> None:
    if not authorization:
        return
    token = authorization.replace("Bearer ", "").strip()
    if token and token != settings.demo_token:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@router.post("/products/lookup/barcode")
async def lookup_barcode(
    body: BarcodeLookupRequest, authorization: str | None = Header(default=None)
):
    require_demo_auth(authorization)
    return await services.lookup_barcode(body.barcode)


@router.get("/products/{product_id}")
def get_product_endpoint(
    product_id: UUID, authorization: str | None = Header(default=None)
):
    require_demo_auth(authorization)
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{product_id}/circular-options")
def circular_options(
    product_id: UUID, authorization: str | None = Header(default=None)
):
    require_demo_auth(authorization)
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return build_circular_options(product, demo_state.user.preferences)


@router.get("/users/me")
def users_me(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    demo_state.sync_level()
    return demo_state.user


@router.get("/users/me/impact")
def users_impact(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.user_impact()


@router.get("/users/me/recommendations")
def users_recommendations(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.get_recommendations()


@router.get("/users/me/closet")
def users_closet(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.owned_products()


@router.get("/users/me/badges")
def users_badges(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return list_badges()


@router.get("/transactions")
def list_transactions(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.list_transactions()


class ImportBody(BaseModel):
    rows: list[dict]


@router.post("/transactions/import")
def import_transactions(
    body: ImportBody, authorization: str | None = Header(default=None)
):
    """Deterministic merchant-rule categorization — persists into DemoState."""
    require_demo_auth(authorization)
    created = services.import_transactions(body.rows)
    return {
        "imported": len(created),
        "transactions": created,
    }


@router.post("/receipts/parse", response_model=ReceiptParseResult)
def parse_receipt(
    body: ReceiptParseRequest | None = None,
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    payload = body or ReceiptParseRequest()
    result = services.parse_receipt_text(payload.text, payload.use_demo)
    return ReceiptParseResult(**result)


@router.get("/facilities/nearby")
def facilities_nearby(
    type: str | None = Query(default=None, alias="type"),
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    category: ProductCategory | None = Query(default=None),
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    return services.nearby_facilities(type, lat, lng, category)


@router.get("/repair/nearby")
def repair_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    return services.nearby_facilities("repair", lat, lng)


@router.get("/recycling/nearby")
def recycling_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    return services.nearby_facilities("recycling", lat, lng)


@router.get("/donation/nearby")
def donation_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    return services.nearby_facilities("donation", lat, lng)


@router.get("/resale/nearby")
def resale_nearby(
    lat: float = Query(12.9716),
    lng: float = Query(77.5946),
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    return services.nearby_facilities("resale", lat, lng)


class CompleteActionBody(BaseModel):
    action_type: ActionType | None = None


@router.post("/actions/{action_id}/complete", response_model=CompletedActionResult)
def complete_action_endpoint(
    action_id: UUID,
    body: CompleteActionBody | None = None,
    authorization: str | None = Header(default=None),
):
    require_demo_auth(authorization)
    action_type = body.action_type if body else None
    result = complete_action(action_id, action_type)
    return CompletedActionResult(**result)


@router.get("/rewards")
def rewards(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return REWARDS


@router.post("/rewards/{reward_id}/redeem", response_model=RedeemResult)
def redeem_reward(
    reward_id: UUID, authorization: str | None = Header(default=None)
):
    require_demo_auth(authorization)
    try:
        result = services.redeem_reward(reward_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return RedeemResult(**{k: v for k, v in result.items() if k != "badges_unlocked"})


@router.get("/offsets")
def offsets(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return OFFSETS


@router.post("/offsets/{offset_id}/purchase", response_model=OffsetPurchaseResult)
def purchase_offset(
    offset_id: UUID, authorization: str | None = Header(default=None)
):
    require_demo_auth(authorization)
    try:
        result = services.purchase_offset(offset_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return OffsetPurchaseResult(**result)


@router.get("/profile/circularity-score")
def circularity_score(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    demo_state.sync_level()
    return {
        "score": user_circularity_score(),
        "impact_points": demo_state.user.impact_points,
        "streak_days": demo_state.user.streak_days,
        "trend_delta": demo_state.user.trend_delta,
        "loop_level": demo_state.user.loop_level,
        "offset_kg_total": demo_state.user.offset_kg_total,
    }


@router.post("/ask", response_model=AskResponse)
def ask_assistant(
    body: AskRequest, authorization: str | None = Header(default=None)
):
    """Lightweight NL interface — tools only, no invented numbers."""
    require_demo_auth(authorization)
    q = body.query.lower()
    tools: list[str] = []
    data: dict = {}

    if "biggest" in q or "carbon source" in q or "energy" in q:
        tools.append("get_carbon_breakdown")
        data = services.user_impact()
        answer = (
            f"Your biggest opportunity is {data['biggest_opportunity']}. "
            f"Estimated total ~{int(data['total_kg'])} kg CO₂e "
            f"(residual ~{int(data['residual_kg'])} kg after offsets). {data['insight']}"
        )
    elif "offset" in q:
        tools.append("list_offsets")
        verified = [o for o in OFFSETS if o.verification_status == "Verified"]
        top = verified[0] if verified else OFFSETS[0]
        data = {"offset": top.model_dump()}
        answer = (
            f"Try verified offset “{top.name}” (~{int(top.co2e_kg)} kg for ₹{int(top.price_inr)}). "
            "Demo purchase only — not a real climate claim."
        )
    elif "reward" in q or "points" in q:
        tools.append("list_rewards")
        affordable = [r for r in REWARDS if r.points_required <= demo_state.user.impact_points]
        top = affordable[0] if affordable else REWARDS[0]
        data = {"reward": top.model_dump(), "points": demo_state.user.impact_points}
        answer = (
            f"You have {demo_state.user.impact_points} pts (Loop Level {demo_state.user.loop_level}). "
            f"Suggested demo reward: {top.title} ({top.points_required} pts)."
        )
    elif "streak" in q:
        tools.append("get_profile")
        answer = (
            f"Your streak is {demo_state.user.streak_days} days. "
            "Complete a real circular action today to keep it going."
        )
        data = {"streak_days": demo_state.user.streak_days}
    elif "repair" in q:
        tools.extend(["get_product", "compare_actions"])
        from app.seed.data import PHONE_ID

        product = get_product(body.product_id or PHONE_ID)
        assert product
        opts = build_circular_options(product, demo_state.user.preferences)
        data = {"best": opts.best_option.model_dump(), "product": product.model_dump()}
        best = opts.best_option
        answer = (
            f"Best option for {product.name}: {best.title}. "
            f"~{int(best.co2e_avoided_kg)} kg CO₂e avoided, "
            f"estimated cost ₹{int(best.estimated_cost_inr)}."
        )
    elif "recycl" in q:
        tools.append("find_local_facilities")
        facilities = services.nearby_facilities("recycling")
        data = {"facilities": [f.model_dump() for f in facilities[:3]]}
        top = facilities[0] if facilities else None
        answer = (
            f"Nearest recycling: {top.name} ({top.distance_km} km). Status: {top.verification_status}."
            if top
            else "No seeded recycling facilities found."
        )
    elif "refurb" in q or "money" in q:
        tools.extend(["get_user_recommendations", "compare_actions"])
        recs = services.get_recommendations()
        best_money = max(recs, key=lambda r: r.money_impact_inr)
        data = {"recommendation": best_money.model_dump()}
        answer = (
            f"{best_money.title} saves the most money among current recommendations "
            f"(~₹{int(best_money.money_impact_inr)})."
        )
    else:
        tools.append("get_user_recommendations")
        recs = services.get_recommendations()
        top = recs[0]
        data = {"recommendation": top.model_dump()}
        answer = f"Your best next action: {top.title} (~{int(top.co2e_avoided_kg)} kg CO₂e avoided)."

    return AskResponse(answer=answer, tools_used=tools, data=data)


@router.post("/demo/reset")
def reset_demo(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    demo_state.reset()
    demo_state.sync_level()
    return {"status": "reset", "score": demo_state.user.circularity_score}
