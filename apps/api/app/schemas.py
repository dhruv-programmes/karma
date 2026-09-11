from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ProductCategory(str, Enum):
    ELECTRONICS = "Electronics"
    CLOTHING = "Clothing"
    FOOD = "Food"
    TRANSPORT = "Transport"
    HOME = "Home"
    ENERGY = "Energy"
    FURNITURE = "Furniture"
    PERSONAL_CARE = "Personal care"
    OTHER = "Other"


class ActionType(str, Enum):
    REPAIR = "REPAIR"
    REFURBISH = "REFURBISH"
    RESELL = "RESELL"
    DONATE = "DONATE"
    RECYCLE = "RECYCLE"
    REPLACE = "REPLACE"
    REDUCE = "REDUCE"


class EffortLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CircularityBreakdown(BaseModel):
    repairability: int
    longevity: int
    recyclability: int
    reuse_potential: int
    circular_options: int


class Product(BaseModel):
    id: UUID
    barcode: str | None = None
    name: str
    brand: str
    category: ProductCategory
    image_url: str | None = None
    estimated_co2e_kg: float
    circularity_score: int
    circularity_breakdown: CircularityBreakdown
    repairability: int
    expected_remaining_life_months: int
    condition: str = "used"
    age_months: int = 24
    attributes: dict[str, Any] = Field(default_factory=dict)


class CarbonEstimate(BaseModel):
    estimated_co2e_kg: float
    display: str
    source: str
    factor: float
    unit: str
    geography: str
    methodology: str
    confidence: float
    timestamp: datetime


class CircularOption(BaseModel):
    action_type: ActionType
    title: str
    estimated_cost_inr: float
    estimated_co2e_impact_kg: float
    co2e_avoided_kg: float
    expected_lifetime_months: int | None = None
    money_return_inr: float | None = None
    convenience: float
    availability: str
    effort: EffortLevel
    explanation: str
    score: float
    next_action: str


class CircularOptionsResponse(BaseModel):
    product: Product
    options: list[CircularOption]
    best_option: CircularOption
    carbon: CarbonEstimate


class UserPreferences(BaseModel):
    budget_sensitivity: float = 0.7
    convenience_preference: float = 0.6
    eco_priority: float = 0.8
    city: str = "Bengaluru"


class Badge(BaseModel):
    id: str
    title: str
    description: str
    icon: str = "leaf"
    unlocked: bool = False


class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    circularity_score: int
    impact_points: int
    streak_days: int
    preferences: UserPreferences
    trend_delta: int = 6
    loop_level: int = 1
    offset_kg_total: float = 0.0
    owned_product_ids: list[UUID] = Field(default_factory=list)
    unlocked_badge_ids: list[str] = Field(default_factory=list)


class ImpactBreakdown(BaseModel):
    purchases_kg: float
    transport_kg: float
    energy_kg: float
    total_kg: float
    month_label: str
    biggest_opportunity: str
    insight: str
    offset_kg_total: float = 0.0
    residual_kg: float = 0.0
    by_category: dict[str, float] = Field(default_factory=dict)


class Recommendation(BaseModel):
    id: UUID
    category: ProductCategory
    action_type: ActionType
    title: str
    subtitle: str
    co2e_avoided_kg: float
    money_impact_inr: float
    effort: EffortLevel
    local_availability: str
    product_id: UUID | None = None
    explanation: str
    score: float


class Facility(BaseModel):
    id: UUID
    name: str
    facility_type: str
    lat: float
    lng: float
    distance_km: float | None = None
    supported_categories: list[ProductCategory]
    open_now: bool | None = None
    verification_status: str
    address: str


class Reward(BaseModel):
    id: UUID
    title: str
    description: str
    points_required: int
    brand: str | None = None
    is_mock: bool = True


class OffsetProject(BaseModel):
    id: UUID
    name: str
    provider: str
    co2e_kg: float
    price_inr: float
    verification_status: str
    geography: str
    description: str
    methodology: str = "demo-methodology-v1"


class CompletedActionResult(BaseModel):
    action_id: UUID
    points_awarded: int
    previous_score: int
    new_score: int
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)
    loop_level: int = 1


class RedeemResult(BaseModel):
    reward_id: UUID
    claim_code: str
    points_spent: int
    points_remaining: int
    message: str
    is_mock: bool = True


class OffsetPurchaseResult(BaseModel):
    offset_id: UUID
    co2e_kg: float
    price_inr: float
    offset_kg_total: float
    residual_kg: float
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)
    is_mock: bool = True


class ReceiptParseRequest(BaseModel):
    text: str | None = None
    use_demo: bool = True


class ReceiptParseResult(BaseModel):
    imported: int
    transactions: list[Transaction]
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)


class BarcodeLookupRequest(BaseModel):
    barcode: str


class Transaction(BaseModel):
    id: UUID
    date: str
    merchant: str
    amount_inr: float
    category: ProductCategory
    type: str = "debit"


class AskRequest(BaseModel):
    query: str
    product_id: UUID | None = None


class AskResponse(BaseModel):
    answer: str
    tools_used: list[str]
    data: dict[str, Any] = Field(default_factory=dict)
