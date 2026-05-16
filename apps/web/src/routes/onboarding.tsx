import { Camera, GameController, Trash, User, X } from "@phosphor-icons/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_FAVORITE_GAMES,
  SEARCH_MIN_QUERY_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@workspace/types"
import {
  addFavoriteGameSelection,
  buildOnboardingPayload,
  getAvatarSubmitBlocker,
  isOnboardingSubmitDisabled,
  removeFavoriteGameSelection,
  type AvatarUploadStatus,
  type OnboardingFavoriteGame,
} from "@/features/onboarding/onboarding-form"
import {
  normalizeUsernameInput,
  validateUsernameCandidate,
  type UsernameValidation,
} from "@/features/onboarding/username"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
})

type AvatarState = {
  mediaId: string | null
  previewUrl: string | null
  status: AvatarUploadStatus
  error: string | null
}

const EMPTY_AVATAR_STATE: AvatarState = {
  mediaId: null,
  previewUrl: null,
  status: "idle",
  error: null,
}

function OnboardingPage() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const createUploadMutation = trpc.media.createUpload.useMutation()
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation()

  const [username, setUsername] = useState("")
  const [hasEditedUsername, setHasEditedUsername] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [favoriteGames, setFavoriteGames] = useState<OnboardingFavoriteGame[]>(
    []
  )
  const [gameSearch, setGameSearch] = useState("")
  const [avatar, setAvatar] = useState<AvatarState>(EMPTY_AVATAR_STATE)
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = trpc.profile.submitOnboarding.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.currentAppUser.invalidate(),
        utils.game.myFavorites.invalidate(),
      ])
      void navigate({ to: "/" })
    },
    onError: () => {
      void utils.profile.checkUsernameAvailability.invalidate({ username })
    },
  })

  const usernameValidation = validateUsernameCandidate(username)
  const debouncedUsername = useDebouncedValue(username, 250)
  const debouncedValidation = validateUsernameCandidate(debouncedUsername)
  const availabilityQuery = trpc.profile.checkUsernameAvailability.useQuery(
    { username: debouncedUsername },
    {
      enabled: debouncedValidation.kind === "valid",
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    }
  )
  const hasAvailabilityForCurrentUsername = debouncedUsername === username
  const currentAvailability = hasAvailabilityForCurrentUsername
    ? availabilityQuery.data
    : undefined
  const usernameFeedback = getUsernameFeedback({
    availability: currentAvailability,
    errorMessage: hasAvailabilityForCurrentUsername
      ? (availabilityQuery.error?.message ?? null)
      : null,
    hasEditedUsername,
    isChecking:
      usernameValidation.kind === "valid" &&
      (!hasAvailabilityForCurrentUsername || availabilityQuery.isFetching),
    username,
    validation: usernameValidation,
  })
  const hasUsernameError =
    hasEditedUsername && usernameFeedback.tone === "error"

  const gameSearchQuery = trpc.search.useQuery(
    { query: gameSearch, limit: 8 },
    {
      enabled: gameSearch.trim().length >= SEARCH_MIN_QUERY_LENGTH,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  const gameResults = useMemo(
    () =>
      gameSearchQuery.data?.results
        .filter((item) => item.type === "game")
        .map((item) => ({
          id: item.id,
          name: item.label,
          slug: item.slug,
        }))
        .filter(
          (game) => !favoriteGames.some((favorite) => favorite.id === game.id)
        ) ?? [],
    [favoriteGames, gameSearchQuery.data]
  )

  const isSubmitDisabled =
    usernameValidation.kind !== "valid" ||
    currentAvailability?.status !== "available" ||
    availabilityQuery.isFetching ||
    isOnboardingSubmitDisabled({
      isSubmitting: mutation.isPending,
      avatarStatus: avatar.status,
    })

  function addFavoriteGame(game: OnboardingFavoriteGame) {
    setLocalError(null)
    setFavoriteGames((current) => addFavoriteGameSelection(current, game))
    setGameSearch("")
  }

  function removeFavoriteGame(gameId: string) {
    setFavoriteGames((current) => removeFavoriteGameSelection(current, gameId))
  }

  async function handleAvatarSelected(file: File | null) {
    if (!file) return

    try {
      if (avatar.previewUrl) URL.revokeObjectURL(avatar.previewUrl)
      setAvatar({
        mediaId: null,
        previewUrl: null,
        status: "uploading",
        error: null,
      })
      setLocalError(null)

      const upload = await createUploadMutation.mutateAsync({
        mimeType: file.type,
        byteSize: file.size,
        purpose: "profile_avatar",
      })

      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-ms-blob-type": "BlockBlob",
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error("Avatar upload failed.")
      }

      await confirmUploadMutation.mutateAsync({ mediaId: upload.mediaId })
      setAvatar({
        mediaId: upload.mediaId,
        previewUrl: URL.createObjectURL(file),
        status: "ready",
        error: null,
      })
    } catch (error) {
      setAvatar({
        mediaId: null,
        previewUrl: null,
        status: "failed",
        error: getErrorMessage(error),
      })
    }
  }

  function removeAvatar() {
    if (avatar.previewUrl) URL.revokeObjectURL(avatar.previewUrl)
    setAvatar(EMPTY_AVATAR_STATE)
    setLocalError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (usernameValidation.kind === "invalid") {
      setLocalError(usernameValidation.message)
      return
    }
    if (
      !hasAvailabilityForCurrentUsername ||
      availabilityQuery.isFetching ||
      currentAvailability === undefined
    ) {
      setLocalError("Checking username availability. Try again in a moment.")
      return
    }
    if (currentAvailability.status !== "available") {
      setLocalError(
        currentAvailability.message ??
          "Choose an available username before creating your profile."
      )
      return
    }

    const avatarBlocker = getAvatarSubmitBlocker(avatar.status)
    if (avatarBlocker) {
      setLocalError(avatarBlocker)
      return
    }

    setLocalError(null)
    mutation.mutate(
      buildOnboardingPayload({
        username,
        displayName,
        bio,
        favoriteGames,
        avatarMediaId: avatar.mediaId,
      })
    )
  }

  const serverErrorMessage = mutation.error?.message
  const errorMessage = localError ?? avatar.error ?? serverErrorMessage

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create your profile</CardTitle>
          <CardDescription>
            Choose your permanent handle and add the optional details that shape
            your first For You feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your_handle"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const val = normalizeUsernameInput(e.target.value)
                    setUsername(val)
                    setHasEditedUsername(true)
                    setLocalError(null)
                    mutation.reset()
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  pattern="[a-z][a-z0-9_]*"
                  aria-invalid={hasUsernameError}
                  aria-describedby="username-help username-status"
                  required
                />
                <p id="username-help" className="text-xs text-muted-foreground">
                  {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} chars. Starts with
                  a letter; lowercase letters, numbers, and underscores only.
                </p>
                <p
                  id="username-status"
                  className={
                    usernameFeedback.tone === "success"
                      ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
                      : usernameFeedback.tone === "error"
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                  }
                  aria-live="polite"
                >
                  {usernameFeedback.message}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Display name (optional)</Label>
                <Input
                  id="displayName"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setDisplayName(e.target.value)
                  }}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground">
                  {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
                </p>
              </div>
            </div>

            <AvatarField
              avatar={avatar}
              isUploading={avatar.status === "uploading"}
              onAvatarSelected={handleAvatarSelected}
              onRemoveAvatar={removeAvatar}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="favorite-game-search">
                Favorite games (optional)
              </Label>
              <Input
                id="favorite-game-search"
                value={gameSearch}
                placeholder="Search games"
                disabled={favoriteGames.length >= MAX_FAVORITE_GAMES}
                onChange={(event) => setGameSearch(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {favoriteGames.length}/{MAX_FAVORITE_GAMES}
              </p>
            </div>

            {gameSearch.trim().length >= SEARCH_MIN_QUERY_LENGTH ? (
              <div className="flex flex-wrap gap-2">
                {gameSearchQuery.isFetching ? (
                  <Skeleton className="h-8 w-36" />
                ) : gameResults.length > 0 ? (
                  gameResults.map((game) => (
                    <Button
                      key={game.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addFavoriteGame(game)}
                    >
                      <GameController weight="bold" />
                      {game.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No games found.
                  </p>
                )}
              </div>
            ) : null}

            {favoriteGames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favoriteGames.map((game) => (
                  <Button
                    key={game.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeFavoriteGame(game.id)}
                  >
                    {game.name}
                    <X weight="bold" />
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell other gamers about yourself..."
                value={bio}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setBio(e.target.value)
                }}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {avatar.status === "uploading"
                ? "Uploading avatar..."
                : mutation.isPending
                  ? "Creating profile..."
                  : "Create profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

type UsernameFeedback = {
  message: string
  tone: "muted" | "success" | "error"
}

function getUsernameFeedback({
  availability,
  errorMessage,
  hasEditedUsername,
  isChecking,
  username,
  validation,
}: {
  availability:
    | { status: "invalid"; message: string }
    | { status: "taken"; message: string }
    | { status: "available" }
    | undefined
  errorMessage: string | null
  hasEditedUsername: boolean
  isChecking: boolean
  username: string
  validation: UsernameValidation
}): UsernameFeedback {
  if (!hasEditedUsername && username.length === 0) {
    return { message: "Enter a username to check availability.", tone: "muted" }
  }

  if (validation.kind === "invalid") {
    return { message: validation.message, tone: "error" }
  }

  if (isChecking) {
    return { message: "Checking username availability...", tone: "muted" }
  }

  if (errorMessage) {
    return { message: errorMessage, tone: "error" }
  }

  if (availability?.status === "available") {
    return { message: `@${username} is available.`, tone: "success" }
  }

  if (availability?.status === "taken" || availability?.status === "invalid") {
    return { message: availability.message, tone: "error" }
  }

  return { message: "Checking username availability...", tone: "muted" }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delayMs, value])

  return debouncedValue
}

function AvatarField({
  avatar,
  isUploading,
  onAvatarSelected,
  onRemoveAvatar,
}: {
  avatar: AvatarState
  isUploading: boolean
  onAvatarSelected: (file: File | null) => Promise<void>
  onRemoveAvatar: () => void
}) {
  const hasSelectedAvatar = Boolean(avatar.mediaId || avatar.error)

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/35 p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={avatar.previewUrl ?? undefined} alt="Avatar" />
          <AvatarFallback>
            <User weight="bold" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Label htmlFor="avatar-media">Avatar (optional)</Label>
          <p className="truncate text-xs text-muted-foreground">
            {avatar.mediaId
              ? `Media ${avatar.mediaId}`
              : isUploading
                ? "Uploading..."
                : "No avatar selected"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="avatar-media"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isUploading}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            void onAvatarSelected(event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!hasSelectedAvatar || isUploading}
          onClick={onRemoveAvatar}
        >
          {avatar.error ? <X weight="bold" /> : <Trash weight="bold" />}
          Remove
        </Button>
      </div>

      {isUploading ? (
        <p className="text-xs text-muted-foreground">
          <Camera weight="bold" className="mr-1 inline" />
          Uploading avatar...
        </p>
      ) : null}
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
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
