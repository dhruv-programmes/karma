import type {
  CommuteSummary,
  Facility,
  ImpactBreakdown,
  Product,
  Recommendation,
  ScoreResponse,
  UserProfile,
} from "@/src/types/api";
import {
  DEMO_PHONE_ID,
  DEMO_REPAIR_ACTION_ID,
} from "@/src/types/api";

export const fallbackUser: UserProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Aisha",
  email: "aisha@example.com",
  circularity_score: 74,
  impact_points: 420,
  streak_days: 5,
  trend_delta: 6,
  loop_level: 2,
  offset_kg_total: 0,
  owned_product_ids: [
    DEMO_PHONE_ID,
    "22222222-2222-2222-2222-222222222202",
    "22222222-2222-2222-2222-222222222203",
    "22222222-2222-2222-2222-222222222208",
  ],
  unlocked_badge_ids: [],
};

export const fallbackImpact: ImpactBreakdown = {
  purchases_kg: 48.2,
  transport_kg: 12.4,
  energy_kg: 22.1,
  total_kg: 82.7,
  month_label: "Feb–Mar 2026",
  biggest_opportunity: "Electronics",
  insight:
    "Biggest lever right now: Electronics. Extend product lifetimes, shift short trips, then offset what's left.",
  offset_kg_total: 0,
  residual_kg: 82.7,
  by_category: { Electronics: 40, Food: 18, Energy: 22 },
  monthly_budget_kg: 90,
  budget_used_pct: 61,
  budget_status: "on_track",
  previous_month_kg: 40,
  this_month_kg: 55,
};

export const fallbackRecommendations: Recommendation[] = [
  {
    id: DEMO_REPAIR_ACTION_ID,
    category: "Electronics",
    action_type: "REPAIR",
    title: "Repair your old phone",
    subtitle: "Extend lifetime instead of buying new",
    co2e_avoided_kg: 120,
    money_impact_inr: 18000,
    effort: "low",
    local_availability: "2 repair options nearby",
    product_id: DEMO_PHONE_ID,
    explanation:
      "Repairable device you already own — cheaper than replacement.",
    score: 92,
  },
  {
    id: "66666666-6666-6666-6666-666666666602",
    category: "Clothing",
    action_type: "RESELL",
    title: "Resell unused jeans",
    subtitle: "Keep fabric in circulation",
    co2e_avoided_kg: 22,
    money_impact_inr: 1200,
    effort: "low",
    local_availability: "Resale platforms available",
    product_id: "22222222-2222-2222-2222-222222222202",
    explanation: "Good reuse potential.",
    score: 78,
  },
];

export const fallbackPhone: Product = {
  id: DEMO_PHONE_ID,
  barcode: "8901030865822",
  name: "Galaxy S-series Smartphone",
  brand: "Samsung",
  category: "Electronics",
  image_url:
    "https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800&q=80&fit=crop",
  estimated_co2e_kg: 70,
  circularity_score: 78,
  circularity_breakdown: {
    repairability: 85,
    longevity: 80,
    recyclability: 72,
    reuse_potential: 76,
    circular_options: 79,
  },
  repairability: 85,
  expected_remaining_life_months: 24,
  condition: "good",
  age_months: 28,
  last_action_label: "Scanned last week",
  next_action_label: "Repair nearby",
};

export const fallbackFacilities: Facility[] = [
  {
    id: "33333333-3333-3333-3333-333333333301",
    name: "Indiranagar Device Care",
    facility_type: "repair",
    lat: 12.9784,
    lng: 77.6408,
    distance_km: 2.3,
    supported_categories: ["Electronics"],
    open_now: true,
    verification_status: "Verified",
    address: "100 Feet Rd, Indiranagar, Bengaluru",
  },
  {
    id: "33333333-3333-3333-3333-333333333302",
    name: "Koramangala Phone Clinic",
    facility_type: "repair",
    lat: 12.9352,
    lng: 77.6245,
    distance_km: 4.1,
    supported_categories: ["Electronics"],
    open_now: true,
    verification_status: "Verified",
    address: "5th Block, Koramangala, Bengaluru",
  },
  {
    id: "33333333-3333-3333-3333-333333333303",
    name: "Saahas Zero Waste Hub",
    facility_type: "recycling",
    lat: 12.9698,
    lng: 77.7499,
    distance_km: 3.2,
    supported_categories: ["Electronics", "Home", "Other"],
    open_now: true,
    verification_status: "Verified",
    address: "Whitefield, Bengaluru",
  },
  {
    id: "33333333-3333-3333-3333-333333333305",
    name: "Goonj Collection Point",
    facility_type: "donation",
    lat: 12.9592,
    lng: 77.6974,
    distance_km: 5.1,
    supported_categories: ["Clothing", "Other"],
    open_now: true,
    verification_status: "Verified",
    address: "HSR Layout, Bengaluru",
  },
];

export const fallbackBadges = [
  {
    id: "first_repair",
    title: "First Repair",
    description: "Completed your first repair action",
    icon: "wrench",
    unlocked: false,
  },
  {
    id: "e_waste_hero",
    title: "e-Waste Hero",
    description: "Recycled electronics responsibly",
    icon: "recycle",
    unlocked: false,
  },
  {
    id: "streak_7",
    title: "Week Streak",
    description: "Kept a 7-day circular streak",
    icon: "flame",
    unlocked: false,
  },
  {
    id: "offset_starter",
    title: "Offset Starter",
    description: "Bought your first demo offset",
    icon: "leaf",
    unlocked: false,
  },
  {
    id: "receipt_ranger",
    title: "Receipt Ranger",
    description: "Parsed a receipt into footprint data",
    icon: "receipt",
    unlocked: false,
  },
  {
    id: "brand_claimer",
    title: "Brand Claimer",
    description: "Redeemed a partner reward",
    icon: "gift",
    unlocked: false,
  },
];

export const fallbackCloset: Product[] = [
  fallbackPhone,
  {
    ...fallbackPhone,
    id: "22222222-2222-2222-2222-222222222202",
    name: "Slim Fit Denim Jeans",
    brand: "Levi's",
    category: "Clothing",
    estimated_co2e_kg: 33,
    circularity_score: 71,
  },
  {
    ...fallbackPhone,
    id: "22222222-2222-2222-2222-222222222203",
    name: "Wireless Noise-Cancel Headphones",
    brand: "Sony",
    category: "Electronics",
    estimated_co2e_kg: 22,
    circularity_score: 69,
  },
];

export const fallbackScore: ScoreResponse = {
  provisional: 681,
  verified: null,
  state: "provisional",
  confidence: 0.4,
  confidenceLabel: "Low",
  signals: 4,
  signalsNeeded: 12,
  categoriesCovered: 2,
  categoriesNeeded: 4,
  merchants: 2,
  merchantsNeeded: 5,
  missing: ["Electricity bill", "Travel history"],
  varietyOk: false,
  nudge: false,
  nudgeCopy:
    "We need more data to calculate your Carbon Score (Upload electricity, shopping, food + travel bills to improve accuracy)",
  baselineTotalKg: 96,
  targetKg: 82,
};

export const fallbackCommuteSummary: CommuteSummary = {
  date: "2026-09-12",
  todayDistanceKm: 0,
  todayPoints: 0,
  dailyRewardCap: 150,
  tripsToday: 0,
  series: [
    { date: "2026-09-06", label: "Sun", distance_km: 1.8, points_awarded: 18, trips: 1 },
    { date: "2026-09-07", label: "Mon", distance_km: 3.2, points_awarded: 25, trips: 2 },
    { date: "2026-09-08", label: "Tue", distance_km: 0.0, points_awarded: 0, trips: 0 },
    { date: "2026-09-09", label: "Wed", distance_km: 4.5, points_awarded: 35, trips: 2 },
    { date: "2026-09-10", label: "Thu", distance_km: 2.1, points_awarded: 20, trips: 1 },
    { date: "2026-09-11", label: "Fri", distance_km: 5.0, points_awarded: 40, trips: 2 },
    { date: "2026-09-12", label: "Today", distance_km: 0.0, points_awarded: 0, trips: 0 },
  ],
};
