export type ProductCategory =
  | "Electronics"
  | "Clothing"
  | "Food"
  | "Transport"
  | "Home"
  | "Energy"
  | "Furniture"
  | "Personal care"
  | "Other";

export type ActionType =
  | "REPAIR"
  | "REFURBISH"
  | "RESELL"
  | "DONATE"
  | "RECYCLE"
  | "REPLACE"
  | "REDUCE";

export type EffortLevel = "low" | "medium" | "high";

export interface CircularityBreakdown {
  repairability: number;
  longevity: number;
  recyclability: number;
  reuse_potential: number;
  circular_options: number;
}

export interface Product {
  id: string;
  barcode?: string | null;
  name: string;
  brand: string;
  category: ProductCategory;
  image_url?: string | null;
  estimated_co2e_kg: number;
  circularity_score: number;
  circularity_breakdown: CircularityBreakdown;
  repairability: number;
  expected_remaining_life_months: number;
  condition: string;
  age_months: number;
  last_action_label?: string | null;
  next_action_label?: string | null;
}

export interface CircularOption {
  action_type: ActionType;
  title: string;
  estimated_cost_inr: number;
  estimated_co2e_impact_kg: number;
  co2e_avoided_kg: number;
  expected_lifetime_months?: number | null;
  money_return_inr?: number | null;
  convenience: number;
  availability: string;
  effort: EffortLevel;
  explanation: string;
  score: number;
  next_action: string;
}

export interface CircularOptionsResponse {
  product: Product;
  options: CircularOption[];
  best_option: CircularOption;
  carbon: {
    estimated_co2e_kg: number;
    display: string;
    confidence: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  circularity_score: number;
  impact_points: number;
  streak_days: number;
  trend_delta: number;
  loop_level?: number;
  offset_kg_total?: number;
  owned_product_ids?: string[];
  unlocked_badge_ids?: string[];
  monthly_budget_kg?: number;
  /** Present after the user has finished the baseline questionnaire. */
  baseline_total_kg?: number | null;
  baseline_created_at?: string | null;
}

export interface SustainablePurchaseVerification {
  status: "verified" | string;
  reward_points: number;
  total_points: number;
  already_claimed: boolean;
  vehicle_make_model: string;
  vehicle_type: string;
  ownership: string;
  verification: string;
  is_mock: boolean;
}

export interface ImpactBreakdown {
  purchases_kg: number;
  transport_kg: number;
  energy_kg: number;
  total_kg: number;
  month_label: string;
  biggest_opportunity: string;
  insight: string;
  offset_kg_total?: number;
  residual_kg?: number;
  by_category?: Record<string, number>;
  monthly_budget_kg?: number;
  budget_used_pct?: number;
  budget_status?: string;
  previous_month_kg?: number;
  this_month_kg?: number;
}

export interface Recommendation {
  id: string;
  category: ProductCategory;
  action_type: ActionType;
  title: string;
  subtitle: string;
  co2e_avoided_kg: number;
  money_impact_inr: number;
  effort: EffortLevel;
  local_availability: string;
  product_id?: string | null;
  explanation: string;
  score: number;
}

export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  lat: number;
  lng: number;
  distance_km?: number | null;
  supported_categories: ProductCategory[];
  open_now?: boolean | null;
  verification_status: string;
  address: string;
  cover_image_url?: string | null;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  brand?: string | null;
  is_mock: boolean;
  expires_on?: string | null;
  cover_image_url?: string | null;
}

export interface OffsetProject {
  id: string;
  name: string;
  provider: string;
  co2e_kg: number;
  price_inr: number;
  verification_status: string;
  geography: string;
  description: string;
  methodology?: string;
  cover_image_url?: string | null;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  points_delta: number;
  created_at: string;
  meta?: Record<string, unknown>;
}

export interface PointsLedgerEntry {
  id: string;
  type: "earned" | "spent" | "event" | string;
  source: string;
  title: string;
  subtitle: string;
  points_delta: number;
  balance_after: number;
  timestamp: string;
  redemption_status?: string | null;
  meta?: Record<string, unknown>;
}

export interface PointsLedgerResponse {
  balance: number;
  entries: PointsLedgerEntry[];
  is_demo?: boolean;
}

export interface ImpactTimeseries {
  points: { label: string; week_start: string; kg: number }[];
  purchases_kg: number;
  transport_kg: number;
  energy_kg: number;
  this_month_kg: number;
  previous_month_kg: number;
}

export type SolarRecommendationStatus =
  | "suggested"
  | "accepted"
  | "in_progress"
  | "completed"
  | "partially_completed"
  | "missed";

export interface SolarHourlyPoint {
  label: string;
  solarKwh: number;
  consumptionKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
}

export interface SolarRecommendation {
  id: string;
  title: string;
  body: string;
  window: string;
  expectedSavingsInr: number;
  co2AvoidedKg: number;
  points: number;
  status: SolarRecommendationStatus;
  action?: string;
}

export interface SolarImpactResponse {
  date: string;
  location: string;
  systemSizeKw: number;
  generatedKwh: number;
  consumedKwh: number;
  exportedKwh: number;
  gridImportedKwh: number;
  householdConsumptionKwh: number;
  selfConsumptionPct: number;
  solarContributionPct: number;
  co2AvoidedKg: number;
  moneySavedInr: number;
  greenPoints: number;
  solarScore: number;
  scoreBreakdown: { label: string; value: number }[];
  live: {
    solarKw: number;
    homeKw: number;
    gridExportKw: number;
    gridImportKw: number;
    batteryKw?: number;
    evKw?: number;
  };
  hourly: SolarHourlyPoint[];
  recommendations: SolarRecommendation[];
  forecast: {
    generatedKwh: number;
    peakWindow: string;
    weather: string;
    opportunity: string;
    message: string;
  };
  financial: {
    actualSavingsInr: number;
    additionalSavingsInr: number;
    optimizedSavingsInr: number;
    tariffInrPerKwh: number;
  };
  rewards: { label: string; points: number; unlocked?: boolean }[];
  comparison: {
    current: { generatedKwh: number; usedKwh: number; exportedKwh: number; selfConsumptionPct: number };
    optimized: { generatedKwh: number; usedKwh: number; exportedKwh: number; selfConsumptionPct: number };
    additionalSavingsInr: number;
    additionalCo2Kg: number;
  };
  timeline: { time: string; title: string; detail: string; points?: number }[];
}

/** Daily walking rewards returned by the step-rewards API. */
export interface StepSeriesPoint {
  label: string;
  date: string;
  steps: number;
  points: number;
}

/**
 * Walking is an Impact Points metric, never a Carbon Credit/KCS input.
 * The API accepts either its snake_case contract or these camelCase fields.
 */
export interface StepSummary {
  todaySteps: number;
  todayPoints: number;
  targetSteps: number;
  nextThreshold: number | null;
  rating: string;
  status: string;
  series: StepSeriesPoint[];
}

export interface CommuteTripRequest {
  distance_km: number;
  duration_min: number;
  avg_speed_kmh: number;
}

export interface CommuteTripResult {
  trip_id: string;
  mode: "walk" | "cycle" | "motor" | string;
  distance_km: number;
  duration_min: number;
  avg_speed_kmh: number;
  points_awarded: number;
  daily_total_points: number;
  daily_cap: number;
  message: string;
}

export interface CommuteSeriesPoint {
  date: string;
  label: string;
  distance_km: number;
  points_awarded: number;
  trips: number;
}

export interface CommuteSummary {
  date: string;
  todayDistanceKm: number;
  todayPoints: number;
  dailyRewardCap: number;
  tripsToday: number;
  series: CommuteSeriesPoint[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface CompletedActionResult {
  action_id: string;
  points_awarded: number;
  previous_score: number;
  new_score: number;
  message: string;
  badges_unlocked?: string[];
  loop_level?: number;
}

export interface RedeemResult {
  reward_id: string;
  claim_code: string;
  points_spent: number;
  points_remaining: number;
  message: string;
  already_redeemed?: boolean;
  is_mock: boolean;
}

export interface OffsetPurchaseResult {
  offset_id: string;
  co2e_kg: number;
  price_inr: number;
  points_spent: number;
  points_remaining: number;
  offset_kg_total: number;
  residual_kg: number;
  message: string;
  badges_unlocked?: string[];
  is_mock: boolean;
}

export interface ReceiptParseResult {
  imported: number;
  transactions: Transaction[];
  message: string;
  badges_unlocked?: string[];
}

export type ExtractionConfidence = "high" | "medium" | "low";
export type DocumentDocType = "receipt" | "utility" | "invoice" | "other";
export type DocumentSource = "image" | "pdf";

export interface ExtractedDocumentItem {
  id: string;
  merchant: string;
  amount_inr: number;
  date: string;
  category: ProductCategory;
  confidence: ExtractionConfidence;
  needs_review_reason?: string | null;
}

export interface DocumentExtraction {
  title: string;
  doc_type: DocumentDocType;
  items: ExtractedDocumentItem[];
}

export interface DocumentExampleSummary {
  id: string;
  title: string;
  subtitle: string;
  doc_type: DocumentDocType;
  source: DocumentSource;
  forces_review: boolean;
}

/** Draft after AI extract, before confirm — drives review + chat. */
export interface DocumentProcessResult {
  example_id?: string;
  title: string;
  pipeline_steps?: string[];
  ocr_preview?: string;
  auto_import: ExtractedDocumentItem[];
  needs_review: ExtractedDocumentItem[];
  imported: number;
  transactions: Transaction[];
  message: string;
  badges_unlocked?: string[];
  requires_review: boolean;
  is_mock?: boolean;
  /** Full extraction JSON for bill chat context */
  extractionJson?: string;
}

export interface DocumentConfirmItem {
  id?: string;
  merchant: string;
  amount_inr: number;
  date: string;
  category: ProductCategory;
  /** Preserve Gemini confidence for the receipt reward formula. */
  confidence?: ExtractionConfidence;
  discarded?: boolean;
}

export interface DocumentConfirmResult {
  imported: number;
  transactions: Transaction[];
  message: string;
  badges_unlocked?: string[];
  is_mock?: boolean;
  total_inr?: number;
  /** Accounting metadata returned by FastAPI when available. */
  co2e_kg_added?: number;
  reward_points_awarded?: number;
  duplicate_count?: number;
  reward_formula_version?: string;
}

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount_inr: number;
  category: ProductCategory;
}

/** Seeded demo barcode for the hero phone flow */
export const DEMO_PHONE_BARCODE = "8901030865822";
export const DEMO_PHONE_ID = "22222222-2222-2222-2222-222222222201";
export const DEMO_REPAIR_ACTION_ID = "66666666-6666-6666-6666-666666666601";
export const DEMO_RECYCLE_ACTION_ID = "66666666-6666-6666-6666-666666666603";

export function mapActionToFacilityType(
  action: ActionType
): "repair" | "recycling" | "donation" | "resale" | null {
  switch (action) {
    case "REPAIR":
    case "REFURBISH":
      return "repair";
    case "RECYCLE":
      return "recycling";
    case "DONATE":
      return "donation";
    case "RESELL":
      return "resale";
    default:
      return null;
  }
}

export interface DemoUserSummary {
  id: string;
  name: string;
  email: string;
  role_description: string;
  circularity_score: number;
  impact_points: number;
  streak_days: number;
  monthly_budget_kg: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export type ScoreState = "provisional" | "verified";

export interface DataMeter {
  signals: number;
  signalsNeeded: number;
  categoriesCovered: number;
  categoriesNeeded: number;
  merchants: number;
  merchantsNeeded: number;
  missing: string[];
  varietyOk: boolean;
  nudge: boolean;
  nudgeCopy: string;
  baselineTotalKg: number;
  targetKg: number;
}

export interface ScoreResponse extends DataMeter {
  provisional: number;
  verified: number | null;
  state: ScoreState;
  confidence: number;
  confidenceLabel: string;
}

export interface BaselineSyncPayload {
  transport: { [key: string]: string };
  shopping: { [key: string]: string };
  reductionPct: number;
  totalKg: number;
  provisional: number;
}

export type LeaderboardMetric = "impact_points" | "kcs";
export type LeaderboardScope = "global" | "friends";

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  impact_points: number;
  carbon_score: number;
  score_state?: "provisional" | "verified";
  rank: number;
  is_current_user?: boolean;
}

export interface FriendResult {
  id: string;
  username: string;
  display_name: string;
  impact_points: number;
  carbon_score: number;
  is_friend: boolean;
  is_current_user?: boolean;
}

export type ChallengePeriod = "daily" | "weekly" | "monthly";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  action_label: string;
  period: ChallengePeriod;
  progress: number;
  target: number;
  reward_points: number;
  completed: boolean;
  claimed?: boolean;
  category?: string;
  expires_at?: string | null;
}

/** Competitive season track. League points are intentionally separate from KCS and Karma Coins. */
export type LeagueTier = "bronze" | "silver" | "gold" | "platinum";

export type LeaguePromotionStatus = "holding" | "promoted" | "at_risk";

export interface LeagueStanding {
  id: string;
  display_name: string;
  username: string;
  league_points: number;
  rank: number;
  is_current_user?: boolean;
}

export interface LeagueSummary {
  tier: LeagueTier;
  badge_id: string;
  badge_asset_url?: string | null;
  color_hex?: string | null;
  league_name: string;
  league_points: number;
  promotion_threshold: number | null;
  weekly_actions_completed: number;
  weekly_actions_target: number;
  promotion_status: LeaguePromotionStatus;
  season_label: string;
  demotion_note: string;
  standings: LeagueStanding[];
}
