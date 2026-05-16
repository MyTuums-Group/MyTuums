import { WarningCircle } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { useState, type FormEvent } from "react"
import { AccountDeletionDialog } from "@/components/account-deletion-dialog"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/account/status")({
  component: AccountStatusPage,
})

function AccountStatusPage() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  })
  const deleteAccountMutation = trpc.settings.deleteAccount.useMutation({
    async onSuccess() {
      setDeletePassword("")
      setDeleteError(null)
      setIsDeleteDialogOpen(false)
      await currentAppUser.refetch()
      await utils.currentAppUser.invalidate()
      window.location.assign("/login")
    },
  })
  const state = currentAppUser.data
  const accountStatus =
    state?.kind === "limited_account" ? state.accountStatus : null
  const suspensionReason =
    state?.kind === "limited_account" ? state.suspensionPublicReason : null

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(null)
    try {
      await deleteAccountMutation.mutateAsync({ password: deletePassword })
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <WarningCircle weight="bold" className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Account status
            </h1>
            <p className="text-sm text-muted-foreground">
              {accountStatus === "account_deleted"
                ? "This account has been deleted."
                : "This account is currently suspended."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            App access is limited while this status is active. Support and
            account closure remain available.
          </p>
          {suspensionReason ? (
            <p className="mt-3 text-sm font-medium">
              Public reason: {suspensionReason}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <a href="/contact">Contact support</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/support">Support center</a>
            </Button>
            {accountStatus === "suspended" ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteError(null)
                  setIsDeleteDialogOpen(true)
                }}
              >
                Delete account
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <AccountDeletionDialog
        error={deleteError ?? deleteAccountMutation.error?.message ?? null}
        isDeleting={deleteAccountMutation.isPending}
        onCancel={() => {
          setIsDeleteDialogOpen(false)
          setDeletePassword("")
          setDeleteError(null)
        }}
        onPasswordChange={(value) => {
          setDeletePassword(value)
          setDeleteError(null)
        }}
        onSubmit={(event) => {
          void handleDeleteAccount(event)
        }}
        open={isDeleteDialogOpen}
        password={deletePassword}
      />
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
