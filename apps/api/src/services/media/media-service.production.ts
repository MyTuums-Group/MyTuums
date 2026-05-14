/**
 * Production singleton — composes Drizzle media adapter + Azure blob storage.
 * Routers import `mediaService` from here; they do not construct adapters.
 */

import { createBlobStorageAdapter } from "./azure-blob-storage.adapter.js";
import * as mediaAdapter from "./media.adapter.js";
import { createMediaService } from "./media.js";

export const mediaService = createMediaService({
  adapter: mediaAdapter,
  storage: createBlobStorageAdapter(),
});
