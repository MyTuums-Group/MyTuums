import type { BlobStorageAdapter } from "./blob-storage.adapter.js";
import {
  createMediaService,
  type CleanupCandidate,
  type MediaPersistenceAdapter,
} from "./media.js";

export type MediaCleanupAdapter = MediaPersistenceAdapter & {
  removeByIds: (ids: string[]) => Promise<void>;
};

export type MediaCleanupResult = {
  scanned: number;
  deletedBlobs: number;
  removedRows: number;
  failures: { mediaId: string; message: string }[];
};

export async function cleanupMedia(deps: {
  adapter: MediaCleanupAdapter;
  storage: BlobStorageAdapter;
}): Promise<MediaCleanupResult> {
  const service = createMediaService({
    adapter: deps.adapter,
    storage: deps.storage,
  });
  const candidates = await service.computeCleanupCandidates();
  const successful: string[] = [];
  const failures: MediaCleanupResult["failures"] = [];
  let deletedBlobs = 0;

  for (const candidate of candidates) {
    try {
      if (hasBlob(candidate)) {
        await deps.storage.deleteBlob(
          candidate.storageContainer,
          candidate.blobKey,
        );
        deletedBlobs++;
      }
      successful.push(candidate.mediaId);
    } catch (error) {
      failures.push({
        mediaId: candidate.mediaId,
        message: error instanceof Error ? error.message : "Cleanup failed.",
      });
    }
  }

  await deps.adapter.removeByIds(successful);

  return {
    scanned: candidates.length,
    deletedBlobs,
    removedRows: successful.length,
    failures,
  };
}

function hasBlob(
  candidate: CleanupCandidate,
): candidate is CleanupCandidate & {
  blobKey: string;
  storageContainer: string;
} {
  return !!candidate.blobKey && !!candidate.storageContainer;
}
