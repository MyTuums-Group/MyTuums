# Issue #4: Onboarding + Profiles — Implementation Plan

> **For Hermes:** Execute task-by-task with TDD. Commit after each task.

**Goal:** Onboarding flow (username picker after email verification) + public profile page at `/@{username}`.

**Architecture:** tRPC profile router (`submitOnboarding`, `getByUsername`, `checkExists`) backed by Drizzle queries against the existing `profile` table. Frontend: `/onboarding` page with validated form, `/@{username}` profile page with posts placeholder. Route guard in `__root.tsx` redirects authenticated-but-profileless users to `/onboarding`.

**Tech Stack:** Fastify, tRPC, Drizzle ORM, TanStack Router, ShadCN UI, React Hook Form + Zod.

---

## Pre-flight

- [x] `profile` table exists in `packages/db/src/schema.ts` (line 206–235)
- [x] `createUsername()` value object exists in `packages/types/src/username.ts`
- [x] `isReservedUsername()` exists in `packages/types/src/reserved-usernames.ts`
- [x] `protectedProcedure` exists in `apps/api/src/trpc.ts`
- [x] BetterAuth session available in tRPC context via `ctx.session`
- [x] CI green on `main`

---

### Task 1: Create profile tRPC router — `submitOnboarding` mutation

**Objective:** Protected mutation that validates username, checks uniqueness, and creates a profile row.

**Files:**
- Create: `apps/api/src/routers/profile.ts`
- Modify: `apps/api/src/trpc.ts` (merge profile router into appRouter)

**Step 1: Create the profile router**

```ts
// apps/api/src/routers/profile.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { profile } from "@workspace/db/schema";
import {
  createUsername,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from "@workspace/types";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const profileRouter = router({
  /** Create a profile during onboarding. Requires auth. Username is immutable. */
  submitOnboarding: protectedProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(USERNAME_MIN_LENGTH)
          .max(USERNAME_MAX_LENGTH),
        displayName: z.string().max(DISPLAY_NAME_MAX_LENGTH).optional(),
        bio: z.string().max(BIO_MAX_LENGTH).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate username format + reserved list
      const result = createUsername(input.username);
      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error.message,
        });
      }
      const username = result.value;

      // 2. Check if user already has a profile (one profile per user)
      const [existing] = await db
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a profile.",
        });
      }

      // 3. Insert — unique constraint on username handles race conditions
      try {
        const [row] = await db
          .insert(profile)
          .values({
            userId: ctx.user.id,
            username,
            displayName: input.displayName?.trim() || null,
            bio: input.bio?.trim() || null,
          })
          .returning();

        return row;
      } catch (err) {
        // PostgreSQL unique violation code
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "23505"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This username is already taken.",
          });
        }
        throw err;
      }
    }),
});
```

**Step 2: Merge into appRouter**

In `apps/api/src/trpc.ts`, add:
```ts
import { profileRouter } from "./routers/profile.js";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ... })),
  me: protectedProcedure.query(({ ctx }) => ({ ... })),
  profile: profileRouter, // ← add this
});
```

**Step 3: Run typecheck**
```bash
cd ~/code/MyTuums && pnpm --filter @workspace/api typecheck
```

**Step 4: Commit**
```bash
git add apps/api/src/routers/ apps/api/src/trpc.ts
git commit -m "feat: add profile tRPC router with submitOnboarding mutation"
```

---

### Task 2: Add `getByUsername` and `checkExists` queries

**Objective:** Public query to fetch a profile by username; protected query to check if current user has a profile (for route guard).

**Files:**
- Modify: `apps/api/src/routers/profile.ts`

**Step 1: Add queries to profileRouter**

Add these inside the `profileRouter` object:

```ts
  /** Fetch a profile by username. Public — used for /@{username} pages. */
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(profile)
        .where(eq(profile.username, input.username.toLowerCase()))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      return row;
    }),

  /** Check if the authenticated user has a profile. Used by route guard. */
  checkExists: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.userId, ctx.user.id))
      .limit(1);

    return { hasProfile: row !== undefined };
  }),
```

**Step 2: Run typecheck**
```bash
cd ~/code/MyTuums && pnpm --filter @workspace/api typecheck
```

**Step 3: Commit**
```bash
git add apps/api/src/routers/profile.ts
git commit -m "feat: add getByUsername and checkExists profile queries"
```

---

### Task 3: Create onboarding page (`/onboarding`)

**Objective:** Form page where user picks username + optional display name and bio. Submits to `profile.submitOnboarding` tRPC mutation.

**Files:**
- Create: `apps/web/src/routes/onboarding.tsx`
- Modify: `apps/web/src/routeTree.gen.ts` (register route)

**Step 1: Create the onboarding route**

```tsx
// apps/web/src/routes/onboarding.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  USERNAME_REGEX,
} from "@workspace/types";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const mutation = trpc.profile.submitOnboarding.useMutation({
    onSuccess: () => {
      void navigate({ to: "/" });
    },
  });

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function validate(): string | null {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < USERNAME_MIN_LENGTH) {
      return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    }
    if (trimmed.length > USERNAME_MAX_LENGTH) {
      return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      return "Username must start with a letter and contain only lowercase letters, numbers, and underscores.";
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    mutation.mutate({
      username: username.trim().toLowerCase(),
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
    });
  }

  const errorMessage = localError ?? mutation.error?.message;

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose your username</CardTitle>
          <CardDescription>
            This will be your permanent handle on MyTuums. Choose wisely — it cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="your_handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={USERNAME_MAX_LENGTH}
                required
              />
              <p className="text-xs text-muted-foreground">
                {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} chars, lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display name (optional)</Label>
              <Input
                id="displayName"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell other gamers about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/{BIO_MAX_LENGTH}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating profile..." : "Create profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Register in routeTree.gen.ts**

After creating the file, update `apps/web/src/routeTree.gen.ts` — add the import and route definition. The Vite dev server auto-regenerates this; for the initial commit, manually add:

```ts
import { Route as onboardingRoute } from "./routes/onboarding";
// ... in route tree:
onboardingRoute,
```

**Step 3: Verify the tRPC client**

The `trpc` import assumes a tRPC React client is already set up. Verify it exists or create it:
- Check if `apps/web/src/lib/trpc.ts` exists and exports `trpc`

If not, create a minimal tRPC client:
```ts
// apps/web/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@workspace/api-contract";
export const trpc = createTRPCReact<AppRouter>();
```

**Step 4: Run typecheck**
```bash
cd ~/code/MyTuums && pnpm --filter @workspace/web typecheck
```

**Step 5: Commit**
```bash
git add apps/web/src/routes/onboarding.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add onboarding page with username picker"
```

---

### Task 4: Update route guard for onboarding redirect

**Objective:** After auth check, redirect users without a profile to `/onboarding` (unless already there).

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`

**Step 1: Update beforeLoad**

The route guard needs to:
1. Allow public paths (no change)
2. Require auth for everything else (no change)
3. NEW: if authenticated but no profile, redirect to `/onboarding`

However, `beforeLoad` runs on every navigation. Calling `trpc.profile.checkExists.useQuery()` here is tricky because it's a hook. Instead, make a direct fetch to the tRPC endpoint or use the auth-client pattern.

Simplest approach: call the BetterAuth session endpoint (already used), then make a direct backend check. Or, since we're in `beforeLoad` (not a React component), use a direct fetch:

```ts
import { getSession } from "@/lib/auth-client";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";

const PUBLIC_PATHS = [ /* existing list */ ];
const PUBLIC_SET = new Set(PUBLIC_PATHS);
const ONBOARDING_PATH = "/onboarding";

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    // Skip guard for public pages
    if (PUBLIC_SET.has(location.pathname)) return;

    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    // User is authenticated — check if they have a profile
    // Skip this check if already on onboarding (prevents redirect loop)
    if (location.pathname !== ONBOARDING_PATH) {
      // Direct fetch to tRPC (not a hook — runs in beforeLoad)
      const baseUrl = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${baseUrl}/trpc/profile.checkExists`, {
        headers: { Cookie: document.cookie },
      });
      if (res.ok) {
        const json = await res.json() as { result?: { data?: { hasProfile?: boolean } } };
        if (json?.result?.data?.hasProfile === false) {
          throw redirect({ to: "/onboarding" });
        }
      }
      // If the fetch fails (e.g. API down), still allow — better than blocking all access
    }
  },
});
```

Wait, using direct fetch to tRPC with cookies is fragile. A cleaner approach: add a dedicated REST endpoint on the API for this check.

Better approach: add a simple REST endpoint `/api/profile/exists` to the Fastify server that returns `{ hasProfile: boolean }`. This avoids the complexity of calling tRPC from `beforeLoad`.

Actually, the simplest approach: just use the auth-client pattern to add a `checkProfile()` function, then call it from `beforeLoad`. Since `getSession()` already works in `beforeLoad`, we can do the same pattern.

Let me add to `auth-client.ts`:
```ts
export async function checkProfile(): Promise<boolean> {
  const { res, json } = await api("/profile/exists");
  if (!res.ok) return false;
  return (json as { hasProfile: boolean }).hasProfile;
}
```

Wait, that's a REST endpoint at `/api/auth/profile/exists` which doesn't make sense. Let me just add a small REST route in the API.

Actually, the cleanest approach for v1: add a simple REST endpoint in `index.ts`:

```ts
// In buildApp(), before the return:
app.get("/api/profile/exists", async (request, reply) => {
  // Re-use the session check from BetterAuth
  const headers = new Headers(
    Object.entries(request.headers).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const [row] = await db
    .select({ id: profile.id })
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1);
  return { hasProfile: row !== undefined };
});
```

This is clean and straightforward. Let me include this in the plan.

**Step 1: Add REST endpoint to API**

In `apps/api/src/index.ts`, inside `buildApp()`, add after the health check:

```ts
  // Profile exists check (for frontend route guard)
  import { eq } from "drizzle-orm";
  import { db } from "@workspace/db";
  import { profile } from "@workspace/db/schema";
  
  app.get("/api/profile/exists", async (request, reply) => {
    const headers = new Headers(
      Object.entries(request.headers).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const [row] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(eq(profile.userId, session.user.id))
      .limit(1);
    return { hasProfile: row !== undefined };
  });
```

Actually, this is getting messy importing drizzle directly in index.ts. Let me move this to a proper route. Let me just use the tRPC endpoint directly with a fetch wrapper.

Actually, let me think about this differently. The simplest approach that works:

1. In `auth-client.ts`, add a function that fetches the tRPC `profile.checkExists` endpoint
2. In `__root.tsx`, call this function in `beforeLoad`

But tRPC requests need a specific format (query params for queries, JSON body for mutations). Let me just add a simple REST endpoint.

Let me do it cleanly: add the REST endpoint in a separate file and register it.

OK, I'm overcomplicating this. The simplest approach is: use the tRPC `profile.checkExists` query from `beforeLoad` by making the raw http request that tRPC expects. tRPC queries use GET with `?input=` query parameter.

Actually, let me just simplify: add a REST endpoint in index.ts. The import of drizzle is fine — index.ts already imports BetterAuth which depends on drizzle.

Let me finalize the plan for this task with the REST endpoint approach.

**Updated Step 1: Add REST endpoint for profile check**

In `apps/api/src/index.ts`, in `buildApp()`, right before `return app;`:

```ts
  // ── Utility endpoint for frontend route guard ──────────────────────
  app.get("/api/profile/exists", async (request, reply) => {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (typeof v === "string") headers.set(k, v);
      }
      const session = await auth.api.getSession({ headers });
      if (!session) {
        return reply.status(401).send({ hasProfile: false });
      }
      const [row] = await db
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.userId, session.user.id))
        .limit(1);
      return { hasProfile: row !== undefined };
    } catch {
      return reply.status(500).send({ hasProfile: false });
    }
  });
```

Wait, `db` and `profile` and `eq` need to be imported. Let me just create a separate file for this.

OK, let me just keep it simpler and inline db import. The profile exists check is trivial.

**Step 2: Update __root.tsx**

```ts
export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    if (PUBLIC_SET.has(location.pathname)) return;

    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    // Redirect to onboarding if no profile (skip when already there)
    if (location.pathname !== "/onboarding") {
      try {
        const res = await fetch(`${getApiBase()}/api/profile/exists`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json() as { hasProfile: boolean };
          if (!data.hasProfile) {
            throw redirect({ to: "/onboarding" });
          }
        }
      } catch (err) {
        if (err && typeof err === "object" && "to" in err) throw err;
        // API error — allow through to avoid lockout
      }
    }
  },
});
```

Where `getApiBase()` is already in `auth-client.ts` — extract it or inline.

**Step 3: Run typecheck + verify**
```bash
cd ~/code/MyTuums && pnpm typecheck
```

**Step 4: Commit**
```bash
git add apps/api/src/index.ts apps/web/src/routes/__root.tsx
git commit -m "feat: add onboarding redirect gate to route guard"
```

---

### Task 5: Create profile page (`/@{username}`)

**Objective:** Public profile page showing display name, bio, avatar, banner, favorite games, and posts (placeholder). Handles 404 for non-existent profiles.

**Files:**
- Create: `apps/web/src/routes/@/$username.tsx`
- Modify: `apps/web/src/routeTree.gen.ts` (register route)

**Step 1: Create the profile route**

TanStack Router file-based routing: `/@:username` maps to either:
- File: `routes/@.tsx` (layout) + `routes/@/$username.tsx` (segment), OR
- Single file with path override

Use the directory approach (works on Linux/WSL):

```
apps/web/src/routes/@/
  $username.tsx
```

```tsx
// apps/web/src/routes/@/$username.tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/@/$username")({
  component: ProfilePage,
  loader: async ({ params }) => {
    try {
      // Use raw tRPC query call since loader isn't a React component
      const baseUrl = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "http://localhost:4000";
      const query = encodeURIComponent(JSON.stringify({ username: params.username }));
      const res = await fetch(`${baseUrl}/trpc/profile.getByUsername?input=${query}`);
      if (!res.ok) throw notFound();
      const json = await res.json() as { result?: { data?: Record<string, unknown> } };
      if (!json?.result?.data) throw notFound();
      return { profile: json.result.data };
    } catch (err) {
      if (err && typeof err === "object" && "statusCode" in err) throw err;
      throw notFound();
    }
  },
  notFoundComponent: () => (
    <div className="flex min-h-svh items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profile not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This user doesn't exist or their account has been removed.</p>
        </CardContent>
      </Card>
    </div>
  ),
});

function ProfilePage() {
  const { profile } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            @{profile.username}
          </CardTitle>
          {profile.displayName && (
            <p className="text-lg font-semibold">{profile.displayName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
          <div className="text-sm text-muted-foreground">
            {/* Placeholder for follower/following counts */}
            <p>Joined: coming soon</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Posts</h3>
            <p className="text-muted-foreground text-sm">Posts will appear here (coming in #5).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Wait, actually this won't work well. The `loader` approach for tRPC is messy. Let me use the React hook approach instead — call `trpc.profile.getByUsername.useQuery()` in the component. But I still need error handling for 404.

Let me use a wrapper component approach:

```tsx
function ProfilePage() {
  const { username } = Route.useParams();
  const query = trpc.profile.getByUsername.useQuery({ username });

  if (query.isLoading) return <ProfileSkeleton />;
  if (query.isError) {
    if (query.error?.data?.code === "NOT_FOUND") {
      return <ProfileNotFound />;
    }
    return <ProfileError message={query.error.message} />;
  }
  const profile = query.data;
  // ... render profile
}
```

This is simpler and more idiomatic. But the issue says "returns 404-style unavailable" — with this approach, it shows the not-found component but the HTTP status is still 200. Acceptable for v1.

**Step 2: Register in routeTree.gen.ts**

**Step 3: Run typecheck**
```bash
cd ~/code/MyTuums && pnpm --filter @workspace/web typecheck
```

**Step 4: Commit**
```bash
git add apps/web/src/routes/@/ apps/web/src/routeTree.gen.ts
git commit -m "feat: add public profile page at /@:username"
```

---

### Task 6: Full pipeline check + commit

**Objective:** Final typecheck, lint, build, and push.

```bash
cd ~/code/MyTuums
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

If all green:
```bash
git add -A
git commit -m "chore: finalize issue #4 onboarding + profiles"
git push
gh issue close 4 --comment "Complete. Onboarding flow, profile page, and route guard in place."
```

---

## Pitfalls

1. **TanStack Router `@` character in filenames** — the `/@/$username.tsx` directory structure uses `@` as a directory name. This works on Linux/WSL but test carefully. If Vite or the router reject it, fall back to a flat `$username.tsx` with a custom path in route config.

2. **tRPC in beforeLoad** — `beforeLoad` runs outside React, so hooks don't work. Use direct fetch to the REST endpoint `/api/profile/exists` added in Task 4.

3. **Username race condition** — handled by the unique index on `profile.username`. The `try/catch` on insert catches PostgreSQL error code `23505` (unique violation). No explicit SELECT-then-INSERT needed.

4. **Double profile creation** — the unique index on `profile.user_id` prevents this. The explicit check before insert catches it early with a nicer error message.

5. **CI `passWithNoTests`** — no test files exist yet for the profile router. The existing `passWithNoTests: true` in vitest config handles this. Don't remove it yet.

6. **Avatar/banner fields** — the profile table has `avatarMediaId` and `bannerMediaId` (FKs to media), but media upload is issue #6. Skip these fields in the onboarding form for now. The profile page can show them once media upload is built.

7. **Favorite games** — the `favorite_game` table exists but game catalog seeding is issue #12. Skip favorites in the onboarding form for now; mention as "coming soon" on the profile page.
