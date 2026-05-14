import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import {
  type AccountStatus,
  type CasePriority,
  type CaseStatus,
  type ContactCategory,
  type MediaPurpose,
  type MediaStatus,
  type ModerationActionType,
  type NotificationType,
  type ReportReason,
  type ReportTargetType,
  type UserRole,
} from "@workspace/types";

const USER_ROLES = [
  "user",
  "moderator",
  "admin",
  "owner",
] as const satisfies readonly UserRole[];

const ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "account_deleted",
] as const satisfies readonly AccountStatus[];

const MEDIA_PURPOSES = [
  "post_attachment",
  "profile_avatar",
  "profile_banner",
] as const satisfies readonly MediaPurpose[];

const MEDIA_STATUSES = [
  "pending",
  "ready",
  "attached",
  "failed",
  "deleted",
] as const satisfies readonly MediaStatus[];

const CASE_STATUSES = [
  "open",
  "reviewing",
  "dismissed",
  "actioned",
] as const satisfies readonly CaseStatus[];

const CASE_PRIORITIES = [
  "normal",
  "urgent",
] as const satisfies readonly CasePriority[];

const REPORT_REASONS = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const satisfies readonly ReportReason[];

const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "profile",
] as const satisfies readonly ReportTargetType[];

const MODERATION_ACTION_TYPES = [
  "remove_post",
  "restore_post",
  "remove_comment",
  "restore_comment",
  "suspend_user",
  "unsuspend_user",
  "dismiss_case",
] as const satisfies readonly ModerationActionType[];

const NOTIFICATION_TYPES = [
  "follow",
  "post_like",
  "post_comment",
  "comment_like",
  "content_removed",
] as const satisfies readonly NotificationType[];

const CONTACT_CATEGORIES = [
  "account_access",
  "moderation_or_safety",
  "privacy_or_data",
  "bug_report",
  "general_support",
  "other",
] as const satisfies readonly ContactCategory[];

// ─────────────────────────────────────────────────────────────────────
// BetterAuth tables
//
// These follow BetterAuth's expected column names and types so the
// Drizzle adapter from better-auth/adapters/drizzle can map them.
// BetterAuth generates its own text IDs; domain tables use UUIDs.
// ─────────────────────────────────────────────────────────────────────

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),

    // ── MyTuums fields ──────────────────────────────────────────────
    /** Timestamp of the 13+ age-confirmation checkbox during signup */
    ageConfirmedAt: timestamp("age_confirmed_at", {
      withTimezone: true,
    }),
    /**
     * Role escalation: owner bootstraps via env, then owner → admin/moderator.
     * DB is the source of truth; auth middleware reads this column.
     */
    role: text("role", {
      enum: USER_ROLES,
    })
      .notNull()
      .default("user"),
    /** Account lifecycle state */
    accountStatus: text("account_status", {
      enum: ACCOUNT_STATUSES,
    })
      .notNull()
      .default("active"),
    /** When the user deleted their account (for hold-window tracking) */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** When a temporary suspension expires (null = active or indefinite) */
    suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    index("user_email_idx").on(table.email),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    /** Hashed password for email/password provider */
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    /** Email address being verified */
    identifier: text("identifier").notNull(),
    /** The verification token/code */
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─────────────────────────────────────────────────────────────────────
// Domain tables — UUID primary keys, snake_case DB columns
// ─────────────────────────────────────────────────────────────────────

export const game = pgTable(
  "game",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Immutable url-safe slug (lowercase alphanumeric + hyphens) */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Alternate search names stored as JSON array */
    aliases: jsonb("aliases").$type<string[]>().default([]),
    coverImageUrl: text("cover_image_url"),
    /** Soft-delete / hide flag */
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("game_slug_unique").on(table.slug),
    index("game_slug_idx").on(table.slug),
    index("game_slug_search_trgm_idx").using(
      "gin",
      sql`(public.immutable_unaccent(lower(${table.slug}))) gin_trgm_ops`,
    ),
    index("game_name_search_trgm_idx").using(
      "gin",
      sql`(public.immutable_unaccent(lower(${table.name}))) gin_trgm_ops`,
    ),
    index("game_aliases_search_trgm_idx").using(
      "gin",
      sql`(public.immutable_unaccent(lower(coalesce(${table.aliases}::text, '')))) gin_trgm_ops`,
    ),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** User who uploaded this media */
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose", {
      enum: MEDIA_PURPOSES,
    }).notNull(),
    status: text("status", {
      enum: MEDIA_STATUSES,
    })
      .notNull()
      .default("pending"),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    /** Azure blob key (path within container) */
    blobKey: text("blob_key"),
    /** Azure storage container name */
    storageContainer: text("storage_container"),
    /** When upload completed (blob confirmed at rest) */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /** Soft-expiry for unconfirmed uploads and deleted media */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_owner_id_idx").on(table.ownerId),
    index("media_status_idx").on(table.status),
  ],
);

export const profile = pgTable(
  "profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Globally-unique lowercase handle */
    username: text("username").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarMediaId: uuid("avatar_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    bannerMediaId: uuid("banner_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("profile_user_id_unique").on(table.userId),
    uniqueIndex("profile_username_unique").on(table.username),
    index("profile_username_idx").on(table.username),
    index("profile_username_search_trgm_idx").using(
      "gin",
      sql`(public.immutable_unaccent(lower(${table.username}))) gin_trgm_ops`,
    ),
    index("profile_display_name_search_trgm_idx").using(
      "gin",
      sql`(public.immutable_unaccent(lower(coalesce(${table.displayName}, '')))) gin_trgm_ops`,
    ),
  ],
);

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Opaque public ID for client-facing routes — never expose internal UUID */
    publicId: text("public_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    gameTagId: uuid("game_tag_id").references(() => game.id, {
      onDelete: "set null",
    }),
    /** Single media attachment (v1 limit: 1 per post) */
    mediaAttachmentId: uuid("media_attachment_id").references(() => media.id, {
      onDelete: "set null",
    }),
    /** Denormalized — updated transactionally with post_like rows */
    likeCount: integer("like_count").notNull().default(0),
    /** Denormalized — updated transactionally with comment rows */
    commentCount: integer("comment_count").notNull().default(0),
    /** User self-deletion timestamp (null = not deleted) */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Moderation removal timestamp (null = not removed) */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    /** Public reason shown to author when content is removed */
    removalPublicReason: text("removal_public_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_public_id_unique").on(table.publicId),
    index("post_author_id_idx").on(table.authorId),
    index("post_created_at_idx").on(table.createdAt),
    index("post_game_tag_id_idx").on(table.gameTagId),
  ],
);

export const comment = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    /** Denormalized — updated transactionally with comment_like rows */
    likeCount: integer("like_count").notNull().default(0),
    /** User self-deletion timestamp (null = not deleted) */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Moderation removal timestamp (null = not removed) */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    /** Public reason shown to author when content is removed */
    removalPublicReason: text("removal_public_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comment_post_id_idx").on(table.postId),
    index("comment_author_id_idx").on(table.authorId),
  ],
);

export const postLike = pgTable(
  "post_like",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("post_like_unique").on(table.userId, table.postId),
    index("post_like_post_id_idx").on(table.postId),
  ],
);

export const commentLike = pgTable(
  "comment_like",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("comment_like_unique").on(table.userId, table.commentId),
    index("comment_like_comment_id_idx").on(table.commentId),
  ],
);

export const follow = pgTable(
  "follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followedId: text("followed_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("follow_unique").on(table.followerId, table.followedId),
    index("follow_follower_id_idx").on(table.followerId),
    index("follow_followed_id_idx").on(table.followedId),
  ],
);

export const block = pgTable(
  "block",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("block_unique").on(table.blockerId, table.blockedId),
    index("block_blocker_id_idx").on(table.blockerId),
  ],
);

export const favoriteGame = pgTable(
  "favorite_game",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "cascade" }),
    /** Insertion order for deterministic display (1–5) */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("favorite_game_unique").on(table.profileId, table.gameId),
    index("favorite_game_profile_id_idx").on(table.profileId),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", {
            enum: NOTIFICATION_TYPES,
    }).notNull(),
    /** User whose action triggered the notification (nullable for system) */
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /**
     * Structured payload — e.g. { postId, commentId }.
     * Immutable after insert. No generated display text stored.
     */
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_recipient_id_idx").on(table.recipientId),
    index("notification_created_at_idx").on(table.createdAt),
  ],
);

export const moderationCase = pgTable(
  "moderation_case",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type", {
      enum: REPORT_TARGET_TYPES,
    }).notNull(),
    /**
     * Polymorphic reference — the UUID of the target entity.
     * FK constraint is enforced at the application layer.
     */
    targetId: uuid("target_id").notNull(),
    status: text("status", {
      enum: CASE_STATUSES,
    })
      .notNull()
      .default("open"),
    priority: text("priority", {
      enum: CASE_PRIORITIES,
    })
      .notNull()
      .default("normal"),
    /** Moderator assigned to this case (nullable when unassigned) */
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("moderation_case_status_idx").on(table.status),
    index("moderation_case_assignee_id_idx").on(table.assigneeId),
  ],
);

export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type", {
      enum: REPORT_TARGET_TYPES,
    }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason", {
            enum: REPORT_REASONS,
    }).notNull(),
    /** Free-text notes from the reporter */
    notes: text("notes"),
    /** Linked moderation case (created when report is triaged) */
    moderationCaseId: uuid("moderation_case_id").references(
      () => moderationCase.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [

    index("report_reporter_id_idx").on(table.reporterId),
    index("report_moderation_case_id_idx").on(table.moderationCaseId),
  ],
);

export const moderationAction = pgTable(
  "moderation_action",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => moderationCase.id, { onDelete: "cascade" }),
    /** Moderator/admin who performed this action */
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action", {
            enum: MODERATION_ACTION_TYPES,
    }).notNull(),
    reason: text("reason", {
            enum: REPORT_REASONS,
    }).notNull(),
    /** Shown to the content author (user-facing) */
    publicReason: text("public_reason"),
    /** Internal notes — never exposed to reported user */
    internalNotes: text("internal_notes"),
    /** When true, overrides a conflicting action (e.g. dismiss an actioned case) */
    conflictOverride: boolean("conflict_override").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("moderation_action_case_id_idx").on(table.caseId)],
);

export const roleChangeAudit = pgTable(
  "role_change_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Admin/owner who changed the role */
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** User whose role was changed */
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    oldRole: text("old_role", {
      enum: USER_ROLES,
    }).notNull(),
    newRole: text("new_role", {
      enum: USER_ROLES,
    }).notNull(),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("role_change_audit_target_idx").on(table.targetUserId)],
);

export const rateLimit = pgTable(
  "rate_limit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Composite key identifier (e.g. "login:192.168.1.1") */
    key: text("key").notNull(),
    /** Action being rate-limited */
    action: text("action").notNull(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rate_limit_key_action_idx").on(table.key, table.action),
  ],
);

export const contactSubmission = pgTable(
  "contact_submission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Nullable — unauthenticated users can submit contact forms */
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    email: text("email"),
    category: text("category", {
            enum: CONTACT_CATEGORIES,
    }).notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("contact_submission_category_idx").on(table.category)],
);
