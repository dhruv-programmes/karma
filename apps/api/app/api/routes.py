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
)
from app.seed.data import (
    OFFSETS,
    REWARDS,
    TRANSACTIONS,
    demo_state,
    get_product,
)
from app.services import core as services

router = APIRouter(prefix="/api/v1")


def require_demo_auth(authorization: str | None) -> None:
    if not authorization:
        return  # demo mode allows open access
    token = authorization.replace("Bearer ", "").strip()
    if token and token != settings.demo_token:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@router.post("/products/lookup/barcode")
async def lookup_barcode(body: BarcodeLookupRequest, authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    product = await services.lookup_barcode(body.barcode)
    return product


@router.get("/products/{product_id}")
def get_product_endpoint(product_id: UUID, authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{product_id}/circular-options")
def circular_options(product_id: UUID, authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    product = get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return build_circular_options(product, demo_state.user.preferences)


@router.get("/users/me")
def users_me(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return demo_state.user


@router.get("/users/me/impact")
def users_impact(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.user_impact()


@router.get("/users/me/recommendations")
def users_recommendations(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return services.get_recommendations()


@router.get("/transactions")
def list_transactions(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return TRANSACTIONS


class ImportBody(BaseModel):
    rows: list[dict]


@router.post("/transactions/import")
def import_transactions(body: ImportBody, authorization: str | None = Header(default=None)):
    """Deterministic merchant-rule categorization stub (no unauthorized scraping)."""
    require_demo_auth(authorization)
    categorized = []
    for row in body.rows:
        merchant = str(row.get("merchant", "Unknown"))
        categorized.append(
            {
                **row,
                "category": services.categorize_merchant(merchant).value,
            }
        )
    return {"imported": len(categorized), "transactions": categorized}


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


@router.get("/offsets")
def offsets(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return OFFSETS


@router.get("/profile/circularity-score")
def circularity_score(authorization: str | None = Header(default=None)):
    require_demo_auth(authorization)
    return {
        "score": user_circularity_score(),
        "impact_points": demo_state.user.impact_points,
        "streak_days": demo_state.user.streak_days,
        "trend_delta": demo_state.user.trend_delta,
    }


@router.post("/ask", response_model=AskResponse)
def ask_assistant(body: AskRequest, authorization: str | None = Header(default=None)):
    """Lightweight NL interface — tools only, no invented numbers."""
    require_demo_auth(authorization)
    q = body.query.lower()
    tools: list[str] = []
    data: dict = {}

    if "biggest" in q or "carbon source" in q:
        tools.append("get_carbon_breakdown")
        data = services.user_impact()
        answer = (
            f"Your biggest opportunity is {data['biggest_opportunity']}. "
            f"Estimated monthly total ~{int(data['total_kg'])} kg CO₂e. {data['insight']}"
        )
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
    return {"status": "reset", "score": demo_state.user.circularity_score}
