import { create } from "zustand";
import type {
  DocumentConfirmResult,
  DocumentProcessResult,
} from "@/src/types/api";

export type LastDocumentImport = DocumentConfirmResult & {
  title?: string;
};

export type ReceiptCapture = {
  uri: string;
  name: string;
  kind: "image";
};

type AppState = {
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
  lastPointsAwarded: number | null;
  setLastPointsAwarded: (n: number | null) => void;
  scannerLocked: boolean;
  setScannerLocked: (v: boolean) => void;
  documentDraft: DocumentProcessResult | null;
  setDocumentDraft: (draft: DocumentProcessResult | null) => void;
  receiptCapture: ReceiptCapture | null;
  setReceiptCapture: (capture: ReceiptCapture | null) => void;
  lastDocumentImport: LastDocumentImport | null;
  setLastDocumentImport: (result: LastDocumentImport | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  onboardingDone: false,
  setOnboardingDone: (v) => set({ onboardingDone: v }),
  lastPointsAwarded: null,
  setLastPointsAwarded: (n) => set({ lastPointsAwarded: n }),
  scannerLocked: false,
  setScannerLocked: (v) => set({ scannerLocked: v }),
  documentDraft: null,
  setDocumentDraft: (draft) => set({ documentDraft: draft }),
  receiptCapture: null,
  setReceiptCapture: (capture) => set({ receiptCapture: capture }),
  lastDocumentImport: null,
  setLastDocumentImport: (result) => set({ lastDocumentImport: result }),
}));
