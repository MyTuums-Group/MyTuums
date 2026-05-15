import {
  Camera,
  Check,
  Desktop,
  GameController,
  Info,
  Key,
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
} from "@workspace/types"
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import type { Theme } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import { changePassword } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc"

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
type FavoriteGame = { id: string; slug: string; name: string }

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
  const [gameSearch, setGameSearch] = useState("")
  const [mediaPreviews, setMediaPreviews] = useState<
    Record<MediaSlot, string | null>
  >({ avatar: null, banner: null })
  const [uploadingSlot, setUploadingSlot] = useState<MediaSlot | null>(null)
  const { theme, setTheme } = useTheme()
  const utils = trpc.useUtils()

  const settingsQuery = trpc.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const gameSearchQuery = trpc.search.useQuery(
    { query: gameSearch, limit: 8 },
    {
      enabled: gameSearch.trim().length >= 2,
      retry: false,
      refetchOnWindowFocus: false,
    }
  )
  const createUploadMutation = trpc.media.createUpload.useMutation()
  const confirmUploadMutation = trpc.media.confirmUpload.useMutation()
  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    async onSuccess(profile) {
      setProfileForm({
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        avatarMediaId: profile.avatarMediaId,
        bannerMediaId: profile.bannerMediaId,
        favoriteGames: profile.favoriteGames,
      })
      setProfileMessage("Profile saved.")
      setProfileError(null)
      await utils.settings.get.invalidate()
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

  useEffect(() => {
    if (!settingsQuery.data) return

    setProfileForm({
      displayName: settingsQuery.data.profile.displayName ?? "",
      bio: settingsQuery.data.profile.bio ?? "",
      avatarMediaId: settingsQuery.data.profile.avatarMediaId,
      bannerMediaId: settingsQuery.data.profile.bannerMediaId,
      favoriteGames: settingsQuery.data.profile.favoriteGames,
    })
    setTheme(settingsQuery.data.display.theme)
  }, [settingsQuery.data, setTheme])

  const gameResults = useMemo(
    () =>
      gameSearchQuery.data?.results
        .filter((item) => item.type === "game")
        .map((item) => ({
          id: item.id,
          name: item.label,
          slug: item.href.split("/").filter(Boolean).at(-1) ?? item.label,
        }))
        .filter(
          (game) =>
            !profileForm.favoriteGames.some(
              (favorite) => favorite.id === game.id
            )
        ) ?? [],
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

  async function handleMediaSelected(slot: MediaSlot, file: File | null) {
    if (!file) return

    try {
      setUploadingSlot(slot)
      setProfileError(null)

      const upload = await createUploadMutation.mutateAsync({
        mimeType: file.type,
        byteSize: file.size,
        purpose: slot === "avatar" ? "profile_avatar" : "profile_banner",
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
        throw new Error("Upload failed.")
      }

      await confirmUploadMutation.mutateAsync({ mediaId: upload.mediaId })
      const objectUrl = URL.createObjectURL(file)
      setMediaPreviews((current) => ({ ...current, [slot]: objectUrl }))
      setProfileForm((current) => ({
        ...current,
        [slot === "avatar" ? "avatarMediaId" : "bannerMediaId"]: upload.mediaId,
      }))
    } catch (error) {
      setProfileError(getErrorMessage(error))
    } finally {
      setUploadingSlot(null)
    }
  }

  function removeMedia(slot: MediaSlot) {
    setMediaPreviews((current) => ({ ...current, [slot]: null }))
    setProfileForm((current) => ({
      ...current,
      [slot === "avatar" ? "avatarMediaId" : "bannerMediaId"]: null,
    }))
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
          isGameSearchLoading={gameSearchQuery.isFetching}
          isSaving={updateProfileMutation.isPending}
          mediaPreviews={mediaPreviews}
          message={profileMessage}
          error={profileError ?? updateProfileMutation.error?.message ?? null}
          uploadingSlot={uploadingSlot}
          onAddFavoriteGame={addFavoriteGame}
          onGameSearchChange={setGameSearch}
          onMediaSelected={handleMediaSelected}
          onRemoveFavoriteGame={removeFavoriteGame}
          onRemoveMedia={removeMedia}
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
  isGameSearchLoading,
  isSaving,
  mediaPreviews,
  message,
  onAddFavoriteGame,
  onGameSearchChange,
  onMediaSelected,
  onRemoveFavoriteGame,
  onRemoveMedia,
  onSubmit,
  setForm,
  uploadingSlot,
}: {
  error: string | null
  form: ProfileFormState
  gameResults: FavoriteGame[]
  gameSearch: string
  isGameSearchLoading: boolean
  isSaving: boolean
  mediaPreviews: Record<MediaSlot, string | null>
  message: string | null
  onAddFavoriteGame: (game: FavoriteGame) => void
  onGameSearchChange: (value: string) => void
  onMediaSelected: (slot: MediaSlot, file: File | null) => Promise<void>
  onRemoveFavoriteGame: (gameId: string) => void
  onRemoveMedia: (slot: MediaSlot) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  setForm: Dispatch<SetStateAction<ProfileFormState>>
  uploadingSlot: MediaSlot | null
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="favorite-game-search">Favorite games</Label>
              <Input
                id="favorite-game-search"
                value={gameSearch}
                placeholder="Search games"
                disabled={form.favoriteGames.length >= MAX_FAVORITE_GAMES}
                onChange={(event) => onGameSearchChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {form.favoriteGames.length}/{MAX_FAVORITE_GAMES}
              </p>
            </div>
          </div>

          {gameSearch.trim().length >= 2 ? (
            <div className="flex flex-wrap gap-2">
              {isGameSearchLoading ? (
                <Skeleton className="h-8 w-36" />
              ) : gameResults.length > 0 ? (
                gameResults.map((game) => (
                  <Button
                    key={game.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAddFavoriteGame(game)}
                  >
                    <GameController weight="bold" />
                    {game.name}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No games found.</p>
              )}
            </div>
          ) : null}

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
              previewUrl={mediaPreviews.avatar}
              slot="avatar"
              uploadingSlot={uploadingSlot}
              onMediaSelected={onMediaSelected}
              onRemoveMedia={onRemoveMedia}
            />
            <MediaField
              label="Banner"
              mediaId={form.bannerMediaId}
              previewUrl={mediaPreviews.banner}
              slot="banner"
              uploadingSlot={uploadingSlot}
              onMediaSelected={onMediaSelected}
              onRemoveMedia={onRemoveMedia}
            />
          </div>

          <Button type="submit" className="w-fit" disabled={isSaving}>
            <Check weight="bold" />
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function MediaField({
  label,
  mediaId,
  onMediaSelected,
  onRemoveMedia,
  previewUrl,
  slot,
  uploadingSlot,
}: {
  label: string
  mediaId: string | null
  onMediaSelected: (slot: MediaSlot, file: File | null) => Promise<void>
  onRemoveMedia: (slot: MediaSlot) => void
  previewUrl: string | null
  slot: MediaSlot
  uploadingSlot: MediaSlot | null
}) {
  const inputId = `${slot}-media`
  const isUploading = uploadingSlot === slot

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/35 p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        {slot === "avatar" ? (
          <Avatar size="lg">
            <AvatarImage src={previewUrl ?? undefined} alt={label} />
            <AvatarFallback>
              <User weight="bold" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex aspect-[5/2] h-16 w-36 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10">
            {previewUrl ? (
              <img
                src={previewUrl}
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isUploading}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            void onMediaSelected(slot, event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!mediaId || isUploading}
          onClick={() => onRemoveMedia(slot)}
        >
          <Trash weight="bold" />
          Remove
        </Button>
      </div>
      {isUploading ? (
        <p className="text-xs text-muted-foreground">Uploading...</p>
      ) : null}
    </div>
  )
}

function AccountSettings({
  email,
  error,
  form,
  isChanging,
  message,
  onSubmit,
  setForm,
}: {
  email: string
  error: string | null
  form: PasswordFormState
  isChanging: boolean
  message: string | null
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

        <Alert variant="destructive">
          <AlertDescription>
            Account deletion is tracked in issue #17.
          </AlertDescription>
        </Alert>
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
