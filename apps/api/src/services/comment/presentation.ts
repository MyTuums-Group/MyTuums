import { Buffer } from "node:buffer";
import { z } from "zod";
import type { ViewerContext } from "@workspace/types";
import type { FeedCommentRow, FeedCursor, FeedPage, FeedPageInput } from "../feed/index.js";

const commentCursorPayloadSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  likeCount: z.number().int().min(0),
});

export class InvalidCommentCursorError extends Error {
  override readonly name = "InvalidCommentCursorError";

  constructor(message = "Invalid comment cursor.") {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type CommentViewModel = {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: null;
  };
  likeCount: number;
  viewerHasLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
  canLike: boolean;
  canDelete: boolean;
};

export type CommentPageViewModel = {
  items: CommentViewModel[];
  nextCursor: string | null;
};

export function encodeCommentCursor(row: FeedCommentRow): string {
  return Buffer.from(
    JSON.stringify({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      likeCount: row.likeCount,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeCommentCursor(cursor: string): FeedCursor {
  try {
    const parsed = commentCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown,
    );

    return {
      id: parsed.id,
      createdAt: new Date(parsed.createdAt),
      likeCount: parsed.likeCount,
    };
  } catch {
    throw new InvalidCommentCursorError();
  }
}

export function createCommentPresentation() {
  function toCommentView(
    viewer: ViewerContext,
    row: FeedCommentRow,
  ): CommentViewModel {
    return {
      id: row.id,
      text: row.text,
      author: {
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: null,
      },
      likeCount: row.likeCount,
      viewerHasLiked: row.viewerHasLiked,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      canLike: viewer.isAuthenticated && row.deletedAt === null,
      canDelete: viewer.userId === row.authorId && row.deletedAt === null,
    };
  }

  return {
    encodeCommentCursor,
    decodeCommentCursor,

    toCommentPageInput(input: { limit: number; cursor?: string | undefined }): FeedPageInput {
      return {
        limit: input.limit,
        cursor: input.cursor ? decodeCommentCursor(input.cursor) : null,
      };
    },

    toCommentView,

    toCommentPageResponse(
      viewer: ViewerContext,
      page: FeedPage<FeedCommentRow>,
    ): CommentPageViewModel {
      return {
        items: page.items.map((row) => toCommentView(viewer, row)),
        nextCursor:
          page.nextCursor && page.items.length > 0
            ? encodeCommentCursor(page.items[page.items.length - 1]!)
            : null,
      };
    },
  };
}
