import { create } from "zustand";

export interface SustainablePurchaseState {
  isVerified: boolean;
  rewardClaimed: boolean;
  rewardPoints: number;
  verifiedAt: string | null;
  documentName: string | null;
  documentSize: number | null;
  vehicleMakeModel: string;
  vehicleType: string;
  ownership: string;
  setVerified: (data?: {
    documentName?: string;
    documentSize?: number;
    vehicleMakeModel?: string;
  }) => void;
  claimReward: () => void;
  resetDemo: () => void;
}

export const useSustainablePurchaseStore = create<SustainablePurchaseState>((set) => ({
  isVerified: false,
  rewardClaimed: false,
  rewardPoints: 1500,
  verifiedAt: null,
  documentName: null,
  documentSize: null,
  vehicleMakeModel: "Tata Nexon EV",
  vehicleType: "Electric Vehicle",
  ownership: "Verified Owner",
  setVerified: (data) =>
    set({
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      documentName: data?.documentName ?? "vehicle_registration_rc.pdf",
      documentSize: data?.documentSize ?? 2450000,
      vehicleMakeModel: data?.vehicleMakeModel ?? "Tata Nexon EV",
    }),
  claimReward: () =>
    set({
      rewardClaimed: true,
    }),
  resetDemo: () =>
    set({
      isVerified: false,
      rewardClaimed: false,
      verifiedAt: null,
      documentName: null,
      documentSize: null,
    }),
}));
