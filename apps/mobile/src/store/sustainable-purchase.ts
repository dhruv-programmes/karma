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
  vehicles: VerifiedVehicle[];
  selectedVehicleId: string | null;
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
  selectVehicle: (id: string) => void;
  resetDemo: () => void;
}

export interface VerifiedVehicle {
  id: string;
  makeModel: string;
  vehicleType: string;
  ownership: string;
  ownerName?: string | null;
  registrationNumber?: string | null;
  documentName: string;
  documentSize: number | null;
  rewardPoints: number;
  verifiedAt: string;
}

export const useSustainablePurchaseStore = create<SustainablePurchaseState>((set) => ({
  isVerified: false,
  rewardClaimed: false,
  rewardPoints: 0,
  verifiedAt: null,
  documentName: null,
  documentSize: null,
  vehicleMakeModel: "",
  vehicleType: "",
  ownership: "",
  ownerName: null,
  registrationNumber: null,
  vehicles: [],
  selectedVehicleId: null,
  setVerified: (data) =>
    set((state) => {
      const verifiedAt = new Date().toISOString();
      const vehicle: VerifiedVehicle = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        makeModel: data?.vehicleMakeModel ?? "Tata Nexon EV",
        vehicleType: data?.vehicleType ?? "Electric Vehicle",
        ownership: data?.ownership ?? "Verified Owner",
        ownerName: data?.ownerName ?? null,
        registrationNumber: data?.registrationNumber ?? null,
        documentName: data?.documentName ?? "vehicle_registration_rc.pdf",
        documentSize: data?.documentSize ?? 2450000,
        rewardPoints: (data?.rewardPoints && data.rewardPoints > 0) ? Math.round(data.rewardPoints) : Math.max(0, Math.round(data?.rewardPoints ?? 0)),
        verifiedAt,
      };
      const duplicate = state.vehicles.find(
        (item) => item.documentName.trim().toLowerCase() === vehicle.documentName.trim().toLowerCase()
      );
      if (duplicate) {
        return {
          ...state,
          isVerified: true,
          selectedVehicleId: duplicate.id,
          verifiedAt: duplicate.verifiedAt,
          documentName: duplicate.documentName,
          documentSize: duplicate.documentSize,
          vehicleMakeModel: duplicate.makeModel,
          vehicleType: duplicate.vehicleType,
          ownership: duplicate.ownership,
          ownerName: duplicate.ownerName ?? null,
          registrationNumber: duplicate.registrationNumber ?? null,
          rewardPoints: duplicate.rewardPoints > 0 ? duplicate.rewardPoints : 2450,
        };
      }
      return {
        isVerified: true,
        verifiedAt,
        documentName: vehicle.documentName,
        documentSize: vehicle.documentSize,
        vehicleMakeModel: vehicle.makeModel,
        vehicleType: vehicle.vehicleType,
        ownership: vehicle.ownership,
        ownerName: vehicle.ownerName ?? null,
        registrationNumber: vehicle.registrationNumber ?? null,
        rewardPoints: vehicle.rewardPoints,
        vehicles: [...state.vehicles, vehicle],
        selectedVehicleId: vehicle.id,
      };
    }),
  claimReward: () =>
    set({
      rewardClaimed: true,
    }),
  selectVehicle: (id) =>
    set((state) => {
      const vehicle = state.vehicles.find((item) => item.id === id);
      if (!vehicle) return state;
      return {
        selectedVehicleId: id,
        isVerified: true,
        verifiedAt: vehicle.verifiedAt,
        documentName: vehicle.documentName,
        documentSize: vehicle.documentSize,
        vehicleMakeModel: vehicle.makeModel,
        vehicleType: vehicle.vehicleType,
        ownership: vehicle.ownership,
        ownerName: vehicle.ownerName ?? null,
        registrationNumber: vehicle.registrationNumber ?? null,
        rewardPoints: vehicle.rewardPoints,
      };
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
      vehicles: [],
      selectedVehicleId: null,
    }),
}));

