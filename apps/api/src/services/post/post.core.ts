import type { PostBody, Result } from "@workspace/types";
import { createPostBody } from "./post.policy.js";

export type PostRecord = {
  id: string;
  publicId: string;
  authorId: string;
  text: string;
  gameTagId: string | null;
  mediaAttachmentId: string | null;
  likeCount: number;
  commentCount: number;
  deletedAt: Date | null;
  removedAt: Date | null;
  removalPublicReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PostCreateInput = {
  authorId: string;
  text: string;
  gameTagId?: string | null;
  mediaAttachmentId?: string | null;
};

export type CreatePostError =
  | { kind: "invalid_post_body"; message: string }
  | { kind: "invalid_game_tag" }
  | { kind: "invalid_media_attachment" };

export type DeleteOwnPostError =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "already_deleted" };

export type ActiveGameRecord = {
  id: string;
  slug: string;
  name: string;
};

export type PostRepository = {
  findActiveGameById(gameId: string): Promise<ActiveGameRecord | null>;
  createPost(values: {
    authorId: string;
    text: PostBody;
    gameTagId: string | null;
    mediaAttachmentId: string | null;
  }): Promise<PostRecord>;
  findPostByPublicId(publicId: string): Promise<PostRecord | null>;
  markPostDeleted(values: {
    publicId: string;
    authorId: string;
    deletedAt: Date;
  }): Promise<PostRecord | null>;
};

export type PostService = {
  createPost(input: PostCreateInput): Promise<Result<PostRecord, CreatePostError>>;
  deleteOwnPost(
    input: { publicId: string; authorId: string },
  ): Promise<Result<{ publicId: string }, DeleteOwnPostError>>;
  findPostByPublicId(publicId: string): Promise<PostRecord | null>;
};

export function createPostService(repository: PostRepository): PostService {
  return {
    async createPost(input) {
      const validatedBody = createPostBody(input.text);
      if (!validatedBody.ok) {
        return {
          ok: false,
          error: {
            kind: "invalid_post_body",
            message: validatedBody.error.message,
          },
        };
      }

      const gameTagId = input.gameTagId ?? null;
      if (gameTagId) {
        const activeGame = await repository.findActiveGameById(gameTagId);
        if (!activeGame) {
          return { ok: false, error: { kind: "invalid_game_tag" } };
        }
      }

      let row: PostRecord;
      try {
        row = await repository.createPost({
          authorId: input.authorId,
          text: validatedBody.value,
          gameTagId,
          mediaAttachmentId: input.mediaAttachmentId ?? null,
        });
      } catch (error) {
        if (isInvalidMediaAttachment(error)) {
          return { ok: false, error: { kind: "invalid_media_attachment" } };
        }
        throw error;
      }

      return { ok: true, value: row };
    },

    async deleteOwnPost(input) {
      const existing = await repository.findPostByPublicId(input.publicId);
      if (!existing) {
        return { ok: false, error: { kind: "not_found" } };
      }

      if (existing.authorId !== input.authorId) {
        return { ok: false, error: { kind: "forbidden" } };
      }

      if (existing.deletedAt) {
        return { ok: false, error: { kind: "already_deleted" } };
      }

      const deleted = await repository.markPostDeleted({
        publicId: input.publicId,
        authorId: input.authorId,
        deletedAt: new Date(),
      });

      if (!deleted) {
        return { ok: false, error: { kind: "already_deleted" } };
      }

      return { ok: true, value: { publicId: deleted.publicId } };
    },

    findPostByPublicId(publicId) {
      return repository.findPostByPublicId(publicId);
    },
  };
}

function isInvalidMediaAttachment(
  error: unknown,
): error is { code: "INVALID_MEDIA_ATTACHMENT" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "INVALID_MEDIA_ATTACHMENT"
  );
}

export function createInMemoryPostService(state: {
  posts: PostRecord[];
  games: Array<ActiveGameRecord & { isActive: boolean }>;
}): PostService & { snapshot(): { posts: PostRecord[] } } {
  let nextPostNumber = state.posts.length + 1;

  const repository: PostRepository = {
    findActiveGameById(gameId) {
      const match = state.games.find((game) => game.id === gameId && game.isActive);
      return Promise.resolve(
        match
          ? {
              id: match.id,
              slug: match.slug,
              name: match.name,
            }
          : null,
      );
    },

    createPost(values) {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const row: PostRecord = {
        id: `post-${nextPostNumber}`,
        publicId: `pub_${String(nextPostNumber).padStart(8, "0")}`,
        authorId: values.authorId,
        text: values.text,
        gameTagId: values.gameTagId,
        mediaAttachmentId: values.mediaAttachmentId,
        likeCount: 0,
        commentCount: 0,
        deletedAt: null,
        removedAt: null,
        removalPublicReason: null,
        createdAt,
        updatedAt: createdAt,
      };
      nextPostNumber += 1;
      state.posts.push(row);
      return Promise.resolve(row);
    },

    findPostByPublicId(publicId) {
      return Promise.resolve(
        state.posts.find((post) => post.publicId === publicId) ?? null,
      );
    },

    markPostDeleted(values) {
      const index = state.posts.findIndex(
        (post) =>
          post.publicId === values.publicId &&
          post.authorId === values.authorId &&
          post.deletedAt === null,
      );

      if (index === -1) {
        return Promise.resolve(null);
      }

      const updated: PostRecord = {
        ...state.posts[index]!,
        deletedAt: values.deletedAt,
        updatedAt: values.deletedAt,
      };
      state.posts[index] = updated;
      return Promise.resolve(updated);
    },
  };

  return {
    ...createPostService(repository),
    snapshot() {
      return {
        posts: [...state.posts],
      };
    },
  };
}
