import Constants from "expo-constants";
import { Platform } from "react-native";

import { useAuthStore } from "@/src/store/auth";
import type {
  AuthResponse,
  Badge,
  BaselineSyncPayload,
  Challenge,
  ChallengePeriod,
  CircularOptionsResponse,
  CompletedActionResult,
  DemoUserSummary,
  Facility,
  FriendResult,
  ImpactBreakdown,
  OffsetProject,
  OffsetPurchaseResult,
  PointsLedgerResponse,
  Product,
  ReceiptParseResult,
  Recommendation,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardScope,
  LeagueSummary,
  LeaguePromotionStatus,
  LeagueTier,
  RedeemResult,
  Reward,
  ScoreResponse,
  ScoreState,
  SolarImpactResponse,
  SolarRecommendationStatus,
  StepSummary,
  Transaction,
  UserProfile,
} from "@/src/types/api";

const API_PORT = 8000;
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
// Password verification deliberately uses a slow KDF. Give authentication a
// realistic window without making every read request feel unresponsive.
const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function resolveDevHost(): string | null {
  // Expo Go has exposed the Metro host through several manifest shapes over
  // time. Read all of them so a physical iPhone/Android device does not try
  // to call its own 127.0.0.1 when the API is running on the host laptop.
  const constants = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };
  const hostUris = [
    constants.expoConfig?.hostUri,
    constants.expoGoConfig?.debuggerHost,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.manifest?.debuggerHost,
    constants.linkingUri,
    constants.experienceUrl,
  ];

  // Expo may expose a loopback hostUri before a usable LAN debuggerHost. Try
  // every candidate instead of allowing the first (unusable) value to win.
  for (const hostUri of hostUris) {
    if (!hostUri) continue;

    // Values may be a bare `192.168.x.x:8081` or a URI such as
    // `exp://192.168.x.x:8081`; strip the scheme before extracting the host.
    const address = hostUri.replace(/^[a-z][a-z\d+.-]*:\/\//i, "");
    const host = address.includes("]")
      ? address.slice(0, address.indexOf("]") + 1).replace(/^\[/, "").replace(/\]$/, "")
      : address.split(":")[0]?.split("/")[0]?.trim();

    // Expo tunnel hosts are not the machine running the API. In that mode the
    // caller must provide a reachable EXPO_PUBLIC_API_URL explicitly.
    if (!host || /^(localhost|127\.0\.0\.1|::1|u\.expo\.dev|expo\.dev)$/i.test(host)) {
      continue;
    }
    return host.includes(":") ? `[${host}]` : host;
  }
  return null;
}

export function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isLoopback =
    !configured ||
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured);

  // On web, the browser's host is the most reliable source. This matters when
  // Expo is opened on another laptop over LAN and EXPO_PUBLIC_API_URL was
  // left at its developer-local loopback default.
  const browserHost =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.hostname
      : null;
  if (browserHost && !/^(localhost|127\.0\.0\.1|::1)$/i.test(browserHost) && isLoopback) {
    return `http://${browserHost}:${API_PORT}`;
  }

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

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<T> {
  const token = useAuthStore.getState().token;
  const authHeader = token ? `Bearer ${token}` : "Bearer demo-carbon-loop-token";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
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
    if (controller.signal.aborted) {
      throw new Error("The server is taking longer than expected. Please try again.");
    }
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

/** Normalize the step endpoint while keeping its UI contract camelCased. */
export function normalizeStepSummary(raw: any): StepSummary {
  const src = raw && typeof raw === "object" ? raw : {};
  const pick = (...keys: string[]): any => {
    for (const key of keys) {
      const value = src[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  };
  const number = (value: unknown, fallback = 0) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const rawSeries = pick("series", "seven_day_series", "history");

  return {
    todaySteps: number(pick("todaySteps", "today_steps", "steps")),
    todayPoints: number(
      pick("todayPoints", "today_points", "points_awarded", "points")
    ),
    targetSteps: number(pick("targetSteps", "target_steps"), 10_000),
    nextThreshold: (() => {
      const value = pick("nextThreshold", "next_threshold");
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    })(),
    rating: String(pick("rating") ?? "Starting out"),
    status: String(pick("status") ?? "not_started"),
    series: Array.isArray(rawSeries)
      ? rawSeries.map((point: any, index: number) => ({
          label: String(point?.label ?? point?.day ?? point?.date?.slice(-2) ?? `D${index + 1}`),
          date: String(point?.date ?? point?.day ?? ""),
          steps: number(point?.steps),
          points: number(point?.points ?? point?.points_awarded),
        }))
      : [],
  };
}

/** Normalize the Solar Impact dashboard contract, allowing backend snake_case during rollout. */
export function normalizeSolarImpact(raw: any): SolarImpactResponse {
  const src = raw && typeof raw === "object" ? raw : {};
  const pick = (...keys: string[]) => keys.reduce((value, key) => value ?? src[key], undefined as any);
  const num = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const live = pick("live", "live_energy_flow", "energy_flow", "live_flow") ?? {};
  const financial = pick("financial", "financial_impact") ?? {};
  const forecast = pick("forecast", "tomorrow_forecast") ?? {};
  const comparison = pick("comparison", "before_vs_optimized") ?? {};
  const current = comparison.current ?? {};
  const optimized = comparison.optimized ?? {};
  const score = pick("solarScore", "solar_score");
  const list = (value: unknown) => Array.isArray(value) ? value : [];
  return {
    date: String(pick("date") ?? new Date().toISOString().slice(0, 10)),
    location: String(pick("location") ?? "Ahmedabad"),
    systemSizeKw: num(pick("systemSizeKw", "system_size_kw"), 5),
    generatedKwh: num(pick("generatedKwh", "generated_kwh"), 20.4),
    consumedKwh: num(pick("consumedKwh", "consumed_kwh", "directly_consumed_kwh"), 12.8),
    exportedKwh: num(pick("exportedKwh", "exported_kwh"), 7.6),
    gridImportedKwh: num(pick("gridImportedKwh", "grid_imported_kwh"), 4.3),
    householdConsumptionKwh: num(pick("householdConsumptionKwh", "household_consumption_kwh"), 17.1),
    selfConsumptionPct: num(pick("selfConsumptionPct", "self_consumption_pct"), 62.7),
    solarContributionPct: num(pick("solarContributionPct", "solar_contribution_pct"), 74.9),
    co2AvoidedKg: num(pick("co2AvoidedKg", "co2_avoided_kg"), 7.4),
    moneySavedInr: num(pick("moneySavedInr", "money_saved_inr", "estimated_savings_inr"), 118),
    greenPoints: num(pick("greenPoints", "green_points", "green_points_earned"), 75),
    solarScore: num(typeof score === "object" ? score?.score : score, 78),
    scoreBreakdown: list(pick("scoreBreakdown", "score_breakdown") ?? (score && typeof score === "object" ? Object.entries(score.components ?? {}).map(([label, value]) => ({ label, value })) : [])).map((item: any) => ({
      label: String(item?.label ?? item?.name ?? "Metric"),
      value: num(item?.value, 0),
    })),
    live: {
      solarKw: num(live.solarKw ?? live.solar_kw ?? live.generation_kw ?? live.solar_generation_kw, 3.8),
      homeKw: num(live.homeKw ?? live.home_kw ?? live.usage_kw ?? live.home_usage_kw, 2.4),
      gridExportKw: num(live.gridExportKw ?? live.grid_export_kw ?? live.export_kw, 1.4),
      gridImportKw: num(live.gridImportKw ?? live.grid_import_kw ?? live.import_kw),
      batteryKw: num(live.batteryKw ?? live.battery_kw),
      evKw: num(live.evKw ?? live.ev_kw),
    },
    hourly: list(pick("hourly", "hourly_data", "hourly_series")).map((point: any, index: number) => ({
      label: String(point?.label ?? point?.time ?? point?.hour ?? `${index + 6}:00`),
      solarKwh: num(point?.solarKwh ?? point?.solar_kwh ?? point?.solar_generation_kwh),
      consumptionKwh: num(point?.consumptionKwh ?? point?.consumption_kwh ?? point?.load_kwh ?? point?.home_consumption_kwh),
      gridImportKwh: num(point?.gridImportKwh ?? point?.grid_import_kwh),
      gridExportKwh: num(point?.gridExportKwh ?? point?.grid_export_kwh),
    })),
    recommendations: list(pick("recommendations")).map((item: any, index: number) => ({
      id: String(item?.id ?? `solar-rec-${index + 1}`),
      title: String(item?.title ?? "Use more solar during the day"),
      body: String(item?.body ?? item?.description ?? item?.subtitle ?? item?.explanation ?? "Shift flexible loads into the solar window."),
      window: String(item?.window ?? item?.recommended_window ?? "12:30 PM – 3:00 PM"),
      expectedSavingsInr: num(item?.expectedSavingsInr ?? item?.expected_savings_inr),
      co2AvoidedKg: num(item?.co2AvoidedKg ?? item?.co2_avoided_kg),
      points: num(item?.points ?? item?.green_points),
      status: (item?.status ?? "suggested") as SolarRecommendationStatus,
      action: item?.action ? String(item.action) : undefined,
    })),
    forecast: {
      generatedKwh: num(forecast.generatedKwh ?? forecast.generated_kwh ?? forecast.expected_generation_kwh, 21.2),
      peakWindow: String(forecast.peakWindow ?? forecast.peak_window ?? (forecast.peak_start && forecast.peak_end ? `${forecast.peak_start} – ${forecast.peak_end}` : "12:15 PM – 2:45 PM")),
      weather: String(forecast.weather ?? "Mostly sunny"),
      opportunity: String(forecast.opportunity ?? "High"),
      message: String(forecast.message ?? forecast.advice ?? "Schedule EV charging, laundry and battery charging between 12 PM and 3 PM."),
    },
    financial: {
      actualSavingsInr: num(financial.actualSavingsInr ?? financial.actual_savings_inr, num(pick("moneySavedInr", "money_saved_inr", "estimated_savings_inr"), 118)),
      additionalSavingsInr: num(financial.additionalSavingsInr ?? financial.additional_savings_inr ?? financial.additional_possible_savings_inr, 34),
      optimizedSavingsInr: num(financial.optimizedSavingsInr ?? financial.optimized_savings_inr ?? financial.potential_optimized_savings_inr, 152),
      tariffInrPerKwh: num(financial.tariffInrPerKwh ?? financial.tariff_inr_per_kwh ?? financial.import_tariff_inr_per_kwh, 8),
    },
    rewards: list(pick("rewards", "green_rewards")).map((item: any) => ({
      label: String(item?.label ?? item?.title ?? "Solar action"),
      points: num(item?.points ?? item?.green_points),
      unlocked: item?.unlocked !== false,
    })),
    comparison: {
      current: {
        generatedKwh: num(current.generatedKwh ?? current.generated_kwh, 20),
        usedKwh: num(current.usedKwh ?? current.used_kwh ?? current.solar_used_kwh, 7),
        exportedKwh: num(current.exportedKwh ?? current.exported_kwh, 13),
        selfConsumptionPct: num(current.selfConsumptionPct ?? current.self_consumption_pct, 35),
      },
      optimized: {
        generatedKwh: num(optimized.generatedKwh ?? optimized.generated_kwh, 20),
        usedKwh: num(optimized.usedKwh ?? optimized.used_kwh ?? optimized.solar_used_kwh, 14),
        exportedKwh: num(optimized.exportedKwh ?? optimized.exported_kwh, 6),
        selfConsumptionPct: num(optimized.selfConsumptionPct ?? optimized.self_consumption_pct, 70),
      },
      additionalSavingsInr: num(comparison.additionalSavingsInr ?? comparison.additional_savings_inr, 42),
      additionalCo2Kg: num(comparison.additionalCo2Kg ?? comparison.additional_co2_kg, 3.8),
    },
    timeline: list(pick("timeline", "impact_timeline")).map((item: any) => ({
      time: String(item?.time ?? "Today"),
      title: String(item?.title ?? "Solar surplus detected"),
      detail: String(item?.detail ?? item?.description ?? ""),
      points: item?.points == null ? undefined : num(item.points),
    })),
  };
}

export const api = {  // Authentication
  signin: (email: string, password = "password123") =>
    request<AuthResponse>("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, AUTH_REQUEST_TIMEOUT_MS),
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
    }, AUTH_REQUEST_TIMEOUT_MS),
  getDemoUsers: () => request<DemoUserSummary[]>("/api/v1/auth/demo-users"),
  getAuthMe: () => request<UserProfile>("/api/v1/auth/me"),

  // Profile & Impact
  getMe: () => request<UserProfile>("/api/v1/users/me"),
  getImpact: () => request<ImpactBreakdown>("/api/v1/users/me/impact"),
  getImpactTimeseries: () =>
    request<import("@/src/types/api").ImpactTimeseries>(
      "/api/v1/users/me/impact/timeseries"
    ),
  getSolarImpact: () =>
    request<any>("/api/v1/users/me/solar-impact").then(normalizeSolarImpact),
  acceptSolarRecommendation: (id: string) =>
    request<{ recommendation_id: string; status: string; points_awarded: number; message: string }>(
      `/api/v1/users/me/solar-impact/recommendations/${encodeURIComponent(id)}/accept`,
      { method: "POST" }
    ),
  completeSolarRecommendation: (id: string) =>
    request<{ recommendation_id: string; status: string; points_awarded: number; message: string }>(
      `/api/v1/users/me/solar-impact/recommendations/${encodeURIComponent(id)}/complete`,
      { method: "POST" }
    ),
  getActivity: () =>
    request<import("@/src/types/api").ActivityEvent[]>(
      "/api/v1/users/me/activity"
    ),
  getPointsLedger: () =>
    request<PointsLedgerResponse>("/api/v1/users/me/points-ledger"),
  getRecommendations: () =>
    request<Recommendation[]>("/api/v1/users/me/recommendations"),
  getCloset: () => request<Product[]>("/api/v1/users/me/closet"),
  getBadges: () => request<Badge[]>("/api/v1/users/me/badges"),
  getScore: () =>
    request<any>("/api/v1/users/me/score").then(normalizeScoreResponse),
  getDataMeter: () =>
    request<any>("/api/v1/users/me/data-meter").then(normalizeScoreResponse),
  getSteps: () =>
    request<any>("/api/v1/users/me/steps").then(normalizeStepSummary),
  syncSteps: (steps: number) =>
    request<any>("/api/v1/users/me/steps/sync", {
      method: "POST",
      body: JSON.stringify({ steps: Math.max(0, Math.round(steps)) }),
    }).then(normalizeStepSummary),
  verifySustainablePurchase: (payload: {
    filename: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    allow_multiple?: boolean;
  }) =>
    request<import("@/src/types/api").SustainablePurchaseVerification>(
      "/api/v1/sustainable-purchases/verify",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  resetSustainablePurchase: () =>
    request<import("@/src/types/api").SustainablePurchaseVerification>(
      "/api/v1/sustainable-purchases/reset",
      { method: "POST" }
    ),
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

  // Social competition. These endpoints are optional during rollout; the
  // screen supplies an offline demo state until the API is deployed.
  getLeaderboard: (scope: LeaderboardScope, metric: LeaderboardMetric) =>
    request<any>(`/api/v1/leaderboard?scope=${scope}&metric=${metric === "impact_points" ? "reward_points" : "carbon_credit_score"}`)
      .then((raw) => (Array.isArray(raw) ? raw : raw?.entries ?? []).map((item: any, index: number) => ({
        id: String(item.id ?? item.user_id ?? index),
        username: String(item.username ?? "member"),
        display_name: String(item.display_name ?? item.name ?? item.username ?? "Member"),
        impact_points: Number(item.impact_points ?? item.reward_points ?? 0),
        carbon_score: Number(item.carbon_score ?? item.carbon_credit_score ?? 650),
        rank: Number(item.rank ?? index + 1),
        is_current_user: Boolean(item.is_current_user),
        is_friend: Boolean(item.is_friend),
      } as LeaderboardEntry))),
  searchFriends: (username: string) =>
    request<any[]>(`/api/v1/users/search?q=${encodeURIComponent(username)}`).then((items) => items.map((item: any) => ({
      id: String(item.id), username: String(item.username ?? ""), display_name: String(item.display_name ?? item.name ?? "Member"),
      impact_points: Number(item.impact_points ?? 0), carbon_score: Number(item.carbon_score ?? 650), is_friend: item.status === "accepted",
    } as FriendResult))),
  addFriend: (username: string) =>
    request<any>(`/api/v1/friends/${encodeURIComponent(username)}`, { method: "POST" }).then((item) => ({
      id: String(item.id),
      username: String(item.username ?? ""),
      display_name: String(item.display_name ?? item.name ?? "Member"),
      impact_points: Number(item.impact_points ?? 0),
      carbon_score: Number(item.carbon_score ?? 650),
      is_friend: true,
    } as FriendResult)),
  removeFriend: (username: string) =>
    request<{ status: string }>(`/api/v1/friends/${encodeURIComponent(username)}`, {
      method: "DELETE",
    }),
  getChallenges: (period: ChallengePeriod) =>
    request<any[]>(`/api/v1/challenges?cadence=${period}`).then((items) => items.map((item: any) => ({
      id: String(item.id), title: String(item.title), description: String(item.description ?? ""),
      action_label: String(item.action_label ?? "Complete challenge"), period: (item.period ?? item.cadence) as ChallengePeriod,
      progress: Number(item.progress?.progress ?? item.progress ?? 0), target: Number(item.progress?.goal_value ?? item.target ?? item.goal_value ?? 1),
      reward_points: Number(item.reward_points ?? 0), completed: Boolean(item.progress?.completed ?? item.completed), claimed: Boolean(item.progress?.reward_awarded ?? item.claimed),
    } as Challenge))),
  claimChallenge: (id: string) =>
    request<any>(
      `/api/v1/challenges/${encodeURIComponent(id)}/complete`,
      { method: "POST" },
    ).then((item) => ({
      id: String(item.id),
      title: String(item.title ?? ""),
      description: String(item.description ?? ""),
      action_label: String(item.action_label ?? "Complete challenge"),
      period: (item.period ?? item.cadence) as ChallengePeriod,
      progress: Number(item.progress?.progress ?? item.progress ?? 0),
      target: Number(item.progress?.goal_value ?? item.target ?? item.goal_value ?? 1),
      reward_points: Number(item.reward_points ?? 0),
      completed: Boolean(item.progress?.completed ?? item.completed),
      claimed: Boolean(item.progress?.reward_awarded ?? item.claimed),
      points_awarded: Number(item.points_awarded ?? 0),
    } as Challenge & { points_awarded: number })),

  /** League state is intentionally not replaced with a fabricated tier offline. */
  getLeague: async (): Promise<LeagueSummary> => {
    // Fetch status and standings together. Status is the authoritative league
    // payload; a slow/broken standings query must not block the whole page.
    const getStatus = async () => {
      try {
        return await request<any>("/api/v1/league/status");
      } catch (primaryError) {
        // Older local/deployed API instances exposed the plural alias only.
        // Keep Expo clients compatible while teammates restart their server.
        try {
          return await request<any>("/api/v1/leagues/me");
        } catch {
          throw primaryError;
        }
      }
    };
    const getStandings = async () => {
      try {
        return await request<any>("/api/v1/league/standings");
      } catch {
        return request<any>("/api/v1/leagues/standings").catch(() => null);
      }
    };
    const [statusResult, standingsResult] = await Promise.all([
      getStatus(),
      getStandings(),
    ]);
    const remote = statusResult;
    const current = remote.current_league ?? {};
    const tier = current.slug as LeagueTier;
    if (!["bronze", "silver", "gold", "platinum"].includes(tier)) {
      throw new Error("League service returned an unknown tier");
    }
    const entries = Array.isArray(standingsResult)
      ? standingsResult
      : standingsResult?.entries ?? standingsResult?.standings ?? [];
    const standings: LeagueSummary["standings"] = Array.isArray(entries)
      ? entries.map((entry: any) => ({
          id: String(entry.user_id ?? entry.id),
          display_name: String(entry.name ?? entry.display_name ?? "Member"),
          username: String(entry.username ?? "member"),
          league_points: Number(entry.season_league_points ?? entry.league_points ?? 0),
          rank: Number(entry.rank ?? 0),
          is_current_user: Boolean(entry.is_current_user),
        }))
      : [];
    const status: LeaguePromotionStatus =
      remote.promotion_status === "ready" || remote.promotion_status === "promoted"
        ? "promoted"
        : remote.promotion_status === "at_risk"
          ? "at_risk"
          : "holding";
    return {
      tier,
      badge_id: String(current.badge_id ?? `league_${tier}`),
      badge_asset_url:
        typeof current.badge_asset_url === "string"
          ? current.badge_asset_url
          : null,
      color_hex: typeof current.color_hex === "string" ? current.color_hex : null,
      league_name: `${current.display_name ?? tier[0].toUpperCase() + tier.slice(1)} League`,
      league_points: Number(remote.season_league_points ?? 0),
      promotion_threshold:
        remote.promotion_threshold == null ? null : Number(remote.promotion_threshold),
      weekly_actions_completed: Number(remote.weekly_action_count ?? 0),
      weekly_actions_target: 5,
      promotion_status: status,
      season_label: `${remote.season_key ?? "Current"} season`,
      demotion_note: "On the first day of each month, every league drops one tier. Bronze is protected.",
      last_promotion_at: typeof remote.last_promotion_at === "string" ? remote.last_promotion_at : null,
      last_promotion_from: ["bronze", "silver", "gold", "platinum"].includes(String(remote.last_promotion_from))
        ? (remote.last_promotion_from as LeagueTier)
        : null,
      last_promotion_to: ["bronze", "silver", "gold", "platinum"].includes(String(remote.last_promotion_to))
        ? (remote.last_promotion_to as LeagueTier)
        : null,
      standings,
    };
  },
  getLeagueStandings: async (): Promise<LeagueSummary["standings"]> => {
    try {
      const remote = await request<any>("/api/v1/league/standings");
      const entries = Array.isArray(remote) ? remote : (remote.entries ?? remote.standings ?? []);
      return entries.map((entry: any) => ({
        id: String(entry.user_id ?? entry.id),
        display_name: String(entry.name ?? entry.display_name ?? "Member"),
        username: String(entry.username ?? "member"),
        league_points: Number(entry.season_league_points ?? entry.league_points ?? 0),
        rank: Number(entry.rank ?? 0),
        is_current_user: Boolean(entry.is_current_user),
      }));
    } catch {
      throw new Error("League standings are unavailable");
    }
  },

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
