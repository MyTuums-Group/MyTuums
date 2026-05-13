import type { DocsArtifact } from "@workspace/docs-content";
import { describe, expect, it } from "vitest";
import type { AccountLifecycleSnapshot } from "../services/account-status/index.js";
import {
  createDocsService,
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
    ).resolves.toEqual({ page: artifact.pages[0], build: artifact.build });

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

      await expect(
        service.search(deniedCase.viewer, {
          query: "Protected",
        }),
      ).rejects.toMatchObject({
        kind: deniedCase.expectedKind,
      });
    }
  });

  it("searches generated docs index entries and returns stable slug targets", async () => {
    const service = createInMemoryDocsService({
      ...artifact,
      searchIndex: [
        ...artifact.searchIndex,
        {
          id: "platform-overview-heading",
          pageSlug: "overview",
          pageTitle: "Overview",
          sectionId: "platform",
          sectionTitle: "Platform",
          headingId: "deployment-safety",
          headingText: "Deployment Safety",
          text: "Release gates keep docs deploys safe for internal maintainers.",
        },
        {
          id: "platform-overview-body",
          pageSlug: "overview",
          pageTitle: "Overview",
          sectionId: "platform",
          sectionTitle: "Platform",
          headingId: "body-copy",
          headingText: "Body Copy",
          text: "Searchable body text mentions generated documentation search.",
        },
        {
          id: "platform-release-body",
          pageSlug: "release-notes",
          pageTitle: "Release Notes",
          sectionId: "platform",
          sectionTitle: "Platform",
          headingId: "body-copy",
          headingText: "Body Copy",
          text: "Overview appears here only as body text.",
        },
      ],
    });

    await expect(
      service.search(createViewer(), {
        query: "deployment safety",
      }),
    ).resolves.toEqual([
      {
        id: "platform-overview-heading",
        sectionSlug: "platform",
        sectionTitle: "Platform",
        pageSlug: "overview",
        pageTitle: "Overview",
        headingId: "deployment-safety",
        headingText: "Deployment Safety",
        excerpt: "Release gates keep docs deploys safe for internal maintainers.",
      },
    ]);

    await expect(
      service.search(createViewer(), {
        query: "platform",
        limit: 1,
      }),
    ).resolves.toMatchObject([
      {
        sectionSlug: "platform",
        pageSlug: "overview",
      },
    ]);

    await expect(
      service.search(createViewer(), {
        query: "overview",
        limit: 1,
      }),
    ).resolves.toMatchObject([
      {
        id: "platform-overview-root",
        pageSlug: "overview",
      },
    ]);

    await expect(
      service.search(createViewer(), {
        query: "generated documentation search",
      }),
    ).resolves.toMatchObject([
      {
        headingId: "body-copy",
      },
    ]);
  });

  it("does not read the search index before authorization succeeds", async () => {
    const service = createDocsService({
      readArtifact() {
        throw new Error("Search index leaked to unauthorized caller.");
      },
    });

    await expect(
      service.search(createViewer({ session: null, account: null }), {
        query: "Protected",
      }),
    ).rejects.toMatchObject({ kind: "unauthenticated" });
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
