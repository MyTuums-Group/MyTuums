import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/admin/users")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { q } = Route.useSearch();
  const [draft, setDraft] = useState(q);
  const guardQuery = trpc.moderation.listCases.useQuery(undefined, {
    retry: false,
  });
  const searchQuery = trpc.search.useQuery(
    { query: q, limit: 12 },
    {
      enabled: !guardQuery.isError && q.trim().length > 0,
      retry: false,
    },
  );

  if (guardQuery.isLoading) return <UsersSkeleton />;
  if (guardQuery.isError) {
    if (guardQuery.error.data?.code === "FORBIDDEN") return <AdminUnavailable />;
    return <AdminError message={guardQuery.error.message} />;
  }

  const users = searchQuery.data?.results.filter((item) => item.type === "user") ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass className="text-primary" weight="bold" />
            User search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const search = new URLSearchParams();
              if (draft.trim()) search.set("q", draft.trim());
              window.location.href = search.toString()
                ? `/admin/users?${search.toString()}`
                : "/admin/users";
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search by username or display name"
              aria-label="Search users"
            />
            <Button type="submit">
              <MagnifyingGlass weight="bold" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {q.trim().length === 0 ? null : searchQuery.isLoading ? (
        <UsersSkeleton />
      ) : searchQuery.isError ? (
        <AdminError message={searchQuery.error.message} />
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No users match.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {users.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground">Open profile</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
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
