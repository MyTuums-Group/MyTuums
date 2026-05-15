export { db } from "./client.js"
export type { Database, Transaction } from "./client.js"

// All tables — import as `import { user, post, ... } from "@workspace/db"`
export {
  // BetterAuth tables
  user,
  session,
  account,
  verification,
  // Domain tables
  game,
  media,
  profile,
  post,
  comment,
  postLike,
  commentLike,
  follow,
  block,
  favoriteGame,
  userPreference,
  notification,
  moderationCase,
  report,
  moderationAction,
  roleChangeAudit,
  rateLimit,
  contactSubmission,
} from "./schema.js"
