import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import {
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
              action_type: "REFURBISH" as const,
              title: "Buy refurbished",
              estimated_cost_inr: 28000,
              estimated_co2e_impact_kg: 40,
              co2e_avoided_kg: 85,
              convenience: 0.7,
              availability: "Refurbished market available",
              effort: "medium" as const,
              explanation: "",
              score: 70,
              next_action: "COMPARE_REFURB",
            },
            {
              action_type: "RESELL" as const,
              title: "Resell",
              estimated_cost_inr: 0,
              estimated_co2e_impact_kg: 1,
              co2e_avoided_kg: 55,
              money_return_inr: 16000,
              convenience: 0.75,
              availability: "Resale platforms available",
              effort: "low" as const,
              explanation: "",
              score: 68,
              next_action: "LIST_FOR_SALE",
            },
            {
              action_type: "DONATE" as const,
              title: "Donate",
              estimated_cost_inr: 0,
              estimated_co2e_impact_kg: 0.5,
              co2e_avoided_kg: 40,
              convenience: 0.8,
              availability: "Donation centers nearby",
              effort: "low" as const,
              explanation: "",
              score: 60,
              next_action: "FIND_DONATION",
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

export function useRepairNearby() {
  return useQuery({
    queryKey: ["repair-nearby"],
    queryFn: () => withFallback(() => api.getRepairNearby(), fallbackFacilities),
  });
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
        {
          id: "55555555-5555-5555-5555-555555555503",
          title: "Eco packaging credit",
          description: "Demo brand channel reward for circular actions.",
          points_required: 250,
          brand: "GreenCart (demo)",
          is_mock: true,
        },
        {
          id: "55555555-5555-5555-5555-555555555504",
          title: "Secondhand fashion credit",
          description: "Mock reward for resale/donation completion.",
          points_required: 350,
          brand: "ReWear Hub (demo)",
          is_mock: true,
        },
      ]),
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
