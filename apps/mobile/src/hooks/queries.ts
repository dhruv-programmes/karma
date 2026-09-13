import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { useAuthStore } from "@/src/store/auth";
import type { ScoreResponse, SolarImpactResponse } from "@/src/types/api";
import {
  fallbackBadges,
  fallbackCloset,
  fallbackFacilities,
  fallbackImpact,
  fallbackPhone,
  fallbackRecommendations,
  fallbackScore,
} from "@/src/lib/fallbacks";

const fallbackSolarImpact: SolarImpactResponse = {
  date: "2026-09-12",
  location: "Ahmedabad",
  systemSizeKw: 5,
  generatedKwh: 20.4,
  consumedKwh: 12.8,
  exportedKwh: 7.6,
  gridImportedKwh: 4.3,
  householdConsumptionKwh: 17.1,
  selfConsumptionPct: 62.7,
  solarContributionPct: 74.9,
  co2AvoidedKg: 7.4,
  moneySavedInr: 118,
  greenPoints: 75,
  solarScore: 78,
  scoreBreakdown: [
    { label: "Self-consumption", value: 82 },
    { label: "Smart load shifting", value: 74 },
    { label: "Solar EV charging", value: 91 },
    { label: "Peak-grid reduction", value: 63 },
  ],
  live: { solarKw: 3.8, homeKw: 2.4, gridExportKw: 1.4, gridImportKw: 0 },
  hourly: [
    { label: "6 AM", solarKwh: 0.2, consumptionKwh: 1.1, gridImportKwh: 0.9, gridExportKwh: 0 },
    { label: "9 AM", solarKwh: 2.1, consumptionKwh: 1.8, gridImportKwh: 0, gridExportKwh: 0.3 },
    { label: "12 PM", solarKwh: 4.6, consumptionKwh: 2.1, gridImportKwh: 0, gridExportKwh: 2.5 },
    { label: "3 PM", solarKwh: 3.9, consumptionKwh: 2.6, gridImportKwh: 0, gridExportKwh: 1.3 },
    { label: "6 PM", solarKwh: 1.6, consumptionKwh: 3.3, gridImportKwh: 1.7, gridExportKwh: 0 },
    { label: "9 PM", solarKwh: 0, consumptionKwh: 2.5, gridImportKwh: 2.5, gridExportKwh: 0 },
  ],
  recommendations: [
    { id: "ev-solar", title: "Move EV charging to solar hours", body: "You normally charge around 8:00 PM. Shift 6.5 kWh into tomorrow's solar window.", window: "12:30 PM – 3:00 PM", expectedSavingsInr: 42, co2AvoidedKg: 3.8, points: 50, status: "suggested" },
    { id: "laundry-solar", title: "Run laundry during the surplus window", body: "A midday cycle can use excess solar instead of grid electricity.", window: "1:00 PM – 2:30 PM", expectedSavingsInr: 15, co2AvoidedKg: 0.9, points: 15, status: "suggested" },
  ],
  forecast: { generatedKwh: 21.2, peakWindow: "12:15 PM – 2:45 PM", weather: "Mostly sunny", opportunity: "High", message: "Tomorrow is a good day to schedule EV charging, laundry and battery charging between 12 PM and 3 PM." },
  financial: { actualSavingsInr: 118, additionalSavingsInr: 34, optimizedSavingsInr: 152, tariffInrPerKwh: 8 },
  rewards: [
    { label: "EV charged using solar", points: 40 },
    { label: "Laundry shifted to solar peak", points: 15 },
    { label: "70% self-consumption achieved", points: 25 },
  ],
  comparison: { current: { generatedKwh: 20, usedKwh: 7, exportedKwh: 13, selfConsumptionPct: 35 }, optimized: { generatedKwh: 20, usedKwh: 14, exportedKwh: 6, selfConsumptionPct: 70 }, additionalSavingsInr: 42, additionalCo2Kg: 3.8 },
  timeline: [
    { time: "12:20 PM", title: "Solar surplus detected", detail: "Excess generation is available for flexible loads." },
    { time: "12:30 PM", title: "EV charging recommendation sent", detail: "Shift 6.5 kWh into the renewable window." },
    { time: "1:05 PM", title: "Solar window started", detail: "The home is using solar before exporting the excess." },
    { time: "2:45 PM", title: "+45 Green Points awarded", detail: "Solar-first behavior was verified.", points: 45 },
  ],
};

async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Sync a fetched score payload into the auth store (no-op when unchanged). */
function useSyncDataMeter(data: ScoreResponse | undefined) {
  useEffect(() => {
    if (!data) return;
    try {
      useAuthStore.getState().setDataMeter(data);
    } catch {
      // Offline-tolerant: never throw to UI
    }
  }, [data]);
}

export function useScore() {
  const query = useQuery({
    queryKey: ["score"],
    queryFn: () => withFallback(api.getScore, fallbackScore),
    staleTime: 30_000,
  });
  useSyncDataMeter(query.data);
  return query;
}

export function useDataMeter() {
  const query = useQuery({
    queryKey: ["data-meter"],
    queryFn: () => withFallback(api.getDataMeter, fallbackScore),
    staleTime: 30_000,
  });
  useSyncDataMeter(query.data);
  return query;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    // Profile data is the source of truth for balances and progress. An API
    // failure must not look like a successful demo profile.
    queryFn: api.getMe,
  });
}

/**
 * Step data intentionally has no made-up fallback. A missing API/device must
 * look unavailable instead of pretending the person walked a demo distance.
 */
export function useSteps() {
  return useQuery({
    queryKey: ["steps"],
    queryFn: api.getSteps,
    staleTime: 20_000,
  });
}

export function useSyncSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (steps: number) => api.syncSteps(steps),
    onSuccess: (data) => {
      qc.setQueryData(["steps"], data);
      // The backend awards Impact Points, so refresh the existing point source.
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

export function useCommuteSummary() {
  return useQuery({
    queryKey: ["commute-summary"],
    queryFn: api.getCommuteSummary,
    staleTime: 20_000,
  });
}

export function useLogCommute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import("@/src/types/api").CommuteTripRequest) =>
      api.logCommute(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commute-summary"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

export function useImpact() {
  return useQuery({
    queryKey: ["impact"],
    queryFn: () => withFallback(api.getImpact, fallbackImpact),
  });
}

export function useImpactTimeseries() {
  return useQuery({
    queryKey: ["impact-timeseries"],
    queryFn: () =>
      withFallback(api.getImpactTimeseries, {
        points: [
          { label: "W1", week_start: "2026-02-03", kg: 18 },
          { label: "W2", week_start: "2026-02-10", kg: 22 },
          { label: "W3", week_start: "2026-02-17", kg: 16 },
          { label: "W4", week_start: "2026-02-24", kg: 28 },
          { label: "W5", week_start: "2026-03-03", kg: 34 },
          { label: "W6", week_start: "2026-03-10", kg: 41 },
          { label: "W7", week_start: "2026-03-17", kg: 29 },
          { label: "W8", week_start: "2026-03-24", kg: 24 },
        ],
        purchases_kg: 48,
        transport_kg: 12,
        energy_kg: 22,
        this_month_kg: 55,
        previous_month_kg: 40,
      }),
  });
}

export function useSolarImpact() {
  return useQuery({
    queryKey: ["solar-impact"],
    queryFn: () => withFallback(api.getSolarImpact, fallbackSolarImpact),
    staleTime: 30_000,
  });
}

export function useSolarRecommendationActions() {
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: (id: string) => api.acceptSolarRecommendation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solar-impact"] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => api.completeSolarRecommendation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solar-impact"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
  return { accept, complete };
}

export function useActivity() {
  return useQuery({
    queryKey: ["activity"],
    queryFn: () =>
      withFallback(api.getActivity, [
        {
          id: "1",
          kind: "scan",
          title: "Scanned Galaxy phone",
          subtitle: "Barcode matched",
          points_delta: 0,
          created_at: "2026-03-25T09:12:00",
        },
      ]),
  });
}

/** Server-authoritative earned/spent Karma Coins history. */
export function usePointsLedger() {
  return useQuery({
    queryKey: ["points-ledger"],
    queryFn: api.getPointsLedger,
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: () =>
      withFallback(api.getRecommendations, fallbackRecommendations),
  });
}

export function useCloset() {
  return useQuery({
    queryKey: ["closet"],
    queryFn: () => withFallback(api.getCloset, fallbackCloset),
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: () => withFallback(api.getBadges, fallbackBadges),
  });
}

/** Current league state is server-backed; do not substitute a fake tier offline. */
export function useLeague() {
  return useQuery({
    queryKey: ["league"],
    queryFn: api.getLeague,
    staleTime: 30_000,
    // A phone can briefly race the local API while Wi-Fi/Expo Go is
    // connecting. Retry transient failures before presenting "unavailable".
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 3_000),
    refetchOnReconnect: true,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () =>
      withFallback(() => api.getProduct(id), {
        ...fallbackPhone,
        id,
      }),
    enabled: !!id,
  });
}

export function useCircularOptions(id: string) {
  return useQuery({
    queryKey: ["circular-options", id],
    queryFn: async () => {
      try {
        return await api.getCircularOptions(id);
      } catch {
        return {
          product: { ...fallbackPhone, id },
          options: [
            {
              action_type: "REPAIR" as const,
              title: "Repair",
              estimated_cost_inr: 4000,
              estimated_co2e_impact_kg: 80,
              co2e_avoided_kg: 120,
              expected_lifetime_months: 24,
              convenience: 0.85,
              availability: "2 repair options nearby",
              effort: "low" as const,
              explanation: "Best circular option for this device.",
              score: 92,
              next_action: "FIND_REPAIR",
            },
            {
              action_type: "RECYCLE" as const,
              title: "Recycle",
              estimated_cost_inr: 0,
              estimated_co2e_impact_kg: 0.3,
              co2e_avoided_kg: 25,
              convenience: 0.65,
              availability: "Nearby facility available",
              effort: "medium" as const,
              explanation: "",
              score: 50,
              next_action: "FIND_RECYCLE",
            },
            {
              action_type: "REPLACE" as const,
              title: "Replace new",
              estimated_cost_inr: 75000,
              estimated_co2e_impact_kg: 70,
              co2e_avoided_kg: 0,
              convenience: 0.9,
              availability: "Retail available",
              effort: "low" as const,
              explanation: "",
              score: 20,
              next_action: "SHOP_NEW",
            },
          ],
          best_option: {
            action_type: "REPAIR" as const,
            title: "Repair",
            estimated_cost_inr: 4000,
            estimated_co2e_impact_kg: 80,
            co2e_avoided_kg: 120,
            expected_lifetime_months: 24,
            convenience: 0.85,
            availability: "2 repair options nearby",
            effort: "low" as const,
            explanation:
              "Repairable — cheaper than replacement with significant environmental benefit.",
            score: 92,
            next_action: "FIND_REPAIR",
          },
          carbon: {
            estimated_co2e_kg: 70,
            display: "~70 kg CO₂e",
            confidence: 0.8,
          },
        };
      }
    },
    enabled: !!id,
  });
}

export function useFacilitiesNearby(
  type?: string,
  lat?: number,
  lng?: number,
  options?: { allowFallback?: boolean },
) {
  const allowFallback = options?.allowFallback ?? true;
  return useQuery({
    queryKey: ["facilities-nearby", type ?? "all", lat ?? 12.9716, lng ?? 77.5946],
    queryFn: () =>
      allowFallback
        ? withFallback(
            () => api.getFacilitiesNearby(type, lat, lng),
            fallbackFacilities.filter((f) => !type || f.facility_type === type)
          )
        : api.getFacilitiesNearby(type, lat, lng),
  });
}

export function useRepairNearby() {
  return useFacilitiesNearby("repair");
}

export function useCompleteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action_type,
    }: {
      id: string;
      action_type?: string;
    }) => api.completeAction(id, action_type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: () =>
      withFallback(api.getRewards, [
        {
          id: "55555555-5555-5555-5555-555555555501",
          title: "₹200 repair voucher",
          description: "Mock partner voucher for verified phone repair.",
          points_required: 300,
          brand: "Indiranagar Device Care",
          is_mock: true,
        },
      ]),
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.redeemReward(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

export function useOffsets() {
  return useQuery({
    queryKey: ["offsets"],
    queryFn: () =>
      withFallback(api.getOffsets, [
        {
          id: "77777777-7777-7777-7777-777777777701",
          name: "Mangrove restoration — Sundarbans",
          provider: "EcoVerified Demo",
          co2e_kg: 100,
          price_inr: 450,
          verification_status: "Verified",
          geography: "IN",
          description: "Community mangrove project. Demo listing only.",
        },
      ]),
  });
}

export function usePurchaseOffset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.purchaseOffset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["impact"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

export function useParseReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.parseReceipt(undefined, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["impact"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["impact-timeseries"] });
      qc.invalidateQueries({ queryKey: ["points-ledger"] });
      qc.invalidateQueries({ queryKey: ["league"] });
    },
  });
}

function invalidateDocumentQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["impact"] });
  qc.invalidateQueries({ queryKey: ["badges"] });
  qc.invalidateQueries({ queryKey: ["me"] });
  qc.invalidateQueries({ queryKey: ["activity"] });
  qc.invalidateQueries({ queryKey: ["points-ledger"] });
  qc.invalidateQueries({ queryKey: ["league"] });
  qc.invalidateQueries({ queryKey: ["impact-timeseries"] });
  qc.invalidateQueries({ queryKey: ["score"] });
  qc.invalidateQueries({ queryKey: ["rewards"] });
  qc.invalidateQueries({ queryKey: ["leaderboard"] });
}

export function useConfirmDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      items,
    }: {
      exampleId?: string;
      items: import("@/src/types/api").DocumentConfirmItem[];
    }) =>
      import("@/src/lib/ai").then(({ confirmDocumentImport }) =>
        confirmDocumentImport(items)
      ),
    onSuccess: () => {
      invalidateDocumentQueries(qc);
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () =>
      withFallback(api.getTransactions, [
        {
          id: "1",
          date: "2026-03-02",
          merchant: "Swiggy",
          amount_inr: 420,
          category: "Food" as const,
        },
        {
          id: "2",
          date: "2026-03-04",
          merchant: "Uber",
          amount_inr: 280,
          category: "Transport" as const,
        },
      ]),
  });
}
