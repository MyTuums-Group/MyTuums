# Finish Issue #4 Non-Deferred Scope Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix the parts of issue #4 that were marked/claimed as built but are not actually correct, while keeping explicitly deferred issue work deferred.

**Architecture:** Keep the existing split: Better Auth owns account registration/session/email verification; MyTuums `profile` service owns profile/onboarding identity. Registration must not collect profile fields. Onboarding must be the only place that creates a MyTuums profile username. Route/auth guards must reliably send authenticated profileless users to onboarding and allow public profile previews where required.

**Tech Stack:** React + TanStack Router, tRPC, Fastify, Better Auth, Drizzle/PostgreSQL, Vitest, pnpm/Turbo.

---

## Current Context

Issue #4 says onboarding/profiles were built. Some explicitly deferred work should remain deferred:

- Keep deferred: avatar/banner upload (#6)
- Keep deferred: favorite games onboarding (#12)
- Keep deferred: follower/following counts (#9)
- Keep deferred: blocked visibility follow-up work if it belongs to #9
- Keep deferred: full profile post list if it belongs to the posts issue (#5)

Non-deferred problems discussed in this session:

1. Registration collected `Display name`, which is misleading because profile identity should be chosen during onboarding.
2. Registration should either:
   - collect no profile identity and let onboarding choose username, or
   - collect a unique username immediately.
   We chose the first path: collect no profile identity at registration.
3. After registration, onboarding not appearing immediately is normal because email verification is required.
4. After verified sign-in, a profileless user should be redirected to onboarding. If this does not happen, it is a bug.
5. The public profile route was claimed as `/@{username}`, but implementation currently uses `/@/$username`, which yields `/@/alice` instead of `/@alice`.
6. Logged-out profile preview was claimed, but root auth guard currently redirects unauthenticated users to `/login` for all non-public paths, so public profile previews cannot work.
7. The current `/api/profile/exists` failure behavior can silently allow profileless users through if the profile check returns non-OK or fails.

Existing local changes already made in this session:

- `apps/web/src/routes/register.tsx`
  - removed the display-name field
  - Better Auth `name` now uses `email` internally
- `apps/web/src/routes/register.test.ts`
  - regression test for removing misleading registration display-name field

Do not revert unrelated working tree changes owned by the user.

---

## Non-Goals

Do not implement the deferred items in this plan:

- No avatar/banner upload flow.
- No favorite-game selector.
- No follower/following count implementation unless already needed to avoid broken placeholders.
- No profile post pagination unless it is already part of a separate active issue.
- No block-management UI.

This plan fixes only the non-deferred claims that are broken or misleading.

---

## Acceptance Criteria

- Registration form collects only email, password, and age confirmation.
- Registration does not collect display name or username.
- Better Auth still receives a required `name` value internally without exposing it as profile identity.
- After email verification/sign-in, authenticated users without a profile reliably land on `/onboarding`.
- `/onboarding` remains accessible for authenticated profileless users.
- Authenticated users who already have a profile are not sent to onboarding.
- Public profile route uses `/@alice`, not `/@/alice`.
- Logged-out visitors can access public profile URLs instead of being redirected to login.
- Non-existent profiles still render the profile-not-found state.
- Tests cover the above non-deferred behavior.

---

## Task 1: Keep registration identity regression locked in

**Objective:** Preserve the registration behavior already fixed in this session.

**Files:**
- Modify/verify: `apps/web/src/routes/register.tsx`
- Test: `apps/web/src/routes/register.test.ts`

**Steps:**

1. Inspect `apps/web/src/routes/register.tsx`.
2. Confirm no user-facing field has:
   - label `Display name`
   - `name="name"`
   - `id="name"`
3. Confirm `signUpEmail` receives:

```ts
name: email,
```

4. Run:

```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
pnpm exec vitest run apps/web/src/routes/register.test.ts
```

Expected: PASS.

5. If the test fails, fix only registration identity behavior. Do not add username collection unless product direction changes.

---

## Task 2: Extract root auth/onboarding guard logic into a testable function

**Objective:** Make the root route redirect behavior testable without browser E2E setup.

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/routes/__root.test.ts`

**Design:**

The current guard is embedded directly in `beforeLoad`, making it hard to test. Extract the decision logic into a small exported function that receives dependencies.

Suggested shape:

```ts
export type RootGuardSession = Awaited<ReturnType<typeof getSession>>;

export type RootGuardDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: "/" | "/login" | "/onboarding" };

export async function decideRootNavigation(input: {
  pathname: string;
  session: RootGuardSession;
  hasProfile: null | (() => Promise<boolean>);
}): Promise<RootGuardDecision> {
  // Move existing PUBLIC/GUEST/protected/profileless rules here.
}
```

Then `beforeLoad` becomes a thin adapter:

```ts
const decision = await decideRootNavigation({
  pathname: location.pathname,
  session,
  hasProfile: session
    ? async () => {
        const res = await fetch(`${getApiBase()}/api/profile/exists`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Profile check failed: ${res.status}`);
        const data = (await res.json()) as { hasProfile: boolean };
        return data.hasProfile;
      }
    : null,
});

if (decision.kind === "redirect") {
  throw redirect({ to: decision.to });
}
```

**Important:** This task should extract behavior without changing intended behavior yet, except where tests in later tasks require it.

**Test-first steps:**

1. Create `apps/web/src/routes/__root.test.ts` with a minimal smoke test for existing behavior:

```ts
import { describe, expect, it } from "vitest";
import { decideRootNavigation } from "./__root";

const session = {
  user: {
    id: "user-1",
    email: "a@example.com",
    name: "a@example.com",
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: "2026-02-01T00:00:00.000Z",
    token: "token",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("decideRootNavigation", () => {
  it("allows guest-only routes for logged-out users", async () => {
    await expect(
      decideRootNavigation({ pathname: "/login", session: null, hasProfile: null }),
    ).resolves.toEqual({ kind: "allow" });
  });
});
```

2. Run the test and expect failure because `decideRootNavigation` does not exist yet:

```bash
pnpm exec vitest run apps/web/src/routes/__root.test.ts
```

3. Extract the function minimally.
4. Re-run and expect PASS.

---

## Task 3: Make profileless authenticated users reliably redirect to onboarding

**Objective:** Fix the post-verification/profileless-user path.

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Test: `apps/web/src/routes/__root.test.ts`

**Behavior:**

- Authenticated + no profile + path `/` => redirect `/onboarding`.
- Authenticated + no profile + path `/onboarding` => allow.
- Authenticated + has profile + path `/` => allow.

**Test-first steps:**

Add tests:

```ts
it("redirects authenticated profileless users to onboarding", async () => {
  await expect(
    decideRootNavigation({
      pathname: "/",
      session,
      hasProfile: async () => false,
    }),
  ).resolves.toEqual({ kind: "redirect", to: "/onboarding" });
});

it("allows authenticated profileless users to stay on onboarding", async () => {
  await expect(
    decideRootNavigation({
      pathname: "/onboarding",
      session,
      hasProfile: async () => false,
    }),
  ).resolves.toEqual({ kind: "allow" });
});

it("allows authenticated users with profiles to reach the home page", async () => {
  await expect(
    decideRootNavigation({
      pathname: "/",
      session,
      hasProfile: async () => true,
    }),
  ).resolves.toEqual({ kind: "allow" });
});
```

Run:

```bash
pnpm exec vitest run apps/web/src/routes/__root.test.ts
```

Expected before fix: at least one failure if current behavior is not extracted or robust.

**Implementation detail:**

Do not silently allow profileless users through if the profile check fails while a session exists. Prefer a clear fail state over bypassing onboarding. Minimal safe option:

```ts
if (input.session && input.pathname !== "/onboarding") {
  if (!input.hasProfile) throw new Error("Profile check dependency missing.");
  const exists = await input.hasProfile();
  if (!exists) return { kind: "redirect", to: "/onboarding" };
}
```

In `beforeLoad`, if the fetch fails, let the error surface or redirect to onboarding conservatively. Do not silently allow access to `/`.

Recommended conservative behavior:

```ts
try {
  // fetch profile exists
} catch {
  return false;
}
```

That sends authenticated users to onboarding if the profile check cannot prove a profile exists.

---

## Task 4: Fix email verification callback target to align with onboarding

**Objective:** Ensure verification lands somewhere that triggers onboarding for profileless users.

**Files:**
- Modify: `apps/api/src/auth.ts`
- Optional test: create or extend an API unit test if there is an easy pure seam

**Current code:**

```ts
verificationUrl.searchParams.set("callbackURL", env.WEB_APP_URL);
```

**Preferred behavior:**

Keep callback to the app root (`env.WEB_APP_URL`) if the root guard is reliable. Do not hardcode `/onboarding` unless Better Auth session cookie is definitely established before redirecting to the web app.

Why root is preferred:

- Existing users with profiles should land on `/`, not onboarding.
- New profileless verified users will be redirected by the root guard to onboarding.

**Action:**

1. Verify `env.WEB_APP_URL` points to the frontend origin, e.g. `http://localhost:5173`.
2. Do not change this unless manual verification shows Better Auth redirects somewhere else.
3. If the callback currently returns to `/verify-email` or another guest route in practice, change callback to `${env.WEB_APP_URL}/` explicitly:

```ts
verificationUrl.searchParams.set("callbackURL", new URL("/", env.WEB_APP_URL).toString());
```

**Verification:**

Manual local flow after implementation:

1. Register a new account.
2. Confirm the app shows `/verify-email`.
3. Open the verification email link from Mailpit or local email tooling.
4. Confirm final browser URL becomes `/onboarding` for the new account.
5. Confirm session exists in browser storage/cookies and `/api/auth/get-session` returns a user.

---

## Task 5: Fix public profile route path from `/@/alice` to `/@alice`

**Objective:** Implement the issue #4 claimed public profile URL shape.

**Files:**
- Rename/create: `apps/web/src/routes/@{$username}.tsx`
- Remove or empty old route: `apps/web/src/routes/@/$username.tsx`
- Modify: `apps/web/src/routeTree.gen.ts`
- Test: add route/source test, e.g. `apps/web/src/routes/profile-route.test.ts`

**Important project convention:**

TanStack Router prefix params:

- `/@{$username}` => `/@alice`
- `/@/$username` => `/@/alice`

Use `/@{$username}` for MyTuums profile URLs.

**Test-first steps:**

Create a source-level regression test if route generation is not easy in unit tests:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routeTree = readFileSync("apps/web/src/routeTree.gen.ts", "utf8");

describe("profile route shape", () => {
  it("uses /@{username} style profile URLs", () => {
    expect(routeTree).toContain("/@{$username}");
    expect(routeTree).not.toContain("/@/$username");
  });
});
```

Run and expect FAIL before changing route tree.

**Implementation steps:**

1. Move current page implementation from:

```text
apps/web/src/routes/@/$username.tsx
```

to:

```text
apps/web/src/routes/@{$username}.tsx
```

2. Update route declaration inside the file:

```ts
export const Route = createFileRoute("/@{$username}")({
  component: ProfilePage,
});
```

3. Update `apps/web/src/routeTree.gen.ts` manually to reflect the route, because this project convention says new routes need manual route tree updates.

4. Ensure old `/@/$username` route is removed from the generated tree.

5. Because `rm` is blocked in this environment, do not use `rm`. Use patch/write_file if needed. If a stale file must be removed, use an allowed file-management tool or leave a note for human deletion if the environment blocks deletion.

**Verification:**

```bash
pnpm exec vitest run apps/web/src/routes/profile-route.test.ts
pnpm --filter web typecheck
```

Expected: PASS.

---

## Task 6: Allow logged-out public profile previews

**Objective:** Make public profile routes accessible without a session.

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Test: `apps/web/src/routes/__root.test.ts`

**Behavior:**

- Logged-out + path `/@alice` => allow.
- Logged-out + path `/` => redirect `/login`.
- Logged-out + path `/onboarding` => redirect `/login`.

**Test-first steps:**

Add tests:

```ts
it("allows logged-out users to view public profile pages", async () => {
  await expect(
    decideRootNavigation({ pathname: "/@alice", session: null, hasProfile: null }),
  ).resolves.toEqual({ kind: "allow" });
});

it("still redirects logged-out users away from protected home", async () => {
  await expect(
    decideRootNavigation({ pathname: "/", session: null, hasProfile: null }),
  ).resolves.toEqual({ kind: "redirect", to: "/login" });
});
```

Run and expect FAIL before implementation.

**Implementation:**

Add a helper:

```ts
function isPublicProfilePath(pathname: string): boolean {
  return /^\/@[a-z][a-z0-9_]{2,19}$/.test(pathname);
}
```

Then allow it before the unauthenticated redirect:

```ts
if (PUBLIC_SET.has(pathname) || isPublicProfilePath(pathname)) {
  return { kind: "allow" };
}
```

Be careful: if the user is authenticated but profileless and tries to view someone else’s profile, product may want onboarding first. For v1, prefer onboarding first for authenticated profileless users unless product says otherwise. That means public profile allowance should be for logged-out users, or the profileless redirect should run for authenticated users.

Suggested order:

1. Static public path allow.
2. Get session.
3. If logged-out and public profile path: allow.
4. Guest-only logic.
5. Logged-out protected redirect.
6. Authenticated profileless redirect.

---

## Task 7: Ensure profile not found still works on public route

**Objective:** Preserve 404-style unavailable behavior after route path changes and public access changes.

**Files:**
- Modify if needed: `apps/web/src/routes/@{$username}.tsx`
- Test source-level or component-level if test setup permits

**Current behavior:**

The profile page handles `query.error.data.code === "NOT_FOUND"` and renders `ProfileNotFound`.

**Steps:**

1. Confirm the moved `/@{$username}` route keeps:

```ts
if (code === "NOT_FOUND") return <ProfileNotFound />;
```

2. Confirm `trpc.profile.getByUsername` is still a public procedure.
3. Confirm no root guard redirects logged-out `/@alice` before the profile page loads.
4. If adding a source-level regression test, assert `@{$username}.tsx` contains `NOT_FOUND` handling and uses `public` query path only through `trpc.profile.getByUsername`.

**Verification:**

```bash
pnpm --filter web typecheck
pnpm test
```

---

## Task 8: Reconcile issue #4 status without reopening deferred work

**Objective:** Make tracking honest without pulling deferred work back into this issue.

**Files/Systems:**
- GitHub issue #4 via `gh`
- Optional docs/plans update

**Steps:**

1. Comment on issue #4 with a precise correction:
   - Registration no longer collects misleading display name.
   - Onboarding is expected after verification/sign-in, not immediately after registration submit.
   - Public profile route fixed to `/@{username}` if Task 5 is complete.
   - Logged-out profile preview fixed if Task 6 is complete.
   - Deferred items remain deferred to their issues.
2. Do not claim avatar/banner/favorites/follower counts/posts are complete.
3. If issue #4 is reopened, scope it to only the non-deferred broken claims. Otherwise create a follow-up issue named something like:

```text
Finish non-deferred onboarding/profile route behavior from #4
```

**Suggested issue/comment wording:**

```markdown
Correction to prior completion note: deferred work remains deferred (#5/#6/#9/#12), but a few non-deferred built claims needed fixes:

- registration no longer asks for display name; profile identity is chosen in onboarding
- verified profileless users are redirected to onboarding
- public profile route uses /@{username}, e.g. /@alice
- logged-out profile preview routes are public

Deferred items remain out of this scope: avatar/banner uploads, favorite games, follower counts, and profile post pagination.
```

---

## Task 9: Run final verification

**Objective:** Prove the implementation is safe and complete.

**Commands:**

```bash
export PATH="$HOME/.local/share/pnpm:$PATH"
pnpm exec vitest run apps/web/src/routes/register.test.ts
pnpm exec vitest run apps/web/src/routes/__root.test.ts
pnpm test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

Expected:

- All tests pass.
- Typecheck passes.
- Lint passes.
- Build passes.

If build fails due to unrelated pre-existing working-tree changes, record exact failure and isolate whether it is caused by this plan’s files.

---

## Risks and Tradeoffs

1. **Better Auth session cookie after verification may still not be visible to the web app.**
   - If so, root guard cannot redirect because it sees no session.
   - Need browser/auth debugging with cookie domain/origin/trusted origins.

2. **Manual route tree editing is fragile.**
   - Project convention says TanStack route tree needs manual updates.
   - Add tests to prevent `/@/$username` regressions.

3. **Profile check failure behavior can create lockout vs bypass tradeoff.**
   - Current behavior bypasses onboarding on profile-check failure.
   - Recommended behavior is conservative redirect to onboarding for authenticated users when profile existence cannot be proven.

4. **Public profile route regex may reject future valid usernames if username policy changes.**
   - Keep regex aligned with `profile.policy.ts` username rules.

5. **Existing unrelated dirty working tree.**
   - Do not overwrite unrelated changes.
   - Before implementation, inspect `git status --short` and avoid broad formatters.

---

## Commit Plan

Use small commits if/when implementing:

1. `test: lock registration identity behavior`
2. `fix: remove profile identity from registration`
3. `test: cover root onboarding guard decisions`
4. `fix: redirect profileless users to onboarding reliably`
5. `fix: use compact public profile route`
6. `fix: allow logged-out public profile previews`
7. `chore: document issue 4 non-deferred completion`

Do not commit unless the user asks or the workflow requires it.
