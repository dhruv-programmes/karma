import { create } from "zustand";

export interface SustainablePurchaseState {
  isVerified: boolean;
  rewardClaimed: boolean;
  /** Reward returned by the verification API; zero means no new reward. */
  rewardPoints: number;
  verifiedAt: string | null;
  documentName: string | null;
  documentSize: number | null;
  vehicleMakeModel: string;
  vehicleType: string;
  ownership: string;
  ownerName: string | null;
  registrationNumber: string | null;
  setVerified: (data?: {
    documentName?: string;
    documentSize?: number;
    vehicleMakeModel?: string;
    vehicleType?: string;
    ownership?: string;
    ownerName?: string;
    rewardPoints?: number;
    registrationNumber?: string;
  }) => void;
  claimReward: () => void;
  resetDemo: () => void;
}

export const useSustainablePurchaseStore = create<SustainablePurchaseState>((set) => ({
  isVerified: false,
  rewardClaimed: false,
  rewardPoints: 0,
  verifiedAt: null,
  documentName: null,
  documentSize: null,
  vehicleMakeModel: "Tata Nexon EV",
  vehicleType: "Electric Vehicle",
  ownership: "Verified Owner",
  ownerName: null,
  registrationNumber: null,
  setVerified: (data) =>
    set({
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      documentName: data?.documentName ?? "vehicle_registration_rc.pdf",
      documentSize: data?.documentSize ?? 2450000,
      vehicleMakeModel: data?.vehicleMakeModel ?? "Tata Nexon EV",
      vehicleType: data?.vehicleType ?? "Electric Vehicle",
      ownership: data?.ownership ?? "Verified Owner",
      ownerName: data?.ownerName ?? null,
      registrationNumber: data?.registrationNumber ?? null,
      rewardPoints: Math.max(0, Math.round(data?.rewardPoints ?? 0)),
    }),
  claimReward: () =>
    set({
      rewardClaimed: true,
    }),
  resetDemo: () =>
    set({
      isVerified: false,
      rewardClaimed: false,
      rewardPoints: 0,
      verifiedAt: null,
      documentName: null,
      documentSize: null,
      ownerName: null,
      registrationNumber: null,
    }),
}));

