import type {
  Facility,
  ImpactBreakdown,
  Product,
  Recommendation,
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
};

export const fallbackImpact: ImpactBreakdown = {
  purchases_kg: 48.2,
  transport_kg: 12.4,
  energy_kg: 22.1,
  total_kg: 82.7,
  month_label: "March 2026",
  biggest_opportunity: "Electronics",
  insight:
    "You do not need to change everything. Your biggest opportunity is extending product lifetimes.",
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
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
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
];
