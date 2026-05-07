/**
 * Authorization module — centralized visibility rules.
 *
 * Every block check, suspension gate, staff-access rule, deleted-content
 * filter, and public-preview eligibility check crosses this single seam.
 * No service module, feed query, or API router implements its own
 * visibility logic.
 *
 * Usage:
 *   import { authorization } from "./authorization/index.js";
 *   const ctx = await authorization.getViewerContext(session);
 *   if (authorization.canView(ctx, target)) { ... }
 */

export { authorization } from "./production.js";
export type { AuthorizationAdapter } from "@workspace/types";
