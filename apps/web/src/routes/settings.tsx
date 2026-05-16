import {
  Camera,
  Check,
  CircleNotch,
  Desktop,
  GameController,
  Info,
  Key,
  MagnifyingGlass,
  Moon,
  ShieldCheck,
  Sun,
  Trash,
  User,
  X,
} from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
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
import { cn } from "@workspace/ui/lib/utils"
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_FAVORITE_GAMES,
  SEARCH_MIN_QUERY_LENGTH,
} from "@workspace/types"
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react"
import type { Theme } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import { AccountDeletionDialog } from "@/components/account-deletion-dialog"
import { changePassword } from "@/lib/auth-client"
import {
  describeMediaUploadFailure,
  uploadBlobViaPutXhr,
  validateClientMediaUpload,
} from "@/lib/media-upload-client"
import {
  getSearchTypeaheadStatus,
  useSearchTypeaheadInteraction,
  type SearchTypeaheadResultProps,
  type SearchTypeaheadStatus,
} from "@/lib/search-typeahead"
import { trpc } from "@/lib/trpc"
import {
  getFavoriteGameSearchOptions,
  type FavoriteGame,
} from "@/routes/-settings-favorite-games"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

const SETTINGS_TABS = [
  "Profile",
  "Account",
  "Display",
  "Safety",
  "About",
] as const

type SettingsTab = (typeof SETTINGS_TABS)[number]
type MediaSlot = "avatar" | "banner"
type ProfileSlotUpload = {
  file: File
  localPreviewUrl: string
  status: "uploading" | "failed"
  progress: number
  mediaId: string
  uploadUrl: string
  message?: string
}

type ProfileFormState = {
  displayName: string
  bio: string
  avatarMediaId: string | null
  bannerMediaId: string | null
  favoriteGames: FavoriteGame[]
}

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const EMPTY_PROFILE_FORM: ProfileFormState = {
  displayName: "",
  bio: "",
  avatarMediaId: null,
  bannerMediaId: null,
  favoriteGames: [],
}

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

function profileSlotLocksSave(upload: ProfileSlotUpload | null) {
  return (
    upload !== null &&
    (upload.status === "uploading" || upload.status === "failed")
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile")
  const [profileForm, setProfileForm] =
    useState<ProfileFormState>(EMPTY_PROFILE_FORM)
  const [passwordForm, setPasswordForm] =
    useState<PasswordFormState>(EMPTY_PASSWORD_FORM)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [gameSearch, setGameSearch] = useState("")
  const [mediaPreviews, setMediaPreviews] = useState<
    Record<MediaSlot, string | null>
  >({ avatar: null, banner: null })
  const [baselineMediaIds, setBaselineMediaIds] = useState<
    Record<MediaSlot, string | null>
  >({ avatar: null, banner: null })
  const [slotIssues, setSlotIssues] = useState<Record<MediaSlot, string | null>>(
    { avatar: null, banner: null }
  )
  const [slotUploadStates, setSlotUploadStates] = useState<
    Record<MediaSlot, ProfileSlotUpload | null>
  >({ avatar: null, banner: null })
  const { theme, setTheme } = useTheme()
  const utils = trpc.useUtils()

  const settingsQuery = trpc.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const gameSearchQuery = trpc.search.useQuery(
    { query: gameSearch, limit: 8 },
    {
      enabled: gameSearch.trim().length >= SEARCH_MIN_QUERY_LENGTH,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )
  const createUploadMutation = trpc.media.createUpload.useMutation()
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation()
  const retryUploadMutation = trpc.media.retryUpload.useMutation()
  const removeUploadMutation = trpc.media.removeUpload.useMutation()
  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    async onSuccess(profile) {
      setProfileForm({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarMediaId: profile.avatarMediaId,
        bannerMediaId: profile.bannerMediaId,
        favoriteGames: profile.favoriteGames,
      })
      setBaselineMediaIds({
        avatar: profile.avatarMediaId,
        banner: profile.bannerMediaId,
      })
      setProfileMessage("Profile saved.")
      setProfileError(null)
      utils.settings.get.setData(undefined, (previous) =>
        previous ? { ...previous, profile } : previous
      )
      await Promise.all([
        utils.settings.get.invalidate(),
        utils.currentAppUser.invalidate(),
        utils.profile.getByUsername.invalidate({ username: profile.username }),
      ])
    },
  })
  const updateThemeMutation = trpc.settings.updateThemePreference.useMutation({
    async onSuccess() {
      await utils.settings.get.invalidate()
    },
  })
  const unblockUserMutation = trpc.settings.unblockUser.useMutation({
    async onSuccess() {
      await utils.settings.get.invalidate()
    },
  })
  const deleteAccountMutation = trpc.settings.deleteAccount.useMutation({
    async onSuccess() {
      setDeletePassword("")
      setDeleteError(null)
      setIsDeleteDialogOpen(false)
      await Promise.all([
        utils.settings.get.invalidate(),
        utils.currentAppUser.invalidate(),
      ])
      window.location.assign("/login")
    },
  })

  useEffect(() => {
    if (!settingsQuery.data) return

    setProfileForm({
      displayName: settingsQuery.data.profile.displayName ?? "",
      bio: settingsQuery.data.profile.bio ?? "",
      avatarMediaId: settingsQuery.data.profile.avatarMediaId,
      bannerMediaId: settingsQuery.data.profile.bannerMediaId,
      favoriteGames: settingsQuery.data.profile.favoriteGames,
    })
    setBaselineMediaIds({
      avatar: settingsQuery.data.profile.avatarMediaId,
      banner: settingsQuery.data.profile.bannerMediaId,
    })
    setTheme(settingsQuery.data.display.theme)
  }, [settingsQuery.data, setTheme])

  const gameResults = useMemo(
    () =>
      getFavoriteGameSearchOptions(
        gameSearchQuery.data,
        profileForm.favoriteGames
      ),
    [gameSearchQuery.data, profileForm.favoriteGames]
  )

  if (settingsQuery.isLoading) return <SettingsSkeleton />

  if (settingsQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{settingsQuery.error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!settingsQuery.data) return null

  const settings = settingsQuery.data

  const profileSlotsBusy =
    profileSlotLocksSave(slotUploadStates.avatar) ||
    profileSlotLocksSave(slotUploadStates.banner)

  /** Server-signed URLs plus in-flight/blob previews — order matches MediaField internals */
  function resolvedProfileSlotPreviewUrl(slot: MediaSlot): string | undefined {
    const uploading = slotUploadStates[slot]?.localPreviewUrl
    if (uploading) return uploading

    const blob = mediaPreviews[slot]
    if (blob) return blob

    const formMediaId =
      slot === "avatar" ? profileForm.avatarMediaId : profileForm.bannerMediaId
    if (!formMediaId) return undefined

    const serverProfile = settings.profile
    const serverMediaId =
      slot === "avatar"
        ? serverProfile.avatarMediaId
        : serverProfile.bannerMediaId
    if (formMediaId !== serverMediaId) return undefined

    const signed =
      slot === "avatar" ? serverProfile.avatarUrl : serverProfile.bannerUrl
    return signed ?? undefined
  }

  function markSlotUploadFailed(slot: MediaSlot, message: string) {
    setSlotUploadStates((current) => {
      const active = current[slot]
      if (!active) return current
      return {
        ...current,
        [slot]: { ...active, status: "failed", message },
      }
    })
    setSlotIssues((current) => ({ ...current, [slot]: message }))
  }

  async function handleProfileSlotMediaSelected(
    slot: MediaSlot,
    file: File | null
  ) {
    if (!file) return

    setProfileMessage(null)
    setProfileError(null)
    setSlotIssues((current) => ({ ...current, [slot]: null }))

    const purpose = slot === "avatar" ? "profile_avatar" : "profile_banner"
    const validated = validateClientMediaUpload({
      mimeType: file.type,
      byteSize: file.size,
      purpose,
    })

    if (!validated.ok) {
      setSlotIssues((current) => ({
        ...current,
        [slot]: validated.issue.message,
      }))
      return
    }

    const previewUrlLocal = URL.createObjectURL(file)

    setMediaPreviews((current) => {
      const previousPreview = current[slot]
      if (previousPreview) URL.revokeObjectURL(previousPreview)
      return { ...current, [slot]: null }
    })

    setSlotUploadStates((current) => {
      const existing = current[slot]
      if (existing?.localPreviewUrl)
        URL.revokeObjectURL(existing.localPreviewUrl)
      return {
        ...current,
        [slot]: {
          file,
          localPreviewUrl: previewUrlLocal,
          status: "uploading",
          progress: 0,
          mediaId: "",
          uploadUrl: "",
        },
      }
    })

    let intent: { mediaId: string; uploadUrl: string }
    try {
      intent = await createUploadMutation.mutateAsync({
        mimeType: validated.mimeType,
        byteSize: validated.byteSize,
        purpose,
      })

      setSlotUploadStates((current) => {
        const active = current[slot]
        if (!active) return current
        return {
          ...current,
          [slot]: {
            ...active,
            mediaId: intent.mediaId,
            uploadUrl: intent.uploadUrl,
          },
        }
      })
    } catch (error) {
      markSlotUploadFailed(
        slot,
        describeMediaUploadFailure(error, "intent")
      )
      return
    }

    try {
      await uploadBlobViaPutXhr({
        uploadUrl: intent.uploadUrl,
        file,
        onProgress: (progress) =>
          setSlotUploadStates((current) => {
            const active = current[slot]
            if (!active || active.status !== "uploading") return current
            return {
              ...current,
              [slot]: { ...active, progress },
            }
          }),
      })
    } catch (error) {
      markSlotUploadFailed(slot, describeMediaUploadFailure(error, "blob"))
      return
    }

    try {
      await confirmUploadMutation.mutateAsync({ mediaId: intent.mediaId })
    } catch (error) {
      markSlotUploadFailed(
        slot,
        describeMediaUploadFailure(error, "confirm")
      )
      return
    }

    const fieldKey = slot === "avatar" ? "avatarMediaId" : "bannerMediaId"

    setMediaPreviews((current) => ({
      ...current,
      [slot]: previewUrlLocal,
    }))
    setProfileForm((current) => ({
      ...current,
      [fieldKey]: intent.mediaId,
    }))
    setSlotIssues((current) => ({ ...current, [slot]: null }))
    setSlotUploadStates((current) => ({ ...current, [slot]: null }))
  }

  async function retryProfileSlotUpload(slot: MediaSlot) {
    const upload = slotUploadStates[slot]
    if (!upload?.mediaId) return

    setProfileError(null)
    setSlotIssues((current) => ({ ...current, [slot]: null }))

    const previewUrlLocal = upload.localPreviewUrl

    setSlotUploadStates((current) => {
      const active = current[slot]
      if (!active) return current
      return {
        ...current,
        [slot]: {
          ...active,
          status: "uploading",
          progress: 0,
          message: undefined,
        },
      }
    })

    let reissued: { uploadUrl: string }
    try {
      reissued = await retryUploadMutation.mutateAsync({
        mediaId: upload.mediaId,
      })
    } catch (error) {
      markSlotUploadFailed(
        slot,
        describeMediaUploadFailure(error, "intent")
      )
      return
    }

    try {
      await uploadBlobViaPutXhr({
        uploadUrl: reissued.uploadUrl,
        file: upload.file,
        onProgress: (progress) =>
          setSlotUploadStates((current) => {
            const active = current[slot]
            if (!active || active.status !== "uploading") return current
            return {
              ...current,
              [slot]: { ...active, progress },
            }
          }),
      })
    } catch (error) {
      markSlotUploadFailed(slot, describeMediaUploadFailure(error, "blob"))
      return
    }

    try {
      await confirmUploadMutation.mutateAsync({ mediaId: upload.mediaId })
    } catch (error) {
      markSlotUploadFailed(
        slot,
        describeMediaUploadFailure(error, "confirm")
      )
      return
    }

    const fieldKey = slot === "avatar" ? "avatarMediaId" : "bannerMediaId"

    setMediaPreviews((current) => ({
      ...current,
      [slot]: previewUrlLocal,
    }))
    setProfileForm((current) => ({
      ...current,
      [fieldKey]: upload.mediaId,
    }))
    setSlotIssues((current) => ({ ...current, [slot]: null }))
    setSlotUploadStates((current) => ({ ...current, [slot]: null }))
  }

  async function removeProfileSlotMedia(slot: MediaSlot) {
    setProfileMessage(null)
    setProfileError(null)
    setSlotIssues((current) => ({ ...current, [slot]: null }))

    const activeUpload = slotUploadStates[slot]
    try {
      if (activeUpload?.mediaId)
        await removeUploadMutation.mutateAsync({
          mediaId: activeUpload.mediaId,
        })
    } catch (error) {
      setProfileError(getErrorMessage(error))
      return
    }

    if (activeUpload?.localPreviewUrl)
      URL.revokeObjectURL(activeUpload.localPreviewUrl)

    setSlotUploadStates((current) => ({ ...current, [slot]: null }))

    const fieldKey = slot === "avatar" ? "avatarMediaId" : "bannerMediaId"
    const baselineId = baselineMediaIds[slot]
    const currentId = profileForm[fieldKey]

    if (currentId && baselineId !== currentId) {
      try {
        await removeUploadMutation.mutateAsync({ mediaId: currentId })
      } catch (error) {
        setProfileError(getErrorMessage(error))
        return
      }

      setProfileForm((current) => ({
        ...current,
        [fieldKey]: baselineId,
      }))

      setMediaPreviews((current) => {
        const preview = current[slot]
        if (preview) URL.revokeObjectURL(preview)
        return { ...current, [slot]: null }
      })
      return
    }

    setProfileForm((current) => ({
      ...current,
      [fieldKey]: null,
    }))

    setMediaPreviews((current) => {
      const preview = current[slot]
      if (preview) URL.revokeObjectURL(preview)
      return { ...current, [slot]: null }
    })
  }

  function addFavoriteGame(game: FavoriteGame) {
    setProfileError(null)
    setProfileForm((current) => {
      if (current.favoriteGames.length >= MAX_FAVORITE_GAMES) return current
      if (current.favoriteGames.some((favorite) => favorite.id === game.id)) {
        return current
      }
      return {
        ...current,
        favoriteGames: [...current.favoriteGames, game],
      }
    })
    setGameSearch("")
  }

  function removeFavoriteGame(gameId: string) {
    setProfileForm((current) => ({
      ...current,
      favoriteGames: current.favoriteGames.filter((game) => game.id !== gameId),
    }))
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileMessage(null)

    const displayName = profileForm.displayName.trim()
    const bio = profileForm.bio.trim()
    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      setProfileError(
        `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`
      )
      return
    }
    if (bio.length > BIO_MAX_LENGTH) {
      setProfileError(`Bio must be at most ${BIO_MAX_LENGTH} characters.`)
      return
    }
    if (profileForm.favoriteGames.length > MAX_FAVORITE_GAMES) {
      setProfileError(`Choose at most ${MAX_FAVORITE_GAMES} favorite games.`)
      return
    }

    setProfileError(null)
    updateProfileMutation.mutate({
      displayName,
      bio,
      avatarMediaId: profileForm.avatarMediaId,
      bannerMediaId: profileForm.bannerMediaId,
      favoriteGameIds: profileForm.favoriteGames.map((game) => game.id),
    })
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordMessage(null)

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.")
      return
    }

    setPasswordError(null)
    try {
      setIsChangingPassword(true)
      const result = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        revokeOtherSessions: true,
      })

      if (!result.ok) {
        setPasswordError(result.error.message)
        return
      }

      setPasswordForm(EMPTY_PASSWORD_FORM)
      setPasswordMessage("Password changed. Other sessions were signed out.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(null)

    try {
      await deleteAccountMutation.mutateAsync({ password: deletePassword })
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    }
  }

  function chooseTheme(nextTheme: Theme) {
    setTheme(nextTheme)
    updateThemeMutation.mutate({ theme: nextTheme })
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Profile, account, display, safety, and release details.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex overflow-x-auto rounded-xl bg-muted p-1 shadow-sm ring-1 ring-foreground/10"
      >
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={cn(
              "min-h-9 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Profile" ? (
        <ProfileSettings
          form={profileForm}
          gameResults={gameResults}
          gameSearch={gameSearch}
          gameSearchError={gameSearchQuery.error?.message ?? null}
          isGameSearchLoading={gameSearchQuery.isFetching}
          isSaving={updateProfileMutation.isPending}
          isProfileBusy={profileSlotsBusy}
          slotIssues={slotIssues}
          slotUploadStates={slotUploadStates}
          previewUrlForSlot={resolvedProfileSlotPreviewUrl}
          message={profileMessage}
          error={profileError ?? updateProfileMutation.error?.message ?? null}
          onAddFavoriteGame={addFavoriteGame}
          onGameSearchChange={setGameSearch}
          onMediaSelected={(slot, file) => {
            void handleProfileSlotMediaSelected(slot, file)
          }}
          onRemoveFavoriteGame={removeFavoriteGame}
          onRemoveMedia={(slot) => {
            void removeProfileSlotMedia(slot)
          }}
          onRetrySlotUpload={(slot) => {
            void retryProfileSlotUpload(slot)
          }}
          onSubmit={handleProfileSubmit}
          setForm={setProfileForm}
        />
      ) : null}

      {activeTab === "Account" ? (
        <AccountSettings
          email={settings.account.email}
          form={passwordForm}
          isChanging={isChangingPassword}
          message={passwordMessage}
          error={passwordError}
          deleteError={
            deleteError ?? deleteAccountMutation.error?.message ?? null
          }
          deletePassword={deletePassword}
          isDeleteDialogOpen={isDeleteDialogOpen}
          isDeleting={deleteAccountMutation.isPending}
          onCancelDelete={() => {
            setIsDeleteDialogOpen(false)
            setDeletePassword("")
            setDeleteError(null)
          }}
          onDeletePasswordChange={(value) => {
            setDeletePassword(value)
            setDeleteError(null)
          }}
          onOpenDelete={() => {
            setDeleteError(null)
            setIsDeleteDialogOpen(true)
          }}
          onSubmitDelete={(event) => {
            void handleDeleteAccount(event)
          }}
          onSubmit={(event) => {
            void handlePasswordSubmit(event)
          }}
          setForm={setPasswordForm}
        />
      ) : null}

      {activeTab === "Display" ? (
        <DisplaySettings
          currentTheme={theme}
          isSaving={updateThemeMutation.isPending}
          error={updateThemeMutation.error?.message ?? null}
          onChooseTheme={chooseTheme}
        />
      ) : null}

      {activeTab === "Safety" ? (
        <SafetySettings
          blockedUsers={settings.safety.blockedUsers}
          isUnblocking={unblockUserMutation.isPending}
          onUnblock={(userId) => unblockUserMutation.mutate({ userId })}
        />
      ) : null}

      {activeTab === "About" ? (
        <AboutSettings
          appVersion={settings.about.appVersion}
          buildInfo={settings.about.buildInfo}
        />
      ) : null}
    </div>
  )
}

function ProfileSettings({
  error,
  form,
  gameResults,
  gameSearch,
  gameSearchError,
  isGameSearchLoading,
  isSaving,
  isProfileBusy,
  previewUrlForSlot,
  message,
  onAddFavoriteGame,
  onGameSearchChange,
  onMediaSelected,
  onRemoveFavoriteGame,
  onRemoveMedia,
  onRetrySlotUpload,
  onSubmit,
  setForm,
  slotIssues,
  slotUploadStates,
}: {
  error: string | null
  form: ProfileFormState
  gameResults: FavoriteGame[]
  gameSearch: string
  gameSearchError: string | null
  isGameSearchLoading: boolean
  isSaving: boolean
  isProfileBusy: boolean
  previewUrlForSlot: (slot: MediaSlot) => string | undefined
  message: string | null
  onAddFavoriteGame: (game: FavoriteGame) => void
  onGameSearchChange: (value: string) => void
  onMediaSelected: (slot: MediaSlot, file: File | null) => void
  onRemoveFavoriteGame: (gameId: string) => void
  onRemoveMedia: (slot: MediaSlot) => void
  onRetrySlotUpload: (slot: MediaSlot) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<ProfileFormState>>
  slotIssues: Record<MediaSlot, string | null>
  slotUploadStates: Record<MediaSlot, ProfileSlotUpload | null>
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Public identity and favorite games.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={form.displayName}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                aria-invalid={form.displayName.length > DISPLAY_NAME_MAX_LENGTH}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {form.displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
              </p>
            </div>

            <FavoriteGameSearchField
              gameResults={gameResults}
              gameSearch={gameSearch}
              errorMessage={gameSearchError}
              isLoading={isGameSearchLoading}
              selectedCount={form.favoriteGames.length}
              onAddFavoriteGame={onAddFavoriteGame}
              onGameSearchChange={onGameSearchChange}
            />
          </div>

          {form.favoriteGames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.favoriteGames.map((game) => (
                <Button
                  key={game.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemoveFavoriteGame(game.id)}
                >
                  {game.name}
                  <X weight="bold" />
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              maxLength={BIO_MAX_LENGTH}
              rows={4}
              aria-invalid={form.bio.length > BIO_MAX_LENGTH}
              onChange={(event) =>
                setForm((current) => ({ ...current, bio: event.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {form.bio.length}/{BIO_MAX_LENGTH}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MediaField
              label="Avatar"
              mediaId={form.avatarMediaId}
              previewUrl={previewUrlForSlot("avatar") ?? null}
              slot="avatar"
              slotIssue={slotIssues.avatar}
              slotUpload={slotUploadStates.avatar}
              onMediaSelected={onMediaSelected}
              onRemoveMedia={onRemoveMedia}
              onRetrySlotUpload={onRetrySlotUpload}
            />
            <MediaField
              label="Banner"
              mediaId={form.bannerMediaId}
              previewUrl={previewUrlForSlot("banner") ?? null}
              slot="banner"
              slotIssue={slotIssues.banner}
              slotUpload={slotUploadStates.banner}
              onMediaSelected={onMediaSelected}
              onRemoveMedia={onRemoveMedia}
              onRetrySlotUpload={onRetrySlotUpload}
            />
          </div>

          <Button
            type="submit"
            className="w-fit"
            disabled={isSaving || isProfileBusy}
          >
            <Check weight="bold" />
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function FavoriteGameSearchField({
  errorMessage,
  gameResults,
  gameSearch,
  isLoading,
  onAddFavoriteGame,
  onGameSearchChange,
  selectedCount,
}: {
  errorMessage: string | null
  gameResults: FavoriteGame[]
  gameSearch: string
  isLoading: boolean
  onAddFavoriteGame: (game: FavoriteGame) => void
  onGameSearchChange: (value: string) => void
  selectedCount: number
}) {
  const isDisabled = selectedCount >= MAX_FAVORITE_GAMES
  const status = getSearchTypeaheadStatus({
    errorMessage,
    isDisabled,
    isLoading,
    query: gameSearch,
    resultCount: gameResults.length,
  })
  const listboxId = "favorite-game-search-results"
  const typeahead = useSearchTypeaheadInteraction<FavoriteGame>({
    enterSelection: "highlighted_or_first",
    getItem: (index) => gameResults[index],
    initialHighlight: "first_result",
    itemCount: gameResults.length,
    listboxId,
    onSelect: onAddFavoriteGame,
    openOnArrowWithoutResults: true,
    preventEnterWithoutSelection: true,
    resetKey: `${gameSearch.trim()}:${gameResults
      .map((game) => game.id)
      .join("|")}`,
    resultIdPrefix: "favorite-game-search-result",
    status,
  })
  const showPanel = typeahead.isOpen && !isDisabled

  return (
    <div className="flex flex-col gap-2" onBlur={typeahead.handleBlurWithin}>
      <Label htmlFor="favorite-game-search">Favorite games</Label>
      <div className="relative">
        <MagnifyingGlass
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="favorite-game-search"
          value={gameSearch}
          type="search"
          role="combobox"
          className="pr-3 pl-8"
          placeholder="Search games"
          disabled={isDisabled}
          aria-autocomplete="list"
          {...typeahead.getInputA11yProps(showPanel)}
          autoComplete="off"
          onChange={(event) => {
            onGameSearchChange(event.target.value)
            typeahead.open()
          }}
          onFocus={typeahead.open}
          onKeyDown={typeahead.handleInputKeyDown}
        />

        {showPanel ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
          >
            <FavoriteGameSearchPanel
              errorMessage={errorMessage}
              gameResults={gameResults}
              getResultProps={typeahead.getResultProps}
              highlightedIndex={typeahead.highlightedIndex}
              status={status}
              onSelect={typeahead.selectItem}
            />
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedCount}/{MAX_FAVORITE_GAMES}
      </p>
    </div>
  )
}

function FavoriteGameSearchPanel({
  errorMessage,
  gameResults,
  getResultProps,
  highlightedIndex,
  onSelect,
  status,
}: {
  errorMessage: string | null
  gameResults: FavoriteGame[]
  getResultProps: (index: number) => SearchTypeaheadResultProps
  highlightedIndex: number
  onSelect: (game: FavoriteGame) => void
  status: SearchTypeaheadStatus
}) {
  if (status === "error") {
    return (
      <FavoriteGameSearchState tone="error">
        {errorMessage ?? "Search failed."}
      </FavoriteGameSearchState>
    )
  }

  if (status === "empty") {
    return (
      <FavoriteGameSearchState>
        Start typing to find games.
      </FavoriteGameSearchState>
    )
  }

  if (status === "too_short") {
    return <FavoriteGameSearchState>Keep typing...</FavoriteGameSearchState>
  }

  if (status === "loading") {
    return (
      <FavoriteGameSearchState>
        <CircleNotch weight="bold" className="size-4 animate-spin" />
        Searching games...
      </FavoriteGameSearchState>
    )
  }

  if (status === "no_results") {
    return <FavoriteGameSearchState>No games found.</FavoriteGameSearchState>
  }

  if (status === "disabled") {
    return (
      <FavoriteGameSearchState>
        Favorite game limit reached.
      </FavoriteGameSearchState>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 p-1">
      {gameResults.map((game, index) => {
        const isHighlighted = highlightedIndex === index
        return (
          <button
            key={game.id}
            {...getResultProps(index)}
            type="button"
            className={cn(
              "flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isHighlighted ? "bg-muted text-foreground" : "hover:bg-muted"
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(game)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
              <GameController weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{game.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                Game
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FavoriteGameSearchState({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "error"
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center gap-2 px-3 py-2 text-sm",
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {children}
    </div>
  )
}

function MediaField({
  label,
  mediaId,
  onMediaSelected,
  onRemoveMedia,
  onRetrySlotUpload,
  previewUrl,
  slot,
  slotIssue,
  slotUpload,
}: {
  label: string
  mediaId: string | null
  onMediaSelected: (slot: MediaSlot, file: File | null) => void
  onRemoveMedia: (slot: MediaSlot) => void
  onRetrySlotUpload: (slot: MediaSlot) => void
  previewUrl: string | null
  slot: MediaSlot
  slotIssue: string | null
  slotUpload: ProfileSlotUpload | null
}) {
  const inputId = `${slot}-media`
  const previewDisplay =
    slotUpload?.localPreviewUrl ?? previewUrl ?? undefined

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/35 p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        {slot === "avatar" ? (
          <Avatar size="lg">
            <AvatarImage src={previewDisplay} alt={label} />
            <AvatarFallback>
              <User weight="bold" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex aspect-[5/2] h-16 w-36 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
            {previewDisplay ? (
              <img
                src={previewDisplay}
                alt={label}
                className="size-full object-cover"
              />
            ) : (
              <Camera weight="bold" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <Label htmlFor={inputId}>{label}</Label>
          <p className="truncate text-xs text-muted-foreground">
            {mediaId ? `Media ${mediaId}` : "No media selected"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={slotUpload?.status === "uploading"}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            void onMediaSelected(slot, event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
        />
        {slotUpload?.status === "failed" && slotUpload.mediaId ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onRetrySlotUpload(slot)}
          >
            Retry
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => onRemoveMedia(slot)}
        >
          <Trash weight="bold" />
          Remove
        </Button>
      </div>

      {slotUpload?.status === "uploading" ? (
        <p className="text-xs text-muted-foreground">
          Uploading {slotUpload.progress}%
        </p>
      ) : null}

      {slotUpload?.status === "failed" ? (
        <p className="text-xs text-destructive">
          {slotUpload.message ?? slotIssue ?? "Upload failed."}
        </p>
      ) : slotIssue ? (
        <p className="text-xs text-destructive">{slotIssue}</p>
      ) : null}
    </div>
  )
}

function AccountSettings({
  deleteError,
  deletePassword,
  email,
  error,
  form,
  isChanging,
  isDeleteDialogOpen,
  isDeleting,
  message,
  onCancelDelete,
  onDeletePasswordChange,
  onOpenDelete,
  onSubmitDelete,
  onSubmit,
  setForm,
}: {
  deleteError: string | null
  deletePassword: string
  email: string
  error: string | null
  form: PasswordFormState
  isChanging: boolean
  isDeleteDialogOpen: boolean
  isDeleting: boolean
  message: string | null
  onCancelDelete: () => void
  onDeletePasswordChange: (value: string) => void
  onOpenDelete: () => void
  onSubmitDelete: (event: FormEvent<HTMLFormElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<PasswordFormState>>
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Email and password.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm ring-1 ring-foreground/10">
            {email}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={form.currentPassword}
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={form.newPassword}
                minLength={8}
                maxLength={128}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                minLength={8}
                maxLength={128}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <Button type="submit" className="w-fit" disabled={isChanging}>
            <Key weight="bold" />
            {isChanging ? "Changing..." : "Change password"}
          </Button>
        </form>

        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-destructive">Delete account</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Permanently close this account, remove public activity, sign out
              all sessions, and reserve the email and username for 7 days.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-fit"
            onClick={onOpenDelete}
          >
            <Trash weight="bold" />
            Delete account
          </Button>
        </div>

        <AccountDeletionDialog
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={onCancelDelete}
          onPasswordChange={onDeletePasswordChange}
          onSubmit={onSubmitDelete}
          open={isDeleteDialogOpen}
          password={deletePassword}
        />
      </CardContent>
    </Card>
  )
}

function DisplaySettings({
  currentTheme,
  error,
  isSaving,
  onChooseTheme,
}: {
  currentTheme: Theme
  error: string | null
  isSaving: boolean
  onChooseTheme: (theme: Theme) => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Display</CardTitle>
        <CardDescription>Theme preference.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-3">
          <ThemeChoice
            icon={Desktop}
            label="System"
            selected={currentTheme === "system"}
            onClick={() => onChooseTheme("system")}
          />
          <ThemeChoice
            icon={Sun}
            label="Light"
            selected={currentTheme === "light"}
            onClick={() => onChooseTheme("light")}
          />
          <ThemeChoice
            icon={Moon}
            label="Dark"
            selected={currentTheme === "dark"}
            onClick={() => onChooseTheme("dark")}
          />
        </div>
        {isSaving ? (
          <p className="text-sm text-muted-foreground">Saving theme...</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ThemeChoice({
  icon: Icon,
  label,
  onClick,
  selected,
}: {
  icon: typeof Desktop
  label: string
  onClick: () => void
  selected: boolean
}) {
  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className="justify-start"
      onClick={onClick}
      aria-pressed={selected}
    >
      <Icon weight="bold" />
      {label}
    </Button>
  )
}

function SafetySettings({
  blockedUsers,
  isUnblocking,
  onUnblock,
}: {
  blockedUsers: Array<{
    userId: string
    username: string
    displayName: string | null
  }>
  isUnblocking: boolean
  onUnblock: (userId: string) => void
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Safety</CardTitle>
        <CardDescription>Blocked users.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {blockedUsers.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-muted/35 p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            <ShieldCheck weight="bold" />
            No blocked users.
          </div>
        ) : (
          blockedUsers.map((user) => (
            <div
              key={user.userId}
              className="flex flex-col gap-3 rounded-xl bg-muted/35 p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {user.displayName ?? `@${user.username}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isUnblocking}
                onClick={() => onUnblock(user.userId)}
              >
                <ShieldCheck weight="bold" />
                Unblock
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AboutSettings({
  appVersion,
  buildInfo,
}: {
  appVersion: string
  buildInfo: string
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardDescription>Version and links.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoLine label="App version" value={appVersion} />
          <InfoLine label="Build" value={buildInfo} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["Terms", "/terms"],
            ["Privacy", "/privacy"],
            ["Cookies", "/cookies"],
            ["Legal notice", "/legal-notice"],
            ["Accessibility", "/accessibility"],
            ["Support", "/support"],
            ["Contact", "/contact"],
          ].map(([label, href]) => (
            <Button key={href} variant="outline" size="sm" asChild>
              <a href={href}>
                <Info weight="bold" />
                {label}
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 p-4 ring-1 ring-foreground/10">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-all">{value}</p>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
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
