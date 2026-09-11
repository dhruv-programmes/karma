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
TV_ID = UUID("22222222-2222-2222-2222-222222222209")
TEE_ID = UUID("22222222-2222-2222-2222-222222222210")
CHAIR_ID = UUID("22222222-2222-2222-2222-222222222211")
POWERBANK_ID = UUID("22222222-2222-2222-2222-222222222212")
BOTTLE_ID = UUID("22222222-2222-2222-2222-222222222213")
KETTLE_ID = UUID("22222222-2222-2222-2222-222222222214")
AC_REMOTE_ID = UUID("22222222-2222-2222-2222-222222222215")
TOASTER_ID = UUID("22222222-2222-2222-2222-222222222216")

# Demo barcode for hero scan — maps to smartphone
DEMO_PHONE_BARCODE = "8901030865822"


def _attrs(**kwargs: float | bool) -> dict:
    return kwargs

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
    TV_ID: Product(
        id=TV_ID,
        barcode="8901234500987",
        name="Smart LED TV 43-inch",
        brand="Samsung",
        category=ProductCategory.ELECTRONICS,
        image_url="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400",
        estimated_co2e_kg=190,
        circularity_score=70,
        circularity_breakdown=CircularityBreakdown(
            repairability=72, longevity=78, recyclability=68, reuse_potential=70, circular_options=72
        ),
        repairability=72,
        expected_remaining_life_months=36,
        attributes=_attrs(
            replacement_cost_inr=42000,
            repair_cost_inr=5500,
            resale_value_inr=12000,
            refurb_cost_inr=22000,
            co2e_avoided_repair_kg=140,
            co2e_avoided_refurb_kg=100,
            co2e_avoided_resell_kg=70,
            co2e_avoided_donate_kg=55,
            co2e_avoided_recycle_kg=30,
        ),
    ),
    TEE_ID: Product(
        id=TEE_ID,
        barcode="8907555098765",
        name="Organic Cotton Tee",
        brand="Levi's",
        category=ProductCategory.CLOTHING,
        image_url="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
        estimated_co2e_kg=7,
        circularity_score=68,
        circularity_breakdown=CircularityBreakdown(
            repairability=55, longevity=60, recyclability=50, reuse_potential=85, circular_options=72
        ),
        repairability=55,
        expected_remaining_life_months=12,
        attributes=_attrs(
            replacement_cost_inr=1800,
            repair_cost_inr=200,
            resale_value_inr=400,
            refurb_cost_inr=600,
            co2e_avoided_repair_kg=5,
            co2e_avoided_refurb_kg=3,
            co2e_avoided_resell_kg=4,
            co2e_avoided_donate_kg=5,
            co2e_avoided_recycle_kg=2,
        ),
    ),
    CHAIR_ID: Product(
        id=CHAIR_ID,
        barcode="8909988776655",
        name="Ergo Office Chair",
        brand="Featherlite",
        category=ProductCategory.FURNITURE,
        image_url="https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
        estimated_co2e_kg=55,
        circularity_score=73,
        circularity_breakdown=CircularityBreakdown(
            repairability=80, longevity=85, recyclability=55, reuse_potential=78, circular_options=74
        ),
        repairability=80,
        expected_remaining_life_months=48,
        attributes=_attrs(
            replacement_cost_inr=12000,
            repair_cost_inr=1500,
            resale_value_inr=3500,
            refurb_cost_inr=5000,
            co2e_avoided_repair_kg=42,
            co2e_avoided_refurb_kg=30,
            co2e_avoided_resell_kg=28,
            co2e_avoided_donate_kg=25,
            co2e_avoided_recycle_kg=12,
        ),
    ),
    POWERBANK_ID: Product(
        id=POWERBANK_ID,
        barcode="8806090987654",
        name="20,000 mAh Power Bank",
        brand="Mi",
        category=ProductCategory.ELECTRONICS,
        image_url="https://images.unsplash.com/photo-1609091839311-b9b0e2c3b2e0?w=400",
        estimated_co2e_kg=12,
        circularity_score=54,
        circularity_breakdown=CircularityBreakdown(
            repairability=35, longevity=45, recyclability=70, reuse_potential=50, circular_options=60
        ),
        repairability=35,
        expected_remaining_life_months=10,
        attributes=_attrs(
            replacement_cost_inr=2500,
            repair_cost_inr=800,
            resale_value_inr=600,
            refurb_cost_inr=1200,
            co2e_avoided_repair_kg=6,
            co2e_avoided_refurb_kg=4,
            co2e_avoided_resell_kg=3,
            co2e_avoided_donate_kg=3,
            co2e_avoided_recycle_kg=5,
        ),
    ),
    BOTTLE_ID: Product(
        id=BOTTLE_ID,
        barcode="8901491199999",
        name="6-Pack PET Water Bottles",
        brand="Bisleri",
        category=ProductCategory.OTHER,
        image_url="https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400",
        estimated_co2e_kg=0.8,
        circularity_score=38,
        circularity_breakdown=CircularityBreakdown(
            repairability=0, longevity=5, recyclability=80, reuse_potential=15, circular_options=40
        ),
        repairability=0,
        expected_remaining_life_months=0,
        attributes=_attrs(
            replacement_cost_inr=90,
            repair_cost_inr=0,
            resale_value_inr=0,
            refurb_cost_inr=0,
            co2e_avoided_repair_kg=0,
            co2e_avoided_refurb_kg=0,
            co2e_avoided_resell_kg=0,
            co2e_avoided_donate_kg=0.1,
            co2e_avoided_recycle_kg=0.4,
            prefer_reduce=True,
        ),
    ),
    KETTLE_ID: Product(
        id=KETTLE_ID,
        barcode="8901058899001",
        name="Electric Kettle 1.5L",
        brand="Philips",
        category=ProductCategory.HOME,
        image_url="https://images.unsplash.com/photo-1570824104453-508995ee1836?w=400",
        estimated_co2e_kg=16,
        circularity_score=67,
        circularity_breakdown=CircularityBreakdown(
            repairability=65, longevity=70, recyclability=62, reuse_potential=68, circular_options=70
        ),
        repairability=65,
        expected_remaining_life_months=20,
        attributes=_attrs(
            replacement_cost_inr=2200,
            repair_cost_inr=450,
            resale_value_inr=500,
            refurb_cost_inr=900,
            co2e_avoided_repair_kg=12,
            co2e_avoided_refurb_kg=8,
            co2e_avoided_resell_kg=6,
            co2e_avoided_donate_kg=5,
            co2e_avoided_recycle_kg=4,
        ),
    ),
    AC_REMOTE_ID: Product(
        id=AC_REMOTE_ID,
        barcode="8901122334455",
        name="Split AC Remote + PCB kit",
        brand="Voltas",
        category=ProductCategory.HOME,
        image_url="https://images.unsplash.com/photo-1631545806609-5f64c8e0f0f0?w=400",
        estimated_co2e_kg=3,
        circularity_score=61,
        circularity_breakdown=CircularityBreakdown(
            repairability=75, longevity=50, recyclability=55, reuse_potential=40, circular_options=65
        ),
        repairability=75,
        expected_remaining_life_months=18,
        attributes=_attrs(
            replacement_cost_inr=1800,
            repair_cost_inr=350,
            resale_value_inr=200,
            refurb_cost_inr=700,
            co2e_avoided_repair_kg=8,
            co2e_avoided_refurb_kg=4,
            co2e_avoided_resell_kg=2,
            co2e_avoided_donate_kg=1,
            co2e_avoided_recycle_kg=1.5,
        ),
    ),
    TOASTER_ID: Product(
        id=TOASTER_ID,
        barcode="8901058877002",
        name="2-Slice Pop-up Toaster",
        brand="Bajaj",
        category=ProductCategory.HOME,
        image_url="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400",
        estimated_co2e_kg=11,
        circularity_score=64,
        circularity_breakdown=CircularityBreakdown(
            repairability=60, longevity=68, recyclability=58, reuse_potential=62, circular_options=66
        ),
        repairability=60,
        expected_remaining_life_months=22,
        attributes=_attrs(
            replacement_cost_inr=1600,
            repair_cost_inr=300,
            resale_value_inr=350,
            refurb_cost_inr=700,
            co2e_avoided_repair_kg=9,
            co2e_avoided_refurb_kg=6,
            co2e_avoided_resell_kg=4,
            co2e_avoided_donate_kg=4,
            co2e_avoided_recycle_kg=3,
        ),
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
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333307"),
        name="Jayanagar Cobbler Collective",
        facility_type="repair",
        lat=12.9308,
        lng=77.5838,
        supported_categories=[ProductCategory.CLOTHING],
        open_now=True,
        verification_status="Verified",
        address="4th Block, Jayanagar, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333308"),
        name="Appliance Fix Hub — JP Nagar",
        facility_type="repair",
        lat=12.9063,
        lng=77.5857,
        supported_categories=[ProductCategory.HOME, ProductCategory.ELECTRONICS],
        open_now=True,
        verification_status="Verified",
        address="15th Cross, JP Nagar, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333309"),
        name="Plastic Recycle Point — Malleshwaram",
        facility_type="recycling",
        lat=13.0035,
        lng=77.5648,
        supported_categories=[ProductCategory.OTHER, ProductCategory.FOOD],
        open_now=True,
        verification_status="Verified",
        address="Sampige Rd, Malleshwaram, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333310"),
        name="Furniture Refresh Studio",
        facility_type="repair",
        lat=12.9889,
        lng=77.5741,
        supported_categories=[ProductCategory.FURNITURE],
        open_now=False,
        verification_status="Unverified",
        address="Rajajinagar, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333311"),
        name="Freecycle Bengaluru Drop",
        facility_type="donation",
        lat=12.9141,
        lng=77.6387,
        supported_categories=[
            ProductCategory.CLOTHING,
            ProductCategory.HOME,
            ProductCategory.FURNITURE,
            ProductCategory.OTHER,
        ],
        open_now=True,
        verification_status="Verified",
        address="BTM Layout, Bengaluru",
    ),
    Facility(
        id=UUID("33333333-3333-3333-3333-333333333312"),
        name="ReSale Electronics Kiosk",
        facility_type="resale",
        lat=12.9719,
        lng=77.6412,
        supported_categories=[ProductCategory.ELECTRONICS, ProductCategory.HOME],
        open_now=True,
        verification_status="Verified",
        address="Indiranagar Metro, Bengaluru",
    ),
]

TRANSACTIONS: list[Transaction] = [
    Transaction(id=UUID("44444444-4444-4444-4444-444444444401"), date="2026-02-03", merchant="Swiggy", amount_inr=380, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444402"), date="2026-02-05", merchant="Uber", amount_inr=240, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444403"), date="2026-02-08", merchant="Flipkart", amount_inr=3200, category=ProductCategory.ELECTRONICS),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444404"), date="2026-02-12", merchant="BESCOM", amount_inr=1850, category=ProductCategory.ENERGY),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444405"), date="2026-02-14", merchant="Blinkit", amount_inr=620, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444406"), date="2026-02-18", merchant="Rapido", amount_inr=110, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444407"), date="2026-02-22", merchant="Amazon", amount_inr=1499, category=ProductCategory.OTHER),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444408"), date="2026-02-26", merchant="Zomato", amount_inr=490, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444409"), date="2026-03-02", merchant="Swiggy", amount_inr=420, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444410"), date="2026-03-04", merchant="Uber", amount_inr=280, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444411"), date="2026-03-06", merchant="Croma", amount_inr=2499, category=ProductCategory.ELECTRONICS),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444412"), date="2026-03-07", merchant="Reliance Digital", amount_inr=8999, category=ProductCategory.ELECTRONICS),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444413"), date="2026-03-08", merchant="Amazon", amount_inr=1899, category=ProductCategory.OTHER),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444414"), date="2026-03-09", merchant="BESCOM", amount_inr=2100, category=ProductCategory.ENERGY),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444415"), date="2026-03-10", merchant="Zomato", amount_inr=560, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444416"), date="2026-03-11", merchant="Rapido", amount_inr=95, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444417"), date="2026-03-11", merchant="BigBasket", amount_inr=1450, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444418"), date="2026-03-12", merchant="Uber", amount_inr=340, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444419"), date="2026-03-14", merchant="Blinkit", amount_inr=780, category=ProductCategory.FOOD),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444420"), date="2026-03-15", merchant="Myntra", amount_inr=2200, category=ProductCategory.CLOTHING),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444421"), date="2026-03-16", merchant="Metro Card Topup", amount_inr=200, category=ProductCategory.TRANSPORT),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444422"), date="2026-03-18", merchant="IKEA", amount_inr=4500, category=ProductCategory.FURNITURE),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444423"), date="2026-03-20", merchant="Nykaa", amount_inr=890, category=ProductCategory.PERSONAL_CARE),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444424"), date="2026-03-22", merchant="BESCOM", amount_inr=2400, category=ProductCategory.ENERGY),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444425"), date="2026-03-24", merchant="Flipkart", amount_inr=1299, category=ProductCategory.HOME),
    Transaction(id=UUID("44444444-4444-4444-4444-444444444426"), date="2026-03-26", merchant="Swiggy", amount_inr=510, category=ProductCategory.FOOD),
]

REWARDS: list[Reward] = [
    Reward(id=UUID("55555555-5555-5555-5555-555555555501"), title="₹200 repair voucher", description="Mock partner voucher for verified phone repair.", points_required=300, brand="Indiranagar Device Care", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555502"), title="Refurbished accessory discount", description="Demo brand reward — not a real endorsement.", points_required=500, brand="Cashify (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555503"), title="Eco packaging credit", description="Demo brand channel reward for completing a circular action.", points_required=250, brand="GreenCart (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555504"), title="Secondhand fashion credit", description="Mock reward for resale/donation completion.", points_required=350, brand="ReWear Hub (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555505"), title="Samsung Care+ day pass", description="Demo brand perk for circular electronics actions.", points_required=400, brand="Samsung (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555506"), title="Levi's repair denim credit", description="Mock brand reward for clothing repair/donate.", points_required=280, brand="Levi's (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555507"), title="Philips appliance service coupon", description="Demo voucher after home appliance repair.", points_required=320, brand="Philips (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555508"), title="Wildcraft gear refresh", description="Mock outdoor brand credit for backpack repair.", points_required=200, brand="Wildcraft (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555509"), title="e-Waste drop bonus", description="Demo reward for verified recycling check-in.", points_required=150, brand="Saahas (demo)", is_mock=True),
    Reward(id=UUID("55555555-5555-5555-5555-555555555510"), title="Metro week pass nudge", description="Demo transport-reduce perk.", points_required=180, brand="BMTC/Namma Metro (demo)", is_mock=True),
]

OFFSETS: list[OffsetProject] = [
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777701"), name="Mangrove restoration — Sundarbans", provider="EcoVerified Demo", co2e_kg=100, price_inr=450, verification_status="Verified", geography="IN", description="Community mangrove project. Demo listing only.", methodology="community-mangrove-v1"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777702"), name="Rural biogas clusters", provider="ClimateLink Demo", co2e_kg=250, price_inr=980, verification_status="Verified", geography="IN", description="Household biogas displacing firewood. Demo listing only.", methodology="biogas-cluster-v1"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777703"), name="Urban tree pledge", provider="Local NGO", co2e_kg=40, price_inr=199, verification_status="Unverified", geography="IN-KA", description="Unverified local pledge — shown for transparency.", methodology="local-pledge"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777704"), name="Solar for rural schools", provider="SunShare Demo", co2e_kg=180, price_inr=720, verification_status="Verified", geography="IN", description="Rooftop solar displacing diesel gensets. Demo only.", methodology="solar-school-v1"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777705"), name="Cookstove upgrade program", provider="CleanCook Demo", co2e_kg=90, price_inr=380, verification_status="Verified", geography="IN", description="Improved cookstoves reducing black carbon. Demo only.", methodology="cookstove-v1"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777706"), name="City park carbon pledge", provider="GreenBengaluru", co2e_kg=25, price_inr=149, verification_status="Unverified", geography="IN-KA", description="Unverified municipal pledge for demo contrast.", methodology="city-pledge"),
]

BASE_RECOMMENDATIONS: list[Recommendation] = [
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666601"), category=ProductCategory.ELECTRONICS, action_type=ActionType.REPAIR, title="Repair your old phone", subtitle="Extend lifetime instead of buying new", co2e_avoided_kg=120, money_impact_inr=18000, effort=EffortLevel.LOW, local_availability="2 repair options nearby", product_id=PHONE_ID, explanation="Repairable device you already own — cheaper than replacement with significant CO₂e avoided.", score=92),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666602"), category=ProductCategory.CLOTHING, action_type=ActionType.RESELL, title="Resell unused jeans", subtitle="Keep fabric in circulation", co2e_avoided_kg=22, money_impact_inr=1200, effort=EffortLevel.LOW, local_availability="Resale platforms available", product_id=JEANS_ID, explanation="Good reuse potential; resale recovers value and avoids new cotton demand.", score=78),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666603"), category=ProductCategory.ELECTRONICS, action_type=ActionType.RECYCLE, title="Recycle old headphones", subtitle="Verified e-waste drop nearby", co2e_avoided_kg=6, money_impact_inr=0, effort=EffortLevel.MEDIUM, local_availability="1.8 km to recycling hub", product_id=HEADPHONES_ID, explanation="Battery and plastics need proper e-waste handling.", score=64),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666604"), category=ProductCategory.TRANSPORT, action_type=ActionType.REDUCE, title="Cut repeat short Uber trips", subtitle="Shift 2 weekly rides to metro/walk", co2e_avoided_kg=18, money_impact_inr=1600, effort=EffortLevel.MEDIUM, local_availability="Based on your recent transport spend", product_id=None, explanation="Transport is a measurable monthly hotspot in your imports.", score=71),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666605"), category=ProductCategory.CLOTHING, action_type=ActionType.DONATE, title="Donate jeans you rarely wear", subtitle="Verified donation drop in HSR", co2e_avoided_kg=20, money_impact_inr=0, effort=EffortLevel.LOW, local_availability="Goonj Collection Point nearby", product_id=JEANS_ID, explanation="Donation keeps textiles in use when resale value is low.", score=76),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666606"), category=ProductCategory.ENERGY, action_type=ActionType.REDUCE, title="Offset your energy spike month", subtitle="Verified projects cover ~100 kg", co2e_avoided_kg=100, money_impact_inr=-450, effort=EffortLevel.LOW, local_availability="In-app verified offsets", product_id=None, explanation="BESCOM spend spiked — pair efficiency tips with a verified offset.", score=80),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666607"), category=ProductCategory.HOME, action_type=ActionType.REPAIR, title="Repair mixer grinder motor", subtitle="Cheaper than a new appliance", co2e_avoided_kg=38, money_impact_inr=4200, effort=EffortLevel.MEDIUM, local_availability="Appliance Fix Hub nearby", product_id=APPLIANCE_ID, explanation="High repairability home appliance with strong CO₂e avoidance.", score=85),
    Recommendation(id=UUID("66666666-6666-6666-6666-666666666608"), category=ProductCategory.OTHER, action_type=ActionType.RECYCLE, title="Drop PET bottles at plastic hub", subtitle="Malleshwaram recycle point", co2e_avoided_kg=0.4, money_impact_inr=0, effort=EffortLevel.LOW, local_availability="Verified plastic recycle point", product_id=BOTTLE_ID, explanation="Better than landfill — still prefer reduce next shop.", score=58),
]

BADGE_CATALOG: list[dict] = [
    {"id": "first_repair", "title": "First Repair", "description": "Completed your first repair action", "icon": "wrench"},
    {"id": "e_waste_hero", "title": "e-Waste Hero", "description": "Recycled electronics responsibly", "icon": "recycle"},
    {"id": "streak_7", "title": "Week Streak", "description": "Kept a 7-day circular streak", "icon": "flame"},
    {"id": "offset_starter", "title": "Offset Starter", "description": "Bought your first demo offset", "icon": "leaf"},
    {"id": "receipt_ranger", "title": "Receipt Ranger", "description": "Parsed a receipt into footprint data", "icon": "receipt"},
    {"id": "brand_claimer", "title": "Brand Claimer", "description": "Redeemed a partner reward", "icon": "gift"},
]

OWNED_PRODUCT_IDS = [PHONE_ID, JEANS_ID, HEADPHONES_ID, APPLIANCE_ID]

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
    "myntra": ProductCategory.CLOTHING,
    "ikea": ProductCategory.FURNITURE,
    "nykaa": ProductCategory.PERSONAL_CARE,
    "metro": ProductCategory.TRANSPORT,
}

DEMO_RECEIPT_TEXT = """
CROMA ELECTRONICS
Wireless earbuds cable   899.00
PHILIPS kettle spare     450.00
---
SWIGGY FOOD
Dinner bowl              320.00
UBER TRIP
Indiranagar → Koramangala 180.00
"""


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
            loop_level=1,
            offset_kg_total=0.0,
            owned_product_ids=list(OWNED_PRODUCT_IDS),
            unlocked_badge_ids=[],
        )
        self.completed_action_ids: set[UUID] = set()
        self.redeemed_reward_ids: set[UUID] = set()
        self.purchased_offset_ids: list[UUID] = []
        self.redeem_ledger: list[dict] = []
        self.products = deepcopy(PRODUCTS)
        self.recommendations = deepcopy(BASE_RECOMMENDATIONS)
        self.transactions = deepcopy(TRANSACTIONS)

    def reset(self) -> None:
        self.__init__()

    def sync_level(self) -> None:
        self.user.loop_level = max(1, self.user.impact_points // 250 + 1)


demo_state = DemoState()
demo_state.sync_level()


def get_product(product_id: UUID) -> Product | None:
    return demo_state.products.get(product_id)


def get_product_by_barcode(barcode: str) -> Product | None:
    pid = BARCODE_INDEX.get(barcode.strip())
    if not pid:
        return None
    return demo_state.products.get(pid)


def unlock_badge(badge_id: str) -> bool:
    if badge_id in demo_state.user.unlocked_badge_ids:
        return False
    known = {b["id"] for b in BADGE_CATALOG}
    if badge_id not in known:
        return False
    demo_state.user.unlocked_badge_ids.append(badge_id)
    return True


def list_badges() -> list[dict]:
    unlocked = set(demo_state.user.unlocked_badge_ids)
    return [{**b, "unlocked": b["id"] in unlocked} for b in BADGE_CATALOG]
