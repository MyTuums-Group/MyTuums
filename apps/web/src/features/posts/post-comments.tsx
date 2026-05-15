import { useState, type ReactNode } from "react";
import { ChatCircleDots, HeartStraight, Trash } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { createTrpcClient, trpc } from "@/lib/trpc";
import { ReportSheet } from "@/features/moderation/report-sheet";
import { DEFAULT_COMMENT_PAGE_LIMIT } from "./constants";
import { getCommentTextState } from "./comment-text";
import { linkifyText } from "./linkify";
import type { CommentPage, CommentView, PostView } from "./types";

type PostCommentsProps = {
  post: PostView;
};

export function PostComments({ post }: PostCommentsProps) {
  const [client] = useState(() => createTrpcClient());
  const [extraPages, setExtraPages] = useState<CommentPage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const commentsQuery = trpc.post.comments.useQuery({
    publicId: post.publicId,
    limit: DEFAULT_COMMENT_PAGE_LIMIT,
  });
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const pages = commentsQuery.data
    ? [commentsQuery.data, ...extraPages]
    : extraPages;
  const comments = pages.flatMap((page) => page.items);
  const nextCursor =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]?.nextCursor ?? null
      : commentsQuery.data?.nextCursor ?? null;
  const canComment =
    currentAppUser.data?.kind === "active_onboarded_profile";

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <ChatCircleDots className="text-primary size-5" weight="bold" />
          Comments
        </CardTitle>
        <span className="text-muted-foreground text-sm">
          {formatCountLabel(post.commentCount, "comment")}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {canComment && (
          <CommentComposer
            publicId={post.publicId}
            onCreated={() => {
              setExtraPages([]);
              setLoadMoreError(null);
            }}
          />
        )}

        {commentsQuery.isLoading && !commentsQuery.data ? (
          <CommentListSkeleton />
        ) : commentsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{commentsQuery.error.message}</AlertDescription>
          </Alert>
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                publicId={post.publicId}
                comment={comment}
              />
            ))}
          </div>
        )}

        {loadMoreError && (
          <Alert variant="destructive">
            <AlertDescription>{loadMoreError}</AlertDescription>
          </Alert>
        )}

        {nextCursor && (
          <Button
            variant="outline"
            disabled={isLoadingMore}
            onClick={() => {
              void (async () => {
                try {
                  setIsLoadingMore(true);
                  setLoadMoreError(null);
                  const nextPage = await client.post.comments.query({
                    publicId: post.publicId,
                    limit: DEFAULT_COMMENT_PAGE_LIMIT,
                    cursor: nextCursor,
                  });
                  setExtraPages((current) => [...current, nextPage]);
                } catch (error) {
                  setLoadMoreError(getErrorMessage(error));
                } finally {
                  setIsLoadingMore(false);
                }
              })();
            }}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CommentComposer({
  publicId,
  onCreated,
}: {
  publicId: string;
  onCreated?: (comment: CommentView) => void;
}) {
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const state = getCommentTextState(draft);
  const utils = trpc.useUtils();

  const createMutation = trpc.post.createComment.useMutation({
    async onMutate(variables) {
      await Promise.all([
        utils.post.comments.cancel({
          publicId,
          limit: DEFAULT_COMMENT_PAGE_LIMIT,
        }),
        utils.post.detail.cancel({ publicId }),
      ]);

      const previousComments = utils.post.comments.getData({
        publicId,
        limit: DEFAULT_COMMENT_PAGE_LIMIT,
      });
      const previousPost = utils.post.detail.getData({ publicId });

      setErrorMessage(null);
      setDraft("");

      utils.post.detail.setData({ publicId }, (current) =>
        current
          ? {
              ...current,
              commentCount: current.commentCount + 1,
            }
          : current,
      );

      return {
        previousComments,
        previousPost,
        previousDraft: draft,
        submittedText: variables.text,
      };
    },

    onError(error, _variables, context) {
      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        context?.previousComments,
      );
      utils.post.detail.setData({ publicId }, context?.previousPost);
      setDraft(context?.previousDraft ?? "");
      setErrorMessage(error.message);
    },

    onSuccess(createdComment) {
      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        (current) => prependCommentToPage(current, createdComment),
      );
      onCreated?.(createdComment);
    },

    async onSettled() {
      await Promise.all([
        utils.post.comments.invalidate({
          publicId,
          limit: DEFAULT_COMMENT_PAGE_LIMIT,
        }),
        utils.post.detail.invalidate({ publicId }),
      ]);
    },
  });

  return (
    <form
      className="space-y-3 rounded-lg bg-muted/30 p-3 ring-1 ring-border"
      onSubmit={(event) => {
        event.preventDefault();
        if (state.isEmpty || state.isTooLong || createMutation.isPending) return;

        createMutation.mutate({
          publicId,
          text: state.normalizedText,
        });
      }}
    >
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={createMutation.isPending}
        placeholder="Add a comment"
        className="min-h-24 resize-y bg-background"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-sm ${
            state.isTooLong ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {state.count} / 300
        </p>

        <Button
          type="submit"
          disabled={state.isEmpty || state.isTooLong || createMutation.isPending}
        >
          {createMutation.isPending ? "Commenting..." : "Comment"}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

function CommentRow({
  publicId,
  comment,
}: {
  publicId: string;
  comment: CommentView;
}) {
  const authorName = comment.author.displayName ?? `@${comment.author.username}`;
  const utils = trpc.useUtils();
  const toggleLikeMutation = trpc.post.toggleCommentLike.useMutation({
    async onMutate() {
      await utils.post.comments.cancel({
        publicId,
        limit: DEFAULT_COMMENT_PAGE_LIMIT,
      });

      const previousComments = utils.post.comments.getData({
        publicId,
        limit: DEFAULT_COMMENT_PAGE_LIMIT,
      });

      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        (current) => updateCommentLikeInPage(current, comment.id, {
          isLikedByViewer: !comment.viewerHasLiked,
          likeCount: Math.max(
            0,
            comment.likeCount + (comment.viewerHasLiked ? -1 : 1),
          ),
        }),
      );

      return { previousComments };
    },

    onError(_error, _variables, context) {
      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        context?.previousComments,
      );
    },

    onSuccess(result) {
      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        (current) => updateCommentLikeInPage(current, result.commentId, result),
      );
    },

    async onSettled() {
      await utils.post.comments.invalidate({
        publicId,
        limit: DEFAULT_COMMENT_PAGE_LIMIT,
      });
    },
  });
  const deleteMutation = trpc.post.deleteOwnComment.useMutation({
    async onMutate() {
      await Promise.all([
        utils.post.comments.cancel({
          publicId,
          limit: DEFAULT_COMMENT_PAGE_LIMIT,
        }),
        utils.post.detail.cancel({ publicId }),
      ]);

      const previousComments = utils.post.comments.getData({
        publicId,
        limit: DEFAULT_COMMENT_PAGE_LIMIT,
      });
      const previousPost = utils.post.detail.getData({ publicId });

      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        (current) => removeCommentFromPage(current, comment.id),
      );
      utils.post.detail.setData({ publicId }, (current) =>
        current
          ? {
              ...current,
              commentCount: Math.max(0, current.commentCount - 1),
            }
          : current,
      );

      return {
        previousComments,
        previousPost,
      };
    },

    onError(_error, _variables, context) {
      utils.post.comments.setData(
        { publicId, limit: DEFAULT_COMMENT_PAGE_LIMIT },
        context?.previousComments,
      );
      utils.post.detail.setData({ publicId }, context?.previousPost);
    },

    async onSettled() {
      await Promise.all([
        utils.post.comments.invalidate({
          publicId,
          limit: DEFAULT_COMMENT_PAGE_LIMIT,
        }),
        utils.post.detail.invalidate({ publicId }),
      ]);
    },
  });

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="mt-0.5">
          <AvatarImage src={comment.author.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(comment.author.displayName ?? comment.author.username)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <Link
              to="/@{$username}"
              params={{ username: comment.author.username }}
              className="truncate rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {authorName}
            </Link>
            {comment.author.displayName && (
              <>
                <span className="text-muted-foreground">
                  @{comment.author.username}
                </span>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
              </>
            )}
            <time
              dateTime={comment.createdAt.toISOString()}
              title={formatAbsoluteTimestamp(comment.createdAt)}
              className="text-muted-foreground"
            >
              {formatRelativeTimestamp(comment.createdAt)}
            </time>
          </div>

          {comment.moderationRemoval ? (
            <RemovedCommentPlaceholder
              publicReason={comment.moderationRemoval.publicReason}
              removedAt={comment.moderationRemoval.removedAt}
            />
          ) : (
            <div className="text-sm leading-6 break-words whitespace-pre-wrap text-foreground">
              {linkifyText(comment.text).map((part, index) =>
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
                ),
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <CommentAction
              icon={
                <HeartStraight
                  className="size-3.5"
                  weight={comment.viewerHasLiked ? "fill" : "bold"}
                />
              }
              label={formatCountLabel(comment.likeCount, "like")}
              isActive={comment.viewerHasLiked}
              disabled={!comment.canLike || toggleLikeMutation.isPending}
              onClick={() => {
                toggleLikeMutation.mutate({ commentId: comment.id });
              }}
            />

            {comment.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate({ commentId: comment.id });
                }}
              >
                <Trash weight="bold" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
            <ReportSheet
              target={{ type: "comment", commentId: comment.id }}
              buttonClassName="h-8 px-2 text-muted-foreground hover:text-foreground"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function CommentAction({
  icon,
  label,
  isActive,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 px-2 ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}

function RemovedCommentPlaceholder({
  publicReason,
  removedAt,
}: {
  publicReason: string | null;
  removedAt: Date;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">This comment was removed.</p>
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
  );
}

function CommentListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function prependCommentToPage(
  page: CommentPage | undefined,
  comment: CommentView,
): CommentPage | undefined {
  if (!page) return page;

  const existing = page.items.filter((item) => item.id !== comment.id);
  const items = [comment, ...existing].sort(compareComments);

  return {
    ...page,
    items,
  };
}

function removeCommentFromPage(
  page: CommentPage | undefined,
  commentId: string,
): CommentPage | undefined {
  if (!page) return page;

  return {
    ...page,
    items: page.items.filter((item) => item.id !== commentId),
  };
}

function updateCommentLikeInPage(
  page: CommentPage | undefined,
  commentId: string,
  update: { isLikedByViewer: boolean; likeCount: number },
): CommentPage | undefined {
  if (!page) return page;

  return {
    ...page,
    items: page.items
      .map((item) =>
        item.id === commentId
          ? {
              ...item,
              viewerHasLiked: update.isLikedByViewer,
              likeCount: update.likeCount,
            }
          : item,
      )
      .sort(compareComments),
  };
}

function compareComments(left: CommentView, right: CommentView): number {
  const likeDifference = right.likeCount - left.likeCount;
  if (likeDifference !== 0) return likeDifference;

  const timeDifference = left.createdAt.getTime() - right.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;

  return left.id.localeCompare(right.id);
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function formatAbsoluteTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatCountLabel(value: number, noun: string): string {
  const count = new Intl.NumberFormat("en").format(value);
  return `${count} ${noun}${value === 1 ? "" : "s"}`;
}

function formatPublicReason(value: string | null): string {
  if (!value) return "Moderation decision";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTimestamp(value: Date): string {
  const elapsed = value.getTime() - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(elapsed) < hour) {
    return formatter.format(Math.round(elapsed / minute), "minute");
  }

  if (Math.abs(elapsed) < day) {
    return formatter.format(Math.round(elapsed / hour), "hour");
  }

  return formatter.format(Math.round(elapsed / day), "day");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong while loading more comments.";
}
