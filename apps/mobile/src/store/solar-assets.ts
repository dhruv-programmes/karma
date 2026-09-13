import { create } from "zustand";
import * as FileSystem from "expo-file-system";

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
  isHydrated: boolean;
  addPanel: (data: { name: string; location: string; systemSizeKw: number }) => void;
  selectPanel: (id: string) => void;
  removePanel: (id: string) => void;
  hydrateSolarAssets: () => Promise<void>;
};

function getSolarAssetsFilePath() {
  try {
    const fs = FileSystem as any;
    const directory = fs?.documentDirectory;
    return typeof directory === "string" && directory.length > 0
      ? `${directory}/carbon_loop_solar_assets_v1.json`
      : null;
  } catch {
    return null;
  }
}

function persistSolarAssets(panels: SolarAsset[], selectedPanelId: string | null) {
  try {
    const fs = FileSystem as any;
    const path = getSolarAssetsFilePath();
    const payload = JSON.stringify({ panels, selectedPanelId });
    if (path && typeof fs?.writeAsStringAsync === "function") {
      fs.writeAsStringAsync(path, payload).catch(() => {});
    } else if (typeof globalThis.localStorage?.setItem === "function") {
      globalThis.localStorage.setItem("carbon_loop_solar_assets_v1", payload);
    }
  } catch {
    // Offline-safe: the in-memory store remains usable.
  }
}

export const useSolarAssetsStore = create<SolarAssetState>((set) => ({
  panels: [],
  selectedPanelId: null,
  isHydrated: false,
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
      const nextPanels = [...state.panels, panel];
      persistSolarAssets(nextPanels, panel.id);
      return {
        panels: nextPanels,
        selectedPanelId: panel.id,
      };
    }),
  selectPanel: (id) => set((state) => {
    const selectedPanelId = state.panels.some((panel) => panel.id === id)
      ? id
      : state.selectedPanelId;
    persistSolarAssets(state.panels, selectedPanelId);
    return { selectedPanelId };
  }),
  removePanel: (id) =>
    set((state) => {
      const panels = state.panels.filter((panel) => panel.id !== id);
      const selectedPanelId =
        state.selectedPanelId === id ? panels[0]?.id ?? null : state.selectedPanelId;
      persistSolarAssets(panels, selectedPanelId);
      return {
        panels,
        selectedPanelId,
      };
    }),
  hydrateSolarAssets: async () => {
    try {
      const fs = FileSystem as any;
      const path = getSolarAssetsFilePath();
      let raw: string | null = null;
      if (path && typeof fs?.getInfoAsync === "function" && typeof fs?.readAsStringAsync === "function") {
        const info = await fs.getInfoAsync(path);
        if (info.exists) raw = await fs.readAsStringAsync(path);
      } else if (typeof globalThis.localStorage?.getItem === "function") {
        raw = globalThis.localStorage.getItem("carbon_loop_solar_assets_v1");
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        const panels = Array.isArray(parsed?.panels)
          ? parsed.panels.filter((panel: any) => panel && typeof panel.id === "string")
          : [];
        const selectedPanelId = panels.some((panel: SolarAsset) => panel.id === parsed?.selectedPanelId)
          ? parsed.selectedPanelId
          : panels[0]?.id ?? null;
        set({ panels, selectedPanelId, isHydrated: true });
        return;
      }
    } catch {
      // Ignore malformed or unavailable local storage and start clean.
    }
    set({ isHydrated: true });
  },
}));
