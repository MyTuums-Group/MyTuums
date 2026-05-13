import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDocsContent,
  DocsContentValidationError,
  isEligibleDocsSource,
  validateDocsManifest,
} from "./index.js";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0, tempDirectories.length).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("docs-content", () => {
  it("validates semantic slugs and duplicate manifest entries", () => {
    expect(() =>
      validateDocsManifest({
        version: 1,
        sections: [
          {
            id: "orientation",
            title: "Orientation",
            pages: [
              {
                slug: "Orientation/Bad",
                title: "Bad slug",
                sourcePath: "CONTEXT.md",
                kind: "context",
              },
              {
                slug: "Orientation/Bad",
                title: "Duplicate slug",
                sourcePath: "docs/context/legal/CONTEXT.md",
                kind: "context",
              },
            ],
          },
        ],
      }),
    ).toThrow(DocsContentValidationError);
  });

  it("accepts the allowed docs source categories and rejects plans", () => {
    expect(isEligibleDocsSource("context", "CONTEXT.md")).toBe(true);
    expect(isEligibleDocsSource("prd", "docs/prd/v1-prd.md")).toBe(true);
    expect(isEligibleDocsSource("adr", "docs/adr/0003-custom-developer-documentation-app.md")).toBe(
      true,
    );
    expect(isEligibleDocsSource("agent-doc", "docs/agents/issue-tracker.md")).toBe(true);
    expect(isEligibleDocsSource("team-convention", "docs/team-conventions.md")).toBe(true);
    expect(isEligibleDocsSource("codebase-doc", "docs/codebase/api/CONTEXT.md")).toBe(true);
    expect(isEligibleDocsSource("ci-cd-doc", "docs/ci-cd/release.md")).toBe(true);
    expect(isEligibleDocsSource("deployment-doc", "docs/deployment/prod.md")).toBe(true);
    expect(isEligibleDocsSource("infrastructure-doc", "docs/infrastructure/azure.md")).toBe(true);
    expect(isEligibleDocsSource("context", "docs/plans/2026-05-13-plan.md")).toBe(false);
  });

  it("builds a generated artifact with navigation, page content, and search entries", async () => {
    const repoRoot = await createTempRepo({
      "CONTEXT.md": [
        "# Context",
        "",
        "See [Scope](docs/prd/v1-prd.md#solution).",
        "",
        "## Product",
        "",
        "MyTuums is a social app.",
      ].join("\n"),
      "docs/prd/v1-prd.md": [
        "# Product Requirements",
        "",
        "## Solution",
        "",
        "Ship the docs content package.",
      ].join("\n"),
      "docs/team-conventions.md": [
        "# Team Conventions",
        "",
        "## Merge Policy",
        "",
        "All CI checks must pass.",
      ].join("\n"),
      "docs/docs-manifest.json": JSON.stringify(
        {
          version: 1,
          sections: [
            {
              id: "orientation",
              title: "Orientation",
              pages: [
                {
                  slug: "orientation/context",
                  title: "Context",
                  sourcePath: "CONTEXT.md",
                  kind: "context",
                },
                {
                  slug: "orientation/team-conventions",
                  title: "Team Conventions",
                  sourcePath: "docs/team-conventions.md",
                  kind: "team-convention",
                },
              ],
            },
            {
              id: "requirements",
              title: "Requirements",
              pages: [
                {
                  slug: "requirements/product-requirements",
                  title: "Product Requirements",
                  sourcePath: "docs/prd/v1-prd.md",
                  kind: "prd",
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
    });

    const result = await buildDocsContent({
      rootDir: repoRoot,
      outputPath: "packages/docs-content/dist/generated/docs-content.json",
      generatedAt: "2026-05-13T00:00:00.000Z",
      commitSha: "deadbeef",
    });

    expect(result.artifact.sections).toHaveLength(2);
    expect(result.artifact.pages.map((page) => page.slug)).toEqual([
      "orientation/context",
      "orientation/team-conventions",
      "requirements/product-requirements",
    ]);
    expect(result.artifact.pages[0]?.links).toEqual([
      {
        text: "Scope",
        href: "docs/prd/v1-prd.md#solution",
        kind: "internal",
        targetSlug: "requirements/product-requirements",
        targetAnchorId: "solution",
        targetSourcePath: "docs/prd/v1-prd.md",
      },
    ]);
    expect(result.artifact.searchIndex.map((entry) => entry.pageSlug)).toEqual(
      expect.arrayContaining([
        "orientation/context",
        "orientation/team-conventions",
        "requirements/product-requirements",
      ]),
    );
    expect(
      result.artifact.searchIndex.every((entry) =>
        result.artifact.pages.some((page) => page.slug === entry.pageSlug),
      ),
    ).toBe(true);
    const contextPageEntry = result.artifact.searchIndex.find(
      (entry) => entry.id === "page:orientation/context",
    );
    expect(contextPageEntry?.pageTitle).toBe("Context");
    expect(contextPageEntry?.sectionTitle).toBe("Orientation");
    expect(contextPageEntry?.headingId).toBeNull();
    expect(contextPageEntry?.text).toContain("MyTuums is a social app.");

    const conventionsHeadingEntry = result.artifact.searchIndex.find(
      (entry) => entry.pageSlug === "orientation/team-conventions" && entry.headingId === "merge-policy",
    );
    expect(conventionsHeadingEntry?.headingText).toBe("Merge Policy");
    expect(conventionsHeadingEntry?.text).toContain("All CI checks must pass.");

    const requirementsHeadingEntry = result.artifact.searchIndex.find(
      (entry) => entry.pageSlug === "requirements/product-requirements" && entry.headingId === "solution",
    );
    expect(requirementsHeadingEntry?.headingText).toBe("Solution");
    expect(requirementsHeadingEntry?.text).toContain("Ship the docs content package.");
  });

  it("fails when a manifest source file is missing", async () => {
    const repoRoot = await createTempRepo({
      "docs/docs-manifest.json": JSON.stringify(
        {
          version: 1,
          sections: [
            {
              id: "orientation",
              title: "Orientation",
              pages: [
                {
                  slug: "orientation/context",
                  title: "Context",
                  sourcePath: "CONTEXT.md",
                  kind: "context",
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
    });

    await expect(
      buildDocsContent({
        rootDir: repoRoot,
      }),
    ).rejects.toThrow(/Source file "CONTEXT.md" does not exist\./u);
  });

  it("fails on broken internal links", async () => {
    const repoRoot = await createTempRepo({
      "CONTEXT.md": "# Context\n\nSee [Scope](docs/prd/v1-prd.md#missing).",
      "docs/prd/v1-prd.md": "# Product Requirements\n\n## Solution\n\nShip it.",
      "docs/docs-manifest.json": JSON.stringify(
        {
          version: 1,
          sections: [
            {
              id: "orientation",
              title: "Orientation",
              pages: [
                {
                  slug: "orientation/context",
                  title: "Context",
                  sourcePath: "CONTEXT.md",
                  kind: "context",
                },
                {
                  slug: "requirements/product-requirements",
                  title: "Product Requirements",
                  sourcePath: "docs/prd/v1-prd.md",
                  kind: "prd",
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
    });

    await expect(
      buildDocsContent({
        rootDir: repoRoot,
      }),
    ).rejects.toThrow(/points to missing heading "missing"/u);
  });

  it("fails on missing or invalid diagram snapshots", async () => {
    const repoRoot = await createTempRepo({
      "CONTEXT.md": "# Context\n\nDiagram here.",
      "docs/docs-manifest.json": JSON.stringify(
        {
          version: 1,
          sections: [
            {
              id: "orientation",
              title: "Orientation",
              pages: [
                {
                  slug: "orientation/context",
                  title: "Context",
                  sourcePath: "CONTEXT.md",
                  kind: "context",
                  diagrams: [
                    {
                      id: "valid-diagram",
                      title: "Valid Diagram",
                      sourcePath: "docs/diagrams/valid.json",
                    },
                    {
                      id: "missing-diagram",
                      title: "Missing Diagram",
                      sourcePath: "docs/diagrams/missing.json",
                    },
                    {
                      id: "invalid-diagram",
                      title: "Invalid Diagram",
                      sourcePath: "docs/diagrams/invalid.json",
                    },
                  ],
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
      "docs/diagrams/valid.json": JSON.stringify({
        schemaVersion: 1,
        store: {
          "page:1": {
            id: "page:1",
            typeName: "page",
          },
        },
      }),
      "docs/diagrams/invalid.json": JSON.stringify({
        foo: "bar",
      }),
    });

    await expect(
      buildDocsContent({
        rootDir: repoRoot,
      }),
    ).rejects.toThrow(/Diagram snapshot "docs\/diagrams\/missing\.json" does not exist\./u);
  });

  it("fails when search index generation throws", async () => {
    const repoRoot = await createTempRepo({
      "CONTEXT.md": "# Context\n\nText.",
      "docs/docs-manifest.json": JSON.stringify(
        {
          version: 1,
          sections: [
            {
              id: "orientation",
              title: "Orientation",
              pages: [
                {
                  slug: "orientation/context",
                  title: "Context",
                  sourcePath: "CONTEXT.md",
                  kind: "context",
                },
              ],
            },
          ],
        },
        null,
        2,
      ),
    });

    await expect(
      buildDocsContent({
        rootDir: repoRoot,
        searchIndexBuilder: () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow(/Search index generation failed: boom\./u);
  });
});

async function createTempRepo(files: Record<string, string>): Promise<string> {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "docs-content-"));
  tempDirectories.push(repoRoot);

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents, "utf8");
  }

  return repoRoot;
}

