import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import {
  fallbackBadges,
  fallbackCloset,
  fallbackFacilities,
  fallbackImpact,
  fallbackPhone,
  fallbackRecommendations,
  fallbackUser,
} from "@/src/lib/fallbacks";

async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => withFallback(api.getMe, fallbackUser),
  });
}

export function useImpact() {
  return useQuery({
    queryKey: ["impact"],
    queryFn: () => withFallback(api.getImpact, fallbackImpact),
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

export function useFacilitiesNearby(type?: string) {
  return useQuery({
    queryKey: ["facilities-nearby", type ?? "all"],
    queryFn: () =>
      withFallback(
        () => api.getFacilitiesNearby(type),
        fallbackFacilities.filter((f) => !type || f.facility_type === type)
      ),
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
