import Constants from "expo-constants";
import { Platform } from "react-native";

import { useAuthStore } from "@/src/store/auth";
import type {
  AuthResponse,
  Badge,
  BaselineSyncPayload,
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
  ScoreResponse,
  ScoreState,
  Transaction,
  UserProfile,
} from "@/src/types/api";

const API_PORT = 8000;

function resolveDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl?.replace(/^[a-z]+:\/\//, "") ??
    null;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

function getBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isLoopback =
    !configured ||
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured);

  // Physical device / LAN: reuse Metro's host IP so the phone can reach the API.
  const lanHost = resolveDevHost();
  if (lanHost) {
    if (!configured || isLoopback) {
      return `http://${lanHost}:${API_PORT}`;
    }
    return configured.replace(/\/$/, "");
  }

  // Android emulator: localhost on the device is not the host machine.
  if (Platform.OS === "android" && isLoopback) {
    return `http://10.0.2.2:${API_PORT}`;
  }

  if (configured) return configured.replace(/\/$/, "");
  return `http://localhost:${API_PORT}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const authHeader = token ? `Bearer ${token}` : "Bearer demo-carbon-loop-token";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(init?.headers ?? {}),
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `API ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.message && err.message !== "API_UNAVAILABLE") {
      throw err;
    }
    throw new Error("API_UNAVAILABLE");
  }
}

/**
 * Normalize a score payload into the canonical camelCase ScoreResponse.
 * Accepts backend snake_case (A1/A2 contract) or camelCase; missing fields
 * fall back to provisional defaults. Never throws (offline-tolerant).
 */
export function normalizeScoreResponse(raw: any): ScoreResponse {
  const src = raw && typeof raw === "object" ? raw : {};
  const pick = (...keys: string[]): any => {
    for (const k of keys) {
      const v = src[k];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  };
  const num = (v: unknown, dflt: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : dflt;
  const rawState = pick("state", "score_state");
  const state: ScoreState = rawState === "verified" ? "verified" : "provisional";
  const confidence = num(pick("confidence", "score_confidence"), 0.4);
  const rawLabel = pick("confidenceLabel", "confidence_label");
  const confidenceLabel =
    typeof rawLabel === "string" && rawLabel.length > 0
      ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)
      : confidence >= 0.85
        ? "High"
        : confidence >= 0.6
          ? "Medium"
          : "Low";
  const catsCovered = pick("categoriesCovered", "categories_covered");
  const categoriesCovered =
    typeof catsCovered === "number"
      ? catsCovered
      : Array.isArray(catsCovered)
        ? catsCovered.length
        : 0;
  const missingRaw = pick("missing");
  const missingList: string[] = Array.isArray(missingRaw)
    ? missingRaw.map(String)
    : [];
  // Backend ScoreResponse omits variety_ok by design (quiet variety gate);
  // derive it from the meter's missing labels: compute_data_meter appends
  // "Varied history" iff variety_ok is False, so absence means variety OK.
  // Only derive when the backend actually sent a missing array; else false.
  const varietyRaw = pick("varietyOk", "variety_ok");
  const varietyOk =
    typeof varietyRaw === "boolean"
      ? varietyRaw
      : Array.isArray(missingRaw)
        ? !missingList.includes("Varied history")
        : false;
  const rawVerified = pick("verified", "verified_score");
  return {
    provisional: num(pick("provisional", "provisional_score"), 650),
    verified:
      typeof rawVerified === "number" && Number.isFinite(rawVerified)
        ? rawVerified
        : null,
    state,
    confidence,
    confidenceLabel,
    signals: num(pick("signals"), 0),
    signalsNeeded: num(pick("signalsNeeded", "signals_needed"), 12),
    categoriesCovered,
    categoriesNeeded: num(pick("categoriesNeeded", "categories_needed"), 4),
    merchants: num(pick("merchants"), 0),
    merchantsNeeded: num(pick("merchantsNeeded", "merchants_needed"), 5),
    missing: missingList,
    varietyOk,
    nudge: Boolean(pick("nudge") ?? false),
    nudgeCopy: String(pick("nudgeCopy", "nudge_copy") ?? ""),
    baselineTotalKg: num(pick("baselineTotalKg", "baseline_total_kg"), 0),
    targetKg: num(pick("targetKg", "target_kg"), 0),
  };
}

export const api = {  // Authentication
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
    request<any>("/api/v1/users/me/score").then(normalizeScoreResponse),
  getDataMeter: () =>
    request<any>("/api/v1/users/me/data-meter").then(normalizeScoreResponse),
  syncBaseline: (payload: BaselineSyncPayload) =>
    request<any>("/api/v1/onboarding/baseline", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeScoreResponse),
  getCircularityScore: () =>
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

  // Transactions (FastAPI). Document extract/confirm live on AI service — see src/lib/ai.ts
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
