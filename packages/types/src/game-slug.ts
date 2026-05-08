// ── GameSlug — branded type only ──
// Validation logic (createGameSlug) moved to apps/api/src/services/game/game.policy.ts

declare const __brand: unique symbol;
export type GameSlug = string & { [__brand]: "GameSlug" };