/**
 * Notification service — production wiring around the Drizzle adapter.
 */

import * as adapter from "./notification.adapter.js"

export const notificationService = adapter

export const {
  list,
  markAllRead,
  markRead,
  recordContentRemoved,
  unreadCount,
} = notificationService
