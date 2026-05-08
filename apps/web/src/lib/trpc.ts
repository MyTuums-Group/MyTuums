import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@workspace/api-contract";

export const trpc = createTRPCReact<AppRouter>();

/** Vite injects import.meta.env at build time. */
export function getApiBase() {
  try {
    const env = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
  } catch {
    // import.meta not available (SSR or non-Vite)
  }
  return "http://localhost:4000";
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBase()}/trpc`,
        transformer: superjson,
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
