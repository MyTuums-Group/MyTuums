# MyTuums Context Map

This repo uses a multi-context documentation layout. Start here, then read only the focused docs that match the area you are changing.

## Source Of Truth

- [docs/prd/v1-scope.md](docs/prd/v1-scope.md) is the entry point for the split authoritative v1 product and platform scope. The focused scope files own the complete feature boundary, domain vocabulary, invariants, route expectations, testing priorities, and launch gates.
- [docs/prd/v1-prd.md](docs/prd/v1-prd.md) is the compact PRD summary. It explains product intent, release posture, and how to consume the scope without repeating it.
- [CONTEXT.md](CONTEXT.md) is a legacy redirect to this map and the v1 scope.

When documents disagree, prefer the v1 scope set unless a later ADR explicitly overrides it.

## Read Order

1. Read this context map.
2. Read [docs/prd/v1-scope.md](docs/prd/v1-scope.md), then the linked focused scope files relevant to the change.
3. Read the focused context docs that match your work:
   - [docs/context/coding-practices/CONTEXT.md](docs/context/coding-practices/CONTEXT.md) for package boundaries, seam rules, CI expectations, and implementation guardrails.
   - [docs/context/documentation-app/CONTEXT.md](docs/context/documentation-app/CONTEXT.md) for the developer documentation web app and docs-content pipeline.
   - [docs/context/legal/CONTEXT.md](docs/context/legal/CONTEXT.md) for legal, launch-readiness, internationalization, privacy, and retention rules.
   - [DESIGN.md](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md) for the canonical visual system and UI theme rules.
4. Read relevant ADRs under `docs/adr/` before changing behavior that may conflict with prior decisions.
5. Read deployment docs under `docs/deployment/` when changing Azure, CI/CD, docs deployment, infrastructure, runtime secrets, or release flow.

## Current Contexts

- [docs/prd/v1-scope.md](docs/prd/v1-scope.md) and its focused scope files: Complete v1 scope and the primary source for product/domain rules.
- [docs/prd/v1-prd.md](docs/prd/v1-prd.md): Product intent, release posture, and PRD summary that points back to the scope.
- [docs/context/coding-practices/CONTEXT.md](docs/context/coding-practices/CONTEXT.md): Package boundaries, seam discipline, service/module rules, CI expectations, and design-system guardrails.
- [docs/context/documentation-app/CONTEXT.md](docs/context/documentation-app/CONTEXT.md): The separate read-only docs app, manifest/content pipeline, auth model, and delivery constraints.
- [docs/context/legal/CONTEXT.md](docs/context/legal/CONTEXT.md): France/EU-first launch posture, legal pages, i18n, privacy, retention, and launch-gating rules. Legal implementation remains tracked through GitHub Issues.
- [DESIGN.md](https://github.com/MyTuums-Group/MyTuums/blob/main/DESIGN.md): The shipped ShadCN-based visual system that the product and docs app both follow.
- [docs/deployment/azure.md](docs/deployment/azure.md): Azure resources, environments, release flow, and monitoring notes.
- [docs/deployment/developer-docs.md](docs/deployment/developer-docs.md): Deployment boundary for the protected developer docs app.

## Historical Notes

Implementation plans are not canonical documentation. Completed or obsolete plans should live in issue/PR history rather than `docs/`.
