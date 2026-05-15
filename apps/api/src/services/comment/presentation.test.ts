import { describe, expect, it } from "vitest";
import type { ViewerContext } from "@workspace/types";
import type { FeedCommentRow } from "../feed/index.js";
import { createCommentPresentation } from "./presentation.js";

const viewerBob: ViewerContext = {
  userId: "bob",
  role: "user",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

const publicViewer: ViewerContext = {
  userId: null,
  role: null,
  accountStatus: null,
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: false,
};

const staffViewer: ViewerContext = {
  userId: "mod",
  role: "moderator",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
  isAuthenticated: true,
};

function commentRow(overrides: Partial<FeedCommentRow> = {}): FeedCommentRow {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: "comment-1",
    postId: "post-1",
    authorId: "bob",
    authorUsername: "bob",
    authorDisplayName: "Bobby",
    authorAccountStatus: "active",
    text: "Nice clutch",
    likeCount: 3,
    viewerHasLiked: false,
    deletedAt: null,
    removedAt: null,
    removalPublicReason: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe("comment presentation", () => {
  it("maps comments with author identity and self-delete capability", () => {
    const presentation = createCommentPresentation();

    expect(presentation.toCommentView(viewerBob, commentRow())).toMatchObject({
      id: "comment-1",
      text: "Nice clutch",
      author: {
        username: "bob",
        displayName: "Bobby",
        avatarUrl: null,
      },
      likeCount: 3,
      viewerHasLiked: false,
      canLike: true,
      canDelete: true,
    });

    expect(presentation.toCommentView(publicViewer, commentRow())).toMatchObject({
      canDelete: false,
    });
  });

  it("shows removed comments to authors as placeholders but keeps staff text visible", () => {
    const presentation = createCommentPresentation();
    const removedAt = new Date("2026-01-02T00:00:00.000Z");
    const row = commentRow({
      removedAt,
      removalPublicReason: "spam",
    });

    expect(presentation.toCommentView(viewerBob, row)).toMatchObject({
      text: "",
      canLike: false,
      canDelete: false,
      moderationRemoval: {
        publicReason: "spam",
        removedAt,
        supportPath: "/contact",
      },
    });

    expect(presentation.toCommentView(staffViewer, row)).toMatchObject({
      text: "Nice clutch",
      moderationRemoval: null,
    });
  });
});
