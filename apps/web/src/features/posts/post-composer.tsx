import { useEffect, useState } from "react"
import { ImageSquare, PenNib, Trash } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { useMediaUploadWorkflow } from "@/lib/media-upload-client"
import { trpc } from "@/lib/trpc"
import { getPostTextState } from "./post-text"
import { getPostComposerGameOptions } from "./post-composer-game-options"
import {
  applyCreatedPostReplacingOptimisticOnFeeds,
  applyOptimisticPostCreateToFeeds,
  cancelPostListQueriesForOptimisticCreate,
  captureFeedSnapshotsForOptimisticPostCreate,
  reconcileCachesAfterPostCreateMutationSettled,
  restoreFeedsAfterOptimisticPostCreateFailure,
} from "./post-cache-reconcile"
import type { PostView } from "./types"

type PostComposerProps = {
  initialGameId?: string | null
  onCreated?: (post: PostView) => void
}

export function PostComposer({ initialGameId, onCreated }: PostComposerProps) {
  const [draft, setDraft] = useState("")
  const defaultSelectedGameId = initialGameId ?? ""
  const [selectedGameId, setSelectedGameId] = useState(defaultSelectedGameId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mediaUpload = useMediaUploadWorkflow({ purpose: "post_attachment" })
  const upload = mediaUpload.upload

  useEffect(() => {
    setSelectedGameId(defaultSelectedGameId)
  }, [defaultSelectedGameId])

  const utils = trpc.useUtils()
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const state = getPostTextState(draft)
  const activeProfile =
    currentAppUser.data?.kind === "active_onboarded_profile"
      ? currentAppUser.data.profile
      : null
  const gamesQuery = trpc.game.listActive.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const favoriteGamesQuery = trpc.game.myFavorites.useQuery(undefined, {
    enabled: activeProfile !== null,
    retry: false,
    refetchOnWindowFocus: false,
  })
  const gameOptions = getPostComposerGameOptions({
    activeGames: gamesQuery.data ?? [],
    favoriteGames: favoriteGamesQuery.data ?? [],
  })
  const selectedGame =
    gameOptions.find((game) => game.id === selectedGameId) ?? null

  const createMutation = trpc.post.create.useMutation({
    async onMutate(variables) {
      const submittedUpload = variables.mediaAttachmentId
        ? mediaUpload.releaseReadyUpload()
        : null
      const optimisticPublicId = `optimistic-${Date.now()}`
      const optimisticPost: PostView = {
        publicId: optimisticPublicId,
        text: variables.text,
        author: {
          username: activeProfile?.username ?? "you",
          displayName: activeProfile?.displayName ?? "You",
          avatarUrl: activeProfile?.avatarUrl ?? null,
        },
        gameTag: selectedGame
          ? {
              id: selectedGame.id,
              slug: selectedGame.slug,
              name: selectedGame.name,
            }
          : null,
        media: submittedUpload
          ? {
              id: submittedUpload.mediaId,
              kind: submittedUpload.kind,
              mimeType: submittedUpload.mimeType,
              url: submittedUpload.previewUrl,
            }
          : null,
        likeCount: 0,
        likedByViewer: false,
        commentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        canDelete: true,
        moderationRemoval: null,
      }

      await cancelPostListQueriesForOptimisticCreate(
        utils,
        activeProfile?.username ?? null
      )

      const snapshots = captureFeedSnapshotsForOptimisticPostCreate(
        utils,
        activeProfile?.username ?? null
      )

      setErrorMessage(null)
      setDraft("")
      setSelectedGameId(defaultSelectedGameId)

      applyOptimisticPostCreateToFeeds(utils, {
        optimisticPost,
        profileUsername: activeProfile?.username ?? null,
      })

      return {
        optimisticPublicId,
        previousSelectedGameId: selectedGameId,
        snapshots,
        previousDraft: draft,
        submittedUpload,
      }
    },

    onError(error, _variables, context) {
      restoreFeedsAfterOptimisticPostCreateFailure(
        utils,
        activeProfile?.username ?? null,
        context?.snapshots
      )

      setDraft(context?.previousDraft ?? "")
      setSelectedGameId(
        context?.previousSelectedGameId ?? defaultSelectedGameId
      )
      setErrorMessage(error.message)
      context?.submittedUpload?.revokePreviewUrl()
    },

    onSuccess(createdPost, _variables, context) {
      applyCreatedPostReplacingOptimisticOnFeeds(utils, {
        createdPost,
        optimisticPublicId: context?.optimisticPublicId,
        profileUsername: activeProfile?.username ?? null,
      })

      onCreated?.(createdPost)
      context?.submittedUpload?.revokePreviewUrl()
    },

    async onSettled() {
      await reconcileCachesAfterPostCreateMutationSettled(
        utils,
        activeProfile?.username ?? null
      )
    },
  })

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <PenNib weight="bold" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="leading-5 font-semibold">Share a public post</p>
          <p className="text-sm text-muted-foreground">
            Start a thread, drop a clip, or call out what you are playing.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (
              state.isEmpty ||
              state.isTooLong ||
              createMutation.isPending ||
              mediaUpload.blocksSubmit
            ) {
              return
            }

            createMutation.mutate({
              text: state.normalizedText,
              mediaAttachmentId: mediaUpload.readyUpload?.mediaId ?? null,
              gameTagId: selectedGameId || null,
            })
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            disabled={createMutation.isPending}
            placeholder="What are you playing right now?"
            className="min-h-28 resize-y bg-muted/20 text-base sm:text-sm"
          />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="post-game-tag"
              className="text-sm font-medium text-foreground"
            >
              Game tag
            </label>
            <select
              id="post-game-tag"
              value={selectedGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
              disabled={
                createMutation.isPending ||
                gamesQuery.isLoading ||
                favoriteGamesQuery.isLoading
              }
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No game tag</option>
              {gameOptions.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files.item(0)
              if (file) {
                setErrorMessage(null)
                void mediaUpload.start(file)
              }
            }}
            className="rounded-lg border border-dashed border-border bg-muted/25 p-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageSquare className="size-4" weight="bold" />
                <span>Attach an image or short video</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  createMutation.isPending || upload?.status === "uploading"
                }
                onClick={() =>
                  document.getElementById("post-media-input")?.click()
                }
              >
                Choose file
              </Button>
              <input
                id="post-media-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file) {
                    setErrorMessage(null)
                    void mediaUpload.start(file)
                  }
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
                        onClick={() => {
                          setErrorMessage(null)
                          void mediaUpload.retry()
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setErrorMessage(null)
                        void mediaUpload.remove()
                      }}
                    >
                      <Trash weight="bold" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
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
                mediaUpload.blocksSubmit
              }
            >
              {createMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>

        {(errorMessage ?? mediaUpload.errorMessage) && (
          <Alert variant="destructive">
            <AlertDescription>
              {errorMessage ?? mediaUpload.errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
