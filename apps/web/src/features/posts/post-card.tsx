import { useState, type ReactNode } from "react"
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
import { DEFAULT_POST_PAGE_LIMIT } from "./constants"
import { linkifyText } from "./linkify"
import { removePostFromFeedPage } from "./post-cache"
import type { PostView } from "./types"

type PostCardProps = {
  post: PostView
  variant?: "feed" | "detail"
  onDeleted?: (publicId: string) => void
}

export function PostCard({ post, variant = "feed", onDeleted }: PostCardProps) {
  const authorName = post.author.displayName ?? `@${post.author.username}`
  const [isLightboxOpen, setLightboxOpen] = useState(false)
  const utils = trpc.useUtils()
  const deleteMutation = trpc.post.deleteOwn.useMutation({
    async onMutate() {
      await Promise.all([
        utils.post.forYouFeed.cancel({ limit: DEFAULT_POST_PAGE_LIMIT }),
        utils.post.profileFeed.cancel({
          username: post.author.username,
          limit: DEFAULT_POST_PAGE_LIMIT,
        }),
        utils.post.detail.cancel({ publicId: post.publicId }),
      ])

      const previousForYou = utils.post.forYouFeed.getData({
        limit: DEFAULT_POST_PAGE_LIMIT,
      })
      const previousProfile = utils.post.profileFeed.getData({
        username: post.author.username,
        limit: DEFAULT_POST_PAGE_LIMIT,
      })

      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        (current) => removePostFromFeedPage(current, post.publicId)
      )
      utils.post.profileFeed.setData(
        {
          username: post.author.username,
          limit: DEFAULT_POST_PAGE_LIMIT,
        },
        (current) => removePostFromFeedPage(current, post.publicId)
      )

      return {
        previousForYou,
        previousProfile,
      }
    },

    onError(_error, _variables, context) {
      if (context?.previousForYou) {
        utils.post.forYouFeed.setData(
          { limit: DEFAULT_POST_PAGE_LIMIT },
          context.previousForYou
        )
      }

      if (context?.previousProfile) {
        utils.post.profileFeed.setData(
          {
            username: post.author.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          context.previousProfile
        )
      }
    },

    onSuccess() {
      onDeleted?.(post.publicId)
    },

    async onSettled() {
      await Promise.all([
        utils.post.forYouFeed.invalidate({ limit: DEFAULT_POST_PAGE_LIMIT }),
        utils.post.profileFeed.invalidate({
          username: post.author.username,
          limit: DEFAULT_POST_PAGE_LIMIT,
        }),
        utils.post.detail.invalidate({ publicId: post.publicId }),
      ])
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

        {post.canDelete && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate({ publicId: post.publicId })
              }}
            >
              <Trash weight="bold" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm leading-6 break-words whitespace-pre-wrap text-foreground">
          {linkifyText(post.text).map((part, index) =>
            part.type === "link" ? (
              <a
                key={`${part.href}-${index}`}
                href={part.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="rounded-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {part.text}
              </a>
            ) : (
              <span key={`${part.text}-${index}`}>{part.text}</span>
            )
          )}
        </div>

        {post.gameTag && (
          <div>
            <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10 ring-inset">
              {post.gameTag.name}
            </span>
          </div>
        )}

        {post.media && (
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
          <PostStat
            icon={<HeartStraight className="size-3.5" weight="bold" />}
            label={formatCountLabel(post.likeCount, "like")}
          />
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
