/**
 * Post service — production wiring around the pure post core.
 */

import { createPostService, type PostCreateInput } from "./post.core.js";
import * as adapter from "./post.adapter.js";

const service = createPostService(adapter);

export type {
  CreatePostError,
  DeleteOwnPostError,
  PostRecord,
  PostService,
} from "./post.core.js";

export function createPost(input: PostCreateInput) {
  return service.createPost(input);
}

export function deleteOwnPost(input: { publicId: string; authorId: string }) {
  return service.deleteOwnPost(input);
}

export function findPostByPublicId(publicId: string) {
  return service.findPostByPublicId(publicId);
}

export { findActiveGameById } from "./post.adapter.js";
