/**
 * Client-side helpers that mirror apps/api/src/services/media/media.policy.ts intent
 * checks (MIME + size caps). Frontend validation improves UX before createUpload —
 * canonical checks remain server-side.
 */

import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type MediaPurpose,
} from "@workspace/types"
import { useEffect, useRef, useState } from "react"
import { trpc } from "./trpc"

export const CLIENT_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const CLIENT_ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const

export const CLIENT_ALLOWED_MEDIA_MIME_TYPES = [
  ...CLIENT_ALLOWED_IMAGE_MIME_TYPES,
  ...CLIENT_ALLOWED_VIDEO_MIME_TYPES,
] as const

export type ClientMediaUploadPurpose = MediaPurpose

export type ClientUploadValidationIssue =
  | { kind: "unsupported_type"; message: string }
  | { kind: "file_too_large"; message: string }

function isAllowedPurpose(purpose: string): purpose is MediaPurpose {
  return (
    purpose === "post_attachment" ||
    purpose === "profile_avatar" ||
    purpose === "profile_banner"
  )
}

function mimeIsImage(mimeType: string): boolean {
  return (CLIENT_ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
    mimeType
  )
}

function mimeIsVideo(mimeType: string): boolean {
  return (CLIENT_ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(
    mimeType
  )
}

function maxBytesLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} bytes`
}

function allowedMimeCandidatesForPurpose(
  purpose: MediaPurpose
): readonly string[] {
  if (purpose === "profile_avatar" || purpose === "profile_banner") {
    return CLIENT_ALLOWED_IMAGE_MIME_TYPES
  }
  return CLIENT_ALLOWED_MEDIA_MIME_TYPES
}

/**
 * Mirrors server `validateUploadIntent` for MIME and size constraints.
 * Avatar/banner only accept images to match `<input accept>` UX.
 */
export function validateClientMediaUpload(input: {
  mimeType: string
  byteSize: number
  purpose: unknown
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
    }
  }
  const purpose = input.purpose as MediaPurpose
  const mimeType = String(input.mimeType || "").trim()
  const candidates = allowedMimeCandidatesForPurpose(purpose)

  if (!mimeType) {
    return {
      ok: false,
      issue: {
        kind: "unsupported_type",
        message: `Unsupported file type. Use ${purpose === "post_attachment" ? "JPEG, PNG, WebP images or MP4/WebM videos" : "JPEG, PNG, or WebP images"}.`,
      },
    }
  }

  const allowedMime = candidates.includes(mimeType)
  if (!allowedMime) {
    const hint =
      purpose === "post_attachment"
        ? "JPEG, PNG, WebP images or MP4/WebM videos."
        : "JPEG, PNG, or WebP images."
    return {
      ok: false,
      issue: {
        kind: "unsupported_type",
        message: `Unsupported file type (${mimeType || "unknown"}). Allowed: ${hint}`,
      },
    }
  }

  if (purpose === "post_attachment") {
    if (!mimeIsImage(mimeType) && !mimeIsVideo(mimeType)) {
      return {
        ok: false,
        issue: {
          kind: "unsupported_type",
          message:
            "Unsupported file type for post attachments. Use JPEG, PNG, WebP images or MP4/WebM videos.",
        },
      }
    }
  }

  const max = mimeIsVideo(mimeType) ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES
  const kindLabel = mimeIsVideo(mimeType) ? "video" : "image"

  if (input.byteSize <= 0) {
    return {
      ok: false,
      issue: {
        kind: "file_too_large",
        message: "Choose a non-empty media file.",
      },
    }
  }

  if (input.byteSize > max) {
    return {
      ok: false,
      issue: {
        kind: "file_too_large",
        message: `That ${kindLabel} is too large (max ${maxBytesLabel(max)}).`,
      },
    }
  }

  return { ok: true, mimeType, byteSize: input.byteSize, purpose }
}

/** Upload blob to Azure signed URL via XHR PUT (same semantics as Blob storage). */
export function uploadBlobViaPutXhr(params: {
  uploadUrl: string
  file: File
  onProgress: (progressPercent: number) => void
}): Promise<void> {
  const { uploadUrl, file, onProgress } = params

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob")
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error("BLOB_UPLOAD_FAILED"))
    }
    xhr.onerror = () => reject(new Error("BLOB_UPLOAD_FAILED"))
    xhr.send(file)
  })
}

export type MediaUploadPhase = "intent" | "blob" | "confirm"

export function describeMediaUploadFailure(
  error: unknown,
  phase: MediaUploadPhase
): string {
  if (error instanceof Error) {
    const code = error.message
    if (code === "BLOB_UPLOAD_FAILED") {
      return "Upload to storage failed. Check your connection and try again."
    }
    switch (phase) {
      case "intent":
        if (code === "invalid_mime_type") {
          return "The server rejected the file type."
        }
        if (code === "file_too_large") {
          return "The server rejected the file size."
        }
        return error.message ? error.message : "Could not start the upload."
      case "blob":
        return "Upload to storage failed. Check your connection and try again."
      case "confirm": {
        if (
          code === "blob_not_found" ||
          code === "blob_size_mismatch" ||
          code === "blob_type_mismatch"
        ) {
          return "The upload could not be confirmed against storage."
        }
        if (code === "media_expired") {
          return "The upload expired before confirmation. Retry the upload."
        }
        return categoryConfirmMessage(code)
      }
      default:
        return error.message || "Something went wrong."
    }
  }
  return phase === "confirm"
    ? "Could not confirm the upload."
    : "Something went wrong."
}

function categoryConfirmMessage(code: string): string {
  switch (code) {
    case "media_not_pending":
      return "The upload session is no longer pending on the server."
    case "wrong_owner":
      return "You cannot confirm uploads that belong to another account."
    case "media_not_found":
      return "The upload reference was not found."
    default:
      return code
  }
}

export type ClientMediaUploadStatus = "uploading" | "ready" | "failed"

type ClientMediaUploadBaseState = {
  file: File
  previewUrl: string
  progress: number
  purpose: MediaPurpose
}

export type ClientMediaUploadState =
  | (ClientMediaUploadBaseState & {
      status: "uploading"
      mediaId: string | null
      errorMessage: null
    })
  | (ClientMediaUploadBaseState & {
      status: "ready"
      mediaId: string
      errorMessage: null
    })
  | (ClientMediaUploadBaseState & {
      status: "failed"
      mediaId: string | null
      errorMessage: string
    })

export type ClientMediaUploadReadyState = Extract<
  ClientMediaUploadState,
  { status: "ready" }
>

export type ReleasedClientMediaUpload = {
  file: File
  kind: "image" | "video"
  mediaId: string
  mimeType: string
  previewUrl: string
  revokePreviewUrl: () => void
}

type ClientMediaUploadIntent = {
  mediaId: string
  uploadUrl: string
}

export type ClientMediaUploadWorkflowOperations = {
  createUpload: (input: {
    byteSize: number
    mimeType: string
    purpose: MediaPurpose
  }) => Promise<ClientMediaUploadIntent>
  retryUpload: (input: { mediaId: string }) => Promise<{ uploadUrl: string }>
  uploadBlob: typeof uploadBlobViaPutXhr
  confirmUpload: (input: { mediaId: string }) => Promise<unknown>
}

export type ClientMediaUploadWorkflowStep =
  | { phase: MediaUploadPhase; status: "started" }
  | {
      phase: "intent"
      status: "succeeded"
      mediaId: string
      uploadUrl: string
    }
  | { phase: "blob"; status: "progress"; progress: number }
  | { phase: "blob"; status: "succeeded"; mediaId: string }
  | { phase: "confirm"; status: "succeeded"; mediaId: string }
  | { phase: MediaUploadPhase; status: "failed"; message: string }

export type ClientMediaUploadWorkflowResult =
  | { ok: true; mediaId: string }
  | {
      ok: false
      cancelled?: false
      mediaId: string | null
      message: string
      phase: MediaUploadPhase
    }
  | { ok: false; cancelled: true; mediaId: string | null }

export async function executeClientMediaUploadWorkflow(params: {
  file: File
  mediaId?: string
  operations: ClientMediaUploadWorkflowOperations
  onStep?: (step: ClientMediaUploadWorkflowStep) => void
  purpose: MediaPurpose
  shouldContinue?: () => boolean
}): Promise<ClientMediaUploadWorkflowResult> {
  const shouldContinue = params.shouldContinue ?? (() => true)
  const emit = (step: ClientMediaUploadWorkflowStep) => params.onStep?.(step)

  let mediaId = params.mediaId ?? null
  let uploadUrl = ""

  emit({ phase: "intent", status: "started" })
  try {
    if (mediaId) {
      const retry = await params.operations.retryUpload({ mediaId })
      uploadUrl = retry.uploadUrl
    } else {
      const intent = await params.operations.createUpload({
        mimeType: params.file.type,
        byteSize: params.file.size,
        purpose: params.purpose,
      })
      mediaId = intent.mediaId
      uploadUrl = intent.uploadUrl
    }

    emit({
      phase: "intent",
      status: "succeeded",
      mediaId,
      uploadUrl,
    })
  } catch (error) {
    const message = describeMediaUploadFailure(error, "intent")
    emit({ phase: "intent", status: "failed", message })
    return { ok: false, phase: "intent", message, mediaId }
  }

  if (!shouldContinue()) {
    return { ok: false, cancelled: true, mediaId }
  }

  emit({ phase: "blob", status: "started" })
  try {
    await params.operations.uploadBlob({
      uploadUrl,
      file: params.file,
      onProgress: (progress) => {
        if (shouldContinue()) {
          emit({ phase: "blob", status: "progress", progress })
        }
      },
    })
    emit({ phase: "blob", status: "succeeded", mediaId })
  } catch (error) {
    const message = describeMediaUploadFailure(error, "blob")
    emit({ phase: "blob", status: "failed", message })
    return { ok: false, phase: "blob", message, mediaId }
  }

  if (!shouldContinue()) {
    return { ok: false, cancelled: true, mediaId }
  }

  emit({ phase: "confirm", status: "started" })
  try {
    await params.operations.confirmUpload({ mediaId })
    emit({ phase: "confirm", status: "succeeded", mediaId })
  } catch (error) {
    const message = describeMediaUploadFailure(error, "confirm")
    emit({ phase: "confirm", status: "failed", message })
    return { ok: false, phase: "confirm", message, mediaId }
  }

  if (!shouldContinue()) {
    return { ok: false, cancelled: true, mediaId }
  }

  return { ok: true, mediaId }
}

export function getClientMediaUploadKind(
  upload: Pick<ClientMediaUploadState, "file">
): "image" | "video" {
  return upload.file.type.startsWith("video/") ? "video" : "image"
}

export function getClientMediaUploadStatus(
  upload: ClientMediaUploadState | null
): "idle" | ClientMediaUploadStatus {
  return upload?.status ?? "idle"
}

export function clientMediaUploadBlocksSubmit(
  upload: ClientMediaUploadState | null
): boolean {
  return upload?.status === "uploading" || upload?.status === "failed"
}

export function getReadyClientMediaUpload(
  upload: ClientMediaUploadState | null
): ClientMediaUploadReadyState | null {
  return upload?.status === "ready" ? upload : null
}

export function useMediaUploadWorkflow(input: {
  purpose: ClientMediaUploadPurpose
}) {
  const [upload, setUpload] = useState<ClientMediaUploadState | null>(null)
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null
  )
  const uploadRef = useRef<ClientMediaUploadState | null>(null)
  const operationRef = useRef(0)

  const createUploadMutation = trpc.media.createUpload.useMutation()
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation()
  const retryUploadMutation = trpc.media.retryUpload.useMutation()
  const removeUploadMutation = trpc.media.removeUpload.useMutation()

  useEffect(() => {
    return () => {
      const current = uploadRef.current
      if (current) URL.revokeObjectURL(current.previewUrl)
      uploadRef.current = null
    }
  }, [])

  function replaceUpload(next: ClientMediaUploadState | null) {
    uploadRef.current = next
    setUpload(next)
  }

  function updateUpload(
    updater: (
      current: ClientMediaUploadState | null
    ) => ClientMediaUploadState | null
  ) {
    setUpload((current) => {
      const next = updater(current)
      uploadRef.current = next
      return next
    })
  }

  function applyWorkflowStep(
    operationId: number,
    step: ClientMediaUploadWorkflowStep
  ) {
    if (operationRef.current !== operationId) return

    if (step.phase === "intent" && step.status === "succeeded") {
      updateUpload((current) =>
        current ? { ...current, mediaId: step.mediaId } : current
      )
      return
    }

    if (step.phase === "blob" && step.status === "progress") {
      updateUpload((current) =>
        current?.status === "uploading"
          ? { ...current, progress: step.progress }
          : current
      )
      return
    }

    if (step.status === "failed") {
      updateUpload((current) =>
        current
          ? { ...current, status: "failed", errorMessage: step.message }
          : current
      )
      return
    }

    if (step.phase === "confirm" && step.status === "succeeded") {
      updateUpload((current) =>
        current
          ? {
              ...current,
              status: "ready",
              mediaId: step.mediaId,
              progress: 100,
              errorMessage: null,
            }
          : current
      )
    }
  }

  async function removeMediaRecord(mediaId: string): Promise<void> {
    await removeUploadMutation.mutateAsync({ mediaId })
  }

  async function start(file: File | null): Promise<void> {
    if (!file) return

    const validated = validateClientMediaUpload({
      mimeType: file.type,
      byteSize: file.size,
      purpose: input.purpose,
    })

    if (!validated.ok) {
      setLocalErrorMessage(validated.issue.message)
      return
    }

    const previous = uploadRef.current
    const previewUrl = URL.createObjectURL(file)
    const operationId = operationRef.current + 1
    operationRef.current = operationId
    setLocalErrorMessage(null)
    replaceUpload({
      file,
      previewUrl,
      purpose: validated.purpose,
      status: "uploading",
      progress: 0,
      mediaId: null,
      errorMessage: null,
    })

    if (previous) {
      URL.revokeObjectURL(previous.previewUrl)
      if (previous.mediaId) {
        try {
          await removeMediaRecord(previous.mediaId)
        } catch {
          // The previous upload may already have expired or been attached.
        }
      }
    }

    const result = await executeClientMediaUploadWorkflow({
      file,
      purpose: validated.purpose,
      operations: {
        createUpload: createUploadMutation.mutateAsync,
        retryUpload: retryUploadMutation.mutateAsync,
        uploadBlob: uploadBlobViaPutXhr,
        confirmUpload: confirmUploadMutation.mutateAsync,
      },
      shouldContinue: () => operationRef.current === operationId,
      onStep: (step) => applyWorkflowStep(operationId, step),
    })

    if (!result.ok && result.cancelled && result.mediaId) {
      try {
        await removeMediaRecord(result.mediaId)
      } catch {
        // Best-effort cleanup for a superseded upload.
      }
    }
  }

  async function retry(): Promise<void> {
    const current = uploadRef.current
    if (!current?.mediaId) return

    const operationId = operationRef.current + 1
    operationRef.current = operationId
    setLocalErrorMessage(null)
    updateUpload((active) =>
      active
        ? {
            ...active,
            status: "uploading",
            progress: 0,
            errorMessage: null,
          }
        : active
    )

    const result = await executeClientMediaUploadWorkflow({
      file: current.file,
      mediaId: current.mediaId,
      purpose: current.purpose,
      operations: {
        createUpload: createUploadMutation.mutateAsync,
        retryUpload: retryUploadMutation.mutateAsync,
        uploadBlob: uploadBlobViaPutXhr,
        confirmUpload: confirmUploadMutation.mutateAsync,
      },
      shouldContinue: () => operationRef.current === operationId,
      onStep: (step) => applyWorkflowStep(operationId, step),
    })

    if (!result.ok && result.cancelled && result.mediaId) {
      try {
        await removeMediaRecord(result.mediaId)
      } catch {
        // Best-effort cleanup for a superseded retry.
      }
    }
  }

  async function remove(): Promise<
    { ok: true } | { ok: false; message: string }
  > {
    const current = uploadRef.current
    if (!current) return { ok: true }

    const operationId = operationRef.current + 1
    operationRef.current = operationId
    setLocalErrorMessage(null)

    if (current.mediaId) {
      try {
        await removeMediaRecord(current.mediaId)
      } catch (error) {
        const message = getUnknownErrorMessage(error)
        setLocalErrorMessage(message)
        updateUpload((active) =>
          active
            ? {
                ...active,
                status: "failed",
                errorMessage: message,
              }
            : active
        )
        return { ok: false, message }
      }
    }

    if (operationRef.current === operationId) {
      URL.revokeObjectURL(current.previewUrl)
      replaceUpload(null)
    }

    return { ok: true }
  }

  function clearLocal(options?: { revokePreviewUrl?: boolean }) {
    const current = uploadRef.current
    operationRef.current += 1
    setLocalErrorMessage(null)
    replaceUpload(null)

    if (current && options?.revokePreviewUrl !== false) {
      URL.revokeObjectURL(current.previewUrl)
    }

    return current
  }

  function releaseReadyUpload(): ReleasedClientMediaUpload | null {
    const ready = getReadyClientMediaUpload(uploadRef.current)
    if (!ready) return null

    clearLocal({ revokePreviewUrl: false })
    return {
      file: ready.file,
      kind: getClientMediaUploadKind(ready),
      mediaId: ready.mediaId,
      mimeType: ready.file.type,
      previewUrl: ready.previewUrl,
      revokePreviewUrl: () => URL.revokeObjectURL(ready.previewUrl),
    }
  }

  const readyUpload = getReadyClientMediaUpload(upload)

  return {
    upload,
    readyUpload,
    status: getClientMediaUploadStatus(upload),
    errorMessage: upload?.errorMessage ?? localErrorMessage,
    blocksSubmit: clientMediaUploadBlocksSubmit(upload),
    start,
    retry,
    remove,
    clearLocal,
    releaseReadyUpload,
  }
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }
  return "Something went wrong."
}
