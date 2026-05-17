import { createBlobStorageAdapter } from "../services/media/azure-blob-storage.adapter.js"
import { cleanupMedia } from "../services/media/cleanup.js"
import * as mediaAdapter from "../services/media/media.adapter.js"
import { operationalEventLogger } from "../services/operational-events.js"

const result = await cleanupMedia({
  adapter: mediaAdapter,
  storage: createBlobStorageAdapter(),
  logger: operationalEventLogger,
})

if (result.failures.length > 0) {
  process.exitCode = 1
}
