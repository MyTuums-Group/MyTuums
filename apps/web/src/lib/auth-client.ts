/**
 * Thin client for BetterAuth REST endpoints anchored at /api/auth.
 */

const API_BASE = "http://localhost:4000";

/** Vite injects import.meta.env at build time. */
function getApiBase() {
  try {
    const env = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
  } catch {
    // import.meta not available (SSR or non-Vite)
  }
  return API_BASE;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${getApiBase()}/api/auth${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
}

export async function signUpEmail(data: {
  email: string;
  password: string;
  name: string;
}): Promise<Response> {
  return api("/sign-up/email", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signInEmail(data: {
  email: string;
  password: string;
}): Promise<Response> {
  return api("/sign-in/email", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signOut(): Promise<Response> {
  return api("/sign-out", { method: "POST" });
}

export async function getSession(): Promise<unknown> {
  const res = await api("/get-session");
  if (!res.ok) return null;
  return res.json() as Promise<unknown>;
}

export async function forgetPassword(data: {
  email: string;
}): Promise<Response> {
  return api("/forget-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: {
  token: string;
  newPassword: string;
}): Promise<Response> {
  return api("/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
