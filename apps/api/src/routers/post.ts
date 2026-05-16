import { z } from "zod"
import { authorization } from "../authorization/index.js"
import type { FeedPageInput } from "../services/feed/index.js"
import { feedVisibilityQueries } from "../services/feed/production.js"
import {
  DiscoverEligibility,
  FollowingEligibility,
  ForYouEligibility,
  ProfileEligibility,
} from "../services/feed/index.js"
import { getCurrentAppUserState } from "../services/app-user-state/index.js"
import {
  createComment as createCommentRecord,
  deleteOwnComment,
  toggleCommentLike,
} from "../services/comment/index.js"
import {
  createCommentPresentation,
  InvalidCommentCursorError,
} from "../services/comment/presentation.js"
import { findBySlug } from "../services/game/game.adapter.js"
import {
  createPost as createPostRecord,
  deleteOwnPost,
} from "../services/post/index.js"
import {
  RATE_LIMIT_POLICIES,
  createUserRateLimitKey,
} from "../services/rate-limit/index.js"
import {
  InvalidFeedCursorError,
  postPublicIdSchema,
} from "../services/post/presentation.js"
import { postPresentation } from "../services/post/presentation.production.js"
import { getOwnerByUsername } from "../services/profile/index.js"
import { mapProfileAccessErrorToTRPC } from "../transport/profile-errors.js"
import {
  mapDiscoverFeedFilterErrorToTRPC,
  mapCreatePostErrorToTRPC,
  mapDeleteOwnPostErrorToTRPC,
  mapPostAppStateErrorToTRPC,
  mapPostAvailabilityErrorToTRPC,
  mapPostPresentationErrorToTRPC,
} from "../transport/post-errors.js"
import {
  mapCreateCommentErrorToTRPC,
  mapDeleteOwnCommentErrorToTRPC,
  mapToggleCommentLikeErrorToTRPC,
} from "../transport/comment-errors.js"
import { enforceRateLimit } from "../transport/rate-limit.js"
import { protectedProcedure, publicProcedure, router } from "../trpc.js"

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 50
const commentPresentation = createCommentPresentation()

const feedPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
})

const discoverFeedSchema = feedPageSchema.extend({
  game: z.preprocess(
    (value: unknown) => {
      if (value === undefined || value === null) return ""
      if (typeof value === "string") return value
      return ""
    },
    z
      .string()
      .trim()
      .max(100)
      .regex(/^(|[a-z0-9]+(?:-[a-z0-9]+)*)$/, "Invalid game filter.")
      .transform((value) => (value === "" ? undefined : value))
  ),
})

export const postRouter = router({
  forYouFeed: protectedProcedure
    .input(feedPageSchema)
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const pageInput = await toFeedPageInputOrThrow(viewer, input)
      const page = await feedVisibilityQueries.queryFeed({
        viewer,
        eligibility: ForYouEligibility.create(),
        limit: pageInput.limit,
        cursor: pageInput.cursor,
      })
      return postPresentation.toFeedResponse(viewer, page)
    }),

  followingFeed: protectedProcedure
    .input(feedPageSchema)
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const pageInput = await toFeedPageInputOrThrow(viewer, input)
      const page = await feedVisibilityQueries.queryFeed({
        viewer,
        eligibility: FollowingEligibility.create(),
        limit: pageInput.limit,
        cursor: pageInput.cursor,
      })
      return postPresentation.toFeedResponse(viewer, page)
    }),

  discoverFeed: protectedProcedure
    .input(discoverFeedSchema)
    .query(async ({ ctx, input }) => {
      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const pageInput = await toFeedPageInputOrThrow(viewer, input)

      let gameSlug: string | null = input.game ?? null
      if (gameSlug) {
        const catalogGame = await findBySlug(gameSlug)
        if (!catalogGame?.isActive) {
          throw mapDiscoverFeedFilterErrorToTRPC({
            kind: "inactive_game_filter",
          })
        }
        gameSlug = catalogGame.slug
      }

      const page = await feedVisibilityQueries.queryFeed({
        viewer,
        eligibility: DiscoverEligibility.create({ gameSlug }),
        limit: pageInput.limit,
        cursor: pageInput.cursor,
      })
      return postPresentation.toFeedResponse(viewer, page)
    }),

  profileFeed: publicProcedure
    .input(
      feedPageSchema.extend({
        username: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx)
      const owner = await getOwnerByUsername(
        input.username,
        viewer,
        authorization
      )
      if (!owner.ok) {
        throw mapProfileAccessErrorToTRPC(owner.error)
      }

      const pageInput = await toFeedPageInputOrThrow(viewer, input)
      const page = await feedVisibilityQueries.queryFeed({
        viewer,
        eligibility: ProfileEligibility.create(owner.value.userId),
        limit: pageInput.limit,
        cursor: pageInput.cursor,
      })

      return postPresentation.toFeedResponse(viewer, page)
    }),

  detail: publicProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx)
      const row = await feedVisibilityQueries.postDetail(viewer, input.publicId)
      if (!row) {
        throw mapPostAvailabilityErrorToTRPC({ kind: "post_not_available" })
      }

      return postPresentation.toPostView(viewer, row)
    }),

  create: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        gameTagId: z.string().uuid().nullable().optional(),
        mediaAttachmentId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appUserState = await getCurrentAppUserState(ctx)
      if (appUserState.kind !== "active_onboarded_profile") {
        throw mapPostAppStateErrorToTRPC({
          kind: "profile_required_for_post",
        })
      }

      await enforceRateLimit({
        key: createUserRateLimitKey(ctx.user.id),
        policy: RATE_LIMIT_POLICIES.postCreate,
        reply: ctx.reply,
        message: "Too many post creation attempts.",
      })

      const created = await createPostRecord({
        authorId: ctx.user.id,
        text: input.text,
        gameTagId: input.gameTagId ?? null,
        mediaAttachmentId: input.mediaAttachmentId ?? null,
      })

      if (!created.ok) {
        throw mapCreatePostErrorToTRPC(created.error)
      }

      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const row = await feedVisibilityQueries.postDetail(
        viewer,
        created.value.publicId
      )

      if (!row) {
        throw mapPostPresentationErrorToTRPC({
          kind: "created_post_unavailable",
        })
      }

      return postPresentation.toPostView(viewer, row)
    }),

  deleteOwn: protectedProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteOwnPost({
        publicId: input.publicId,
        authorId: ctx.user.id,
      })

      if (!deleted.ok) {
        throw mapDeleteOwnPostErrorToTRPC(deleted.error)
      }

      return deleted.value
    }),

  comments: publicProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
        cursor: z.string().optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_PAGE_LIMIT)
          .default(DEFAULT_PAGE_LIMIT),
      })
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerFromContext(ctx)
      const row = await feedVisibilityQueries.postDetail(viewer, input.publicId)
      if (!row) {
        throw mapPostAvailabilityErrorToTRPC({ kind: "post_not_available" })
      }

      try {
        const page = await feedVisibilityQueries.commentList(
          viewer,
          row.id,
          commentPresentation.toCommentPageInput(input)
        )
        return commentPresentation.toCommentPageResponse(viewer, page)
      } catch (error) {
        if (error instanceof InvalidCommentCursorError) {
          throw mapPostPresentationErrorToTRPC({
            kind: "invalid_comment_cursor",
            message: error.message,
          })
        }
        throw error
      }
    }),

  createComment: protectedProcedure
    .input(
      z.object({
        publicId: postPublicIdSchema,
        text: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appUserState = await getCurrentAppUserState(ctx)
      if (appUserState.kind !== "active_onboarded_profile") {
        throw mapPostAppStateErrorToTRPC({
          kind: "profile_required_for_comment",
        })
      }

      const viewer = await authorization.getViewerContext({
        userId: ctx.user.id,
      })
      const postRow = await feedVisibilityQueries.postDetail(
        viewer,
        input.publicId
      )
      if (!postRow) {
        throw mapPostAvailabilityErrorToTRPC({ kind: "post_not_available" })
      }

      await enforceRateLimit({
        key: createUserRateLimitKey(ctx.user.id),
        policy: RATE_LIMIT_POLICIES.commentCreate,
        reply: ctx.reply,
        message: "Too many comment creation attempts.",
      })

      const created = await createCommentRecord({
        publicId: input.publicId,
        authorId: ctx.user.id,
        text: input.text,
      })

      if (!created.ok) {
        throw mapCreateCommentErrorToTRPC(created.error)
      }

      return commentPresentation.toCommentView(viewer, {
        ...created.value,
        authorUsername: appUserState.profile.username,
        authorDisplayName: appUserState.profile.displayName,
        authorAccountStatus: "active",
        viewerHasLiked: false,
      })
    }),

  deleteOwnComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteOwnComment({
        commentId: input.commentId,
        authorId: ctx.user.id,
      })

      if (!deleted.ok) {
        throw mapDeleteOwnCommentErrorToTRPC(deleted.error)
      }

      return deleted.value
    }),

  toggleCommentLike: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const toggled = await toggleCommentLike({
        commentId: input.commentId,
        userId: ctx.user.id,
      })

      if (!toggled.ok) {
        throw mapToggleCommentLikeErrorToTRPC(toggled.error)
      }

      return toggled.value
    }),
})

async function toFeedPageInputOrThrow(
  viewer: Awaited<ReturnType<typeof getViewerFromContext>>,
  input: z.infer<typeof feedPageSchema>
): Promise<FeedPageInput> {
  try {
    return await postPresentation.toFeedPageInput(viewer, input)
  } catch (error) {
    if (error instanceof InvalidFeedCursorError) {
      throw mapPostPresentationErrorToTRPC({
        kind: "invalid_feed_cursor",
        message: error.message,
      })
    }
    throw error
  }
}

async function getViewerFromContext(ctx: {
  session: { user: { id: string } } | null
}) {
  return authorization.getViewerContext(
    ctx.session ? { userId: ctx.session.user.id } : null
  )
}
