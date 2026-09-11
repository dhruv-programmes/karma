import { create } from "zustand";

type AppState = {
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
  lastPointsAwarded: number | null;
  setLastPointsAwarded: (n: number | null) => void;
  scannerLocked: boolean;
  setScannerLocked: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  onboardingDone: false,
  setOnboardingDone: (v) => set({ onboardingDone: v }),
  lastPointsAwarded: null,
  setLastPointsAwarded: (n) => set({ lastPointsAwarded: n }),
  scannerLocked: false,
  setScannerLocked: (v) => set({ scannerLocked: v }),
}));
