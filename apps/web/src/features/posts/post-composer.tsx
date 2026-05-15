import { useState } from "react";
import { ImageSquare, PenNib, Trash } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { trpc } from "@/lib/trpc";
import { DEFAULT_POST_PAGE_LIMIT } from "./constants";
import {
  prependPostToFeedPage,
  replacePostInFeedPage,
} from "./post-cache";
import { getPostTextState } from "./post-text";
import type { PostView } from "./types";

type PostComposerProps = {
  onCreated?: (post: PostView) => void;
};

export function PostComposer({ onCreated }: PostComposerProps) {
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);

  const utils = trpc.useUtils();
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const state = getPostTextState(draft);
  const activeProfile =
    currentAppUser.data?.kind === "active_onboarded_profile"
      ? currentAppUser.data.profile
      : null;
  const createUploadMutation = trpc.media.createUpload.useMutation();
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation();
  const retryUploadMutation = trpc.media.retryUpload.useMutation();
  const removeUploadMutation = trpc.media.removeUpload.useMutation();

  const createMutation = trpc.post.create.useMutation({
    async onMutate(variables) {
      const optimisticPublicId = `optimistic-${Date.now()}`;
      const optimisticPost: PostView = {
        publicId: optimisticPublicId,
        text: variables.text,
        author: {
          username: activeProfile?.username ?? "you",
          displayName: activeProfile?.displayName ?? "You",
          avatarUrl: null,
        },
        gameTag: null,
        media:
          upload?.status === "ready"
            ? {
                id: upload.mediaId,
                kind: upload.file.type.startsWith("video/") ? "video" : "image",
                mimeType: upload.file.type,
                url: upload.previewUrl,
              }
            : null,
        likeCount: 0,
        likedByViewer: false,
        commentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        canDelete: true,
      };

      await Promise.all([
        utils.post.forYouFeed.cancel({ limit: DEFAULT_POST_PAGE_LIMIT }),
        activeProfile
          ? utils.post.profileFeed.cancel({
              username: activeProfile.username,
              limit: DEFAULT_POST_PAGE_LIMIT,
            })
          : Promise.resolve(),
      ]);

      const previousForYou = utils.post.forYouFeed.getData({
        limit: DEFAULT_POST_PAGE_LIMIT,
      });
      const previousProfile = activeProfile
        ? utils.post.profileFeed.getData({
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          })
        : undefined;

      setErrorMessage(null);
      setDraft("");
      clearUpload();

      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        (current) => prependPostToFeedPage(current, optimisticPost),
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          (current) => prependPostToFeedPage(current, optimisticPost),
        );
      }

      return {
        optimisticPublicId,
        previousForYou,
        previousProfile,
        previousDraft: draft,
      };
    },

    onError(error, _variables, context) {
      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        context?.previousForYou,
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          context?.previousProfile,
        );
      }

      setDraft(context?.previousDraft ?? "");
      setErrorMessage(error.message);
    },

    onSuccess(createdPost, _variables, context) {
      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        (current) =>
          replacePostInFeedPage(
            current,
            context?.optimisticPublicId ?? createdPost.publicId,
            createdPost,
          ) ?? prependPostToFeedPage(current, createdPost),
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          (current) =>
            replacePostInFeedPage(
              current,
              context?.optimisticPublicId ?? createdPost.publicId,
              createdPost,
            ) ?? prependPostToFeedPage(current, createdPost),
        );
      }

      onCreated?.(createdPost);
    },

    async onSettled() {
      await Promise.all([
        utils.post.forYouFeed.invalidate({ limit: DEFAULT_POST_PAGE_LIMIT }),
        activeProfile
          ? utils.post.profileFeed.invalidate({
              username: activeProfile.username,
              limit: DEFAULT_POST_PAGE_LIMIT,
            })
          : Promise.resolve(),
      ]);
    },
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <PenNib weight="bold" className="text-primary size-5" />
        <div>
          <p className="font-semibold">Share a public post</p>
          <p className="text-muted-foreground text-sm">
            Text only for now. Links keep their typed text and open safely.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              state.isEmpty ||
              state.isTooLong ||
              createMutation.isPending ||
              upload?.status === "uploading" ||
              upload?.status === "failed"
            ) {
              return;
            }

            createMutation.mutate({
              text: state.normalizedText,
              mediaAttachmentId: upload?.status === "ready" ? upload.mediaId : null,
            });
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            disabled={createMutation.isPending}
            placeholder="What are you playing right now?"
            className="min-h-32 resize-y"
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files.item(0);
              if (file) void startUpload(file);
            }}
            className="rounded-lg border border-dashed border-border bg-muted/30 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageSquare className="size-4" weight="bold" />
                <span>Add an image or short video</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={createMutation.isPending || upload?.status === "uploading"}
                onClick={() => document.getElementById("post-media-input")?.click()}
              >
                Choose file
              </Button>
              <input
                id="post-media-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void startUpload(file);
                }}
              />
            </div>

            {upload && (
              <div className="mt-3 space-y-2">
                {upload.file.type.startsWith("video/") ? (
                  <video
                    src={upload.previewUrl}
                    controls
                    preload="metadata"
                    className="max-h-72 w-full rounded-md bg-black object-contain"
                  />
                ) : (
                  <img
                    src={upload.previewUrl}
                    alt="Selected post attachment preview"
                    className="max-h-72 w-full rounded-md object-contain"
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {upload.status === "uploading"
                      ? `Uploading ${upload.progress}%`
                      : upload.status === "ready"
                        ? "Ready to attach"
                        : "Upload failed"}
                  </span>
                  <div className="flex gap-2">
                    {upload.status === "failed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void retryUpload()}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeUpload()}
                    >
                      <Trash weight="bold" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p
              className={`text-sm ${
                state.isTooLong ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {state.count} / 500
            </p>

            <Button
              type="submit"
              disabled={
                state.isEmpty ||
                state.isTooLong ||
                createMutation.isPending ||
                upload?.status === "uploading" ||
                upload?.status === "failed"
              }
            >
              {createMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  async function startUpload(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setErrorMessage(null);
    setUpload({
      file,
      previewUrl,
      status: "uploading",
      progress: 0,
      mediaId: "",
      uploadUrl: "",
    });

    try {
      const intent = await createUploadMutation.mutateAsync({
        mimeType: file.type,
        byteSize: file.size,
        purpose: "post_attachment",
      });
      setUpload((current) =>
        current
          ? { ...current, mediaId: intent.mediaId, uploadUrl: intent.uploadUrl }
          : current,
      );
      await uploadFile(intent.uploadUrl, file, (progress) => {
        setUpload((current) => (current ? { ...current, progress } : current));
      });
      await confirmUploadMutation.mutateAsync({ mediaId: intent.mediaId });
      setUpload((current) =>
        current ? { ...current, status: "ready", progress: 100 } : current,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
      setUpload((current) =>
        current ? { ...current, status: "failed" } : current,
      );
    }
  }

  async function retryUpload() {
    if (!upload?.mediaId) return;
    setUpload({ ...upload, status: "uploading", progress: 0 });
    try {
      const retry = await retryUploadMutation.mutateAsync({
        mediaId: upload.mediaId,
      });
      await uploadFile(retry.uploadUrl, upload.file, (progress) => {
        setUpload((current) => (current ? { ...current, progress } : current));
      });
      await confirmUploadMutation.mutateAsync({ mediaId: upload.mediaId });
      setUpload((current) =>
        current ? { ...current, status: "ready", progress: 100 } : current,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
      setUpload((current) =>
        current ? { ...current, status: "failed" } : current,
      );
    }
  }

  async function removeUpload() {
    if (upload?.mediaId) {
      await removeUploadMutation.mutateAsync({ mediaId: upload.mediaId });
    }
    clearUpload();
  }

  function clearUpload() {
    setUpload((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }
}

type UploadState = {
  file: File;
  previewUrl: string;
  status: "uploading" | "ready" | "failed";
  progress: number;
  mediaId: string;
  uploadUrl: string;
};

function uploadFile(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
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
      else reject(new Error("Blob upload failed."));
    };
    xhr.onerror = () => reject(new Error("Blob upload failed."));
    xhr.send(file);
  });
}
