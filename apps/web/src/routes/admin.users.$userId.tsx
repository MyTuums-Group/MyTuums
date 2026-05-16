import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
  UserCircle,
  UserSwitch,
  WarningCircle,
} from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { trpc } from "@/lib/trpc"
import { getAdminUserActionVisibility } from "./-admin-user-actions"

export const Route = createFileRoute("/admin/users/$userId")({
  component: AdminUserDetailPage,
})

type RouterOutputs = inferRouterOutputs<AppRouter>
type StaffUserDetail = RouterOutputs["staff"]["getUser"]
type RoleOption = StaffUserDetail["actions"]["roleOptions"][number]
type SuspensionDuration = "24h" | "7d" | "30d" | "indefinite"

const SUSPENSION_DURATIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "indefinite", label: "Indefinite" },
] as const satisfies Array<{ value: SuspensionDuration; label: string }>

function AdminUserDetailPage() {
  const { userId } = Route.useParams()
  const detailQuery = trpc.staff.getUser.useQuery(
    { targetUserId: userId },
    { retry: false }
  )

  if (detailQuery.isLoading) return <UserDetailSkeleton />
  if (detailQuery.isError) {
    if (detailQuery.error.data?.code === "FORBIDDEN")
      return <AdminUnavailable />
    return <AdminError message={formatStaffError(detailQuery.error.message)} />
  }
  if (!detailQuery.data) return <AdminError message="User not found." />

  return <UserDetailSurface detail={detailQuery.data} />
}

function UserDetailSurface({ detail }: { detail: StaffUserDetail }) {
  const title =
    detail.profile?.displayName ?? detail.profile?.username ?? detail.id

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <a href="/admin/users">
            <ArrowLeft data-icon="inline-start" weight="bold" />
            User search
          </a>
        </Button>
        <a
          href={detail.profile ? `/@${detail.profile.username}` : undefined}
          aria-disabled={!detail.profile}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Public profile
        </a>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="text-primary" weight="bold" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Fact label="User ID" value={detail.id} />
            <Fact
              label="Profile"
              value={
                detail.profile
                  ? `@${detail.profile.username}`
                  : "No profile created"
              }
            />
            <Fact label="Role" value={formatEnum(detail.role)} />
            <Fact label="Status" value={formatEnum(detail.accountStatus)} />
            <Fact
              label="Email"
              value={detail.emailVerified ? "Verified" : "Unverified"}
            />
            <Fact
              label="Suspension"
              value={
                detail.accountStatus === "suspended"
                  ? formatSuspension(detail)
                  : "Not suspended"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" weight="bold" />
              Moderation context
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Role changes and suspension actions are limited by the v1 staff
              hierarchy. Successful mutations refresh this account panel.
            </p>
            {detail.suspensionPublicReason ? (
              <p>Public reason: {formatEnum(detail.suspensionPublicReason)}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <StaffActionsPanel detail={detail} />
    </div>
  )
}

function StaffActionsPanel({ detail }: { detail: StaffUserDetail }) {
  const visibility = getAdminUserActionVisibility({
    accountStatus: detail.accountStatus,
    actions: detail.actions,
  })

  if (!visibility.hasAnyAction) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <ShieldCheck weight="bold" />
          No account actions are available for this target.
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {visibility.showSuspend ? (
        <SuspendUserForm targetUserId={detail.id} />
      ) : null}
      {visibility.showUnsuspend ? (
        <UnsuspendUserForm targetUserId={detail.id} />
      ) : null}
      {visibility.showConfirmUnderage ? (
        <ConfirmUnderageForm targetUserId={detail.id} />
      ) : null}
      {visibility.showRoleChange ? (
        <RoleChangeForm
          targetUserId={detail.id}
          roleOptions={detail.actions.roleOptions}
        />
      ) : null}
    </section>
  )
}

function SuspendUserForm({ targetUserId }: { targetUserId: string }) {
  const utils = trpc.useUtils()
  const [duration, setDuration] = useState<SuspensionDuration>("7d")
  const [publicReason, setPublicReason] = useState("terms_violation")
  const [internalNotes, setInternalNotes] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const mutation = trpc.staff.suspendUser.useMutation({
    async onSuccess() {
      setInternalNotes("")
      setSuccess("User suspended.")
      await refreshStaffUser(utils, targetUserId)
    },
    onError() {
      setSuccess(null)
    },
  })

  return (
    <ActionCard
      title="Suspend user"
      icon={<WarningCircle className="text-destructive" weight="bold" />}
      error={mutation.error?.message}
      success={success}
      onSubmit={() =>
        mutation.mutate({
          targetUserId,
          duration,
          publicReason,
          internalNotes,
        })
      }
    >
      <label className="flex flex-col gap-2 text-sm font-medium">
        Duration
        <select
          value={duration}
          onChange={(event) =>
            setDuration(event.target.value as SuspensionDuration)
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {SUSPENSION_DURATIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Public reason
        <Input
          value={publicReason}
          onChange={(event) => setPublicReason(event.target.value)}
          maxLength={80}
          required
        />
      </label>
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Suspending..." : "Suspend"}
      </Button>
    </ActionCard>
  )
}

function UnsuspendUserForm({ targetUserId }: { targetUserId: string }) {
  const utils = trpc.useUtils()
  const [internalNotes, setInternalNotes] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const mutation = trpc.staff.unsuspendUser.useMutation({
    async onSuccess() {
      setInternalNotes("")
      setSuccess("User unsuspended.")
      await refreshStaffUser(utils, targetUserId)
    },
    onError() {
      setSuccess(null)
    },
  })

  return (
    <ActionCard
      title="Unsuspend user"
      icon={<CheckCircle className="text-primary" weight="bold" />}
      error={mutation.error?.message}
      success={success}
      onSubmit={() => mutation.mutate({ targetUserId, internalNotes })}
    >
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Unsuspending..." : "Unsuspend"}
      </Button>
    </ActionCard>
  )
}

function ConfirmUnderageForm({ targetUserId }: { targetUserId: string }) {
  const utils = trpc.useUtils()
  const [internalNotes, setInternalNotes] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const mutation = trpc.staff.confirmUnderage.useMutation({
    async onSuccess() {
      setInternalNotes("")
      setSuccess("Underage suspension applied.")
      await refreshStaffUser(utils, targetUserId)
    },
    onError() {
      setSuccess(null)
    },
  })

  return (
    <ActionCard
      title="Confirm underage"
      icon={<WarningCircle className="text-destructive" weight="bold" />}
      error={mutation.error?.message}
      success={success}
      onSubmit={() => mutation.mutate({ targetUserId, internalNotes })}
    >
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <Button type="submit" variant="destructive" disabled={mutation.isPending}>
        {mutation.isPending ? "Confirming..." : "Confirm underage"}
      </Button>
    </ActionCard>
  )
}

function RoleChangeForm({
  roleOptions,
  targetUserId,
}: {
  roleOptions: RoleOption[]
  targetUserId: string
}) {
  const utils = trpc.useUtils()
  const [newRole, setNewRole] = useState<RoleOption>(roleOptions[0]!)
  const [internalNotes, setInternalNotes] = useState("")
  const [success, setSuccess] = useState<string | null>(null)
  const mutation = trpc.staff.changeRole.useMutation({
    async onSuccess() {
      setInternalNotes("")
      setSuccess("Role updated.")
      await refreshStaffUser(utils, targetUserId)
    },
    onError() {
      setSuccess(null)
    },
  })

  useEffect(() => {
    setNewRole(roleOptions[0]!)
  }, [roleOptions])

  return (
    <ActionCard
      title="Change role"
      icon={<UserSwitch className="text-primary" weight="bold" />}
      error={mutation.error?.message}
      success={success}
      onSubmit={() =>
        mutation.mutate({
          targetUserId,
          newRole,
          internalNotes,
        })
      }
    >
      <label className="flex flex-col gap-2 text-sm font-medium">
        New role
        <select
          value={newRole}
          onChange={(event) => setNewRole(event.target.value as RoleOption)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {formatEnum(role)}
            </option>
          ))}
        </select>
      </label>
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Updating..." : "Update role"}
      </Button>
    </ActionCard>
  )
}

function ActionCard({
  children,
  error,
  icon,
  onSubmit,
  success,
  title,
}: {
  children: ReactNode
  error?: string
  icon: ReactNode
  onSubmit: () => void
  success: string | null
  title: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          {children}
          {success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{formatStaffError(error)}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}

function NotesBox({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      Internal notes
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="min-h-28"
      />
    </label>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/25 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  )
}

async function refreshStaffUser(
  utils: ReturnType<typeof trpc.useUtils>,
  targetUserId: string
) {
  await Promise.all([
    utils.staff.getUser.invalidate({ targetUserId }),
    utils.staff.searchUsers.invalidate(),
  ])
}

function UserDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function AdminUnavailable() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md items-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This page is not available.
        </CardContent>
      </Card>
    </div>
  )
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md p-4">
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}

function formatEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatSuspension(detail: StaffUserDetail): string {
  if (detail.suspendedUntil) return formatDate(detail.suspendedUntil)
  return detail.suspensionPublicReason === "underage"
    ? "Indefinite underage suspension"
    : "Indefinite"
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatStaffError(message: string): string {
  switch (message) {
    case "internal_notes_required":
      return "Internal notes are required."
    case "role_change_not_allowed":
      return "Your role cannot make that role change."
    case "suspension_not_allowed":
      return "Your role cannot change that account suspension."
    case "staff_access_not_allowed":
      return "This account is not available for your staff role."
    case "target_not_found":
      return "User not found."
    default:
      return formatEnum(message)
  }
}
