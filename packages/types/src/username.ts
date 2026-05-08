// ── Username — immutable v1 handle, 3-20 chars, lowercase [a-z][a-z0-9_] ──
// Behavioral validation (createUsername, isUsername, isReservedUsername)
// moved to apps/api/src/services/profile/ — types packages don't hold logic.

declare const __brand: unique symbol;
export type Username = string & { [__brand]: "Username" };