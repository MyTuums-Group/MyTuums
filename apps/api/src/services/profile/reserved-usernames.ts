// ── Reserved usernames — platform, staff, legal, impersonation-sensitive ──
// Moved from @workspace/types: behavioral logic doesn't belong in a types package.

const RESERVED = [
  "admin", "administrator", "support", "security", "mytuums",
  "mytuumsadmin", "staff", "moderator", "mod", "system", "root",
  "api", "help", "contact", "about", "terms", "privacy", "cookies",
  "accessibility", "login", "register", "logout", "settings",
  "notifications", "discover", "following", "home", "feed", "post",
  "search", "game", "games", "report", "reports", "block", "blocks",
  "owner", "founder", "ceo", "official", "verified", "team", "dev",
  "developer", "null", "undefined", "true", "false", "everyone",
  "all", "here", "anonymous", "unknown", "deleted", "removed",
  "suspended",
];

/** Check if a lowercase username is reserved. Input must be pre-lowercased. */
export function isReservedUsername(lowercase: string): boolean {
  return RESERVED.indexOf(lowercase) !== -1;
}