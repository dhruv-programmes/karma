from __future__ import annotations

import math
import re
from datetime import date
from uuid import UUID, uuid4

import httpx

from app.config import settings
from app.engines.carbon import estimate_from_spend
from app.schemas import Facility, Product, ProductCategory, Transaction
from app.seed.data import (
    DEMO_RECEIPT_TEXT,
    FACILITIES,
    MERCHANT_CATEGORY_RULES,
    OFFSETS,
    REWARDS,
    demo_state,
    get_product,
    get_product_by_barcode,
    log_activity,
    unlock_badge,
)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


async def lookup_barcode(barcode: str) -> Product:
    """Try Open Products Facts, then seed fallback. Never fail the demo."""
    local = get_product_by_barcode(barcode)
    if local:
        log_activity(
            "scan",
            f"Scanned {local.name}",
            f"{local.brand} · circularity {local.circularity_score}",
        )
        if local.id in demo_state.products:
            demo_state.products[local.id] = local.model_copy(
                update={"last_action_label": "Just scanned", "next_action_label": "Compare options"}
            )
        return local

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            for base in (settings.open_products_facts_url, settings.open_food_facts_url):
                resp = await client.get(f"{base}/{barcode}.json")
                if resp.status_code != 200:
                    continue
                payload = resp.json()
                if payload.get("status") != 1:
                    continue
                p = payload.get("product", {})
                name = p.get("product_name") or p.get("generic_name") or "Unknown product"
                brand = (p.get("brands") or "Unknown").split(",")[0].strip()
                from app.seed.data import PHONE_ID

                seeded = get_product(PHONE_ID)
                if seeded:
                    product = seeded.model_copy(
                        update={
                            "name": name[:80],
                            "brand": brand[:40],
                            "barcode": barcode,
                        }
                    )
                    log_activity("scan", f"Scanned {product.name}", "Matched via Open Facts + seed")
                    return product
    except Exception:
        pass

    from app.seed.data import PHONE_ID

    product = get_product(PHONE_ID)
    assert product is not None
    log_activity("scan", f"Scanned {product.name}", "Demo fallback match")
    return product


def nearby_facilities(
    facility_type: str | None = None,
    lat: float = 12.9716,
    lng: float = 77.5946,
    category: ProductCategory | None = None,
) -> list[Facility]:
    results: list[Facility] = []
    for f in FACILITIES:
        if facility_type and f.facility_type != facility_type:
            continue
        if category and category not in f.supported_categories:
            continue
        distance = round(haversine_km(lat, lng, f.lat, f.lng), 1)
        results.append(f.model_copy(update={"distance_km": distance}))
    results.sort(key=lambda x: x.distance_km or 999)
    return results


def categorize_merchant(merchant: str) -> ProductCategory:
    key = merchant.strip().lower()
    for rule, cat in MERCHANT_CATEGORY_RULES.items():
        if rule in key:
            return cat
    return ProductCategory.OTHER


def _month_totals() -> tuple[float, float]:
    this_m = 0.0
    prev_m = 0.0
    for t in demo_state.transactions:
        kg = estimate_from_spend(t.category, t.amount_inr).estimated_co2e_kg
        if t.date.startswith("2026-03"):
            this_m += kg
        elif t.date.startswith("2026-02"):
            prev_m += kg
    return round(this_m, 1), round(prev_m, 1)


def user_impact() -> dict:
    purchases = 0.0
    transport = 0.0
    energy = 0.0
    by_category: dict[str, float] = {}
    for t in demo_state.transactions:
        est = estimate_from_spend(t.category, t.amount_inr)
        kg = est.estimated_co2e_kg
        by_category[t.category.value] = round(
            by_category.get(t.category.value, 0.0) + kg, 1
        )
        if t.category == ProductCategory.TRANSPORT:
            transport += kg
        elif t.category == ProductCategory.ENERGY:
            energy += kg
        else:
            purchases += kg

    total = purchases + transport + energy
    buckets = {
        "Purchases": purchases,
        "Transport": transport,
        "Energy": energy,
    }
    biggest = max(buckets, key=buckets.get)
    if by_category:
        top_cat = max(by_category, key=by_category.get)
        if by_category[top_cat] >= max(buckets.values()) * 0.45:
            biggest = top_cat

    offset_total = demo_state.user.offset_kg_total
    residual = max(0.0, round(total - offset_total, 1))
    this_m, prev_m = _month_totals()
    budget = demo_state.user.monthly_budget_kg
    used_pct = round(min(200.0, (this_m / budget) * 100), 1) if budget else 0.0
    status = "on_track" if used_pct <= 90 else ("watch" if used_pct <= 110 else "over")
    insight = (
        f"Biggest lever right now: {biggest}. "
        f"March is ~{int(this_m)} kg vs budget {int(budget)} kg ({status.replace('_', ' ')})."
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
        "previous_month_kg": prev_m,
        "this_month_kg": this_m,
    }


def impact_timeseries() -> dict:
    from datetime import datetime, timedelta

    weeks: dict[str, float] = {}
    purchases = transport = energy = 0.0
    for t in demo_state.transactions:
        kg = estimate_from_spend(t.category, t.amount_inr).estimated_co2e_kg
        if t.category == ProductCategory.TRANSPORT:
            transport += kg
        elif t.category == ProductCategory.ENERGY:
            energy += kg
        else:
            purchases += kg
        d = datetime.strptime(t.date, "%Y-%m-%d")
        week_start = (d - timedelta(days=d.weekday())).date().isoformat()
        weeks[week_start] = round(weeks.get(week_start, 0.0) + kg, 1)

    points = [
        {"label": f"W{i+1}", "week_start": ws, "kg": weeks[ws]}
        for i, ws in enumerate(sorted(weeks.keys()))
    ]
    this_m, prev_m = _month_totals()
    return {
        "points": points,
        "purchases_kg": round(purchases, 1),
        "transport_kg": round(transport, 1),
        "energy_kg": round(energy, 1),
        "this_month_kg": this_m,
        "previous_month_kg": prev_m,
    }


def list_activity(limit: int = 30) -> list[dict]:
    return list(demo_state.activity_events[:limit])


def get_recommendations():
    return sorted(demo_state.recommendations, key=lambda r: r.score, reverse=True)


def list_transactions() -> list[Transaction]:
    return list(demo_state.transactions)


def import_transactions(rows: list[dict]) -> list[Transaction]:
    created: list[Transaction] = []
    today = date.today().isoformat()
    for row in rows:
        merchant = str(row.get("merchant", "Unknown"))
        amount = float(row.get("amount_inr", row.get("amount", 0)) or 0)
        txn = Transaction(
            id=uuid4(),
            date=str(row.get("date") or today),
            merchant=merchant,
            amount_inr=amount,
            category=categorize_merchant(merchant),
        )
        demo_state.transactions.append(txn)
        created.append(txn)
    return created


def parse_receipt_text(text: str | None, use_demo: bool = True) -> dict:
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
                "SWIGGY",
                "ZOMATO",
                "UBER",
                "CROMA",
                "AMAZON",
                "FLIPKART",
                "BESCOM",
                "PHILIPS",
                "BIGBASKET",
                "BLINKIT",
            )
        ):
            merchant = ln.title() if len(ln) < 40 else merchant
            # Prefer known merchant tokens
            for token in (
                "Swiggy",
                "Zomato",
                "Uber",
                "Croma",
                "Amazon",
                "Flipkart",
                "BESCOM",
                "Philips",
                "BigBasket",
                "Blinkit",
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

    created = import_transactions(rows)
    badges: list[str] = []
    if unlock_badge("receipt_ranger"):
        badges.append("receipt_ranger")
    log_activity(
        "receipt",
        f"Parsed receipt · {len(created)} items",
        "Added to footprint (demo NLP)",
        meta={"imported": len(created)},
    )
    return {
        "imported": len(created),
        "transactions": created,
        "message": f"Parsed {len(created)} line items into your footprint (demo NLP stub).",
        "badges_unlocked": badges,
    }


def redeem_reward(reward_id: UUID) -> dict:
    reward = next((r for r in REWARDS if r.id == reward_id), None)
    if not reward:
        raise ValueError("Reward not found")
    if reward_id in demo_state.redeemed_reward_ids:
        raise ValueError("Reward already redeemed")
    user = demo_state.user
    if user.impact_points < reward.points_required:
        raise ValueError("Not enough impact points")

    user.impact_points -= reward.points_required
    demo_state.redeemed_reward_ids.add(reward_id)
    demo_state.sync_level()
    code = f"LOOP-{str(reward_id)[-4:].upper()}-{user.impact_points}"
    entry = {
        "reward_id": str(reward_id),
        "claim_code": code,
        "points_spent": reward.points_required,
    }
    demo_state.redeem_ledger.append(entry)
    badges: list[str] = []
    if unlock_badge("brand_claimer"):
        badges.append("brand_claimer")
    log_activity(
        "redeem",
        f"Redeemed {reward.title}",
        f"Code ready · −{reward.points_required} pts",
        points_delta=-reward.points_required,
    )
    return {
        "reward_id": reward_id,
        "claim_code": code,
        "points_spent": reward.points_required,
        "points_remaining": user.impact_points,
        "message": f"Demo claim code ready for {reward.brand or reward.title}",
        "is_mock": True,
        "badges_unlocked": badges,
    }


def purchase_offset(offset_id: UUID) -> dict:
    project = next((o for o in OFFSETS if o.id == offset_id), None)
    if not project:
        raise ValueError("Offset not found")
    user = demo_state.user
    user.offset_kg_total = round(user.offset_kg_total + project.co2e_kg, 1)
    demo_state.purchased_offset_ids.append(offset_id)
    impact = user_impact()
    badges: list[str] = []
    if unlock_badge("offset_starter"):
        badges.append("offset_starter")
    log_activity(
        "offset",
        f"Offset +{int(project.co2e_kg)} kg",
        project.name,
    )
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


def owned_products() -> list[Product]:
    out: list[Product] = []
    for pid in demo_state.user.owned_product_ids:
        p = get_product(pid)
        if p:
            out.append(p)
    return out
