from __future__ import annotations

from datetime import datetime, timezone

from app.schemas import CarbonEstimate, Product, ProductCategory
from app.seed.data import CARBON_FACTORS


def format_co2e(kg: float) -> str:
    """Never show false precision."""
    if kg < 1:
        return f"~{kg:.1f} kg CO₂e"
    return f"~{int(round(kg))} kg CO₂e"


def estimate_from_spend(
    category: ProductCategory | str,
    amount_inr: float,
    quantity: float = 1.0,
) -> CarbonEstimate:
    key = category.value if isinstance(category, ProductCategory) else category
    meta = CARBON_FACTORS.get(key, CARBON_FACTORS["Other"])
    factor = float(meta["factor"])
    co2e = amount_inr * factor * quantity
    return CarbonEstimate(
        estimated_co2e_kg=co2e,
        display=format_co2e(co2e),
        source=meta["source"],
        factor=factor,
        unit=meta["unit"],
        geography=meta["geography"],
        methodology=meta["methodology"],
        confidence=float(meta["confidence"]),
        timestamp=datetime.now(timezone.utc),
    )


def estimate_product(product: Product) -> CarbonEstimate:
    """Prefer stored bottom-up product estimate when present."""
    key = product.category.value
    meta = CARBON_FACTORS.get(key, CARBON_FACTORS["Other"])
    return CarbonEstimate(
        estimated_co2e_kg=product.estimated_co2e_kg,
        display=format_co2e(product.estimated_co2e_kg),
        source="seed/product-lifecycle",
        factor=float(meta["factor"]),
        unit="kgCO2e/product",
        geography=meta["geography"],
        methodology="bottom-up-category-v1",
        confidence=min(0.9, float(meta["confidence"]) + 0.1),
        timestamp=datetime.now(timezone.utc),
    )
