import { describe, expect, it } from "vitest"
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@workspace/types"
import {
  executeClientMediaUploadWorkflow,
  validateClientMediaUpload,
  type ClientMediaUploadWorkflowStep,
} from "./media-upload-client.ts"

describe("validateClientMediaUpload", () => {
  it("allows post_attachment images within size cap", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "image/jpeg",
        byteSize: IMAGE_MAX_BYTES,
        purpose: "post_attachment",
      })
    ).toEqual({
      ok: true,
      mimeType: "image/jpeg",
      byteSize: IMAGE_MAX_BYTES,
      purpose: "post_attachment",
    })
  })

  it("allows post_attachment videos with video cap", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "video/mp4",
        byteSize: VIDEO_MAX_BYTES,
        purpose: "post_attachment",
      })
    ).toEqual({
      ok: true,
      mimeType: "video/mp4",
      byteSize: VIDEO_MAX_BYTES,
      purpose: "post_attachment",
    })
  })

  it("blocks unsupported MIME for post_attachment", () => {
    const result = validateClientMediaUpload({
      mimeType: "image/gif",
      byteSize: 1024,
      purpose: "post_attachment",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.kind).toBe("unsupported_type")
  })

  it("blocks video MIME for avatar purpose", () => {
    const result = validateClientMediaUpload({
      mimeType: "video/mp4",
      byteSize: 1024,
      purpose: "profile_avatar",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.kind).toBe("unsupported_type")
  })

  it("blocks oversized profile banner images", () => {
    const result = validateClientMediaUpload({
      mimeType: "image/png",
      byteSize: IMAGE_MAX_BYTES + 1,
      purpose: "profile_banner",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.kind).toBe("file_too_large")
  })

  it("blocks oversized post videos vs image cap semantics", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "video/mp4",
        byteSize: VIDEO_MAX_BYTES + 1,
        purpose: "post_attachment",
      }).ok
    ).toBe(false)
  })

  it("formats empty MIME as unsupported", () => {
    const result = validateClientMediaUpload({
      mimeType: "",
      byteSize: 512,
      purpose: "profile_avatar",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issue.kind).toBe("unsupported_type")
  })
})

describe("executeClientMediaUploadWorkflow", () => {
  it("runs create intent, blob upload, and confirmation in order", async () => {
    const steps: string[] = []

    const result = await executeClientMediaUploadWorkflow({
      file: fakeFile("image/png", 1024),
      purpose: "post_attachment",
      operations: {
        createUpload: (input) => {
          expect(input).toEqual({
            mimeType: "image/png",
            byteSize: 1024,
            purpose: "post_attachment",
          })
          return Promise.resolve({
            mediaId: "media-1",
            uploadUrl: "https://upload.test/1",
          })
        },
        retryUpload: () =>
          Promise.reject(new Error("retry should not be called")),
        uploadBlob: ({ onProgress, uploadUrl }) => {
          expect(uploadUrl).toBe("https://upload.test/1")
          onProgress(45)
          return Promise.resolve()
        },
        confirmUpload: (input) => {
          expect(input).toEqual({ mediaId: "media-1" })
          return Promise.resolve()
        },
      },
      onStep: (step) => steps.push(formatStep(step)),
    })

    expect(result).toEqual({ ok: true, mediaId: "media-1" })
    expect(steps).toEqual([
      "intent:started",
      "intent:succeeded:media-1",
      "blob:started",
      "blob:progress:45",
      "blob:succeeded:media-1",
      "confirm:started",
      "confirm:succeeded:media-1",
    ])
  })

  it("uses retry upload URLs for an existing media id", async () => {
    const steps: string[] = []

    const result = await executeClientMediaUploadWorkflow({
      file: fakeFile("image/webp", 2048),
      mediaId: "media-2",
      purpose: "profile_banner",
      operations: {
        createUpload: () =>
          Promise.reject(new Error("create should not be called")),
        retryUpload: (input) => {
          expect(input).toEqual({ mediaId: "media-2" })
          return Promise.resolve({ uploadUrl: "https://upload.test/retry" })
        },
        uploadBlob: ({ uploadUrl }) => {
          expect(uploadUrl).toBe("https://upload.test/retry")
          return Promise.resolve()
        },
        confirmUpload: (input) => {
          expect(input).toEqual({ mediaId: "media-2" })
          return Promise.resolve()
        },
      },
      onStep: (step) => steps.push(formatStep(step)),
    })

    expect(result).toEqual({ ok: true, mediaId: "media-2" })
    expect(steps).toContain("intent:succeeded:media-2")
  })

  it("reports blob failures with client-safe copy", async () => {
    const steps: string[] = []

    const result = await executeClientMediaUploadWorkflow({
      file: fakeFile("video/mp4", 4096),
      purpose: "post_attachment",
      operations: {
        createUpload: () =>
          Promise.resolve({
            mediaId: "media-3",
            uploadUrl: "https://upload.test/3",
          }),
        retryUpload: () =>
          Promise.reject(new Error("retry should not be called")),
        uploadBlob: () => Promise.reject(new Error("BLOB_UPLOAD_FAILED")),
        confirmUpload: () =>
          Promise.reject(new Error("confirm should not be called")),
      },
      onStep: (step) => steps.push(formatStep(step)),
    })

    expect(result).toEqual({
      ok: false,
      phase: "blob",
      message: "Upload to storage failed. Check your connection and try again.",
      mediaId: "media-3",
    })
    expect(steps.at(-1)).toBe(
      "blob:failed:Upload to storage failed. Check your connection and try again."
    )
  })
})

function fakeFile(type: string, size: number): File {
  return { type, size } as File
}

function formatStep(step: ClientMediaUploadWorkflowStep): string {
  if (step.status === "progress") {
    return `${step.phase}:${step.status}:${step.progress}`
  }
  if (step.status === "succeeded" && "mediaId" in step) {
    return `${step.phase}:${step.status}:${step.mediaId}`
  }
  if (step.status === "failed") {
    return `${step.phase}:${step.status}:${step.message}`
  }
  return `${step.phase}:${step.status}`
}
