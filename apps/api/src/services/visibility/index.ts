/**
 * In-memory visibility predicates — safe to import without loading DB clients.
 */
export {
  isStaff,
  canViewUser,
  canViewProfile,
  canViewAuthorizationPost,
  canViewAuthorizationComment,
  canViewFeedPost,
  canViewFeedComment,
  canViewTarget,
} from "./memory.js";
