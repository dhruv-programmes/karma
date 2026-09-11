import type {
  Badge,
  CircularOptionsResponse,
  CompletedActionResult,
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
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer demo-carbon-loop-token",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API ${res.status}`);
    }
    return (await res.json()) as T;
  } catch {
    throw new Error("API_UNAVAILABLE");
  }
}

export const api = {
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
  getTransactions: () => request<Transaction[]>("/api/v1/transactions"),
  parseReceipt: (text?: string, use_demo = true) =>
    request<ReceiptParseResult>("/api/v1/receipts/parse", {
      method: "POST",
      body: JSON.stringify({ text: text ?? null, use_demo }),
    }),
  ask: (query: string, product_id?: string) =>
    request<{ answer: string; tools_used: string[] }>("/api/v1/ask", {
      method: "POST",
      body: JSON.stringify({ query, product_id }),
    }),
  resetDemo: () =>
    request<{ status: string }>("/api/v1/demo/reset", { method: "POST" }),
};
