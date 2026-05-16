import { describe, expect, it } from "vitest";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@workspace/types";
import { validateClientMediaUpload } from "./media-upload-client.ts";

describe("validateClientMediaUpload", () => {
  it("allows post_attachment images within size cap", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "image/jpeg",
        byteSize: IMAGE_MAX_BYTES,
        purpose: "post_attachment",
      }),
    ).toEqual({
      ok: true,
      mimeType: "image/jpeg",
      byteSize: IMAGE_MAX_BYTES,
      purpose: "post_attachment",
    });
  });

  it("allows post_attachment videos with video cap", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "video/mp4",
        byteSize: VIDEO_MAX_BYTES,
        purpose: "post_attachment",
      }),
    ).toEqual({
      ok: true,
      mimeType: "video/mp4",
      byteSize: VIDEO_MAX_BYTES,
      purpose: "post_attachment",
    });
  });

  it("blocks unsupported MIME for post_attachment", () => {
    const result = validateClientMediaUpload({
      mimeType: "image/gif",
      byteSize: 1024,
      purpose: "post_attachment",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issue.kind).toBe("unsupported_type");
  });

  it("blocks video MIME for avatar purpose", () => {
    const result = validateClientMediaUpload({
      mimeType: "video/mp4",
      byteSize: 1024,
      purpose: "profile_avatar",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issue.kind).toBe("unsupported_type");
  });

  it("blocks oversized profile banner images", () => {
    const result = validateClientMediaUpload({
      mimeType: "image/png",
      byteSize: IMAGE_MAX_BYTES + 1,
      purpose: "profile_banner",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issue.kind).toBe("file_too_large");
  });

  it("blocks oversized post videos vs image cap semantics", () => {
    expect(
      validateClientMediaUpload({
        mimeType: "video/mp4",
        byteSize: VIDEO_MAX_BYTES + 1,
        purpose: "post_attachment",
      }).ok,
    ).toBe(false);
  });

  it("formats empty MIME as unsupported", () => {
    const result = validateClientMediaUpload({
      mimeType: "",
      byteSize: 512,
      purpose: "profile_avatar",
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issue.kind).toBe("unsupported_type");
  });
});
