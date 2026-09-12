import { create } from "zustand";
import * as FileSystem from "expo-file-system";
import type { UserProfile } from "@/src/types/api";

const AUTH_FILE = `${FileSystem.documentDirectory ?? ""}/carbon_loop_auth_v2.json`;

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

  // Shopping factors by frequency
  const shopFreqMap: Record<Frequency, { repair: number; selective: number; frequent: number }> = {
    never: { repair: 0, selective: 0, frequent: 0 },
    rarely: { repair: 4, selective: 6, frequent: 10 },
    sometimes: { repair: 8, selective: 14, frequent: 22 },
    often: { repair: 12, selective: 20, frequent: 40 },
  };

  const s = answers.shopping;
  const rawShopping =
    shopFreqMap[s.repair]?.repair +
    shopFreqMap[s.selective]?.selective +
    shopFreqMap[s.frequent]?.frequent;
  const shoppingKg = Math.max(12, rawShopping);

  const totalKg = transportKg + shoppingKg + homeKg;

  // Base circularity score calculation
  let score = 642;
  if (t.public === "often") score += 14;
  if (t.walk === "often") score += 18;
  if (t.car === "often") score -= 28;
  else if (t.car === "never") score += 12;

  if (s.repair === "often") score += 28;
  else if (s.repair === "sometimes") score += 12;
  if (s.frequent === "often") score -= 32;
  else if (s.frequent === "never") score += 16;
  if (s.selective === "often") score += 10;

  score = Math.min(820, Math.max(480, score));

  return { totalKg, transportKg, shoppingKg, homeKg, score };
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

  setAuth: (user: UserProfile, token: string, isComplete?: boolean) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setBaseline: (baseline: BaselineAnswers) => void;
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
}) {
  try {
    if (FileSystem.documentDirectory) {
      FileSystem.writeAsStringAsync(AUTH_FILE, JSON.stringify(state)).catch(() => {});
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
    set((state) => {
      const next = {
        ...state,
        baseline,
        startingScore: computed.score,
        startingFootprintKg: computed.totalKg,
      };
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
    });
    try {
      if (FileSystem.documentDirectory) {
        FileSystem.deleteAsync(AUTH_FILE, { idempotent: true }).catch(() => {});
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
      if (FileSystem.documentDirectory) {
        const info = await FileSystem.getInfoAsync(AUTH_FILE);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(AUTH_FILE);
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
