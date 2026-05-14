import { feedVisibilityQueries } from "../feed/production.js";
import { mediaService } from "../media/media-service.production.js";
import { createPostPresentation } from "./presentation.js";

export const postPresentation = createPostPresentation({
  media: mediaService,
  loadPostDetail: (viewer, publicId) => feedVisibilityQueries.postDetail(viewer, publicId),
});
