import { useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle, Flag, ShieldWarning } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/admin/reports")({
  validateSearch: (search) => ({
    caseId: typeof search.caseId === "string" ? search.caseId : "",
  }),
  component: AdminReportsPage,
});

const PUBLIC_REASONS = [
  "self_harm",
  "illegal_or_dangerous",
  "privacy",
  "underage_or_safety",
  "harassment",
  "spam",
  "impersonation",
  "other",
] as const;

const INTERNAL_REASONS = PUBLIC_REASONS;

function AdminReportsPage() {
  const search = Route.useSearch();
  const [selectedCaseId, setSelectedCaseId] = useState(search.caseId);
  const casesQuery = trpc.moderation.listCases.useQuery(undefined, {
    retry: false,
  });

  if (casesQuery.isLoading) return <ReportsSkeleton />;
  if (casesQuery.isError) {
    if (casesQuery.error.data?.code === "FORBIDDEN") return <AdminUnavailable />;
    return <AdminError message={casesQuery.error.message} />;
  }

  const cases = casesQuery.data ?? [];
  const activeCaseId = selectedCaseId || cases[0]?.id || "";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-[22rem_1fr]">
      <aside className="space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="text-primary" weight="bold" />
          <h1 className="text-lg font-semibold">Report queue</h1>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {cases.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No cases.</p>
          ) : (
            cases.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                  item.id === activeCaseId ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedCaseId(item.id)}
              >
                <span className="font-medium">
                  {item.targetType} · {item.priority}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {item.status} · {item.reportCount} report
                  {item.reportCount === 1 ? "" : "s"}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {activeCaseId ? (
        <CaseReviewPanel caseId={activeCaseId} />
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No case selected.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CaseReviewPanel({ caseId }: { caseId: string }) {
  const utils = trpc.useUtils();
  const detailQuery = trpc.moderation.getCase.useQuery({ caseId });
  const claimMutation = trpc.moderation.claimCase.useMutation({
    async onSuccess() {
      await invalidateModeration(utils, caseId);
    },
  });
  const unassignMutation = trpc.moderation.unassignCase.useMutation({
    async onSuccess() {
      await invalidateModeration(utils, caseId);
    },
  });

  if (detailQuery.isLoading) return <Skeleton className="h-96 w-full" />;
  if (detailQuery.isError) {
    return <AdminError message={detailQuery.error.message} />;
  }
  if (!detailQuery.data) return null;

  const detail = detailQuery.data;
  const actionableTarget =
    detail.target?.type === "post" || detail.target?.type === "comment"
      ? detail.target
      : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {detail.priority === "urgent" ? (
                <ShieldWarning className="text-destructive" weight="bold" />
              ) : (
                <Flag className="text-primary" weight="bold" />
              )}
              {detail.targetType} case
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.status} · {detail.priority} ·{" "}
              {detail.assigneeId ? `assigned to ${detail.assigneeId}` : "unassigned"}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={claimMutation.isPending}
              onClick={() => claimMutation.mutate({ caseId })}
            >
              Claim
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={unassignMutation.isPending}
              onClick={() => unassignMutation.mutate({ caseId })}
            >
              Unassign
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/25 p-3 text-sm">
            <p className="font-medium">{detail.target?.label ?? detail.targetId}</p>
            {detail.target?.text && (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {detail.target.text}
              </p>
            )}
            {detail.target?.removedAt && (
              <p className="mt-2 text-muted-foreground">
                Removed · {formatPublicReason(detail.target.removalPublicReason)}
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-semibold">Reports</h2>
              <div className="space-y-2">
                {detail.reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <p className="font-medium">
                      {formatPublicReason(report.reason)} · {report.reporterId}
                    </p>
                    {report.notes && (
                      <p className="mt-1 text-muted-foreground">{report.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">Timeline</h2>
              <div className="space-y-2">
                {detail.actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions yet.</p>
                ) : (
                  detail.actions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-border p-3 text-sm"
                    >
                      <p className="font-medium">
                        {action.action} · {action.actorId}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {action.internalNotes}
                        {action.conflictOverride ? " · override" : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DismissCaseForm caseId={caseId} />
        {actionableTarget ? (
          <ContentActionForm
            caseId={caseId}
            isRemoved={actionableTarget.removedAt !== null}
            targetType={actionableTarget.type === "comment" ? "comment" : "post"}
            targetUpdatedAt={actionableTarget.updatedAt}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <CheckCircle weight="bold" />
              Profile cases can be dismissed in v1.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DismissCaseForm({ caseId }: { caseId: string }) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState<(typeof INTERNAL_REASONS)[number]>("other");
  const [internalNotes, setInternalNotes] = useState("");
  const mutation = trpc.moderation.dismissCase.useMutation({
    async onSuccess() {
      setInternalNotes("");
      await invalidateModeration(utils, caseId);
    },
  });

  return (
    <ActionCard
      title="Dismiss"
      error={mutation.error?.message}
      onSubmit={() =>
        mutation.mutate({
          caseId,
          reason,
          internalNotes,
        })
      }
    >
      <ReasonSelect value={reason} onChange={setReason} />
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Dismissing..." : "Dismiss case"}
      </Button>
    </ActionCard>
  );
}

function ContentActionForm({
  caseId,
  isRemoved,
  targetType,
  targetUpdatedAt,
}: {
  caseId: string;
  isRemoved: boolean;
  targetType: "post" | "comment";
  targetUpdatedAt: Date | null;
}) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState<(typeof INTERNAL_REASONS)[number]>("other");
  const [publicReason, setPublicReason] =
    useState<(typeof PUBLIC_REASONS)[number]>("other");
  const [internalNotes, setInternalNotes] = useState("");
  const [conflictOverride, setConflictOverride] = useState(false);
  const mutation = trpc.moderation.actionCase.useMutation({
    async onSuccess() {
      setInternalNotes("");
      setConflictOverride(false);
      await invalidateModeration(utils, caseId);
    },
  });
  const action = `${isRemoved ? "restore" : "remove"}_${targetType}` as const;

  return (
    <ActionCard
      title={isRemoved ? "Restore" : "Remove"}
      error={mutation.error?.message}
      onSubmit={() =>
        mutation.mutate({
          caseId,
          action,
          reason,
          publicReason: isRemoved ? null : publicReason,
          internalNotes,
          expectedTargetUpdatedAt: targetUpdatedAt,
          conflictOverride,
        })
      }
    >
      <ReasonSelect value={reason} onChange={setReason} />
      {!isRemoved && (
        <label className="grid gap-2 text-sm font-medium">
          Public reason
          <select
            value={publicReason}
            onChange={(event) =>
              setPublicReason(event.target.value as typeof publicReason)
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PUBLIC_REASONS.map((item) => (
              <option key={item} value={item}>
                {formatPublicReason(item)}
              </option>
            ))}
          </select>
        </label>
      )}
      <NotesBox value={internalNotes} onChange={setInternalNotes} />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={conflictOverride}
          onChange={(event) => setConflictOverride(event.target.checked)}
        />
        Override conflict
      </label>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : isRemoved ? "Restore content" : "Remove content"}
      </Button>
    </ActionCard>
  );
}

function ActionCard({
  children,
  error,
  onSubmit,
  title,
}: {
  children: ReactNode;
  error?: string;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ReasonSelect({
  onChange,
  value,
}: {
  onChange: (value: (typeof INTERNAL_REASONS)[number]) => void;
  value: (typeof INTERNAL_REASONS)[number];
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      Reason
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as typeof value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {INTERNAL_REASONS.map((item) => (
          <option key={item} value={item}>
            {formatPublicReason(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NotesBox({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      Internal notes
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28"
      />
    </label>
  );
}

async function invalidateModeration(
  utils: ReturnType<typeof trpc.useUtils>,
  caseId: string,
) {
  await Promise.all([
    utils.moderation.listCases.invalidate(),
    utils.moderation.getCase.invalidate({ caseId }),
  ]);
}

function ReportsSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-[22rem_1fr]">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
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

function formatPublicReason(value: string | null): string {
  if (!value) return "Moderation decision";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
