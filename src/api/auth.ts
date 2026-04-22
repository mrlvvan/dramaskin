import { apiRequest } from "./client";

export type AuthUser = {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: AuthUser;
};

export function requestEmailCode(email: string, purpose: "login" | "signup" = "signup") {
  return apiRequest<{ message: string }>("/auth/request-code", {
    method: "POST",
    body: { email, purpose },
  });
}

export function verifyEmailCode(email: string, code: string) {
  return apiRequest<AuthResponse>("/auth/verify-code", {
    method: "POST",
    body: { email, code },
  });
}

export function devLogin(email?: string) {
  return apiRequest<AuthResponse>("/auth/dev-login", {
    method: "POST",
    body: { email },
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export type MeResponse = {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
};

export function getMe() {
  return apiRequest<MeResponse>("/me", { auth: true });
}

export type PatchMePayload = {
  firstName?: string | null;
  lastName?: string | null;
};

export function patchMe(payload: PatchMePayload) {
  return apiRequest<MeResponse>("/me", { method: "PATCH", auth: true, body: payload });
}
