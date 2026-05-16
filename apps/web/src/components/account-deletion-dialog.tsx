import { Trash, X } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { FormEvent } from "react"

export function AccountDeletionDialog({
  error,
  isDeleting,
  onCancel,
  onPasswordChange,
  onSubmit,
  open,
  password,
}: {
  error: string | null
  isDeleting: boolean
  onCancel: () => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  open: boolean
  password: string
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        onSubmit={onSubmit}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-destructive/40 bg-background p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="delete-account-title" className="text-lg font-semibold">
              Delete account
            </h2>
            <p
              id="delete-account-description"
              className="mt-1 text-sm leading-6 text-muted-foreground"
            >
              Your profile, posts, comments, follows, likes, notifications, and
              active sessions will be removed from the app. Your email and
              username stay reserved for 7 days.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <X weight="bold" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-account-password">Password</Label>
          <Input
            id="delete-account-password"
            type="password"
            value={password}
            minLength={1}
            maxLength={128}
            autoComplete="current-password"
            required
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={isDeleting}>
            <Trash weight="bold" />
            {isDeleting ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </form>
    </div>
  )
}
