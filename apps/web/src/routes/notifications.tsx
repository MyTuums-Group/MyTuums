import type { Icon } from "@phosphor-icons/react"
import {
  ChatCircleDots,
  Check,
  Checks,
  HeartStraight,
  ShieldWarning,
  UserPlus,
} from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import {
  type NotificationIconKind,
  type NotificationListItem,
  getNotificationPresentation,
} from "@/features/notifications/notification-presentation"
import { trpc } from "@/lib/trpc"

const NOTIFICATION_ICONS: Record<NotificationIconKind, Icon> = {
  follow: UserPlus,
  heart: HeartStraight,
  chat: ChatCircleDots,
  moderation: ShieldWarning,
}

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
})

function NotificationsPage() {
  const utils = trpc.useUtils()
  const notificationsQuery = trpc.notification.list.useQuery()
  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.notification.list.invalidate(),
        utils.notification.unreadCount.invalidate(),
      ])
    },
  })

  const unreadCount =
    notificationsQuery.data?.filter((item) => !item.isRead).length ?? 0

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:py-8">
      <section className="space-y-3" aria-labelledby="notifications-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1
              id="notifications-heading"
              className="font-heading text-lg font-semibold tracking-tight"
            >
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${formatCount(unreadCount)} unread`
                : "All caught up"}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <Checks weight="bold" />
            Mark all read
          </Button>
        </div>

        {notificationsQuery.isLoading && !notificationsQuery.data ? (
          <NotificationSkeleton />
        ) : notificationsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {notificationsQuery.error.message}
            </AlertDescription>
          </Alert>
        ) : notificationsQuery.data?.length ? (
          <div className="space-y-2">
            {notificationsQuery.data.map((item) => (
              <NotificationRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>No notifications yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Follow, likes, comments, and moderation updates will land here.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

function NotificationRow({ item }: { item: NotificationListItem }) {
  const utils = trpc.useUtils()
  const markReadMutation = trpc.notification.markRead.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.notification.list.invalidate(),
        utils.notification.unreadCount.invalidate(),
      ])
    },
  })
  const { href, iconKind, title, targetPreview } =
    getNotificationPresentation(item)
  const Icon = NOTIFICATION_ICONS[iconKind]

  return (
    <a
      href={href}
      onClick={() => {
        if (!item.isRead && !markReadMutation.isPending) {
          markReadMutation.mutate({ notificationId: item.id })
        }
      }}
      className={cn(
        "group flex min-w-0 gap-3 rounded-xl bg-card p-3 text-left shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        !item.isRead && "ring-primary/35"
      )}
    >
      <Avatar className="mt-0.5">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {item.actor ? (
            getInitials(item.actor.displayName ?? item.actor.username)
          ) : (
            <Icon weight="bold" className="size-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="text-sm leading-5 font-medium text-foreground">
            {title}
          </p>
          {!item.isRead ? (
            <span
              aria-label="Unread"
              className="mt-1 size-2 shrink-0 rounded-full bg-primary"
            />
          ) : (
            <Check
              aria-label="Read"
              weight="bold"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
          )}
        </div>

        <p className="line-clamp-2 text-sm break-words text-muted-foreground">
          {targetPreview}
        </p>

        <time
          dateTime={item.createdAt.toISOString()}
          title={formatAbsoluteTimestamp(item.createdAt)}
          className="block text-xs text-muted-foreground"
        >
          {formatRelativeTimestamp(item.createdAt)}
        </time>
      </div>
    </a>
  )
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="shadow-sm">
          <CardContent className="flex gap-3 p-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"

  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en").format(value)
}

function formatAbsoluteTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatRelativeTimestamp(value: Date): string {
  const elapsed = value.getTime() - Date.now()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (Math.abs(elapsed) < hour) {
    return formatter.format(Math.round(elapsed / minute), "minute")
  }

  if (Math.abs(elapsed) < day) {
    return formatter.format(Math.round(elapsed / hour), "hour")
  }

  return formatter.format(Math.round(elapsed / day), "day")
}
