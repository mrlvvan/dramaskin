import {
  devLogin,
  getMe,
  logout,
  refreshSession,
  requestEmailCode,
  verifyEmailCode,
  type AuthUser,
  type MeResponse,
} from "../api/auth";
import { useAuthStore } from "../store/authStore";

const ACCESS_KEY = "dramma_access_token";
const REFRESH_KEY = "dramma_refresh_token";

function meToAuthUser(data: MeResponse): AuthUser {
  const dob =
    data.dateOfBirth == null
      ? null
      : typeof data.dateOfBirth === "string"
        ? data.dateOfBirth
        : String(data.dateOfBirth)
  return {
    id: data.id,
    email: data.email,
    role: data.role === "ADMIN" ? "ADMIN" : "USER",
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    phone: data.phone ?? null,
    dateOfBirth: dob,
  };
}

export async function restoreSession(): Promise<void> {
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!access && !refresh) {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    return;
  }

  try {
    const me = await getMe();
    const user = meToAuthUser(me);
    useAuthStore.setState({
      user,
      accessToken: localStorage.getItem(ACCESS_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      isAuthenticated: true,
    });
  } catch {
    useAuthStore.getState().clearSession();
  }
}

export async function sendLoginCode(email: string, purpose: "login" | "signup" = "signup") {
  return requestEmailCode(email, purpose);
}

export async function confirmLoginCode(email: string, code: string) {
  const response = await verifyEmailCode(email, code);
  useAuthStore.getState().setSession({
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  return response.user;
}

export async function devQuickLogin(email?: string) {
  const response = await devLogin(email);
  useAuthStore.getState().setSession({
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });
  return response.user;
}

export async function tryRefreshAccessToken() {
  const store = useAuthStore.getState();
  if (!store.refreshToken) return null;

  const tokens = await refreshSession(store.refreshToken);
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  useAuthStore.setState({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isAuthenticated: true,
  });
  return tokens.accessToken;
}

export async function signOut() {
  const store = useAuthStore.getState();
  if (store.refreshToken) {
    try {
      await logout(store.refreshToken);
    } catch {
      /* ignored */
    }
  }
  store.clearSession();
}
