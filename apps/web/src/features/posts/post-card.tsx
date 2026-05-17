import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowUpRight,
  ChatCircleDots,
  HeartStraight,
  Trash,
} from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { trpc } from "@/lib/trpc"
import { ReportSheet } from "@/features/moderation/report-sheet"
import { linkifyText } from "./linkify"
import {
  applyOptimisticPostDeleteToFeeds,
  cancelPostListQueriesForOptimisticDelete,
  captureFeedSnapshotsForOptimisticPostDelete,
  reconcileCachesAfterPostDeleteMutationSettled,
  reconcileCachesAfterPostLikeMutationSettled,
  restoreFeedsAfterOptimisticPostDeleteFailure,
} from "./post-cache-reconcile"
import type { PostView } from "./types"

type PostCardProps = {
  post: PostView
  variant?: "feed" | "detail"
  onDeleted?: (publicId: string) => void
}

export function PostCard({ post, variant = "feed", onDeleted }: PostCardProps) {
  const authorName = post.author.displayName ?? `@${post.author.username}`
  const [isLightboxOpen, setLightboxOpen] = useState(false)
  const [likeState, setLikeState] = useState({
    likedByViewer: post.likedByViewer,
    likeCount: post.likeCount,
  })
  const utils = trpc.useUtils()
  useEffect(() => {
    setLikeState({
      likedByViewer: post.likedByViewer,
      likeCount: post.likeCount,
    })
  }, [post.likedByViewer, post.likeCount])

  const likeMutation = trpc.engagement.togglePostLike.useMutation({
    onMutate() {
      const previous = likeState
      setLikeState((current) => {
        const likedByViewer = !current.likedByViewer
        return {
          likedByViewer,
          likeCount: Math.max(0, current.likeCount + (likedByViewer ? 1 : -1)),
        }
      })
      return { previous }
    },

    onError(_error, _variables, context) {
      if (context?.previous) {
        setLikeState(context.previous)
      }
    },

    onSuccess(result) {
      setLikeState({
        likedByViewer: result.liked,
        likeCount: result.likeCount,
      })
    },

    async onSettled() {
      await reconcileCachesAfterPostLikeMutationSettled(utils, {
        postPublicId: post.publicId,
        authorUsername: post.author.username,
      })
    },
  })
  const deleteMutation = trpc.post.deleteOwn.useMutation({
    async onMutate() {
      await cancelPostListQueriesForOptimisticDelete(utils, {
        postPublicId: post.publicId,
        authorUsername: post.author.username,
      })

      const snapshots = captureFeedSnapshotsForOptimisticPostDelete(utils, {
        authorUsername: post.author.username,
      })

      applyOptimisticPostDeleteToFeeds(utils, {
        postPublicId: post.publicId,
        authorUsername: post.author.username,
      })

      return snapshots
    },

    onError(_error, _variables, context) {
      if (context) {
        restoreFeedsAfterOptimisticPostDeleteFailure(
          utils,
          { authorUsername: post.author.username },
          context
        )
      }
    },

    onSuccess() {
      onDeleted?.(post.publicId)
    },

    async onSettled() {
      await reconcileCachesAfterPostDeleteMutationSettled(utils, {
        postPublicId: post.publicId,
        authorUsername: post.author.username,
        gameSlug: post.gameTag?.slug,
      })
    },
  })

  return (
    <Card
      className={cn(
        "shadow-sm transition-shadow duration-200 motion-reduce:transition-none",
        variant === "feed" && "focus-within:shadow-md hover:shadow-md",
        variant === "detail" && "shadow-md"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="mt-0.5">
            <AvatarImage src={post.author.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(post.author.displayName ?? post.author.username)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <Link
              to="/@{$username}"
              params={{ username: post.author.username }}
              className="block truncate rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {authorName}
            </Link>

            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {post.author.displayName && (
                <>
                  <span className="truncate">@{post.author.username}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <time
                dateTime={post.createdAt.toISOString()}
                title={formatAbsoluteTimestamp(post.createdAt)}
                className="truncate"
              >
                {formatRelativeTimestamp(post.createdAt)}
              </time>
            </CardDescription>
          </div>
        </div>

        <CardAction>
          <div className="-mr-2 flex flex-wrap justify-end gap-1">
            <ReportSheet
              target={{ type: "post", publicId: post.publicId }}
              buttonClassName="shrink-0 text-muted-foreground hover:text-foreground"
            />
            {post.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate({ publicId: post.publicId })
              }}
            >
              <Trash weight="bold" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {post.moderationRemoval ? (
          <RemovedContentPlaceholder
            targetType="post"
            publicReason={post.moderationRemoval.publicReason}
            removedAt={post.moderationRemoval.removedAt}
          />
        ) : (
          <div className="text-sm leading-6 break-words whitespace-pre-wrap text-foreground">
            {linkifyText(post.text).map((part, index) =>
              part.type === "link" ? (
                <a
                  key={`${part.href}-${index}`}
                  href={part.href}
                  target="_blank"
                  rel={part.rel}
                  className="rounded-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {part.text}
                </a>
              ) : (
                <span key={`${part.text}-${index}`}>{part.text}</span>
              )
            )}
          </div>
        )}

        {!post.moderationRemoval && post.gameTag && (
          <div>
            <Link
              to="/game/$slug"
              params={{ slug: post.gameTag.slug }}
              className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 transition-colors ring-inset hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {post.gameTag.name}
            </Link>
          </div>
        )}

        {!post.moderationRemoval && post.media && (
          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            {post.media.kind === "video" ? (
              <video
                src={post.media.url}
                controls
                preload="metadata"
                className="max-h-[32rem] w-full bg-black object-contain"
              />
            ) : (
              <button
                type="button"
                className="block w-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={post.media.url}
                  alt="Post image attachment"
                  className="max-h-[32rem] w-full object-contain"
                />
              </button>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={likeState.likedByViewer}
            disabled={likeMutation.isPending}
            className="min-h-8 gap-1.5 rounded-full px-2.5 text-xs font-medium text-foreground ring-1 ring-foreground/10 hover:text-primary data-[liked=true]:text-primary"
            data-liked={likeState.likedByViewer}
            onClick={() => {
              likeMutation.mutate({ publicId: post.publicId })
            }}
          >
            <HeartStraight
              className="size-3.5"
              weight={likeState.likedByViewer ? "fill" : "bold"}
            />
            <span>{formatCountLabel(likeState.likeCount, "like")}</span>
          </Button>
          <PostStat
            icon={<ChatCircleDots className="size-3.5" weight="bold" />}
            label={formatCountLabel(post.commentCount, "comment")}
          />
        </div>

        {variant === "feed" ? (
          <Button asChild variant="ghost" size="sm" className="-mr-2 ml-auto">
            <Link to="/post/$publicId" params={{ publicId: post.publicId }}>
              Open post
              <ArrowUpRight weight="bold" />
            </Link>
          </Button>
        ) : (
          <time
            dateTime={post.createdAt.toISOString()}
            className="ml-auto text-xs text-muted-foreground sm:text-sm"
          >
            {formatAbsoluteTimestamp(post.createdAt)}
          </time>
        )}
      </CardFooter>

      {isLightboxOpen && post.media?.kind === "image" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-md bg-background px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-border"
            onClick={() => setLightboxOpen(false)}
          >
            Close
          </button>
          <img
            src={post.media.url}
            alt="Post image attachment"
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </Card>
  )
}

function PostStat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-background px-2.5 text-xs font-medium whitespace-nowrap text-foreground ring-1 ring-foreground/10"
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

function RemovedContentPlaceholder({
  publicReason,
  removedAt,
  targetType,
}: {
  publicReason: string | null
  removedAt: Date
  targetType: "post" | "comment"
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">
        This {targetType} was removed.
      </p>
      <p className="mt-1">
        Reason: {formatPublicReason(publicReason)} ·{" "}
        {formatAbsoluteTimestamp(removedAt)}
      </p>
      <a
        href="/contact"
        className="mt-2 inline-flex rounded-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        Contact support
      </a>
    </div>
  )
}

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
}

function formatAbsoluteTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatCountLabel(value: number, noun: string): string {
  const count = new Intl.NumberFormat("en").format(value)
  return `${count} ${noun}${value === 1 ? "" : "s"}`
}

function formatPublicReason(value: string | null): string {
  if (!value) return "Moderation decision"
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatRelativeTimestamp(value: Date): string {
  const elapsed = value.getTime() - Date.now()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (Math.abs(elapsed) < hour) {
    return formatter.format(Math.round(elapsed / minute), "minute")
  }

  if (Math.abs(elapsed) < day) {
    return formatter.format(Math.round(elapsed / hour), "hour")
  }

  return formatter.format(Math.round(elapsed / day), "day")
}
