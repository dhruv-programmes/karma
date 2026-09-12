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
        image_url="https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1525547719571-a2d4acaf0b43?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1622560480605-d83b829acbf8?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1621939514649-b07e4f0d0b6c?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1609091839311-b9b0e2c3b2e0?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80&fit=crop",
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
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1532996122724-e3c354a0b4ba?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1611284446314-60a58ac0deb8?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1611284446314-60a58ac0deb8?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80&fit=crop",
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
        cover_image_url="https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800&q=80&fit=crop",
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
    Reward(id=UUID("55555555-5555-5555-5555-555555555501"), title="₹200 repair voucher", description="Mock partner voucher for verified phone repair.", points_required=300, brand="Indiranagar Device Care", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555502"), title="Refurbished accessory discount", description="Demo brand reward — not a real endorsement.", points_required=500, brand="Cashify (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555503"), title="Eco packaging credit", description="Demo brand channel reward for completing a circular action.", points_required=250, brand="GreenCart (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555504"), title="Secondhand fashion credit", description="Mock reward for resale/donation completion.", points_required=350, brand="ReWear Hub (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555505"), title="Samsung Care+ day pass", description="Demo brand perk for circular electronics actions.", points_required=400, brand="Samsung (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555506"), title="Levi's repair denim credit", description="Mock brand reward for clothing repair/donate.", points_required=280, brand="Levi's (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555507"), title="Philips appliance service coupon", description="Demo voucher after home appliance repair.", points_required=320, brand="Philips (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555508"), title="Wildcraft gear refresh", description="Mock outdoor brand credit for backpack repair.", points_required=200, brand="Wildcraft (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555509"), title="e-Waste drop bonus", description="Demo reward for verified recycling check-in.", points_required=150, brand="Saahas (demo)", is_mock=True, expires_on="2026-06-30"),
    Reward(id=UUID("55555555-5555-5555-5555-555555555510"), title="Metro week pass nudge", description="Demo transport-reduce perk.", points_required=180, brand="BMTC/Namma Metro (demo)", is_mock=True, expires_on="2026-06-30"),
]

# The mobile offers screen also contains the government and partner catalog.
# Keep those offers server-backed so a redemption is a real wallet mutation
# (and appears in the points ledger) rather than a local-only preview.  These
# IDs are deterministic because existing local SQLite databases need to be
# safely backfilled when the app starts again.
COUPON_REWARD_IDS: dict[str, UUID] = {
    "govt-solar": UUID("55555555-5555-5555-5555-555555555601"),
    "govt-ev-charge": UUID("55555555-5555-5555-5555-555555555602"),
    "govt-compost": UUID("55555555-5555-5555-5555-555555555603"),
    "govt-metro": UUID("55555555-5555-5555-5555-555555555604"),
    "eco-patagonia": UUID("55555555-5555-5555-5555-555555555605"),
    "eco-allbirds": UUID("55555555-5555-5555-5555-555555555606"),
    "eco-zerowaste": UUID("55555555-5555-5555-5555-555555555607"),
    "eco-blueland": UUID("55555555-5555-5555-5555-555555555608"),
    "eco-ecovessel": UUID("55555555-5555-5555-5555-555555555609"),
    "partner-relove": UUID("55555555-5555-5555-5555-555555555610"),
    "partner-repair": UUID("55555555-5555-5555-5555-555555555611"),
    "partner-organic": UUID("55555555-5555-5555-5555-555555555612"),
    "partner-bike": UUID("55555555-5555-5555-5555-555555555613"),
}

# Listed prices intentionally match the normalized pricing tiers used by
# services.effective_reward_cost.  This keeps the amount shown on the offers
# page identical to the amount deducted by the API.
COUPON_REWARDS: list[Reward] = [
    Reward(id=COUPON_REWARD_IDS["govt-solar"], title="National Rooftop Solar Subsidy", description="Government rebate voucher for an empanelled residential rooftop solar installation.", points_required=400, brand="Ministry of New & Renewable Energy", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["govt-ev-charge"], title="Public EV Fast-Charging Credits", description="Complimentary EV fast charging credits at municipal chargers and highway stations.", points_required=180, brand="Bureau of Energy Efficiency", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["govt-compost"], title="Home Aeration Composter Kit", description="Municipal home composting kit with bio-enzyme starter cultures.", points_required=140, brand="Clean City Municipal Action", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["govt-metro"], title="Green Transit Smart Pass", description="Digital pass with free rides on electrified metro and feeder-bus routes.", points_required=250, brand="State Metro Rail Corporation", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["eco-patagonia"], title="Garment Care & Recycled Outerwear", description="Circular repair and recycled-gear partner discount.", points_required=350, brand="Patagonia Worn Wear", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["eco-allbirds"], title="SweetFoam & Merino Wool Shoes", description="Sustainable footwear partner voucher.", points_required=250, brand="Allbirds Eco Footwear", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["eco-zerowaste"], title="Package-Free Pantry & Body Care", description="Package-free refill and body-care partner voucher.", points_required=120, brand="Bare Necessities Zero Waste", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["eco-blueland"], title="Plastic-Free Cleaning Starter Kit", description="Plastic-free cleaning starter-kit partner voucher.", points_required=150, brand="Blueland Clean Tech", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["eco-ecovessel"], title="Triple-Insulated Stainless Bottles", description="Reusable thermal bottle partner voucher.", points_required=130, brand="EcoVessel Thermal Gear", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["partner-relove"], title="Authenticated Vintage & Pre-Owned", description="Pre-owned style partner voucher.", points_required=350, brand="Relove Thrift Collective", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["partner-repair"], title="Electronics & Leather Restoration", description="Certified repair partner credit.", points_required=300, brand="Local Master Repair Network", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["partner-organic"], title="Farm-to-Door Pesticide-Free CSA", description="Regenerative organic farm partner voucher.", points_required=130, brand="First Harvest Organic Farms", is_mock=True, expires_on="2026-12-31"),
    Reward(id=COUPON_REWARD_IDS["partner-bike"], title="Complete Bicycle Overhaul & Safety Tune", description="Zero-emission commute bicycle tune-up voucher.", points_required=350, brand="City Cycle Works", is_mock=True, expires_on="2026-12-31"),
]

OFFSETS: list[OffsetProject] = [
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777701"), name="Mangrove restoration — Sundarbans", provider="EcoVerified Demo", co2e_kg=100, price_inr=450, verification_status="Verified", geography="IN", description="Community mangrove project. Demo listing only.", methodology="community-mangrove-v1", cover_image_url="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80&fit=crop"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777702"), name="Rural biogas clusters", provider="ClimateLink Demo", co2e_kg=250, price_inr=980, verification_status="Verified", geography="IN", description="Household biogas displacing firewood. Demo listing only.", methodology="biogas-cluster-v1", cover_image_url="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80&fit=crop"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777703"), name="Urban tree pledge", provider="Local NGO", co2e_kg=40, price_inr=199, verification_status="Unverified", geography="IN-KA", description="Unverified local pledge — shown for transparency.", methodology="local-pledge", cover_image_url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&fit=crop"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777704"), name="Solar for rural schools", provider="SunShare Demo", co2e_kg=180, price_inr=720, verification_status="Verified", geography="IN", description="Rooftop solar displacing diesel gensets. Demo only.", methodology="solar-school-v1", cover_image_url="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80&fit=crop"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777705"), name="Cookstove upgrade program", provider="CleanCook Demo", co2e_kg=90, price_inr=380, verification_status="Verified", geography="IN", description="Improved cookstoves reducing black carbon. Demo only.", methodology="cookstove-v1", cover_image_url="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80&fit=crop"),
    OffsetProject(id=UUID("77777777-7777-7777-7777-777777777706"), name="City park carbon pledge", provider="GreenBengaluru", co2e_kg=25, price_inr=149, verification_status="Unverified", geography="IN-KA", description="Unverified municipal pledge for demo contrast.", methodology="city-pledge", cover_image_url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&fit=crop"),
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

# Seeded document-upload examples (OCR→LLM demo; real Vision/LLM later).
# Future pipeline: Upload image|pdf → OCR / PDF text → LLM JSON → confidence split → review → import.
DOCUMENT_EXAMPLES: list[dict] = [
    {
        "id": "doc-croma-receipt",
        "title": "Croma electronics receipt",
        "subtitle": "Earbuds + kettle spare",
        "doc_type": "receipt",
        "source": "image",
        "pipeline_steps": [
            "Reading document (OCR)…",
            "Extracting line items with AI…",
            "Matching merchants to footprint categories…",
        ],
        "ocr_text": """CROMA ELECTRONICS
Store: Indiranagar
Date: 10-09-2026
Wireless earbuds cable    899.00
Philips kettle spare      450.00
TOTAL                    1349.00""",
        "extracted_items": [
            {
                "id": "croma-1",
                "merchant": "Croma",
                "amount_inr": 899.0,
                "date": "2026-09-10",
                "category": ProductCategory.ELECTRONICS,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "croma-2",
                "merchant": "Croma",
                "amount_inr": 450.0,
                "date": "2026-09-10",
                "category": ProductCategory.ELECTRONICS,
                "confidence": "high",
                "needs_review_reason": None,
            },
        ],
    },
    {
        "id": "doc-swiggy-order",
        "title": "Swiggy food order",
        "subtitle": "Dinner delivery",
        "doc_type": "receipt",
        "source": "image",
        "pipeline_steps": [
            "Reading document (OCR)…",
            "Extracting line items with AI…",
            "Matching merchants to footprint categories…",
        ],
        "ocr_text": """SWIGGY
Order #SW-48291
Dinner bowl               320.00
Delivery fee               40.00
TOTAL                     360.00""",
        "extracted_items": [
            {
                "id": "swiggy-1",
                "merchant": "Swiggy",
                "amount_inr": 360.0,
                "date": "2026-09-11",
                "category": ProductCategory.FOOD,
                "confidence": "high",
                "needs_review_reason": None,
            },
        ],
    },
    {
        "id": "doc-bescom-bill",
        "title": "BESCOM electricity bill",
        "subtitle": "Home energy bill",
        "doc_type": "utility",
        "source": "pdf",
        "pipeline_steps": [
            "Extracting PDF text…",
            "Running OCR on scanned pages…",
            "Extracting charges with AI…",
        ],
        "ocr_text": """BESCOM
Account: ********4521
Billing period: Aug 2026
Energy charges           1850.00
Fixed charges             120.00
Fuel adjustment surcharge  95.??
TOTAL DUE               ~2065""",
        "extracted_items": [
            {
                "id": "bescom-1",
                "merchant": "BESCOM",
                "amount_inr": 1850.0,
                "date": "2026-09-01",
                "category": ProductCategory.ENERGY,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "bescom-2",
                "merchant": "BESCOM",
                "amount_inr": 120.0,
                "date": "2026-09-01",
                "category": ProductCategory.ENERGY,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "bescom-3",
                "merchant": "BESCOM",
                "amount_inr": 95.0,
                "date": "2026-09-01",
                "category": ProductCategory.ENERGY,
                "confidence": "medium",
                "needs_review_reason": "Fuel surcharge amount was partially illegible on the scan",
            },
        ],
    },
    {
        "id": "doc-uber-pdf",
        "title": "Uber trips summary",
        "subtitle": "Weekly ride summary",
        "doc_type": "receipt",
        "source": "pdf",
        "pipeline_steps": [
            "Extracting PDF text…",
            "Extracting trips with AI…",
            "Matching merchants to footprint categories…",
        ],
        "ocr_text": """UBER TRIP SUMMARY
Week of 01 Sep 2026
Indiranagar → Koramangala   180.00
HSR → Whitefield            340.00
Airport drop                620.00
TOTAL                      1140.00""",
        "extracted_items": [
            {
                "id": "uber-1",
                "merchant": "Uber",
                "amount_inr": 180.0,
                "date": "2026-09-02",
                "category": ProductCategory.TRANSPORT,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "uber-2",
                "merchant": "Uber",
                "amount_inr": 340.0,
                "date": "2026-09-04",
                "category": ProductCategory.TRANSPORT,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "uber-3",
                "merchant": "Uber",
                "amount_inr": 620.0,
                "date": "2026-09-07",
                "category": ProductCategory.TRANSPORT,
                "confidence": "high",
                "needs_review_reason": None,
            },
        ],
    },
    {
        "id": "doc-flipkart-invoice",
        "title": "Flipkart shopping invoice",
        "subtitle": "Mixed shopping cart",
        "doc_type": "invoice",
        "source": "pdf",
        "pipeline_steps": [
            "Extracting PDF text…",
            "Extracting line items with AI…",
            "Resolving ambiguous categories…",
        ],
        "ocr_text": """FLIPKART INVOICE
Order FK-991203
USB-C hub                 1299.00
Cotton tee pack            899.00
MISC SKU#X9-??             450.00
TOTAL                     2648.00""",
        "extracted_items": [
            {
                "id": "fk-1",
                "merchant": "Flipkart",
                "amount_inr": 1299.0,
                "date": "2026-09-08",
                "category": ProductCategory.ELECTRONICS,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "fk-2",
                "merchant": "Flipkart",
                "amount_inr": 899.0,
                "date": "2026-09-08",
                "category": ProductCategory.CLOTHING,
                "confidence": "high",
                "needs_review_reason": None,
            },
            {
                "id": "fk-3",
                "merchant": "Flipkart",
                "amount_inr": 450.0,
                "date": "2026-09-08",
                "category": ProductCategory.OTHER,
                "confidence": "low",
                "needs_review_reason": "SKU label unreadable — category uncertain",
            },
        ],
    },
]


def get_document_example(example_id: str) -> dict | None:
    for ex in DOCUMENT_EXAMPLES:
        if ex["id"] == example_id:
            return ex
    return None


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
            monthly_budget_kg=90.0,
            provisional_score=767,
            verified_score=767,
            score_state="verified",
            score_confidence=1.0,
        )
        self.completed_action_ids: set[UUID] = set()
        self.redeemed_reward_ids: set[UUID] = set()
        self.purchased_offset_ids: list[UUID] = []
        self.redeem_ledger: list[dict] = []
        self.products = deepcopy(PRODUCTS)
        self.recommendations = deepcopy(BASE_RECOMMENDATIONS)
        self.transactions = deepcopy(TRANSACTIONS)
        hints = {
            PHONE_ID: ("Scanned last week", "Repair nearby"),
            JEANS_ID: ("In closet", "Donate or resell"),
            HEADPHONES_ID: ("Battery degrading", "Recycle e-waste"),
            APPLIANCE_ID: ("Motor noise noted", "Book repair"),
        }
        for pid, (last, nxt) in hints.items():
            if pid in self.products:
                self.products[pid] = self.products[pid].model_copy(
                    update={"last_action_label": last, "next_action_label": nxt}
                )
        self.activity_events: list[dict] = [
            {
                "id": "act-seed-1",
                "kind": "scan",
                "title": "Scanned Galaxy phone",
                "subtitle": "Barcode matched · circularity 78",
                "points_delta": 0,
                "created_at": "2026-03-25T09:12:00",
                "meta": {},
            },
            {
                "id": "act-seed-2",
                "kind": "insight",
                "title": "Energy spike detected",
                "subtitle": "BESCOM bill pushed Energy into your top 3",
                "points_delta": 0,
                "created_at": "2026-03-22T18:40:00",
                "meta": {},
            },
            {
                "id": "act-seed-3",
                "kind": "streak",
                "title": "5-day streak",
                "subtitle": "Keep going — Week Streak unlocks at 7",
                "points_delta": 0,
                "created_at": "2026-03-26T08:00:00",
                "meta": {},
            },
        ]

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



def log_activity(kind: str, title: str, subtitle: str, points_delta: int = 0, meta: dict | None = None) -> dict:
    from datetime import datetime, timezone
    from uuid import uuid4

    event = {
        "id": str(uuid4()),
        "kind": kind,
        "title": title,
        "subtitle": subtitle,
        "points_delta": points_delta,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "meta": meta or {},
    }
    demo_state.activity_events.insert(0, event)
    return event


def list_badges() -> list[dict]:
    unlocked = set(demo_state.user.unlocked_badge_ids)
    return [{**b, "unlocked": b["id"] in unlocked} for b in BADGE_CATALOG]
