# Documentation App Context

Read this document when working on the separate developer documentation web app, the docs-content build pipeline, docs authorization, docs search, or documentation rendering.

## Purpose

MyTuums has a separate read-only developer documentation app at `docs.mytuums.com`. It exists to present repo-versioned documentation as a first-class reading experience without leaking protected content into public static assets.

## Product Boundary

- The docs app is for MyTuums organization members only.
- In v1, organization membership is represented by verified active `admin` and `owner` accounts.
- `moderator` and `user` accounts are denied access.
- The docs app reuses the main web app's login, verification, and password-reset flows through return URLs.
- Docs access does not require social profile onboarding.
- All authorized docs users see the same documentation set; there are no per-section permissions in v1.

## Content Model

- Repo Markdown remains the canonical documentation source.
- Interactive diagrams use separate repo-versioned tldraw snapshots.
- Navigation is explicit manifest-driven navigation, not filesystem-driven navigation.
- URLs use stable semantic slugs owned by the docs manifest.
- Transient implementation plans are excluded from the docs app.
- Presentation belongs to the docs app; individual docs should not hand-author HTML/CSS.
- Rendering supports GitHub-flavored Markdown, callouts, fenced code blocks, heading anchors, and generated tables of contents.
- Raw HTML and Mermaid are not supported.
- The production docs app is read-only: no comments, in-app editing, diagram editing, export, or download.

## Delivery Model

- `apps/docs` is the protected reader shell.
- `packages/docs-content` owns manifest validation, content compilation, search-index generation, diagram validation, and provenance/build metadata.
- The API serves docs through authenticated tRPC reads for index, page content, search, and diagram snapshots.
- Protected docs content, titles, search metadata, and diagram metadata must not be bundled into publicly fetchable static assets.
- Docs validation is CI-blocking and must fail on manifest errors, bad slugs, broken links, and invalid diagram snapshots.

## Companion References

- `docs/prd/developer-documentation-app-prd.md`
- `docs/adr/0003-custom-developer-documentation-app.md`
- `DESIGN.md`
