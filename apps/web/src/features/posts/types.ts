import type { AppRouter, inferRouterOutputs } from "@workspace/api-contract";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PostView = RouterOutputs["post"]["detail"];
export type PostFeedPage = RouterOutputs["post"]["forYouFeed"];
