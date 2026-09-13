import { create } from "zustand";

export type SolarAsset = {
  id: string;
  name: string;
  location: string;
  systemSizeKw: number;
  addedAt: string;
  rewardPoints: number;
};

type SolarAssetState = {
  panels: SolarAsset[];
  selectedPanelId: string | null;
  addPanel: (data: { name: string; location: string; systemSizeKw: number }) => void;
  selectPanel: (id: string) => void;
  removePanel: (id: string) => void;
};

export const useSolarAssetsStore = create<SolarAssetState>((set) => ({
  panels: [],
  selectedPanelId: null,
  addPanel: ({ name, location, systemSizeKw }) =>
    set((state) => {
      const normalizedSize = Math.min(50, Math.max(0.5, Number(systemSizeKw) || 3));
      const panel: SolarAsset = {
        id: `solar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || `Solar panel ${state.panels.length + 1}`,
        location: location.trim() || "Home rooftop",
        systemSizeKw: normalizedSize,
        addedAt: new Date().toISOString(),
        // Solar is the highest-value verified asset in this prototype. The
        // bounded formula scales with system size without becoming exploitable.
        rewardPoints: Math.round(Math.min(1800, 1200 + normalizedSize * 30)),
      };
      return {
        panels: [...state.panels, panel],
        selectedPanelId: panel.id,
      };
    }),
  selectPanel: (id) => set((state) => ({
    selectedPanelId: state.panels.some((panel) => panel.id === id)
      ? id
      : state.selectedPanelId,
  })),
  removePanel: (id) =>
    set((state) => {
      const panels = state.panels.filter((panel) => panel.id !== id);
      return {
        panels,
        selectedPanelId:
          state.selectedPanelId === id ? panels[0]?.id ?? null : state.selectedPanelId,
      };
    }),
}));
