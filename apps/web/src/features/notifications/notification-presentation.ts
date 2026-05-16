import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** Canonical notification row from `notification.list` (API contract output). */
export type NotificationListItem = RouterOutputs["notification"]["list"][number];

export type NotificationIconKind =
  | "follow"
  | "heart"
  | "chat"
  | "moderation";

export type NotificationPresentation = {
  iconKind: NotificationIconKind;
  title: string;
  targetPreview: string;
  href: string;
};

export function getNotificationIconKind(
  type: NotificationListItem["type"],
): NotificationIconKind {
  switch (type) {
    case "follow":
      return "follow";
    case "post_like":
    case "comment_like":
      return "heart";
    case "post_comment":
      return "chat";
    case "content_removed":
      return "moderation";
  }
}

export function getNotificationTitle(item: NotificationListItem): string {
  const actor = item.actor
    ? (item.actor.displayName ?? `@${item.actor.username}`)
    : null;

  switch (item.type) {
    case "follow":
      return `${actor ?? "Someone"} followed you`;
    case "post_like":
      return `${actor ?? "Someone"} liked your post`;
    case "post_comment":
      return `${actor ?? "Someone"} commented on your post`;
    case "comment_like":
      return `${actor ?? "Someone"} liked your comment`;
    case "content_removed":
      return item.target.kind === "removed_content"
        ? `Your ${item.target.targetType} was removed`
        : "Your content was removed";
  }
}

export function getNotificationTargetPreview(
  item: NotificationListItem,
): string {
  switch (item.target.kind) {
    case "profile":
      return `@${item.target.username}`;
    case "post":
    case "comment":
      return item.target.preview;
    case "removed_content":
      return item.target.publicReason
        ? `Reason: ${item.target.publicReason}`
        : "Moderation update";
  }
}

export function getNotificationHref(item: NotificationListItem): string {
  switch (item.target.kind) {
    case "profile":
      return `/@${item.target.username}`;
    case "post":
      return `/post/${item.target.publicId}`;
    case "comment":
      return `/post/${item.target.postPublicId}#comment-${item.target.commentId}`;
    case "removed_content":
      return item.target.postPublicId
        ? `/post/${item.target.postPublicId}`
        : "/notifications";
  }
}

export function getNotificationPresentation(
  item: NotificationListItem,
): NotificationPresentation {
  return {
    iconKind: getNotificationIconKind(item.type),
    title: getNotificationTitle(item),
    targetPreview: getNotificationTargetPreview(item),
    href: getNotificationHref(item),
  };
}
