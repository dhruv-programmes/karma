from app.engines.carbon import estimate_from_spend, format_co2e
from app.engines.circularity import rank_options, score_option
from app.engines.repair_replace import build_circular_options
from app.schemas import EffortLevel, CircularOption, ActionType, UserPreferences
from app.seed.data import PRODUCTS, PHONE_ID, get_product


def test_format_co2e_no_false_precision():
    assert format_co2e(119.438) == "~119 kg CO₂e"
    assert "~" in format_co2e(0.4)


def test_spend_estimate_uses_factor():
    est = estimate_from_spend("Electronics", 1000)
    assert est.estimated_co2e_kg == 450.0
    assert est.geography == "IN"


def test_phone_repair_ranks_best():
    product = get_product(PHONE_ID)
    assert product is not None
    result = build_circular_options(product, UserPreferences())
    assert result.best_option.action_type == ActionType.REPAIR
    assert result.best_option.co2e_avoided_kg == 120
    assert len(result.options) >= 5


def test_seed_has_rich_products():
    assert len(PRODUCTS) >= 3
    phone = get_product(PHONE_ID)
    assert phone and phone.circularity_score == 78
