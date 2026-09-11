import { useAuthStore } from "@/src/store/auth";
import type {
  AuthResponse,
  Badge,
  CircularOptionsResponse,
  CompletedActionResult,
  DemoUserSummary,
  Facility,
  ImpactBreakdown,
  OffsetProject,
  OffsetPurchaseResult,
  Product,
  ReceiptParseResult,
  Recommendation,
  RedeemResult,
  Reward,
  Transaction,
  UserProfile,
} from "@/src/types/api";

const DEFAULT_API = "http://localhost:8000";

function getBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const authHeader = token ? `Bearer ${token}` : "Bearer demo-carbon-loop-token";

  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `API ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.message && err.message !== "API_UNAVAILABLE") {
      throw err;
    }
    throw new Error("API_UNAVAILABLE");
  }
}

export const api = {
  // Authentication
  signin: (email: string, password = "password123") =>
    request<AuthResponse>("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (data: {
    name: string;
    email: string;
    password: string;
    monthly_budget_kg?: number;
    persona?: string;
  }) =>
    request<AuthResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDemoUsers: () => request<DemoUserSummary[]>("/api/v1/auth/demo-users"),
  getAuthMe: () => request<UserProfile>("/api/v1/auth/me"),

  // Profile & Impact
  getMe: () => request<UserProfile>("/api/v1/users/me"),
  getImpact: () => request<ImpactBreakdown>("/api/v1/users/me/impact"),
  getImpactTimeseries: () =>
    request<import("@/src/types/api").ImpactTimeseries>(
      "/api/v1/users/me/impact/timeseries"
    ),
  getActivity: () =>
    request<import("@/src/types/api").ActivityEvent[]>(
      "/api/v1/users/me/activity"
    ),
  getRecommendations: () =>
    request<Recommendation[]>("/api/v1/users/me/recommendations"),
  getCloset: () => request<Product[]>("/api/v1/users/me/closet"),
  getBadges: () => request<Badge[]>("/api/v1/users/me/badges"),
  getScore: () =>
    request<{
      score: number;
      impact_points: number;
      streak_days: number;
      trend_delta: number;
      loop_level: number;
      offset_kg_total: number;
    }>("/api/v1/profile/circularity-score"),

  // Products
  lookupBarcode: (barcode: string) =>
    request<Product>("/api/v1/products/lookup/barcode", {
      method: "POST",
      body: JSON.stringify({ barcode }),
    }),
  getProduct: (id: string) => request<Product>(`/api/v1/products/${id}`),
  getCircularOptions: (id: string) =>
    request<CircularOptionsResponse>(
      `/api/v1/products/${id}/circular-options`
    ),

  // Facilities
  getFacilitiesNearby: (
    type?: string,
    lat = 12.9716,
    lng = 77.5946
  ) => {
    const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (type) q.set("type", type);
    return request<Facility[]>(`/api/v1/facilities/nearby?${q}`);
  },
  getRepairNearby: (lat = 12.9716, lng = 77.5946) =>
    request<Facility[]>(`/api/v1/repair/nearby?lat=${lat}&lng=${lng}`),
  getRecyclingNearby: (lat = 12.9716, lng = 77.5946) =>
    request<Facility[]>(`/api/v1/recycling/nearby?lat=${lat}&lng=${lng}`),

  // Actions, Rewards, Offsets
  completeAction: (id: string, action_type?: string) =>
    request<CompletedActionResult>(`/api/v1/actions/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ action_type: action_type ?? null }),
    }),
  getRewards: () => request<Reward[]>("/api/v1/rewards"),
  redeemReward: (id: string) =>
    request<RedeemResult>(`/api/v1/rewards/${id}/redeem`, { method: "POST" }),
  getOffsets: () => request<OffsetProject[]>("/api/v1/offsets"),
  purchaseOffset: (id: string) =>
    request<OffsetPurchaseResult>(`/api/v1/offsets/${id}/purchase`, {
      method: "POST",
    }),

  // Transactions & Receipts
  getTransactions: () => request<Transaction[]>("/api/v1/transactions"),
  parseReceipt: (text?: string, use_demo = true) =>
    request<ReceiptParseResult>("/api/v1/receipts/parse", {
      method: "POST",
      body: JSON.stringify({ text: text ?? null, use_demo }),
    }),

  // Assistant & Reset
  ask: (query: string, product_id?: string) =>
    request<{ answer: string; tools_used: string[] }>("/api/v1/ask", {
      method: "POST",
      body: JSON.stringify({ query, product_id }),
    }),
  resetDemo: () =>
    request<{ status: string }>("/api/v1/demo/reset", { method: "POST" }),
};
