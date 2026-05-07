// tRPC router type exports for client/server type sharing.
// This package exports ONLY tRPC router/client type wiring — no logic.

export type { AppRouter } from "@workspace/api/trpc";

// Re-export utility types for tRPC client usage
export type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
