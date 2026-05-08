/**
 * Typed client for BetterAuth REST endpoints under /api/auth.
 *
 * Returns parsed JSON with typed response shapes so callers don't
 * interact with raw fetch/Response.
 */

import { getApiBase } from "./trpc";

// ── Typed response shapes ────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
  accountStatus?: string;
}

interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  user: AuthUser;
  session: AuthSession;
}

export interface AuthError {
  code: string;
  message: string;
  status: number;
}

type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };

// ── Internal fetch wrapper ───────────────────────────────────────────

async function api(
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; json: unknown }> {
  const res = await fetch(`${getApiBase()}/api/auth${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json = res.ok
    ? await res.json().catch(() => null)
    : await res.json().catch(() => ({ code: "UNKNOWN", message: "Request failed", status: res.status }));
  return { res, json: json as Record<string, unknown> };
}

// ── Public API ───────────────────────────────────────────────────────

export async function signUpEmail(data: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResult<{ token: string; user: AuthUser }>> {
  const { res, json } = await api("/sign-up/email", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) return { ok: false, error: json as AuthError };
  return { ok: true, data: json as { token: string; user: AuthUser } };
}

export async function signInEmail(data: {
  email: string;
  password: string;
}): Promise<AuthResult<{ token: string; user: AuthUser }>> {
  const { res, json } = await api("/sign-in/email", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) return { ok: false, error: json as AuthError };
  return { ok: true, data: json as { token: string; user: AuthUser } };
}

export async function getSession(): Promise<SessionResponse | null> {
  const { res, json } = await api("/get-session");
  if (!res.ok) return null;
  return json as SessionResponse;
}

export async function forgetPassword(data: {
  email: string;
}): Promise<AuthResult<{ success: boolean }>> {
  const { res, json } = await api("/forget-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) return { ok: false, error: json as AuthError };
  return { ok: true, data: json as { success: boolean } };
}

export async function resetPassword(data: {
  token: string;
  newPassword: string;
}): Promise<AuthResult<{ success: boolean }>> {
  const { res, json } = await api("/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) return { ok: false, error: json as AuthError };
  return { ok: true, data: json as { success: boolean } };
}
