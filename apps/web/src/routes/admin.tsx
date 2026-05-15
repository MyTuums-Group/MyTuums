import { useState } from "react";
import type { ReactNode } from "react";
import { Flag, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/admin")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const casesQuery = trpc.moderation.listCases.useQuery(undefined, {
    retry: false,
  });

  if (casesQuery.isLoading) return <AdminSkeleton />;
  if (casesQuery.isError) {
    if (casesQuery.error.data?.code === "FORBIDDEN") return <AdminUnavailable />;
    return <AdminError message={casesQuery.error.message} />;
  }

  const cases = casesQuery.data ?? [];
  const filtered = cases.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    return true;
  });
  const openCount = cases.filter((item) => item.status === "open").length;
  const urgentCount = cases.filter((item) => item.priority === "urgent").length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric title="Open cases" value={openCount} icon={<Flag weight="bold" />} />
        <Metric title="Urgent" value={urgentCount} icon={<ShieldCheck weight="bold" />} />
        <Metric title="Total cases" value={cases.length} icon={<Flag weight="bold" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <AdminLink href="/admin/reports" icon={<Flag weight="bold" />} title="Report queue" />
        <AdminLink href="/admin/users" icon={<MagnifyingGlass weight="bold" />} title="User search" />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="dismissed">Dismissed</option>
            <option value="actioned">Actioned</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            aria-label="Filter by priority"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No cases match.</p>
          ) : (
            filtered.map((item) => <CaseRow key={item.id} item={item} />)
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <a
      href={href}
      className="flex min-h-16 items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
      </span>
      <span aria-hidden="true">→</span>
    </a>
  );
}

function CaseRow({
  item,
}: {
  item: {
    id: string;
    targetType: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    reportCount: number;
    createdAt: Date;
  };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-medium">
          {item.targetType} · {item.priority}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.status} · {item.reportCount} report{item.reportCount === 1 ? "" : "s"} ·{" "}
          {formatTime(item.createdAt)}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={`/admin/reports?caseId=${item.id}`}>Open</a>
      </Button>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
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
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md p-4">
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
