// ── CommentBody — branded type only ──
// Validation logic (createCommentBody) moved to apps/api/src/services/comment/comment.policy.ts

declare const __brand: unique symbol;
export type CommentBody = string & { [__brand]: "CommentBody" };