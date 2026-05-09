/**
 * Blob storage adapter — abstraction over cloud blob storage.
 *
 * This module defines the interface that both production (Azure Blob)
 * and test (in-memory fake) adapters must satisfy. Azure logic is
 * behind this seam; the media service only depends on the interface.
 */

// ── Interface ────────────────────────────────────────────────────────

export interface BlobStorageAdapter {
  /** Generate a signed URL for uploading a blob. */
  generateSignedUploadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number,
  ): Promise<string>;

  /** Generate a signed URL for reading a blob. */
  generateSignedReadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number,
  ): Promise<string>;

  /** Verify that a blob exists and check its size + content type. */
  verifyBlob(
    container: string,
    blobKey: string,
  ): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
  }>;

  /** Delete a blob from storage. */
  deleteBlob(container: string, blobKey: string): Promise<void>;
}

// ── Fake (in-memory) adapter for tests ───────────────────────────────

export interface StoredBlob {
  data: Buffer;
  mimeType: string;
  size: number;
}

/**
 * In-memory blob storage adapter for use in tests.
 *
 * Stores blobs in a Map keyed by "container/blobKey".
 * generateSigned*Url returns fake URLs that describe the operation.
 * verifyBlob and deleteBlob operate on the in-memory store.
 */
export class FakeBlobStorageAdapter implements BlobStorageAdapter {
  private store = new Map<string, StoredBlob>();

  generateSignedUploadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number,
  ): Promise<string> {
    return Promise.resolve(
      `fake-upload://${container}/${blobKey}?lifetime=${lifetimeSeconds}`,
    );
  }

  generateSignedReadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number,
  ): Promise<string> {
    return Promise.resolve(
      `fake-read://${container}/${blobKey}?lifetime=${lifetimeSeconds}`,
    );
  }

  verifyBlob(
    container: string,
    blobKey: string,
  ): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
    const key = `${container}/${blobKey}`;
    const blob = this.store.get(key);
    if (!blob) return Promise.resolve({ exists: false });
    return Promise.resolve({
      exists: true,
      size: blob.size,
      mimeType: blob.mimeType,
    });
  }

  deleteBlob(container: string, blobKey: string): Promise<void> {
    const key = `${container}/${blobKey}`;
    this.store.delete(key);
    return Promise.resolve();
  }

  /** Store a blob — used by test helpers to simulate a completed upload. */
  storeBlob(
    container: string,
    blobKey: string,
    blob: StoredBlob,
  ): void {
    const key = `${container}/${blobKey}`;
    this.store.set(key, blob);
  }

  /** Clear all stored blobs — used in test setup/teardown. */
  clear(): void {
    this.store.clear();
  }
}
