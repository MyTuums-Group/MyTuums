import { useState } from "react";
import { PenNib } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { trpc } from "@/lib/trpc";
import { DEFAULT_POST_PAGE_LIMIT } from "./constants";
import {
  prependPostToFeedPage,
  replacePostInFeedPage,
} from "./post-cache";
import { getPostTextState } from "./post-text";
import type { PostView } from "./types";

type PostComposerProps = {
  onCreated?: (post: PostView) => void;
};

export function PostComposer({ onCreated }: PostComposerProps) {
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const currentAppUser = trpc.currentAppUser.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const state = getPostTextState(draft);
  const activeProfile =
    currentAppUser.data?.kind === "active_onboarded_profile"
      ? currentAppUser.data.profile
      : null;

  const createMutation = trpc.post.create.useMutation({
    async onMutate(variables) {
      const optimisticPublicId = `optimistic-${Date.now()}`;
      const optimisticPost: PostView = {
        publicId: optimisticPublicId,
        text: variables.text,
        author: {
          username: activeProfile?.username ?? "you",
          displayName: activeProfile?.displayName ?? "You",
          avatarUrl: null,
        },
        gameTag: null,
        media: null,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        canDelete: true,
      };

      await Promise.all([
        utils.post.forYouFeed.cancel({ limit: DEFAULT_POST_PAGE_LIMIT }),
        activeProfile
          ? utils.post.profileFeed.cancel({
              username: activeProfile.username,
              limit: DEFAULT_POST_PAGE_LIMIT,
            })
          : Promise.resolve(),
      ]);

      const previousForYou = utils.post.forYouFeed.getData({
        limit: DEFAULT_POST_PAGE_LIMIT,
      });
      const previousProfile = activeProfile
        ? utils.post.profileFeed.getData({
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          })
        : undefined;

      setErrorMessage(null);
      setDraft("");

      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        (current) => prependPostToFeedPage(current, optimisticPost),
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          (current) => prependPostToFeedPage(current, optimisticPost),
        );
      }

      return {
        optimisticPublicId,
        previousForYou,
        previousProfile,
        previousDraft: draft,
      };
    },

    onError(error, _variables, context) {
      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        context?.previousForYou,
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          context?.previousProfile,
        );
      }

      setDraft(context?.previousDraft ?? "");
      setErrorMessage(error.message);
    },

    onSuccess(createdPost, _variables, context) {
      utils.post.forYouFeed.setData(
        { limit: DEFAULT_POST_PAGE_LIMIT },
        (current) =>
          replacePostInFeedPage(
            current,
            context?.optimisticPublicId ?? createdPost.publicId,
            createdPost,
          ) ?? prependPostToFeedPage(current, createdPost),
      );

      if (activeProfile) {
        utils.post.profileFeed.setData(
          {
            username: activeProfile.username,
            limit: DEFAULT_POST_PAGE_LIMIT,
          },
          (current) =>
            replacePostInFeedPage(
              current,
              context?.optimisticPublicId ?? createdPost.publicId,
              createdPost,
            ) ?? prependPostToFeedPage(current, createdPost),
        );
      }

      onCreated?.(createdPost);
    },

    async onSettled() {
      await Promise.all([
        utils.post.forYouFeed.invalidate({ limit: DEFAULT_POST_PAGE_LIMIT }),
        activeProfile
          ? utils.post.profileFeed.invalidate({
              username: activeProfile.username,
              limit: DEFAULT_POST_PAGE_LIMIT,
            })
          : Promise.resolve(),
      ]);
    },
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <PenNib weight="bold" className="text-primary size-5" />
        <div>
          <p className="font-semibold">Share a public post</p>
          <p className="text-muted-foreground text-sm">
            Text only for now. Links keep their typed text and open safely.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (state.isEmpty || state.isTooLong || createMutation.isPending) {
              return;
            }

            createMutation.mutate({
              text: state.normalizedText,
            });
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            disabled={createMutation.isPending}
            placeholder="What are you playing right now?"
            className="min-h-32 resize-y"
          />

          <div className="flex items-center justify-between gap-3">
            <p
              className={`text-sm ${
                state.isTooLong ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {state.count} / 500
            </p>

            <Button
              type="submit"
              disabled={
                state.isEmpty || state.isTooLong || createMutation.isPending
              }
            >
              {createMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
