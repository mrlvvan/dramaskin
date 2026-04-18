import { create } from "zustand";
import type { AuthUser } from "../api/auth";

const ACCESS_KEY = "dramma_access_token";
const REFRESH_KEY = "dramma_refresh_token";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
};

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: readStorage(ACCESS_KEY),
  refreshToken: readStorage(REFRESH_KEY),
  isAuthenticated: Boolean(readStorage(ACCESS_KEY) || readStorage(REFRESH_KEY)),
  setSession: ({ user, accessToken, refreshToken }) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },
  clearSession: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
