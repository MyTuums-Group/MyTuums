import { describe, expect, it } from "vitest";
import {
  type NotificationListItem,
  getNotificationHref,
  getNotificationIconKind,
  getNotificationPresentation,
  getNotificationTargetPreview,
  getNotificationTitle,
} from "../features/notifications/notification-presentation";

const base = {
  id: "n1",
  isRead: false,
  createdAt: new Date("2026-01-02T12:00:00.000Z"),
} satisfies Partial<NotificationListItem>;

describe("notification presentation", () => {
  it("maps icon kind for every notification type", () => {
    expect(getNotificationIconKind("follow")).toBe("follow");
    expect(getNotificationIconKind("post_like")).toBe("heart");
    expect(getNotificationIconKind("comment_like")).toBe("heart");
    expect(getNotificationIconKind("post_comment")).toBe("chat");
    expect(getNotificationIconKind("content_removed")).toBe("moderation");
  });

  it("builds titles for social notifications with and without actor", () => {
    const actor = {
      username: "bob",
      displayName: "Bob",
      avatarUrl: null,
    } satisfies NonNullable<NotificationListItem["actor"]>;

    expect(
      getNotificationTitle({
        ...base,
        type: "follow",
        actor,
        target: {
          kind: "profile",
          username: "bob",
          preview: "",
        },
      }),
    ).toBe("Bob followed you");

    expect(
      getNotificationTitle({
        ...base,
        type: "follow",
        actor: { ...actor, displayName: null },
        target: {
          kind: "profile",
          username: "bob",
          preview: "",
        },
      }),
    ).toBe("@bob followed you");

    expect(
      getNotificationTitle({
        ...base,
        type: "post_like",
        actor: null,
        target: {
          kind: "post",
          publicId: "pub_1",
          preview: "Hi",
        },
      }),
    ).toBe("Someone liked your post");

    expect(
      getNotificationTitle({
        ...base,
        type: "post_comment",
        actor,
        target: {
          kind: "post",
          publicId: "pub_1",
          preview: "Hi",
        },
      }),
    ).toBe("Bob commented on your post");

    expect(
      getNotificationTitle({
        ...base,
        type: "comment_like",
        actor,
        target: {
          kind: "comment",
          postPublicId: "pub_1",
          commentId: "c1",
          preview: "Nice",
        },
      }),
    ).toBe("Bob liked your comment");
  });

  it("builds content_removed titles from removed_content target", () => {
    expect(
      getNotificationTitle({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "post",
          postPublicId: "pub_2",
          publicReason: "spam",
        },
      }),
    ).toBe("Your post was removed");
    expect(
      getNotificationTitle({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "comment",
          postPublicId: "pub_2",
          commentId: "c1",
          publicReason: null,
        },
      }),
    ).toBe("Your comment was removed");
  });

  it("builds target preview for every target kind", () => {
    expect(
      getNotificationTargetPreview({
        ...base,
        type: "follow",
        actor: null,
        target: {
          kind: "profile",
          username: "alice",
          preview: "",
        },
      }),
    ).toBe("@alice");

    expect(
      getNotificationTargetPreview({
        ...base,
        type: "post_like",
        actor: null,
        target: {
          kind: "post",
          publicId: "pub_1",
          preview: "Hello world",
        },
      }),
    ).toBe("Hello world");

    expect(
      getNotificationTargetPreview({
        ...base,
        type: "comment_like",
        actor: null,
        target: {
          kind: "comment",
          postPublicId: "pub_1",
          commentId: "c1",
          preview: "Thread text",
        },
      }),
    ).toBe("Thread text");

    expect(
      getNotificationTargetPreview({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "post",
          postPublicId: "pub_2",
          publicReason: "harassment",
        },
      }),
    ).toBe("Reason: harassment");

    expect(
      getNotificationTargetPreview({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "comment",
          postPublicId: null,
          publicReason: null,
        },
      }),
    ).toBe("Moderation update");
  });

  it("builds href for every target kind", () => {
    expect(
      getNotificationHref({
        ...base,
        type: "follow",
        actor: null,
        target: {
          kind: "profile",
          username: "alice",
          preview: "",
        },
      }),
    ).toBe("/@alice");

    expect(
      getNotificationHref({
        ...base,
        type: "post_like",
        actor: null,
        target: {
          kind: "post",
          publicId: "pub_00000001",
          preview: "",
        },
      }),
    ).toBe("/post/pub_00000001");

    expect(
      getNotificationHref({
        ...base,
        type: "post_comment",
        actor: null,
        target: {
          kind: "comment",
          postPublicId: "pub_1",
          commentId: "comment-uuid",
          preview: "",
        },
      }),
    ).toBe("/post/pub_1#comment-comment-uuid");

    expect(
      getNotificationHref({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "post",
          postPublicId: "pub_2",
          publicReason: null,
        },
      }),
    ).toBe("/post/pub_2");

    expect(
      getNotificationHref({
        ...base,
        type: "content_removed",
        actor: null,
        target: {
          kind: "removed_content",
          targetType: "comment",
          postPublicId: null,
          publicReason: null,
        },
      }),
    ).toBe("/notifications");
  });

  it("aggregates presentation fields", () => {
    const item = {
      ...base,
      type: "post_like" as const,
      actor: {
        username: "bob",
        displayName: "Bob",
        avatarUrl: null,
      },
      target: {
        kind: "post" as const,
        publicId: "pub_1",
        preview: "Ace",
      },
    } satisfies NotificationListItem;

    expect(getNotificationPresentation(item)).toEqual({
      iconKind: "heart",
      title: "Bob liked your post",
      targetPreview: "Ace",
      href: "/post/pub_1",
    });
  });
});
