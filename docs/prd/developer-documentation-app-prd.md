# Developer Documentation App PRD

## Problem Statement

MyTuums developer knowledge currently lives in repo Markdown files, ADRs, PRDs, agent docs, and future operational docs that are useful to maintainers but not organized as a first-class reading experience. Developers need a secure, searchable, visually coherent documentation app that exposes the canonical repo-versioned documentation without leaking protected content to public users or duplicating authentication, navigation, and styling decisions outside the product architecture.

The documentation app must serve organization members, not public MyTuums users. In v1, organization membership is represented by the existing `admin` and `owner` roles. Moderators are excluded because they may be trusted community moderators rather than MyTuums organization members.

## Solution

Build a separate read-only developer documentation app at `docs.mytuums.com`. The app uses the same visual identity as the main web app, reuses the existing API/BetterAuth session, and grants access only to verified active `admin` and `owner` accounts. The docs app does not implement its own login, registration, verification, or password-reset flows; it redirects to the main web app auth flows with return URLs.

Documentation remains canonical in the repo as Markdown and versioned tldraw snapshot files. A new docs-content package validates an explicit manifest, compiles the allowed docs into a generated artifact, builds a search index, validates internal links and diagram references, and fails CI on documentation breakage. The API serves only the generated artifact through authenticated tRPC procedures after an `admin` or `owner` authorization check. Protected document content, navigation metadata, search indexes, page titles, and diagram metadata must not be bundled into publicly fetchable static docs app assets.

The production docs app is read-only. It supports rich Markdown presentation, generated search, stable semantic slugs, compact build provenance, and read-only interactive tldraw diagrams. It does not support in-app editing, comments, feedback storage, per-section permissions, old artifact browsing, Wiki.js, Mermaid, raw HTML, or inclusion of implementation plans.

## User Stories

1. As a MyTuums organization member, I want to open `docs.mytuums.com`, so that I can read developer documentation in a dedicated app.
2. As a MyTuums organization member, I want the docs app to share the main web app's visual identity, so that internal tooling feels consistent with the product.
3. As a MyTuums organization member, I want to use my existing MyTuums session, so that I do not manage separate docs credentials.
4. As a logged-out visitor, I want to be redirected to the main login flow with a return URL, so that I can authenticate and land back on the requested docs page.
5. As an unverified organization member, I want to be sent through the main email verification flow, so that docs access still requires verified identity.
6. As a verified active admin, I want to access the developer documentation app even if I have not completed social profile onboarding, so that developer access is not blocked by consumer profile setup.
7. As the owner, I want to access all developer documentation, so that I can inspect product, infrastructure, and operational decisions.
8. As a moderator, I want to be denied access to developer documentation, so that community moderation access does not imply organization membership.
9. As a normal user, I want to see an access-denied screen instead of documentation, so that protected developer content remains private.
10. As an unauthorized user, I should not receive docs navigation, page titles, search indexes, or diagram metadata, so that document existence is not leaked.
11. As a suspended or account-deleted user, I want docs access blocked, so that inactive accounts cannot read protected documentation.
12. As a developer, I want all authorized docs users to see the same documentation set, so that docs access is simple and all-or-nothing.
13. As a developer, I want docs URLs to use stable semantic slugs, so that links remain useful when source files move.
14. As a developer, I want docs navigation to be manifest-driven, so that section order, titles, and inclusion are deliberate.
15. As a developer, I want `CONTEXT.md` included in the docs app, so that the product model is easy to browse.
16. As a developer, I want PRDs included in the docs app, so that product requirements are easy to find.
17. As a developer, I want ADRs included in the docs app, so that architectural decisions are visible alongside product docs.
18. As a developer, I want agent docs included in the docs app, so that agent workflows and repository conventions are discoverable.
19. As a developer, I want team conventions included in the docs app, so that shared engineering practices are visible.
20. As a developer, I want future codebase documentation included, so that module boundaries and system behavior can be documented.
21. As a developer, I want future CI/CD documentation included, so that build and release behavior is documented.
22. As a developer, I want future deployment documentation included, so that environment promotion is documented.
23. As a developer, I want future infrastructure documentation included, so that Azure and service dependencies are documented.
24. As a developer, I do not want `docs/plans/**` exposed in the docs app, so that transient implementation plans do not become canonical documentation.
25. As a developer, I want Markdown to remain the canonical docs format, so that docs stay reviewable in normal pull requests.
26. As a developer, I want the app to own presentation, so that individual docs do not hand-author HTML/CSS.
27. As a developer, I want GitHub-flavored Markdown support, so that tables, lists, links, and code blocks render naturally.
28. As a developer, I want callout support, so that important notes and warnings can be highlighted consistently.
29. As a developer, I want syntax-highlighted fenced code blocks, so that examples are readable.
30. As a developer, I want heading anchors and generated tables of contents, so that long docs are navigable.
31. As a security-conscious maintainer, I want raw HTML disabled in docs rendering, so that Markdown content cannot inject arbitrary markup.
32. As a maintainer, I want Mermaid excluded, so that tldraw remains the single interactive diagram path.
33. As a developer, I want full-text docs search, so that I can quickly find requirements, decisions, and conventions.
34. As a developer, I want search results to link to stable semantic slugs, so that search links remain durable.
35. As a developer, I want docs search to be separate from product user/game search, so that developer search does not affect social app search.
36. As a developer, I want the docs search index generated from the validated artifact, so that search matches deployed docs.
37. As a developer, I want interactive diagrams embedded in docs, so that architecture and flows can be understood visually.
38. As a developer, I want tldraw diagrams stored as separate repo-versioned snapshots, so that large diagram data does not clutter Markdown.
39. As a developer, I want Markdown to reference diagrams through manifest-backed metadata, so that diagram inclusion is explicit.
40. As a developer, I want diagrams treated as presentation assets, so that they do not become canonical sources of truth for code, data, or infrastructure schemas.
41. As a docs reader, I want to pan and zoom diagrams, so that large diagrams are readable.
42. As a docs reader, I want to fit diagrams to content or reset the view, so that I can recover from navigation.
43. As a docs reader, I want fullscreen diagram viewing, so that detailed diagrams are easier to inspect.
44. As an organization member, I do not want production diagram editing, so that docs remain repo-versioned and reviewable.
45. As a maintainer, I do not want production diagram export or download, so that read-only diagrams remain a reading surface rather than a content extraction feature.
46. As a developer, I want the docs app to show the currently deployed docs artifact only, so that docs match the deployed environment.
47. As a developer, I want build metadata visible, so that I can identify the environment, commit SHA, and build time behind the docs.
48. As a developer, I want page provenance visible, so that I can identify the source path for a docs page.
49. As a developer, I want detailed history to stay in Git, so that the docs app stays focused on reading current docs.
50. As a maintainer, I want docs validation to fail CI on broken references, so that broken docs do not deploy.
51. As a maintainer, I want duplicate or invalid slugs rejected, so that docs routing remains stable.
52. As a maintainer, I want missing source files rejected, so that manifest entries cannot silently break.
53. As a maintainer, I want missing or invalid tldraw snapshots rejected, so that diagrams do not fail at runtime.
54. As a maintainer, I want broken internal links rejected, so that readers do not hit dead links.
55. As a maintainer, I want search-index generation failures rejected, so that search does not silently degrade.
56. As an API maintainer, I want docs reads exposed through tRPC, so that docs access follows existing app API patterns.
57. As an API maintainer, I want the API to authorize every docs read, so that protected content is not exposed through static assets.
58. As a frontend maintainer, I want the docs shell deployed as a separate Azure Static Web App, so that the shell can be independently hosted at `docs.mytuums.com`.
59. As an operator, I want the API to serve docs content from a generated artifact, so that production does not depend on ad hoc filesystem reads.
60. As an operator, I want credentialed CORS to include the docs origin, so that the docs app can call the API with the existing session.
61. As a maintainer, I want no in-app comments or feedback storage, so that docs feedback stays in issues, PRs, and repo changes.
62. As a maintainer, I want no separate Wiki.js deployment, so that auth, visual identity, content validation, and tldraw integration remain inside the MyTuums architecture.

## Implementation Decisions

- Build a separate `apps/docs` React/Vite/TanStack Router app for developer documentation.
- Deploy the docs app shell as a separate Azure Static Web App at `docs.mytuums.com`.
- Reuse the main web app's visual identity through the existing ShadCN-based shared UI and theme conventions.
- Reuse the existing API/BetterAuth session; do not add a separate docs authentication system.
- Reuse main login, verification, and password-reset flows through return URLs.
- Require a verified active `admin` or `owner` account for docs access.
- Do not require social profile onboarding for docs access.
- Treat all admins as MyTuums organization members. Do not support support-only admins who can administer the product but cannot read developer documentation.
- Exclude moderators from docs access.
- Make docs access all-or-nothing for all authorized docs users. Do not support per-section documentation permissions.
- Do not send docs navigation, search index, page titles, or diagram metadata to unauthorized users.
- Use API-mediated reads for all protected docs content.
- Expose docs reads through authenticated tRPC procedures for index/navigation, page content, search, and diagram snapshots.
- Keep the docs shell free of protected Markdown, document metadata, search content, and diagram snapshot data.
- Add a dedicated `packages/docs-content` package that owns manifest validation, generated content artifacts, diagram validation, and search index generation.
- Have the API serve only the generated docs-content artifact rather than reading Markdown and diagram files ad hoc from the production filesystem.
- Use an explicit manifest for documentation navigation and inclusion. Do not derive navigation from filesystem order.
- Use manifest-owned stable semantic slugs rather than source file paths.
- Include `CONTEXT.md`, PRDs, ADRs, agent docs, team conventions, and future codebase, CI/CD, deployment, and infrastructure docs.
- Exclude `docs/plans/**` entirely from the docs app.
- Keep Markdown as the canonical documentation source.
- Keep page presentation centralized in the docs app rather than hand-authored HTML/CSS inside documentation files.
- Support GitHub-flavored Markdown, callouts, syntax-highlighted fenced code blocks, heading anchors, and generated tables of contents.
- Disable raw HTML in Markdown rendering.
- Do not support Mermaid. Use tldraw for interactive visual diagrams.
- Store diagrams as separate repo-versioned tldraw snapshot files referenced by Markdown and manifest metadata.
- Treat diagram artifacts as documentation/presentation assets, not canonical sources of truth for code, data, or infrastructure schemas.
- Provide read-only tldraw diagram viewing in production only.
- Allow diagram pan, zoom, fit-to-content/reset view, and fullscreen viewing.
- Do not allow production diagram editing, persistence, copy/paste mutation, export, or download.
- Build a generated docs search index from manifest-listed docs content.
- Keep docs search separate from product user/game search.
- Show only the currently deployed docs-content artifact for each environment.
- Include compact provenance for authorized users: source path, environment, commit SHA, and build time.
- Leave detailed history and old versions in Git rather than adding an in-app version browser.
- Make docs validation CI-blocking.
- Reject manifest errors, missing files, duplicate slugs, invalid slugs, broken internal links, missing diagram files, invalid diagram snapshots, and search-index generation failures.
- Do not add in-app docs comments, feedback storage, or discussion features.
- Capture the custom docs app decision in ADR 0003.

### Major Modules

- **Docs content package**: a deep module that exposes a small generated-content interface while hiding manifest parsing, source-file validation, slug validation, link validation, diagram validation, search indexing, and build metadata generation.
- **Docs authorization policy**: a narrow server-side policy that determines whether the current viewer has developer documentation access from session, role, verification, and account status.
- **Docs API router**: authenticated tRPC procedures for docs index, page reads, search, and diagram snapshots, all guarded by docs authorization.
- **Docs web app shell**: a protected reader experience that handles auth redirects, access denied states, docs navigation, page rendering, search UI, provenance display, and diagram embeds.
- **Markdown renderer**: a constrained rendering module for GFM, callouts, code highlighting, heading anchors, and generated tables of contents with raw HTML disabled.
- **Read-only diagram viewer**: a tldraw viewer wrapper that supports only approved read interactions and never persists production mutations.
- **Docs deployment configuration**: environment and CI/CD wiring for the docs Static Web App, API trusted origins/CORS, and docs-content build steps.

## Testing Decisions

- Tests should assert external behavior and security boundaries rather than implementation details.
- Docs authorization tests should cover logged-out, unverified, suspended, account-deleted, `user`, `moderator`, `admin`, and `owner` viewers.
- API tests should verify unauthorized callers receive no docs content, navigation metadata, search index, page titles, or diagram metadata.
- API tests should verify authorized admins and owner can fetch index, pages, search results, and diagram snapshots.
- Docs-content tests should validate manifest inclusion, duplicate slug rejection, invalid slug rejection, missing file rejection, excluded plans, broken internal link rejection, missing diagram rejection, invalid diagram snapshot rejection, and search index generation.
- Markdown renderer tests should verify GFM rendering, callouts, code blocks, heading anchors, table of contents generation, raw HTML suppression, and lack of Mermaid support.
- Search tests should verify title, section, heading, and body matching against generated docs content and stable slug results.
- Diagram viewer tests should verify read-only behavior at the component boundary: pan/zoom/fullscreen controls are available and editing/export/persistence controls are unavailable.
- Docs app route tests should verify logged-out users redirect to main login with return URL, unverified users go through verification, unauthorized active users see access denied, and authorized users see docs chrome.
- Build/CI tests should run through normal package scripts so docs validation failures block the same quality gate as typecheck/build.
- Prior art in the repo includes root guard tests for auth-driven navigation, authorization tests for role and visibility behavior, and service tests for isolated policy modules.

## Out of Scope

- Wiki.js or any standalone wiki product.
- Docusaurus, Nextra, GitHub Wiki, or a static bundled docs site as the primary docs architecture.
- Public documentation access.
- Moderator access to developer documentation.
- Per-section documentation permissions.
- Separate docs authentication, registration, verification, or password-reset flows.
- Requiring social profile onboarding before docs access.
- Bundling protected Markdown, page metadata, search indexes, or diagram snapshots into public static assets.
- In-app editing of Markdown or diagrams.
- Production tldraw editing, persistence, export, or download.
- Raw HTML in Markdown.
- Mermaid diagrams.
- MDX.
- Hand-authored HTML/CSS documentation pages as canonical source.
- Inclusion of `docs/plans/**`.
- In-app comments, reactions, annotations, or feedback storage.
- In-app old-version or commit browsing.
- Product user/game search integration.
- Recent searches, search analytics, or docs usage analytics.

## Further Notes

The docs app exists for developers and maintainers, but v1 deliberately uses `admin` and `owner` roles as the enforcement proxy for MyTuums organization membership. This coupling is acceptable because all admins are organization members by product rule.

The most important security constraint is that the docs app shell may be public as a static app, but protected docs content must only be returned by the API after authorization. A client-side route guard alone is not sufficient because static bundles are publicly fetchable.

The docs-content package should be treated as a deep module. Its public interface should remain small, while the implementation owns validation, normalization, artifact generation, and search indexing. This keeps the docs API simple and makes documentation correctness testable before deployment.

ADR 0003 records the architectural decision to build a custom developer documentation app because the decision creates durable boundaries across app structure, content generation, authorization, deployment, and diagram rendering.
