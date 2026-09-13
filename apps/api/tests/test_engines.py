from app.engines.carbon import estimate_from_spend, format_co2e
from app.engines.circularity import rank_options, score_option
from app.engines.repair_replace import build_circular_options
from app.schemas import EffortLevel, CircularOption, ActionType, UserPreferences
from app.seed.data import PRODUCTS, PHONE_ID, get_product
from uuid import UUID
from app.engines.scoring import complete_action
from app.services.core import user_impact, purchase_offset, parse_receipt_text
from app.seed.data import demo_state, list_badges


def test_format_co2e_no_false_precision():
    assert format_co2e(119.438) == "~119 kg CO₂e"
    assert "~" in format_co2e(0.4)


def test_spend_estimate_uses_factor():
    est = estimate_from_spend("Electronics", 1000)
    assert est.estimated_co2e_kg == 4.5
    assert est.geography == "IN"


def test_phone_repair_ranks_best():
    product = get_product(PHONE_ID)
    assert product is not None
    result = build_circular_options(product, UserPreferences())
    assert result.best_option.action_type == ActionType.REPAIR
    assert result.best_option.co2e_avoided_kg == 120
    assert len(result.options) >= 5


def test_seed_has_rich_products():
    assert len(PRODUCTS) >= 16
    phone = get_product(PHONE_ID)
    assert phone and phone.circularity_score == 78


def test_dynamic_impact_and_badges():
    demo_state.reset()
    impact = user_impact()
    assert impact["total_kg"] > 0
    assert impact["biggest_opportunity"]
    parse_receipt_text(None, True)
    purchase_offset(UUID("77777777-7777-7777-7777-777777777701"))
    result = complete_action(
        UUID("66666666-6666-6666-6666-666666666601"), ActionType.REPAIR
    )
    assert result["points_awarded"] == 100
    unlocked = {b["id"] for b in list_badges() if b["unlocked"]}
    assert "first_repair" in unlocked
    assert "offset_starter" in unlocked
    assert "receipt_ranger" in unlocked
