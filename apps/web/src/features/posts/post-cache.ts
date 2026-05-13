import type { PostFeedPage, PostView } from "./types";

export function prependPostToFeedPage(
  page: PostFeedPage | undefined,
  post: PostView,
): PostFeedPage {
  if (!page) {
    return {
      items: [post],
      nextCursor: null,
    };
  }

  return {
    ...page,
    items: [post, ...page.items.filter((item) => item.publicId !== post.publicId)],
  };
}

export function replacePostInFeedPage(
  page: PostFeedPage | undefined,
  targetPublicId: string,
  replacement: PostView,
): PostFeedPage | undefined {
  if (!page) return page;

  return {
    ...page,
    items: page.items.map((item) =>
      item.publicId === targetPublicId ? replacement : item,
    ),
  };
}

export function removePostFromFeedPage(
  page: PostFeedPage | undefined,
  publicId: string,
): PostFeedPage | undefined {
  if (!page) return page;

  return {
    ...page,
    items: page.items.filter((item) => item.publicId !== publicId),
  };
}
