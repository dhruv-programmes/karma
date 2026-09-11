import type {
  CircularOptionsResponse,
  CompletedActionResult,
  Facility,
  ImpactBreakdown,
  Product,
  Recommendation,
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
    // Demo must never die on network — return local fallbacks via callers
    throw new Error("API_UNAVAILABLE");
  }
}

export const api = {
  getMe: () => request<UserProfile>("/api/v1/users/me"),
  getImpact: () => request<ImpactBreakdown>("/api/v1/users/me/impact"),
  getRecommendations: () =>
    request<Recommendation[]>("/api/v1/users/me/recommendations"),
  getScore: () =>
    request<{
      score: number;
      impact_points: number;
      streak_days: number;
      trend_delta: number;
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
  getOffsets: () =>
    request<
      {
        id: string;
        name: string;
        provider: string;
        co2e_kg: number;
        price_inr: number;
        verification_status: string;
        geography: string;
        description: string;
      }[]
    >("/api/v1/offsets"),
  getTransactions: () => request<Transaction[]>("/api/v1/transactions"),
  ask: (query: string, product_id?: string) =>
    request<{ answer: string; tools_used: string[] }>("/api/v1/ask", {
      method: "POST",
      body: JSON.stringify({ query, product_id }),
    }),
  resetDemo: () =>
    request<{ status: string }>("/api/v1/demo/reset", { method: "POST" }),
};
