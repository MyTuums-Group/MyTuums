import { createBlobStorageAdapter } from "../services/media/azure-blob-storage.adapter.js";
import { cleanupMedia } from "../services/media/cleanup.js";
import * as mediaAdapter from "../services/media/media.adapter.js";

const result = await cleanupMedia({
  adapter: mediaAdapter,
  storage: createBlobStorageAdapter(),
});

console.log(
  JSON.stringify({
    event: "media_cleanup_completed",
    ...result,
  }),
);

if (result.failures.length > 0) {
  process.exitCode = 1;
}
