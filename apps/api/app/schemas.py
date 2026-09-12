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
    last_action_label: str | None = None
    next_action_label: str | None = None


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
    monthly_budget_kg: float = 90.0
    # --- KCS provisional->verified (optional, backwards compatible) ---
    provisional_score: int | None = 650
    verified_score: int | None = None
    score_state: str = "provisional"
    score_confidence: float = 0.4
    baseline_total_kg: float | None = None
    baseline_created_at: str | None = None


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
    monthly_budget_kg: float = 90.0
    budget_used_pct: float = 0.0
    budget_status: str = "on_track"
    previous_month_kg: float = 0.0
    this_month_kg: float = 0.0


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
    cover_image_url: str | None = None


class Reward(BaseModel):
    id: UUID
    title: str
    description: str
    points_required: int
    brand: str | None = None
    is_mock: bool = True
    expires_on: str | None = None
    cover_image_url: str | None = None


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
    cover_image_url: str | None = None


class ActivityEvent(BaseModel):
    id: str
    kind: str
    title: str
    subtitle: str
    points_delta: int = 0
    created_at: str
    meta: dict[str, Any] = Field(default_factory=dict)


class TimeseriesPoint(BaseModel):
    label: str
    week_start: str
    kg: float


class ImpactTimeseries(BaseModel):
    points: list[TimeseriesPoint]
    purchases_kg: float
    transport_kg: float
    energy_kg: float
    this_month_kg: float
    previous_month_kg: float


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


class Transaction(BaseModel):
    id: UUID
    date: str
    merchant: str
    amount_inr: float
    category: ProductCategory
    type: str = "debit"


class ReceiptParseResult(BaseModel):
    imported: int
    transactions: list[Transaction]
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)


class ExtractionConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DocumentDocType(str, Enum):
    RECEIPT = "receipt"
    UTILITY = "utility"
    INVOICE = "invoice"


class DocumentSource(str, Enum):
    IMAGE = "image"
    PDF = "pdf"


class ExtractedDocumentItem(BaseModel):
    id: str
    merchant: str
    amount_inr: float
    date: str
    category: ProductCategory
    confidence: ExtractionConfidence
    needs_review_reason: str | None = None


class DocumentExampleSummary(BaseModel):
    id: str
    title: str
    subtitle: str
    doc_type: DocumentDocType
    source: DocumentSource
    forces_review: bool = False


class DocumentProcessRequest(BaseModel):
    example_id: str


class DocumentProcessResult(BaseModel):
    example_id: str
    title: str
    pipeline_steps: list[str]
    ocr_preview: str
    auto_import: list[ExtractedDocumentItem]
    needs_review: list[ExtractedDocumentItem]
    imported: int = 0
    transactions: list[Transaction] = Field(default_factory=list)
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)
    requires_review: bool = False
    is_mock: bool = True


class DocumentConfirmItem(BaseModel):
    id: str | None = None
    merchant: str
    amount_inr: float
    date: str
    category: ProductCategory
    discarded: bool = False


class DocumentConfirmRequest(BaseModel):
    example_id: str
    items: list[DocumentConfirmItem]


class DocumentConfirmResult(BaseModel):
    imported: int
    transactions: list[Transaction]
    message: str
    badges_unlocked: list[str] = Field(default_factory=list)
    is_mock: bool = True


class BarcodeLookupRequest(BaseModel):
    barcode: str


class AskRequest(BaseModel):
    query: str
    product_id: UUID | None = None


class AskResponse(BaseModel):
    answer: str
    tools_used: list[str]
    data: dict[str, Any] = Field(default_factory=dict)


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    monthly_budget_kg: float = 90.0
    persona: str | None = None


class SignInRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class DemoUserSummary(BaseModel):
    id: str
    name: str
    email: str
    role_description: str
    circularity_score: int
    impact_points: int
    streak_days: int
    monthly_budget_kg: float


class StepsSyncRequest(BaseModel):
    steps: int = Field(ge=0, strict=True)


class DailyStepsPoint(BaseModel):
    date: str
    steps: int
    points_awarded: int


class StepsMetricResponse(BaseModel):
    date: str
    steps: int
    points_awarded: int
    daily_reward_cap: int = 100
    next_threshold: int | None = None
    next_points: int = 0
    status: str
    rating: str
    series: list[DailyStepsPoint] = Field(default_factory=list)


# ==========================================
# GPS COMMUTE REWARDS (WALK & CYCLE)
# ==========================================


class CommuteTripRequest(BaseModel):
    distance_km: float = Field(ge=0.0)
    duration_min: float = Field(ge=0.0)
    avg_speed_kmh: float = Field(ge=0.0)


class CommuteTripResult(BaseModel):
    trip_id: str
    mode: str
    distance_km: float
    duration_min: float
    avg_speed_kmh: float
    points_awarded: int
    daily_total_points: int
    daily_cap: int
    message: str


class CommuteSeriesPoint(BaseModel):
    date: str
    label: str
    distance_km: float
    points_awarded: int
    trips: int


class CommuteSummaryResponse(BaseModel):
    date: str
    today_distance_km: float
    today_points: int
    daily_reward_cap: int
    trips_today: int
    series: list[CommuteSeriesPoint] = Field(default_factory=list)


# ==========================================
# KCS provisional->verified contract
# ==========================================


class BaselineRequest(BaseModel):
    transport: dict[str, Any] = Field(default_factory=dict)
    shopping: dict[str, Any] = Field(default_factory=dict)
    reductionPct: int = Field(ge=5, le=30)
    totalKg: float
    provisional: int


class ScoreResponse(BaseModel):
    provisional: int
    verified: int | None = None
    state: str = "provisional"
    confidence: float = 0.4
    confidence_label: str = "low"
    signals: int = 0
    signals_needed: int = 12
    categories_covered: list[str] = Field(default_factory=list)
    categories_needed: int = 4
    merchants: int = 0
    merchants_needed: int = 5
    missing: list[str] = Field(default_factory=list)
    nudge: bool = False
    nudge_copy: str | None = None
    baseline_total_kg: float | None = None
    target_kg: float | None = None


# DataMeterResponse is intentionally the same shape (alias OK)
DataMeterResponse = ScoreResponse
