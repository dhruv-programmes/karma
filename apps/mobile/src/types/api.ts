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
}

export interface ImpactBreakdown {
  purchases_kg: number;
  transport_kg: number;
  energy_kg: number;
  total_kg: number;
  month_label: string;
  biggest_opportunity: string;
  insight: string;
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
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  brand?: string | null;
  is_mock: boolean;
}

export interface CompletedActionResult {
  action_id: string;
  points_awarded: number;
  previous_score: number;
  new_score: number;
  message: string;
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
