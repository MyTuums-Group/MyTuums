/**
 * Engagement service — production wiring around the Drizzle adapter.
 */

import * as adapter from "./engagement.adapter.js";

export const engagementService = adapter;

export const {
  blockUser,
  countUnreadNotifications,
  getProfileEngagement,
  listVisibleNotifications,
  toggleCommentLike,
  toggleFollow,
  togglePostLike,
  unblockUser,
} = engagementService;
