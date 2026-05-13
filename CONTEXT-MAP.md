# MyTuums Context Map

This repo now uses a multi-context documentation layout. Start here, then read only the focused docs that match the area you are changing.

## Read Order

1. Read `CONTEXT.md` for the cross-cutting product model, shared vocabulary, and platform overview.
2. Read the focused context docs that match your work:
   - `docs/context/documentation-app/CONTEXT.md` for the developer documentation web app and docs-content pipeline.
   - `docs/context/legal/CONTEXT.md` for legal, launch-readiness, internationalization, privacy, and retention rules.
   - `docs/context/coding-practices/CONTEXT.md` for important coding practices, monorepo boundaries, and implementation guardrails.
   - `DESIGN.md` for the canonical visual system and UI theme rules.
3. Read relevant ADRs under `docs/adr/` before changing behavior that may conflict with prior decisions.

## Current Contexts

- `CONTEXT.md`: Cross-cutting product and platform overview for MyTuums v1.
- `docs/context/documentation-app/CONTEXT.md`: The separate read-only docs app, manifest/content pipeline, auth model, and delivery constraints.
- `docs/context/legal/CONTEXT.md`: France/EU-first launch posture, legal pages, i18n, privacy, retention, and launch-gating rules.
- `docs/context/coding-practices/CONTEXT.md`: Package boundaries, seam discipline, service/module rules, CI expectations, and design-system guardrails.
- `DESIGN.md`: The shipped ShadCN-based visual system that the product and docs app both follow.

## Planned Next Splits

These contexts are expected next, but are not separated yet:

- CI/CD
- Infrastructure
- Cybersecurity
