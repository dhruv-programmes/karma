from __future__ import annotations

import math
from uuid import UUID

import httpx

from app.config import settings
from app.schemas import Facility, Product, ProductCategory
from app.seed.data import (
    FACILITIES,
    get_product,
    get_product_by_barcode,
    demo_state,
)
from app.engines.carbon import estimate_from_spend
from app.seed.data import MERCHANT_CATEGORY_RULES, TRANSACTIONS


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
                # Map into closest seeded electronics/food shell if possible
                if local := get_product_by_barcode(barcode):
                    return local
                # Fall through to default phone for demo reliability when unknown
                from app.seed.data import PHONE_ID

                seeded = get_product(PHONE_ID)
                if seeded:
                    return seeded.model_copy(
                        update={
                            "name": name[:80],
                            "brand": brand[:40],
                            "barcode": barcode,
                        }
                    )
    except Exception:
        pass

    # Absolute fallback — hero phone
    from app.seed.data import PHONE_ID

    product = get_product(PHONE_ID)
    assert product is not None
    return product


def nearby_facilities(
    facility_type: str,
    lat: float = 12.9716,
    lng: float = 77.5946,
    category: ProductCategory | None = None,
) -> list[Facility]:
    results: list[Facility] = []
    for f in FACILITIES:
        if f.facility_type != facility_type:
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


def user_impact() -> dict:
    purchases = 0.0
    transport = 0.0
    energy = 0.0
    for t in TRANSACTIONS:
        est = estimate_from_spend(t.category, t.amount_inr)
        if t.category == ProductCategory.TRANSPORT:
            transport += est.estimated_co2e_kg
        elif t.category == ProductCategory.ENERGY:
            energy += est.estimated_co2e_kg
        else:
            purchases += est.estimated_co2e_kg

    total = purchases + transport + energy
    biggest = "Electronics"
    insight = (
        "You do not need to change everything. "
        "Your biggest opportunity is extending product lifetimes."
    )
    return {
        "purchases_kg": round(purchases, 1),
        "transport_kg": round(transport, 1),
        "energy_kg": round(energy, 1),
        "total_kg": round(total, 1),
        "month_label": "March 2026",
        "biggest_opportunity": biggest,
        "insight": insight,
    }


def get_recommendations():
    return sorted(demo_state.recommendations, key=lambda r: r.score, reverse=True)
