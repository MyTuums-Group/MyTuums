import { Buffer } from "node:buffer";
import { z } from "zod";
import type { Result, ViewerContext } from "@workspace/types";
import type { FeedContext, FeedCursor, FeedPage, FeedPageInput, FeedPostRow } from "../feed/index.js";
import type { MediaService, SignReadUrlOutput } from "../media/media.js";
import type { SignReadError } from "../media/media.policy.js";

export const POST_PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export const postPublicIdSchema = z
  .string()
  .regex(POST_PUBLIC_ID_PATTERN, "Invalid post ID.");

const feedCursorPayloadSchema = z.object({
  createdAt: z.string().datetime(),
  publicId: postPublicIdSchema,
});

export class InvalidFeedCursorError extends Error {
  override readonly name = "InvalidFeedCursorError";

  constructor(message = "Invalid feed cursor.") {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function encodeCursor(row: FeedPostRow): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: row.createdAt.toISOString(),
      publicId: row.publicId,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeCursor(cursor: string): z.infer<typeof feedCursorPayloadSchema> {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    return feedCursorPayloadSchema.parse(parsed);
  } catch {
    throw new InvalidFeedCursorError();
  }
}

export type PostPresentationPorts = {
  media: Pick<MediaService, "signReadUrl">;
  loadPostDetail: (viewer: ViewerContext, publicId: string) => Promise<FeedPostRow | null>;
};

export type PostViewModel = {
  publicId: string;
  text: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: null;
  };
  gameTag: { id: string; slug: string; name: string } | null;
  media: {
    id: string;
    kind: "image" | "video";
    mimeType: string;
    url: string;
  } | null;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  canDelete: boolean;
};

export type FeedPageViewModel = {
  items: PostViewModel[];
  nextCursor: string | null;
  context?: FeedContext;
};

export function createPostPresentation({ media, loadPostDetail }: PostPresentationPorts) {
  async function resolveCursor(viewer: ViewerContext, cursor: string): Promise<FeedCursor> {
    const payload = decodeCursor(cursor);
    const row = await loadPostDetail(viewer, payload.publicId);
    if (!row || row.createdAt.toISOString() !== payload.createdAt) {
      throw new InvalidFeedCursorError();
    }

    return {
      createdAt: row.createdAt,
      id: row.id,
    };
  }

  async function toPostView(viewer: ViewerContext, row: FeedPostRow): Promise<PostViewModel> {
    return {
      publicId: row.publicId,
      text: row.text,
      author: {
        username: row.authorUsername,
        displayName: row.authorDisplayName,
        avatarUrl: null,
      },
      gameTag:
        row.gameTagId && row.gameTagSlug && row.gameTagName
          ? {
              id: row.gameTagId,
              slug: row.gameTagSlug,
              name: row.gameTagName,
            }
          : null,
      media: await toMediaView(media, row),
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      canDelete: viewer.userId === row.authorId && row.deletedAt === null,
    };
  }

  return {
    encodeCursor,
    decodeCursor,

    resolveCursor,

    async toFeedPageInput(
      viewer: ViewerContext,
      input: { limit: number; cursor?: string | undefined },
    ): Promise<FeedPageInput> {
      return {
        limit: input.limit,
        cursor: input.cursor ? await resolveCursor(viewer, input.cursor) : null,
      };
    },

    toPostView,

    async toFeedResponse(viewer: ViewerContext, page: FeedPage<FeedPostRow>): Promise<FeedPageViewModel> {
      return {
        items: await Promise.all(page.items.map((row) => toPostView(viewer, row))),
        nextCursor:
          page.nextCursor && page.items.length > 0
            ? encodeCursor(page.items[page.items.length - 1]!)
            : null,
        context: page.context,
      };
    },
  };
}

async function toMediaView(
  media: Pick<MediaService, "signReadUrl">,
  row: FeedPostRow,
): Promise<PostViewModel["media"]> {
  if (!row.mediaAttachmentId || !row.mediaStatus) return null;
  const signed = await media.signReadUrl(row.mediaAttachmentId);
  if (!signed.ok) return null;

  return {
    id: row.mediaAttachmentId,
    kind: row.mediaMimeType?.startsWith("video/") ? "video" : "image",
    mimeType: row.mediaMimeType ?? "application/octet-stream",
    url: signed.value.readUrl,
  };
}

/** Test seam: in-memory `signReadUrl` without loading the real media module graph. */
export function createStubMediaService(
  signReadUrl: (mediaId: string) => Promise<Result<SignReadUrlOutput, SignReadError>>,
): Pick<MediaService, "signReadUrl"> {
  return { signReadUrl };
}
