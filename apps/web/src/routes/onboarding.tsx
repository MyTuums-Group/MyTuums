import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { trpc } from "@/lib/trpc"
import {
  normalizeUsernameInput,
  validateUsernameCandidate,
  type UsernameValidation,
} from "@/features/onboarding/username"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
} from "@workspace/types"

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const [username, setUsername] = useState("")
  const [hasEditedUsername, setHasEditedUsername] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = trpc.profile.submitOnboarding.useMutation({
    onSuccess: () => {
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
  const canSubmit =
    usernameValidation.kind === "valid" &&
    currentAvailability?.status === "available" &&
    !availabilityQuery.isFetching &&
    !mutation.isPending

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

    setLocalError(null)
    mutation.mutate({
      username,
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
    })
  }

  const serverErrorMessage = mutation.error?.message
  const errorMessage = localError ?? serverErrorMessage

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose your username</CardTitle>
          <CardDescription>
            This will be your permanent handle on MyTuums. Choose wisely: it
            cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

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
                aria-invalid={Boolean(errorMessage) || hasUsernameError}
                aria-describedby="username-help username-status"
                required
              />
              <p id="username-help" className="text-xs text-muted-foreground">
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} chars. Starts with a
                letter; lowercase letters, numbers, and underscores only.
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
                  const val: string = e.target.value
                  setDisplayName(val)
                }}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell other gamers about yourself..."
                value={bio}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  const val: string = e.target.value
                  setBio(val)
                }}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {mutation.isPending ? "Creating profile..." : "Create profile"}
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
