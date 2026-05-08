import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export const Route = createFileRoute("/@{$username}")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const query = trpc.profile.getByUsername.useQuery({ username });

  if (query.isLoading) return <ProfileSkeleton />;

  if (query.isError) {
    const code = query.error?.data?.code;
    if (code === "NOT_FOUND") return <ProfileNotFound />;
    return <ProfileError message={query.error.message} />;
  }

  if (!query.data) return null;

  const profile = query.data;

  return (
    <div className="mx-auto max-w-2xl p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl">@{profile.username}</CardTitle>
            {profile.displayName && (
              <p className="text-lg font-semibold">{profile.displayName}</p>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
          <div className="text-sm text-muted-foreground">
            <p>Follower / following counts: coming soon</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Posts will appear here (coming in #5).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl p-4 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profile not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This user doesn't exist or their account has been removed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Alert variant="destructive" className="w-full max-w-md">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
