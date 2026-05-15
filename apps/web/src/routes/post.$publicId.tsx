import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PostCard } from "@/features/posts/post-card";
import { PostComments } from "@/features/posts/post-comments";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/post/$publicId")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const navigate = useNavigate();
  const { publicId } = Route.useParams();
  const query = trpc.post.detail.useQuery({ publicId });

  if (query.isLoading) {
    return <PostDetailSkeleton />;
  }

  if (query.isError) {
    const code = query.error.data?.code;
    if (code === "NOT_FOUND") {
      return <PostUnavailable />;
    }

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <Alert variant="destructive">
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!query.data) {
    return <PostUnavailable />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <PostCard
        post={query.data}
        variant="detail"
        onDeleted={() => {
          void navigate({ to: "/" });
        }}
      />

      <PostComments post={query.data} />
    </div>
  );
}

function PostUnavailable() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Post unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          This post has been deleted, removed, or never existed.
        </CardContent>
      </Card>
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    </div>
  );
}
