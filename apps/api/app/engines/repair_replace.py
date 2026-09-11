from __future__ import annotations

from app.engines.circularity import rank_options
from app.schemas import (
    ActionType,
    CircularOption,
    CircularOptionsResponse,
    EffortLevel,
    Product,
    UserPreferences,
)
from app.engines.carbon import estimate_product


def build_circular_options(
    product: Product,
    prefs: UserPreferences,
) -> CircularOptionsResponse:
    attrs = product.attributes
    repair_cost = float(attrs.get("repair_cost_inr", 0))
    replace_cost = float(attrs.get("replacement_cost_inr", 0))
    refurb_cost = float(attrs.get("refurb_cost_inr", 0))
    resale = float(attrs.get("resale_value_inr", 0))

    prefer_reduce = bool(attrs.get("prefer_reduce", False))

    options: list[CircularOption] = []

    if not prefer_reduce and product.repairability >= 40 and repair_cost > 0:
        options.append(
            CircularOption(
                action_type=ActionType.REPAIR,
                title="Repair",
                estimated_cost_inr=repair_cost,
                estimated_co2e_impact_kg=repair_cost * 0.02,
                co2e_avoided_kg=float(attrs.get("co2e_avoided_repair_kg", 0)),
                expected_lifetime_months=product.expected_remaining_life_months,
                convenience=0.85 if product.repairability >= 70 else 0.55,
                availability="2 repair options nearby",
                effort=EffortLevel.LOW if product.repairability >= 70 else EffortLevel.MEDIUM,
                explanation="Repairable product you already own — cheaper than replacement with strong environmental benefit.",
                score=0,
                next_action="FIND_REPAIR",
            )
        )

    if refurb_cost > 0:
        options.append(
            CircularOption(
                action_type=ActionType.REFURBISH,
                title="Buy refurbished",
                estimated_cost_inr=refurb_cost,
                estimated_co2e_impact_kg=refurb_cost * 0.05,
                co2e_avoided_kg=float(attrs.get("co2e_avoided_refurb_kg", 0)),
                expected_lifetime_months=max(12, product.expected_remaining_life_months - 6),
                convenience=0.7,
                availability="Refurbished market available",
                effort=EffortLevel.MEDIUM,
                explanation="Lower impact than buying new while restoring usable condition.",
                score=0,
                next_action="COMPARE_REFURB",
            )
        )

    if resale > 0:
        options.append(
            CircularOption(
                action_type=ActionType.RESELL,
                title="Resell",
                estimated_cost_inr=0,
                estimated_co2e_impact_kg=1.0,
                co2e_avoided_kg=float(attrs.get("co2e_avoided_resell_kg", 0)),
                money_return_inr=resale,
                convenience=0.75,
                availability="Resale platforms available",
                effort=EffortLevel.LOW,
                explanation="Recover value and keep the product in use.",
                score=0,
                next_action="LIST_FOR_SALE",
            )
        )

    options.append(
        CircularOption(
            action_type=ActionType.DONATE,
            title="Donate",
            estimated_cost_inr=0,
            estimated_co2e_impact_kg=0.5,
            co2e_avoided_kg=float(attrs.get("co2e_avoided_donate_kg", 0)),
            convenience=0.8,
            availability="Donation centers nearby",
            effort=EffortLevel.LOW,
            explanation="Extend social use when resale is less practical.",
            score=0,
            next_action="FIND_DONATION",
        )
    )

    options.append(
        CircularOption(
            action_type=ActionType.RECYCLE,
            title="Recycle",
            estimated_cost_inr=0,
            estimated_co2e_impact_kg=0.3,
            co2e_avoided_kg=float(attrs.get("co2e_avoided_recycle_kg", 0)),
            convenience=0.65,
            availability="Nearby facility available",
            effort=EffortLevel.MEDIUM,
            explanation="Responsible end-of-life path when reuse is not viable.",
            score=0,
            next_action="FIND_RECYCLE",
        )
    )

    if replace_cost > 0:
        options.append(
            CircularOption(
                action_type=ActionType.REPLACE,
                title="Replace new",
                estimated_cost_inr=replace_cost,
                estimated_co2e_impact_kg=product.estimated_co2e_kg,
                co2e_avoided_kg=0,
                expected_lifetime_months=36,
                convenience=0.9,
                availability="Retail available",
                effort=EffortLevel.LOW,
                explanation="Highest estimated impact — only when repair and reuse are not feasible.",
                score=0,
                next_action="SHOP_NEW",
            )
        )

    if prefer_reduce:
        options.insert(
            0,
            CircularOption(
                action_type=ActionType.REDUCE,
                title="Reduce repeat purchase",
                estimated_cost_inr=0,
                estimated_co2e_impact_kg=0,
                co2e_avoided_kg=product.estimated_co2e_kg,
                convenience=0.9,
                availability="Behavior change",
                effort=EffortLevel.MEDIUM,
                explanation="For consumables, cutting repeat buys beats circular end-of-life options.",
                score=0,
                next_action="SET_REMINDER",
            ),
        )

    ranked = rank_options(options, prefs)
    return CircularOptionsResponse(
        product=product,
        options=ranked,
        best_option=ranked[0],
        carbon=estimate_product(product),
    )
