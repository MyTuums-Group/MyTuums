// tRPC router type exports for client/server type sharing.
// This package exports ONLY tRPC router/client type wiring — no logic.
//
// The AppRouter type lives in apps/api/src/trpc.ts. After the API
// router is implemented (issue #3+), this file will re-export:
//   export type { AppRouter } from "../../apps/api/src/trpc";
//
// For now, export a stub so the build doesn't fail.

import type { AnyRouter } from "@trpc/server";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppRouter extends AnyRouter {}

// Re-export utility types
export type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
