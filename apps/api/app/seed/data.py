from __future__ import annotations

from copy import deepcopy
from uuid import UUID

from app.schemas import (
    CircularityBreakdown,
    Facility,
    OffsetProject,
    Product,
    ProductCategory,
    Recommendation,
    Reward,
    Transaction,
    UserPreferences,
    UserProfile,
    ActionType,
    EffortLevel,
)

DEMO_USER_ID = UUID("11111111-1111-1111-1111-111111111111")
PHONE_ID = UUID("22222222-2222-2222-2222-222222222201")
JEANS_ID = UUID("22222222-2222-2222-2222-222222222202")
HEADPHONES_ID = UUID("22222222-2222-2222-2222-222222222203")
LAPTOP_ID = UUID("22222222-2222-2222-2222-222222222204")
SHOES_ID = UUID("22222222-2222-2222-2222-222222222205")
BACKPACK_ID = UUID("22222222-2222-2222-2222-222222222206")
FOOD_ID = UUID("22222222-2222-2222-2222-222222222207")
APPLIANCE_ID = UUID("22222222-2222-2222-2222-222222222208")

# Demo barcode for hero scan — maps to smartphone
DEMO_PHONE_BARCODE = "8901030865822"

PRODUCTS: dict[UUID, Product] = {
    PHONE_ID: Product(
        id=PHONE_ID,
        barcode=DEMO_PHONE_BARCODE,
        name="Galaxy S-series Smartphone",
        brand="Samsung",
        category=ProductCategory.ELECTRONICS,
        image_url="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
        estimated_co2e_kg=70,
        circularity_score=78,
        circularity_breakdown=CircularityBreakdown(
            repairability=85,
            longevity=80,
            recyclability=72,
            reuse_potential=76,
            circular_options=79,
        ),
        repairability=85,
        expected_remaining_life_months=24,
        condition="good",
        age_months=28,
        attributes={
            "replacement_cost_inr": 75000,
            "repair_cost_inr": 4000,
            "resale_value_inr": 16000,
            "refurb_cost_inr": 28000,
            "co2e_avoided_repair_kg": 120,
            "co2e_avoided_refurb_kg": 85,
            "co2e_avoided_resell_kg": 55,
            "co2e_avoided_donate_kg": 40,
            "co2e_avoided_recycle_kg": 25,
        },
    ),
    JEANS_ID: Product(
        id=JEANS_ID,
        barcode="8907555012345",
        name="Slim Fit Denim Jeans",
        brand="Levi's",
        category=ProductCategory.CLOTHING,
        image_url="https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
        estimated_co2e_kg=33,
        circularity_score=71,
        circularity_breakdown=CircularityBreakdown(
            repairability=70,
            longevity=75,
            recyclability=55,
            reuse_potential=82,
            circular_options=74,
        ),
        repairability=70,
        expected_remaining_life_months=18,
        condition="fair",
        age_months=14,
        attributes={
            "replacement_cost_inr": 4500,
            "repair_cost_inr": 450,
            "resale_value_inr": 1200,
            "refurb_cost_inr": 1800,
            "co2e_avoided_repair_kg": 28,
            "co2e_avoided_refurb_kg": 18,
            "co2e_avoided_resell_kg": 22,
            "co2e_avoided_donate_kg": 20,
            "co2e_avoided_recycle_kg": 8,
        },
    ),
    HEADPHONES_ID: Product(
        id=HEADPHONES_ID,
        barcode="8806090123456",
        name="Wireless Noise-Cancel Headphones",
        brand="Sony",
        category=ProductCategory.ELECTRONICS,
        image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        estimated_co2e_kg=22,
        circularity_score=69,
        circularity_breakdown=CircularityBreakdown(
            repairability=62,
            longevity=70,
            recyclability=68,
            reuse_potential=74,
            circular_options=71,
        ),
        repairability=62,
        expected_remaining_life_months=16,
        condition="good",
        age_months=20,
        attributes={
            "replacement_cost_inr": 22000,
            "repair_cost_inr": 2500,
            "resale_value_inr": 7000,
            "refurb_cost_inr": 12000,
            "co2e_avoided_repair_kg": 18,
            "co2e_avoided_refurb_kg": 12,
            "co2e_avoided_resell_kg": 10,
            "co2e_avoided_donate_kg": 8,
            "co2e_avoided_recycle_kg": 6,
        },
    ),
    LAPTOP_ID: Product(
        id=LAPTOP_ID,
        barcode="0194252012345",
        name="Ultrabook 14-inch Laptop",
        brand="Dell",
        category=ProductCategory.ELECTRONICS,
        image_url="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
        estimated_co2e_kg=280,
        circularity_score=74,
        circularity_breakdown=CircularityBreakdown(
            repairability=78,
            longevity=82,
            recyclability=70,
            reuse_potential=72,
            circular_options=76,
        ),
        repairability=78,
        expected_remaining_life_months=30,
        age_months=36,
        attributes={
            "replacement_cost_inr": 95000,
            "repair_cost_inr": 8500,
            "resale_value_inr": 28000,
            "refurb_cost_inr": 45000,
            "co2e_avoided_repair_kg": 210,
            "co2e_avoided_refurb_kg": 160,
            "co2e_avoided_resell_kg": 100,
            "co2e_avoided_donate_kg": 80,
            "co2e_avoided_recycle_kg": 40,
        },
    ),
    SHOES_ID: Product(
        id=SHOES_ID,
        barcode="1945000123456",
        name="Everyday Running Shoes",
        brand="Nike",
        category=ProductCategory.CLOTHING,
        image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
        estimated_co2e_kg=14,
        circularity_score=58,
        circularity_breakdown=CircularityBreakdown(
            repairability=40,
            longevity=50,
            recyclability=45,
            reuse_potential=70,
            circular_options=65,
        ),
        repairability=40,
        expected_remaining_life_months=8,
        attributes={
            "replacement_cost_inr": 8000,
            "repair_cost_inr": 900,
            "resale_value_inr": 1500,
            "refurb_cost_inr": 3500,
            "co2e_avoided_repair_kg": 8,
            "co2e_avoided_refurb_kg": 5,
            "co2e_avoided_resell_kg": 6,
            "co2e_avoided_donate_kg": 7,
            "co2e_avoided_recycle_kg": 3,
        },
    ),
    BACKPACK_ID: Product(
        id=BACKPACK_ID,
        barcode="8901234567890",
        name="Urban Daypack",
        brand="Wildcraft",
        category=ProductCategory.OTHER,
        image_url="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        estimated_co2e_kg=18,
        circularity_score=66,
        circularity_breakdown=CircularityBreakdown(
            repairability=75,
            longevity=80,
            recyclability=50,
            reuse_potential=78,
            circular_options=70,
        ),
        repairability=75,
        expected_remaining_life_months=36,
        attributes={
            "replacement_cost_inr": 3500,
            "repair_cost_inr": 400,
            "resale_value_inr": 900,
            "refurb_cost_inr": 1500,
            "co2e_avoided_repair_kg": 14,
            "co2e_avoided_refurb_kg": 9,
            "co2e_avoided_resell_kg": 10,
            "co2e_avoided_donate_kg": 11,
            "co2e_avoided_recycle_kg": 4,
        },
    ),
    FOOD_ID: Product(
        id=FOOD_ID,
        barcode="8901491101234",
        name="Packaged Breakfast Cereal",
        brand="Kellogg's",
        category=ProductCategory.FOOD,
        image_url="https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400",
        estimated_co2e_kg=1.2,
        circularity_score=42,
        circularity_breakdown=CircularityBreakdown(
            repairability=0,
            longevity=5,
            recyclability=60,
            reuse_potential=20,
            circular_options=35,
        ),
        repairability=0,
        expected_remaining_life_months=0,
        attributes={
            "replacement_cost_inr": 280,
            "repair_cost_inr": 0,
            "resale_value_inr": 0,
            "refurb_cost_inr": 0,
            "co2e_avoided_repair_kg": 0,
            "co2e_avoided_refurb_kg": 0,
            "co2e_avoided_resell_kg": 0,
            "co2e_avoided_donate_kg": 0.4,
            "co2e_avoided_recycle_kg": 0.2,
            "prefer_reduce": True,
        },
    ),
    APPLIANCE_ID: Product(
        id=APPLIANCE_ID,
        barcode="8901058845123",
        name="Mixer Grinder",
        brand="Philips",
        category=ProductCategory.HOME,
        image_url="https://images.unsplash.com/photo-1585515320310-259814833e7f?w=400",
        estimated_co2e_kg=45,
        circularity_score=72,
        circularity_breakdown=CircularityBreakdown(
            repairability=80,
            longevity=85,
            recyclability=65,
            reuse_potential=70,
            circular_options=75,
        ),
        repairability=80,
        expected_remaining_life_months=40,
        attributes={
            "replacement_cost_inr": 6500,
            "repair_cost_inr": 900,
            "resale_value_inr": 1800,
            "refurb_cost_inr": 3200,
            "co2e_avoided_repair_kg": 38,
            "co2e_avoided_refurb_kg": 28,
            "co2e_avoided_resell_kg": 20,
            "co2e_avoided_donate_kg": 18,
            "co2e_avoided_recycle_kg": 10,
        },
    ),
}

BARCODE_INDEX: dict[str, UUID] = {
    p.barcode: p.id for p in PRODUCTS.values() if p.barcode
}

CARBON_FACTORS: dict[str, dict] = {
    "Electronics": {
        "factor": 0.45,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.72,
        "bottom_up": {
            "smartphone": 70,
            "laptop": 280,
            "headphones": 22,
        },
    },
    "Clothing": {
        "factor": 0.35,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.68,
    },
    "Food": {
        "factor": 0.55,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.65,
    },
    "Transport": {
        "factor": 0.22,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.7,
    },
    "Energy": {
        "factor": 0.82,
        "unit": "kgCO2e/kWh-proxy",
        "geography": "IN",
        "methodology": "grid-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.75,
    },
    "Home": {
        "factor": 0.4,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.66,
    },
    "Furniture": {
        "factor": 0.38,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.6,
    },
    "Personal care": {
        "factor": 0.3,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.62,
    },
    "Other": {
        "factor": 0.32,
        "unit": "kgCO2e/INR",
        "geography": "IN",
        "methodology": "spend-intensity-v1",
        "source": "seed/emission-factors",
        "confidence": 0.55,
    },
}

FACILITIES: list[Facility] = [
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333301"),
        name="Indiranagar Device Care",
        facility_type="repair",
        lat=12.9784,
        lng=77.6408,
        supported_categories=[ProductCategory.ELECTRONICS],
        open_now=True,
        verification_status="Verified",
        address="100 Feet Rd, Indiranagar, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333302"),
        name="Koramangala Phone Clinic",
        facility_type="repair",
        lat=12.9352,
        lng=77.6245,
        supported_categories=[ProductCategory.ELECTRONICS],
        open_now=True,
        verification_status="Verified",
        address="5th Block, Koramangala, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333303"),
        name="Saahas Zero Waste Hub",
        facility_type="recycling",
        lat=12.9698,
        lng=77.7499,
        supported_categories=[
            ProductCategory.ELECTRONICS,
            ProductCategory.HOME,
            ProductCategory.OTHER,
        ],
        open_now=True,
        verification_status="Verified",
        address="Whitefield, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333304"),
        name="Hasiru Dala e-Waste Drop",
        facility_type="recycling",
        lat=12.9716,
        lng=77.5946,
        supported_categories=[ProductCategory.ELECTRONICS],
        open_now=False,
        verification_status="Unverified",
        address="Near Cubbon Park, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333305"),
        name="Goonj Collection Point",
        facility_type="donation",
        lat=12.9592,
        lng=77.6974,
        supported_categories=[ProductCategory.CLOTHING, ProductCategory.OTHER],
        open_now=True,
        verification_status="Verified",
        address="HSR Layout, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333306"),
        name="Cashify Exchange Desk",
        facility_type="resale",
        lat=12.9279,
        lng=77.6271,
        supported_categories=[ProductCategory.ELECTRONICS],
        open_now=True,
        verification_status="Unverified",
        address="Forum Mall area, Bengaluru",
    ),
]

TRANSACTIONS: list[Transaction] = [
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444401"),
        date="2026-03-02",
        merchant="Swiggy",
        amount_inr=420,
        category=ProductCategory.FOOD,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444402"),
        date="2026-03-04",
        merchant="Uber",
        amount_inr=280,
        category=ProductCategory.TRANSPORT,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444403"),
        date="2026-03-06",
        merchant="Croma",
        amount_inr=2499,
        category=ProductCategory.ELECTRONICS,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444404"),
        date="2026-03-08",
        merchant="Amazon",
        amount_inr=1899,
        category=ProductCategory.OTHER,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444405"),
        date="2026-03-09",
        merchant="BESCOM",
        amount_inr=2100,
        category=ProductCategory.ENERGY,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444406"),
        date="2026-03-10",
        merchant="Zomato",
        amount_inr=560,
        category=ProductCategory.FOOD,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444407"),
        date="2026-03-11",
        merchant="Rapido",
        amount_inr=95,
        category=ProductCategory.TRANSPORT,
    ),
    Transaction(
        id=UUID("44444444-4444-4444-4444-444444444408"),
        date="2026-03-11",
        merchant="BigBasket",
        amount_inr=1450,
        category=ProductCategory.FOOD,
    ),
]

REWARDS: list[Reward] = [
    Reward(
        id=UUID("55555555-5555-5555-5555-555555555501"),
        title="₹200 repair voucher",
        description="Mock partner voucher for verified phone repair.",
        points_required=300,
        brand="Indiranagar Device Care",
        is_mock=True,
    ),
    Reward(
        id=UUID("55555555-5555-5555-5555-555555555502"),
        title="Refurbished accessory discount",
        description="Demo brand reward — not a real endorsement.",
        points_required=500,
        brand="Cashify (demo)",
        is_mock=True,
    ),
    Reward(
        id=UUID("55555555-5555-5555-5555-555555555503"),
        title="Eco packaging credit",
        description="Demo brand channel reward for completing a circular action.",
        points_required=250,
        brand="GreenCart (demo)",
        is_mock=True,
    ),
    Reward(
        id=UUID("55555555-5555-5555-5555-555555555504"),
        title="Secondhand fashion credit",
        description="Mock reward for resale/donation completion.",
        points_required=350,
        brand="ReWear Hub (demo)",
        is_mock=True,
    ),
]

OFFSETS: list[OffsetProject] = [
    OffsetProject(
        id=UUID("77777777-7777-7777-7777-777777777701"),
        name="Mangrove restoration — Sundarbans",
        provider="EcoVerified Demo",
        co2e_kg=100,
        price_inr=450,
        verification_status="Verified",
        geography="IN",
        description="Community mangrove project. Demo listing only.",
    ),
    OffsetProject(
        id=UUID("77777777-7777-7777-7777-777777777702"),
        name="Rural biogas clusters",
        provider="ClimateLink Demo",
        co2e_kg=250,
        price_inr=980,
        verification_status="Verified",
        geography="IN",
        description="Household biogas displacing firewood. Demo listing only.",
    ),
    OffsetProject(
        id=UUID("77777777-7777-7777-7777-777777777703"),
        name="Urban tree pledge",
        provider="Local NGO",
        co2e_kg=40,
        price_inr=199,
        verification_status="Unverified",
        geography="IN-KA",
        description="Unverified local pledge — shown for transparency.",
    ),
]

BASE_RECOMMENDATIONS: list[Recommendation] = [
    Recommendation(
        id=UUID("66666666-6666-6666-6666-666666666601"),
        category=ProductCategory.ELECTRONICS,
        action_type=ActionType.REPAIR,
        title="Repair your old phone",
        subtitle="Extend lifetime instead of buying new",
        co2e_avoided_kg=120,
        money_impact_inr=18000,
        effort=EffortLevel.LOW,
        local_availability="2 repair options nearby",
        product_id=PHONE_ID,
        explanation="Repairable device you already own — cheaper than replacement with significant CO₂e avoided.",
        score=92,
    ),
    Recommendation(
        id=UUID("66666666-6666-6666-6666-666666666602"),
        category=ProductCategory.CLOTHING,
        action_type=ActionType.RESELL,
        title="Resell unused jeans",
        subtitle="Keep fabric in circulation",
        co2e_avoided_kg=22,
        money_impact_inr=1200,
        effort=EffortLevel.LOW,
        local_availability="Resale platforms available",
        product_id=JEANS_ID,
        explanation="Good reuse potential; resale recovers value and avoids new cotton demand.",
        score=78,
    ),
    Recommendation(
        id=UUID("66666666-6666-6666-6666-666666666603"),
        category=ProductCategory.ELECTRONICS,
        action_type=ActionType.RECYCLE,
        title="Recycle old headphones",
        subtitle="Verified e-waste drop nearby",
        co2e_avoided_kg=6,
        money_impact_inr=0,
        effort=EffortLevel.MEDIUM,
        local_availability="1.8 km to recycling hub",
        product_id=HEADPHONES_ID,
        explanation="Battery and plastics need proper e-waste handling.",
        score=64,
    ),
    Recommendation(
        id=UUID("66666666-6666-6666-6666-666666666604"),
        category=ProductCategory.TRANSPORT,
        action_type=ActionType.REDUCE,
        title="Cut repeat short Uber trips",
        subtitle="Shift 2 weekly rides to metro/walk",
        co2e_avoided_kg=18,
        money_impact_inr=1600,
        effort=EffortLevel.MEDIUM,
        local_availability="Based on your recent transport spend",
        product_id=None,
        explanation="Transport is a measurable monthly hotspot in your imports.",
        score=71,
    ),
]

MERCHANT_CATEGORY_RULES: dict[str, ProductCategory] = {
    "swiggy": ProductCategory.FOOD,
    "zomato": ProductCategory.FOOD,
    "uber": ProductCategory.TRANSPORT,
    "rapido": ProductCategory.TRANSPORT,
    "amazon": ProductCategory.OTHER,
    "flipkart": ProductCategory.OTHER,
    "croma": ProductCategory.ELECTRONICS,
    "reliance digital": ProductCategory.ELECTRONICS,
    "bigbasket": ProductCategory.FOOD,
    "blinkit": ProductCategory.FOOD,
    "bescom": ProductCategory.ENERGY,
    "electricity": ProductCategory.ENERGY,
    "rent": ProductCategory.HOME,
}


class DemoState:
    """Mutable in-memory demo state (no database yet)."""

    def __init__(self) -> None:
        self.user = UserProfile(
            id=DEMO_USER_ID,
            name="Aisha",
            email="aisha@example.com",
            circularity_score=74,
            impact_points=420,
            streak_days=5,
            preferences=UserPreferences(),
            trend_delta=6,
        )
        self.completed_action_ids: set[UUID] = set()
        self.products = deepcopy(PRODUCTS)
        self.recommendations = deepcopy(BASE_RECOMMENDATIONS)

    def reset(self) -> None:
        self.__init__()


demo_state = DemoState()


def get_product(product_id: UUID) -> Product | None:
    return demo_state.products.get(product_id)


def get_product_by_barcode(barcode: str) -> Product | None:
    pid = BARCODE_INDEX.get(barcode.strip())
    if not pid:
        return None
    return demo_state.products.get(pid)
