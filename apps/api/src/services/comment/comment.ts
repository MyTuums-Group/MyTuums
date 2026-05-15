import { createCommentService, type CommentCreateInput } from "./comment.core.js";
import * as adapter from "./comment.adapter.js";

const service = createCommentService(adapter);

export type {
  CommentRecord,
  CommentService,
  CreateCommentError,
  DeleteOwnCommentError,
  ToggleCommentLikeError,
} from "./comment.core.js";

export function createComment(input: CommentCreateInput) {
  return service.createComment(input);
}

export function deleteOwnComment(input: { commentId: string; authorId: string }) {
  return service.deleteOwnComment(input);
}

export function toggleCommentLike(input: { commentId: string; userId: string }) {
  return service.toggleCommentLike(input);
}
