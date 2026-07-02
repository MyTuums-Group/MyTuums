import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { TRPCError } from "@trpc/server"
import type { Context } from "./context.js"
import type { AppRouter } from "./app-router.js"

export type MobileCaller = ReturnType<AppRouter["createCaller"]>
type CallerInput<T> = T extends (input: infer I) => unknown ? I : never
type OnboardingInput = CallerInput<MobileCaller["profile"]["submitOnboarding"]>
type CreatePostInput = CallerInput<MobileCaller["post"]["create"]>
type CreateMediaUploadInput = CallerInput<MobileCaller["media"]["createUpload"]>
type SubmitReportInput = CallerInput<MobileCaller["moderation"]["submitReport"]>
type CreateMobileContext = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<Context>

type MobileRouteOptions = {
  createContext?: CreateMobileContext
  createCaller?: (ctx: Context) => MobileCaller | Promise<MobileCaller>
}

type MobileRouteHandler = (
  caller: MobileCaller,
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<unknown>

export function registerMobileRoutes(
  app: FastifyInstance,
  options: MobileRouteOptions = {}
): void {
  const createRouteContext =
    options.createContext ??
    (async (request: FastifyRequest, reply: FastifyReply) => {
      const { createContext } = await import("./context.js")
      return createContext(request, reply)
    })
  const createCaller =
    options.createCaller ??
    (async (ctx: Context) => {
      const { appRouter } = await import("./app-router.js")
      return appRouter.createCaller(ctx)
    })

  const route = (
    method: "GET" | "POST" | "DELETE",
    url: string,
    handler: MobileRouteHandler
  ) => {
    app.route({
      method,
      url: `/api/mobile/v1${url}`,
      async handler(request, reply) {
        try {
          const ctx = await createRouteContext(request, reply)
          const caller = await createCaller(ctx)
          return await handler(caller, request, reply)
        } catch (error) {
          return sendMobileError(reply, error)
        }
      },
    })
  }

  route("GET", "/session", (caller) => caller.currentAppUser())
  route("GET", "/readiness", (caller) => caller.launchReadiness())
  route("GET", "/username-availability", (caller, request) =>
    caller.profile.checkUsernameAvailability({
      username: queryString(request, "username") ?? "",
    })
  )
  route("POST", "/onboarding", (caller, request) =>
    caller.profile.submitOnboarding(bodyAs<OnboardingInput>(request))
  )

  route("GET", "/feed/for-you", (caller, request) =>
    caller.post.forYouFeed(pageInput(request))
  )
  route("GET", "/feed/following", (caller, request) =>
    caller.post.followingFeed(pageInput(request))
  )
  route("GET", "/discover/posts", (caller, request) =>
    caller.post.discoverFeed({
      ...pageInput(request),
      game: queryString(request, "game"),
    })
  )
  route("GET", "/posts/:publicId", (caller, request) =>
    caller.post.detail({ publicId: pathParam(request, "publicId") })
  )
  route("POST", "/posts", (caller, request) =>
    caller.post.create(bodyAs<CreatePostInput>(request))
  )
  route("DELETE", "/posts/:publicId", (caller, request) =>
    caller.post.deleteOwn({ publicId: pathParam(request, "publicId") })
  )

  route("GET", "/posts/:publicId/comments", (caller, request) =>
    caller.post.comments({
      publicId: pathParam(request, "publicId"),
      ...pageInput(request),
    })
  )
  route("POST", "/posts/:publicId/comments", (caller, request) =>
    caller.post.createComment({
      publicId: pathParam(request, "publicId"),
      text: bodyString(request, "text"),
    })
  )
  route("DELETE", "/comments/:commentId", (caller, request) =>
    caller.post.deleteOwnComment({ commentId: pathParam(request, "commentId") })
  )
  route("POST", "/posts/:publicId/like-toggle", (caller, request) =>
    caller.engagement.togglePostLike({
      publicId: pathParam(request, "publicId"),
    })
  )
  route("POST", "/comments/:commentId/like-toggle", (caller, request) =>
    caller.engagement.toggleCommentLike({
      commentId: pathParam(request, "commentId"),
    })
  )

  route("GET", "/profiles/:username", (caller, request) =>
    caller.profile.getByUsername({ username: pathParam(request, "username") })
  )
  route("GET", "/profiles/:username/posts", (caller, request) =>
    caller.post.profileFeed({
      username: pathParam(request, "username"),
      ...pageInput(request),
    })
  )
  route("GET", "/profiles/:username/engagement", (caller, request) =>
    caller.engagement.profileState({ username: pathParam(request, "username") })
  )
  route("POST", "/profiles/:username/follow-toggle", (caller, request) =>
    caller.engagement.toggleFollow({ username: pathParam(request, "username") })
  )

  route("GET", "/games", (caller) => caller.game.listActive())
  route("GET", "/games/:slug", (caller, request) =>
    caller.game.detail({ slug: pathParam(request, "slug") })
  )
  route("GET", "/games/:slug/posts", (caller, request) =>
    caller.game.feed({
      slug: pathParam(request, "slug"),
      ...pageInput(request),
    })
  )
  route("GET", "/search", (caller, request) =>
    caller.search({
      query: queryString(request, "query") ?? "",
      limit: queryInt(request, "limit") ?? 10,
    })
  )

  route("POST", "/media/uploads", (caller, request) =>
    caller.media.createUpload(bodyAs<CreateMediaUploadInput>(request))
  )
  route("POST", "/media/uploads/:mediaId/confirm", (caller, request) =>
    caller.media.confirmUpload({ mediaId: pathParam(request, "mediaId") })
  )
  route("POST", "/media/uploads/:mediaId/retry", (caller, request) =>
    caller.media.retryUpload({ mediaId: pathParam(request, "mediaId") })
  )
  route("DELETE", "/media/uploads/:mediaId", (caller, request) =>
    caller.media.removeUpload({ mediaId: pathParam(request, "mediaId") })
  )

  route("POST", "/reports", (caller, request) =>
    caller.moderation.submitReport(bodyAs<SubmitReportInput>(request))
  )
}

function pathParam(request: FastifyRequest, key: string): string {
  const params = request.params
  if (typeof params !== "object" || params === null || !(key in params)) {
    return ""
  }
  const value = (params as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

function bodyRecord(request: FastifyRequest): Record<string, unknown> {
  return typeof request.body === "object" && request.body !== null
    ? (request.body as Record<string, unknown>)
    : {}
}

function bodyAs<T>(request: FastifyRequest): T {
  return bodyRecord(request) as T
}

function bodyString(request: FastifyRequest, key: string): string {
  const value = bodyRecord(request)[key]
  return typeof value === "string" ? value : ""
}

function pageInput(request: FastifyRequest): {
  cursor?: string
  limit?: number
} {
  return {
    cursor: queryString(request, "cursor"),
    limit: queryInt(request, "limit"),
  }
}

function queryString(request: FastifyRequest, key: string): string | undefined {
  const value = queryValue(request, key)
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function queryInt(request: FastifyRequest, key: string): number | undefined {
  const value = queryString(request, key)
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function queryValue(request: FastifyRequest, key: string): unknown {
  const query = request.query
  if (typeof query !== "object" || query === null || !(key in query)) {
    return undefined
  }
  const value = (query as Record<string, unknown>)[key]
  return Array.isArray(value) ? value[0] : value
}

function sendMobileError(reply: FastifyReply, error: unknown) {
  if (error instanceof TRPCError) {
    return reply.status(statusForTRPCCode(error.code)).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.cause instanceof Error ? error.cause.message : undefined,
      },
    })
  }

  return reply.status(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Mobile API request failed.",
    },
  })
}

function statusForTRPCCode(code: TRPCError["code"]): number {
  switch (code) {
    case "BAD_REQUEST":
    case "PARSE_ERROR":
      return 400
    case "UNAUTHORIZED":
      return 401
    case "FORBIDDEN":
      return 403
    case "NOT_FOUND":
      return 404
    case "METHOD_NOT_SUPPORTED":
      return 405
    case "TIMEOUT":
      return 408
    case "CONFLICT":
      return 409
    case "PAYLOAD_TOO_LARGE":
      return 413
    case "PRECONDITION_FAILED":
      return 412
    case "UNPROCESSABLE_CONTENT":
      return 422
    case "TOO_MANY_REQUESTS":
      return 429
    case "CLIENT_CLOSED_REQUEST":
      return 499
    default:
      return 500
  }
}
