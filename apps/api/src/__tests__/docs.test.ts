import type { DocsArtifact } from "@workspace/docs-content";
import { describe, expect, it } from "vitest";
import type { AccountLifecycleSnapshot } from "../services/account-status/index.js";
import {
  createInMemoryDocsService,
  DocsPageNotFoundError,
} from "../services/docs/index.js";

const artifact: DocsArtifact = {
  version: 1,
  manifestPath: "docs/docs-manifest.json",
  build: {
    generatedAt: "2026-05-13T00:00:00.000Z",
    commitSha: "abc1234",
  },
  sections: [
    {
      id: "platform",
      title: "Platform",
      description: "Core documentation",
      pages: [
        {
          slug: "overview",
          title: "Overview",
          sourcePath: "CONTEXT.md",
          kind: "context",
          summary: "Platform overview",
          diagramIds: ["platform-map"],
        },
      ],
    },
  ],
  pages: [
    {
      slug: "overview",
      title: "Overview",
      sourcePath: "CONTEXT.md",
      kind: "context",
      summary: "Platform overview",
      sectionId: "platform",
      sectionTitle: "Platform",
      markdown: "# Overview\n\nProtected internal docs.",
      text: "Overview Protected internal docs.",
      headings: [{ id: "overview", text: "Overview", level: 1 }],
      links: [],
      diagrams: [
        {
          id: "platform-map",
          title: "Platform Map",
          sourcePath: "docs/diagrams/platform-map.tldr",
          description: "High-level tldraw map",
          snapshot: {
            document: {
              name: "platform-map",
            },
          },
        },
      ],
    },
  ],
  searchIndex: [
    {
      id: "platform-overview-root",
      pageSlug: "overview",
      pageTitle: "Overview",
      sectionId: "platform",
      sectionTitle: "Platform",
      headingId: "overview",
      headingText: "Overview",
      text: "Protected internal docs.",
    },
  ],
};

const activeAdmin: AccountLifecycleSnapshot = {
  status: "active",
  role: "admin",
  suspendedUntil: null,
  deletedAt: null,
};

function createViewer(
  overrides: Partial<{
    session: { user: { id: string; emailVerified?: boolean | null } } | null;
    account: AccountLifecycleSnapshot | null;
  }> = {},
) {
  return {
    session: { user: { id: "admin-1", emailVerified: true } },
    account: activeAdmin,
    ...overrides,
  };
}

describe("Docs service", () => {
  it("allows verified admin and owner viewers without profile onboarding to read docs", async () => {
    const service = createInMemoryDocsService(artifact);

    await expect(service.getNavigation(createViewer())).resolves.toEqual(artifact.sections);
    await expect(
      service.getPage(createViewer(), {
        sectionSlug: "platform",
        pageSlug: "overview",
      }),
    ).resolves.toEqual(artifact.pages[0]);

    await expect(
      service.getNavigation(
        createViewer({
          session: { user: { id: "owner-1", emailVerified: true } },
          account: { ...activeAdmin, role: "owner" },
        }),
      ),
    ).resolves.toEqual(artifact.sections);
  });

  it("denies docs reads for disallowed viewer states", async () => {
    const service = createInMemoryDocsService(artifact);

    const deniedCases = [
      {
        label: "logged out",
        viewer: createViewer({ session: null, account: null }),
        expectedKind: "unauthenticated",
      },
      {
        label: "unverified admin",
        viewer: createViewer({
          session: { user: { id: "admin-1", emailVerified: false } },
        }),
        expectedKind: "unverified_account",
      },
      {
        label: "standard user",
        viewer: createViewer({
          account: { ...activeAdmin, role: "user" },
        }),
        expectedKind: "forbidden_role",
      },
      {
        label: "moderator",
        viewer: createViewer({
          account: { ...activeAdmin, role: "moderator" },
        }),
        expectedKind: "forbidden_role",
      },
      {
        label: "suspended admin",
        viewer: createViewer({
          account: { ...activeAdmin, status: "suspended" },
        }),
        expectedKind: "inactive_account",
      },
      {
        label: "deleted owner",
        viewer: createViewer({
          account: { ...activeAdmin, role: "owner", status: "account_deleted" },
        }),
        expectedKind: "inactive_account",
      },
    ] as const;

    for (const deniedCase of deniedCases) {
      await expect(service.getNavigation(deniedCase.viewer)).rejects.toMatchObject({
        kind: deniedCase.expectedKind,
      });

      await expect(
        service.getPage(deniedCase.viewer, {
          sectionSlug: "platform",
          pageSlug: "overview",
        }),
      ).rejects.toMatchObject({
        kind: deniedCase.expectedKind,
      });
    }
  });

  it("returns not found when the section and page do not match the artifact", async () => {
    const service = createInMemoryDocsService(artifact);

    await expect(
      service.getPage(createViewer(), {
        sectionSlug: "platform",
        pageSlug: "missing-page",
      }),
    ).rejects.toBeInstanceOf(DocsPageNotFoundError);
  });
});
