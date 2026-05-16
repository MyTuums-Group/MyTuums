/**
 * Client-side helpers that mirror apps/api/src/services/media/media.policy.ts intent
 * checks (MIME + size caps). Frontend validation improves UX before createUpload —
 * canonical checks remain server-side.
 */

import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type MediaPurpose,
} from "@workspace/types";

export const CLIENT_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CLIENT_ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;

export const CLIENT_ALLOWED_MEDIA_MIME_TYPES = [
  ...CLIENT_ALLOWED_IMAGE_MIME_TYPES,
  ...CLIENT_ALLOWED_VIDEO_MIME_TYPES,
] as const;

export type ClientMediaUploadPurpose = MediaPurpose;

export type ClientUploadValidationIssue =
  | { kind: "unsupported_type"; message: string }
  | { kind: "file_too_large"; message: string };

function isAllowedPurpose(purpose: string): purpose is MediaPurpose {
  return (
    purpose === "post_attachment" ||
    purpose === "profile_avatar" ||
    purpose === "profile_banner"
  );
}

function mimeIsImage(mimeType: string): boolean {
  return (CLIENT_ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}

function mimeIsVideo(mimeType: string): boolean {
  return (CLIENT_ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}

function maxBytesLabel(bytes: number): string {
  if (bytes >= 1024 * 1024)
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

function allowedMimeCandidatesForPurpose(
  purpose: MediaPurpose,
): readonly string[] {
  if (
    purpose === "profile_avatar" ||
    purpose === "profile_banner"
  ) {
    return CLIENT_ALLOWED_IMAGE_MIME_TYPES;
  }
  return CLIENT_ALLOWED_MEDIA_MIME_TYPES;
}

/**
 * Mirrors server `validateUploadIntent` for MIME and size constraints.
 * Avatar/banner only accept images to match `<input accept>` UX.
 */
export function validateClientMediaUpload(input: {
  mimeType: string;
  byteSize: number;
  purpose: unknown;
}):
  | { ok: true; mimeType: string; byteSize: number; purpose: MediaPurpose }
  | { ok: false; issue: ClientUploadValidationIssue } {
  if (!isAllowedPurpose(String(input.purpose))) {
    return {
      ok: false,
      issue: {
        kind: "unsupported_type",
        message: "Unsupported media purpose for upload.",
      },
    };
  }
  const purpose = input.purpose as MediaPurpose;
  const mimeType = String(input.mimeType || "").trim();
  const candidates = allowedMimeCandidatesForPurpose(purpose);

  if (!mimeType) {
    return {
      ok: false,
      issue: {
        kind: "unsupported_type",
        message: `Unsupported file type. Use ${purpose === "post_attachment" ? "JPEG, PNG, WebP images or MP4/WebM videos" : "JPEG, PNG, or WebP images"}.`,
      },
    };
  }

  const allowedMime = candidates.includes(mimeType);
  if (!allowedMime) {
    const hint =
      purpose === "post_attachment"
        ? "JPEG, PNG, WebP images or MP4/WebM videos."
        : "JPEG, PNG, or WebP images.";
    return {
      ok: false,
      issue: {
        kind: "unsupported_type",
        message: `Unsupported file type (${mimeType || "unknown"}). Allowed: ${hint}`,
      },
    };
  }

  if (purpose === "post_attachment") {
    if (!mimeIsImage(mimeType) && !mimeIsVideo(mimeType)) {
      return {
        ok: false,
        issue: {
          kind: "unsupported_type",
          message:
            'Unsupported file type for post attachments. Use JPEG, PNG, WebP images or MP4/WebM videos.',
        },
      };
    }
  }

  const max =
    mimeIsVideo(mimeType) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  const kindLabel = mimeIsVideo(mimeType)
    ? "video"
    : "image";

  if (input.byteSize <= 0) {
    return {
      ok: false,
      issue: {
        kind: "file_too_large",
        message: "Choose a non-empty media file.",
      },
    };
  }

  if (input.byteSize > max) {
    return {
      ok: false,
      issue: {
        kind: "file_too_large",
        message: `That ${kindLabel} is too large (max ${maxBytesLabel(max)}).`,
      },
    };
  }

  return { ok: true, mimeType, byteSize: input.byteSize, purpose };
}

/** Upload blob to Azure signed URL via XHR PUT (same semantics as Blob storage). */
export function uploadBlobViaPutXhr(params: {
  uploadUrl: string;
  file: File;
  onProgress: (progressPercent: number) => void;
}): Promise<void> {
  const { uploadUrl, file, onProgress } = params;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("BLOB_UPLOAD_FAILED"));
    };
    xhr.onerror = () => reject(new Error("BLOB_UPLOAD_FAILED"));
    xhr.send(file);
  });
}

export type MediaUploadPhase = "intent" | "blob" | "confirm";

export function describeMediaUploadFailure(
  error: unknown,
  phase: MediaUploadPhase,
): string {
  if (error instanceof Error) {
    const code = error.message;
    if (code === "BLOB_UPLOAD_FAILED") {
      return "Upload to storage failed. Check your connection and try again.";
    }
    switch (phase) {
      case "intent":
        if (code === "invalid_mime_type") {
          return "The server rejected the file type.";
        }
        if (code === "file_too_large") {
          return "The server rejected the file size.";
        }
        return error.message ? error.message : "Could not start the upload.";
      case "blob":
        return "Upload to storage failed. Check your connection and try again.";
      case "confirm": {
        if (
          code === "blob_not_found" ||
          code === "blob_size_mismatch" ||
          code === "blob_type_mismatch"
        ) {
          return "The upload could not be confirmed against storage.";
        }
        if (code === "media_expired") {
          return "The upload expired before confirmation. Retry the upload.";
        }
        return categoryConfirmMessage(code);
      }
      default:
        return error.message || "Something went wrong.";
    }
  }
  return phase === "confirm"
    ? "Could not confirm the upload."
    : "Something went wrong.";
}

function categoryConfirmMessage(code: string): string {
  switch (code) {
    case "media_not_pending":
      return "The upload session is no longer pending on the server.";
    case "wrong_owner":
      return "You cannot confirm uploads that belong to another account.";
    case "media_not_found":
      return "The upload reference was not found.";
    default:
      return code;
  }
}
