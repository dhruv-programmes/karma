import { create } from "zustand";
import * as FileSystem from "expo-file-system";
import type { DataMeter, ScoreState, UserProfile } from "@/src/types/api";

function getAuthFilePath(): string | null {
  try {
    const fs = FileSystem as any;
    const dir = fs?.documentDirectory;
    if (typeof dir === "string" && dir.length > 0) {
      return `${dir}/carbon_loop_auth_v2.json`;
    }
  } catch {
    // Ignored
  }
  return null;
}

export type OnboardingStep =
  | "welcome"
  | "account"
  | "baseline"
  | "goal"
  | "reveal"
  | "location"
  | "complete";

export type Frequency = "never" | "rarely" | "sometimes" | "often";

export interface TransportFrequencies {
  public: Frequency;
  twowheeler: Frequency;
  car: Frequency;
  walk: Frequency;
}

export interface ShoppingFrequencies {
  repair: Frequency;
  selective: Frequency;
  frequent: Frequency;
}

export interface BaselineAnswers {
  transport: TransportFrequencies;
  shopping: ShoppingFrequencies;
}

export interface GoalSettings {
  reductionPct: number; // 5..30
  priorities: string[]; // 'emissions' | 'circular' | 'rewards'
}

export const DEFAULT_BASELINE: BaselineAnswers = {
  transport: {
    public: "often",
    twowheeler: "never",
    car: "rarely",
    walk: "sometimes",
  },
  shopping: {
    repair: "sometimes",
    selective: "often",
    frequent: "rarely",
  },
};

function normalizeBaseline(answers: any): BaselineAnswers {
  if (!answers) return DEFAULT_BASELINE;
  // If legacy single string structure
  if (typeof answers.transport === "string") {
    const t = answers.transport;
    const s = answers.shopping;
    return {
      transport: {
        public: t === "public" ? "often" : "rarely",
        twowheeler: t === "twowheeler" ? "often" : "never",
        car: t === "car" ? "often" : "rarely",
        walk: t === "walk" ? "often" : "sometimes",
      },
      shopping: {
        repair: s === "repair" ? "often" : "sometimes",
        selective: s === "selective" ? "often" : "sometimes",
        frequent: s === "frequent" ? "often" : "rarely",
      },
    };
  }
  return {
    transport: { ...DEFAULT_BASELINE.transport, ...(answers.transport || {}) },
    shopping: { ...DEFAULT_BASELINE.shopping, ...(answers.shopping || {}) },
  };
}

export function computeBaselineFootprint(rawAnswers: any): {
  totalKg: number;
  transportKg: number;
  shoppingKg: number;
  homeKg: number;
  score: number;
} {
  const answers = normalizeBaseline(rawAnswers);
  const homeKg = 20; // Clearly labeled baseline home estimate

  // Transport factors by frequency
  const transFreqMap: Record<Frequency, { public: number; twowheeler: number; car: number; walk: number }> = {
    never: { public: 0, twowheeler: 0, car: 0, walk: 0 },
    rarely: { public: 4, twowheeler: 6, car: 12, walk: 2 },
    sometimes: { public: 12, twowheeler: 16, car: 26, walk: 4 },
    often: { public: 22, twowheeler: 26, car: 44, walk: 6 },
  };

  const t = answers.transport;
  const rawTransport =
    transFreqMap[t.public]?.public +
    transFreqMap[t.twowheeler]?.twowheeler +
    transFreqMap[t.car]?.car +
    transFreqMap[t.walk]?.walk;
  const transportKg = Math.max(8, rawTransport);

  // Shopping (REVERSED logic — savers subtract, mirrored from backend Karma formula):
  // | answer    | frequent (driver, +) | selective_rev (saver, reversed) | repair_credit (saver, subtract) |
  // |-----------|----------------------|---------------------------------|-----------------------------------|
  // | never     | 0                    | 16                              | 0                                 |
  // | rarely    | 10                   | 10                              | 4                                 |
  // | sometimes | 22                   | 6                               | 8                                 |
  // | often     | 40                   | 0                               | 12                                |
  // shoppingKg = max(12, frequent + selective_rev - repair_credit)
  const frequentKg: Record<Frequency, number> = {
    never: 0,
    rarely: 10,
    sometimes: 22,
    often: 40,
  };
  const selectiveRevKg: Record<Frequency, number> = {
    never: 16,
    rarely: 10,
    sometimes: 6,
    often: 0,
  };
  const repairCreditKg: Record<Frequency, number> = {
    never: 0,
    rarely: 4,
    sometimes: 8,
    often: 12,
  };

  const s = answers.shopping;
  const rawShopping =
    (frequentKg[s.frequent] ?? 0) +
    (selectiveRevKg[s.selective] ?? 0) -
    (repairCreditKg[s.repair] ?? 0);
  const shoppingKg = Math.max(12, rawShopping);

  const totalKg = transportKg + shoppingKg + homeKg;

  // Karma Credit Score (provisional shown): raw=round(650+(110-totalKg)*2.2),
  // clamped to [480,820], provisional display capped at 680.
  const score = provisionalKcs(totalKg);

  return { totalKg, transportKg, shoppingKg, homeKg, score };
}

// --- Karma Credit Score scale (mirrors backend A2 engine) ---
export const KCS_REF = 110;
export const KCS_BASE = 650;
export const KCS_SLOPE = 2.2;
export const KCS_MIN = 480;
export const KCS_MAX = 820;
export const KCS_PROVISIONAL_CAP = 680;

/** Unclamped Karma Credit Score for a monthly footprint. */
export function rawKcs(totalKg: number): number {
  return Math.round(KCS_BASE + (KCS_REF - totalKg) * KCS_SLOPE);
}

/** Provisional KCS shown in UI: clamped to [480,820], display-capped at 680. */
export function provisionalKcs(totalKg: number): number {
  const clamped = Math.min(KCS_MAX, Math.max(KCS_MIN, rawKcs(totalKg)));
  return Math.min(clamped, KCS_PROVISIONAL_CAP);
}

/** Alias for UI teammate convenience: provisional KCS from monthly kg. */
export function kcsFromKg(kg: number): number {
  return provisionalKcs(kg);
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isDemoMode: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: OnboardingStep;
  baseline: BaselineAnswers | null;
  goal: GoalSettings;
  locationPreference: "granted" | "denied" | "manual" | "skipped" | null;
  startingScore: number;
  startingFootprintKg: number;
  scoreState: ScoreState;
  scoreConfidence: number;
  scoreConfidenceLabel: string;
  dataMeter: DataMeter | null;

  setAuth: (user: UserProfile, token: string, isComplete?: boolean) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setBaseline: (baseline: BaselineAnswers) => void;
  setDataMeter: (meter: DataMeter | null) => void;
  setGoal: (goal: GoalSettings) => void;
  setLocationPreference: (pref: "granted" | "denied" | "manual" | "skipped") => void;
  completeOnboarding: () => void;
  startDemo: (customUser?: Partial<UserProfile>) => void;
  logout: () => void;
  hydrateAuth: () => Promise<void>;
  resetOnboarding: () => void;
}

function persistState(state: {
  user: UserProfile | null;
  token: string | null;
  isDemoMode: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: OnboardingStep;
  baseline: BaselineAnswers | null;
  goal: GoalSettings;
  locationPreference: string | null;
  startingScore: number;
  startingFootprintKg: number;
  scoreState?: ScoreState;
  scoreConfidence?: number;
  scoreConfidenceLabel?: string;
  dataMeter?: DataMeter | null;
}) {
  try {
    const filePath = getAuthFilePath();
    const fs = FileSystem as any;
    if (filePath && typeof fs?.writeAsStringAsync === "function") {
      fs.writeAsStringAsync(filePath, JSON.stringify(state)).catch(() => {});
    }
  } catch {
    // Ignored
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
  isDemoMode: false,
  hasCompletedOnboarding: false,
  onboardingStep: "welcome",
  baseline: DEFAULT_BASELINE,
  goal: { reductionPct: 15, priorities: ["emissions"] },
  locationPreference: null,
  startingScore: 642,
  startingFootprintKg: 74,
  scoreState: "provisional",
  scoreConfidence: 0.4,
  scoreConfidenceLabel: "Low",
  dataMeter: null,

  setAuth: (user, token, isComplete = true) => {
    set((state) => {
      const next = {
        ...state,
        user,
        token,
        isAuthenticated: true,
        isDemoMode: false,
        hasCompletedOnboarding: isComplete,
        onboardingStep: (isComplete ? "complete" : state.onboardingStep) as OnboardingStep,
      };
      persistState(next);
      return next;
    });
  },

  setOnboardingStep: (step) => {
    set((state) => {
      const next = { ...state, onboardingStep: step };
      persistState(next);
      return next;
    });
  },

  setBaseline: (rawBaseline) => {
    const baseline = normalizeBaseline(rawBaseline);
    const computed = computeBaselineFootprint(baseline);
    const reductionPct = get().goal?.reductionPct ?? 15;
    set((state) => {
      const next = {
        ...state,
        baseline,
        startingScore: computed.score,
        startingFootprintKg: computed.totalKg,
        scoreState: "provisional" as ScoreState,
        scoreConfidence: 0.4,
        scoreConfidenceLabel: "Low",
      };
      persistState(next);
      return next;
    });
    // Fire-and-forget backend sync (dynamic import avoids a store<->api
    // import cycle). Offline-tolerant: never throws to UI.
    try {
      import("@/src/lib/api")
        .then(({ api }) =>
          api
            .syncBaseline({
              transport: { ...baseline.transport },
              shopping: { ...baseline.shopping },
              reductionPct,
              totalKg: computed.totalKg,
              provisional: computed.score,
            })
            .then((res) => {
              try {
                if (res) get().setDataMeter(res);
              } catch {
                // Ignored
              }
            })
            .catch(() => {})
        )
        .catch(() => {});
    } catch {
      // Offline — ignored
    }
  },

  setDataMeter: (meter) => {
    const prev = get().dataMeter;
    // Guard against infinite loops from query sync: skip when unchanged.
    try {
      if (JSON.stringify(prev) === JSON.stringify(meter)) return;
    } catch {
      // Fall through and set
    }
    set((state) => {
      const next = { ...state, dataMeter: meter };
      persistState(next);
      return next;
    });
  },

  setGoal: (goal) => {
    set((state) => {
      const next = { ...state, goal };
      persistState(next);
      return next;
    });
  },

  setLocationPreference: (pref) => {
    set((state) => {
      const next = { ...state, locationPreference: pref };
      persistState(next);
      return next;
    });
  },

  completeOnboarding: () => {
    set((state) => {
      const next = {
        ...state,
        hasCompletedOnboarding: true,
        onboardingStep: "complete" as OnboardingStep,
      };
      persistState(next);
      return next;
    });
  },

  startDemo: (customUser) => {
    const demoUser: UserProfile = {
      id: "11111111-1111-1111-1111-111111111111",
      email: "demo@carbonloop.app",
      name: "Alex Rivera",
      circularity_score: 642,
      impact_points: 420,
      streak_days: 5,
      trend_delta: 14,
      loop_level: 2,
      offset_kg_total: 12.5,
      monthly_budget_kg: 63.0,
      ...customUser,
    };
    set((state) => {
      const next = {
        ...state,
        user: demoUser,
        token: "demo-carbon-loop-token",
        isAuthenticated: true,
        isDemoMode: true,
        hasCompletedOnboarding: true,
        onboardingStep: "complete" as OnboardingStep,
      };
      persistState(next);
      return next;
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isDemoMode: false,
      hasCompletedOnboarding: false,
      onboardingStep: "welcome",
      baseline: DEFAULT_BASELINE,
      goal: { reductionPct: 15, priorities: ["emissions"] },
      scoreState: "provisional",
      scoreConfidence: 0.4,
      scoreConfidenceLabel: "Low",
      dataMeter: null,
    });
    try {
      const filePath = getAuthFilePath();
      const fs = FileSystem as any;
      if (filePath && typeof fs?.deleteAsync === "function") {
        fs.deleteAsync(filePath, { idempotent: true }).catch(() => {});
      }
    } catch {
      // Ignored
    }
  },

  resetOnboarding: () => {
    set((state) => {
      const next = {
        ...state,
        hasCompletedOnboarding: false,
        onboardingStep: "welcome" as OnboardingStep,
        baseline: DEFAULT_BASELINE,
      };
      persistState(next);
      return next;
    });
  },

  hydrateAuth: async () => {
    try {
      const filePath = getAuthFilePath();
      const fs = FileSystem as any;
      if (filePath && typeof fs?.getInfoAsync === "function" && typeof fs?.readAsStringAsync === "function") {
        const info = await fs.getInfoAsync(filePath);
        if (info.exists) {
          const content = await fs.readAsStringAsync(filePath);
          const data = JSON.parse(content);
          if (data) {
            const baseline = normalizeBaseline(data.baseline);
            set({
              user: data.user || null,
              token: data.token || null,
              isAuthenticated: Boolean(data.user && data.token),
              isDemoMode: Boolean(data.isDemoMode),
              hasCompletedOnboarding: Boolean(data.hasCompletedOnboarding),
              onboardingStep: data.onboardingStep || (data.hasCompletedOnboarding ? "complete" : "welcome"),
              baseline,
              goal: data.goal || { reductionPct: 15, priorities: ["emissions"] },
              locationPreference: data.locationPreference || null,
              startingScore: data.startingScore || 642,
              startingFootprintKg: data.startingFootprintKg || 74,
              scoreState: data.scoreState === "verified" ? "verified" : "provisional",
              scoreConfidence:
                typeof data.scoreConfidence === "number" ? data.scoreConfidence : 0.4,
              scoreConfidenceLabel: data.scoreConfidenceLabel || "Low",
              dataMeter: (data.dataMeter as DataMeter | null) ?? null,
              isHydrated: true,
            });
            return;
          }
        }
      }
    } catch {
      // Ignored
    }
    set({ isHydrated: true });
  },
}));
