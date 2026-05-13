# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a multi-context domain-doc layout.

Expected files:

- `CONTEXT-MAP.md` at the repo root
- `CONTEXT.md` at the repo root
- focused `CONTEXT.md` files under `docs/context/**/CONTEXT.md`
- `DESIGN.md` at the repo root for visual/UI decisions
- `docs/adr/` at the repo root

The repo may not have these files yet. If they do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. Producer workflows such as `grill-with-docs` can create them lazily when terms or decisions get resolved.

## Before Exploring

When using engineering skills such as `diagnose`, `tdd`, `improve-codebase-architecture`, or `zoom-out`:

1. Read `CONTEXT-MAP.md` if it exists to choose the right focused docs.
2. Read root `CONTEXT.md` for shared product vocabulary and platform context.
3. Read the relevant focused docs under `docs/context/**/CONTEXT.md` for the area you are about to change.
4. Read `DESIGN.md` when the work affects UI, theming, layout, or component composition.
5. Read relevant ADRs under `docs/adr/` if they exist.
6. Use the glossary's vocabulary when naming domain concepts in issues, tests, hypotheses, and refactor proposals.

## Use The Glossary's Vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md` or the relevant focused context doc. Do not drift to synonyms the documentation explicitly avoids.

If the concept needed is not in the glossary yet, that may indicate either:

- the work is inventing language the project does not use, or
- the glossary has a real gap that should be resolved with `grill-with-docs`.

## Flag ADR Conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
