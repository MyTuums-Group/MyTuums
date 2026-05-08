// ── PostBody — branded type only ──
// Validation logic (createPostBody, postBodyLength) moved to apps/api/src/services/post/post.policy.ts

declare const __brand: unique symbol;
export type PostBody = string & { [__brand]: "PostBody" };