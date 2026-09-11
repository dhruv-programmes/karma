import { create } from "zustand";
import * as FileSystem from "expo-file-system";
import type { UserProfile } from "@/src/types/api";

const AUTH_FILE = `${FileSystem.documentDirectory ?? ""}/carbon_loop_auth.json`;

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  logout: () => void;
  hydrateAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true });
    // Asynchronously persist to file
    try {
      if (FileSystem.documentDirectory) {
        FileSystem.writeAsStringAsync(
          AUTH_FILE,
          JSON.stringify({ user, token })
        ).catch(() => {});
      }
    } catch {
      // Ignored
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    try {
      if (FileSystem.documentDirectory) {
        FileSystem.deleteAsync(AUTH_FILE, { idempotent: true }).catch(() => {});
      }
    } catch {
      // Ignored
    }
  },

  hydrateAuth: async () => {
    try {
      if (FileSystem.documentDirectory) {
        const info = await FileSystem.getInfoAsync(AUTH_FILE);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(AUTH_FILE);
          const data = JSON.parse(content);
          if (data.user && data.token) {
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
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
