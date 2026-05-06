// ── Reserved usernames — platform, staff, legal, impersonation-sensitive ──
// Repo-versioned list. Run lowercase normalization before checking.

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

export function isReservedUsername(lowercase: string): boolean {
  return RESERVED.indexOf(lowercase) !== -1;
}
