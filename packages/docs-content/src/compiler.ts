import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  analyzeMarkdown,
  type MarkdownDiagramEmbedCandidate,
  type MarkdownLinkCandidate,
  type MarkdownSearchSection,
} from "./markdown.js";
import { isValidDiagramId, isValidSemanticPath } from "./slug.js";
import type {
  DocsArtifact,
  DocsBuildOptions,
  DocsBuildResult,
  DocsDiagram,
  DocsLink,
  DocsManifest,
  DocsManifestDiagram,
  DocsManifestPage,
  DocsManifestSection,
  DocsPage,
  DocsSection,
  DocsSearchEntry,
  DocsSourceKind,
  SearchIndexBuildContext,
} from "./types.js";

export const DEFAULT_DOCS_MANIFEST_PATH = "docs/docs-manifest.json";
export const DEFAULT_DOCS_ARTIFACT_RELATIVE_PATH = "packages/docs-content/dist/generated/docs-content.json";

const SOURCE_RULES: Record<DocsSourceKind, readonly RegExp[]> = {
  context: [
    /^CONTEXT\.md$/u,
    /^CONTEXT-MAP\.md$/u,
    /^docs\/context\/.+\/CONTEXT\.md$/u,
  ],
  prd: [/^docs\/prd\/.+\.md$/u],
  adr: [/^docs\/adr\/.+\.md$/u],
  "agent-doc": [/^AGENTS\.md$/u, /^docs\/agents\/.+\.md$/u],
  "team-convention": [/^docs\/team-conventions\.md$/u],
  "codebase-doc": [/^docs\/codebase\/.+\.md$/u],
  "ci-cd-doc": [/^docs\/ci-cd\/.+\.md$/u],
  "deployment-doc": [/^docs\/deployment\/.+\.md$/u],
  "infrastructure-doc": [/^docs\/infrastructure\/.+\.md$/u],
};

const DIAGRAM_SOURCE_PATTERN = /^docs\/diagrams\/.+\.(?:json|tldr)$/u;

interface CompiledPageDraft {
  slug: string;
  title: string;
  sourcePath: string;
  kind: DocsSourceKind;
  summary?: string;
  sectionId: string;
  sectionTitle: string;
  markdown: string;
  text: string;
  headings: DocsPage["headings"];
  diagrams: DocsDiagram[];
  diagramEmbeds: MarkdownDiagramEmbedCandidate[];
  rawLinks: MarkdownLinkCandidate[];
  searchSections: MarkdownSearchSection[];
}

export class DocsContentValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(`${message}\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "DocsContentValidationError";
    this.issues = issues;
  }
}

export async function buildDocsContent(options: DocsBuildOptions): Promise<DocsBuildResult> {
  const rootDir = path.resolve(options.rootDir);
  const manifestPath = resolveFromRoot(rootDir, options.manifestPath ?? DEFAULT_DOCS_MANIFEST_PATH);
  const outputPath =
    options.outputPath === undefined
      ? undefined
      : resolveFromRoot(rootDir, options.outputPath);

  const manifest = await loadDocsManifest(manifestPath);
  const artifact = await compileDocsManifest(manifest, {
    rootDir,
    manifestPath,
    generatedAt: options.generatedAt,
    commitSha: options.commitSha,
    searchIndexBuilder: options.searchIndexBuilder,
  });

  if (outputPath !== undefined) {
    await writeDocsArtifact(artifact, outputPath);
  }

  return {
    manifestPath,
    outputPath,
    artifact,
  };
}

export async function loadDocsManifest(manifestPath: string): Promise<DocsManifest> {
  const rawManifest = await fs.readFile(manifestPath, "utf8");
  const parsed = JSON.parse(rawManifest) as unknown;
  return validateDocsManifest(parsed);
}

export function validateDocsManifest(value: unknown): DocsManifest {
  const issues: string[] = [];
  const root = expectRecord(value, "Manifest", issues);

  const versionValue = root.version;
  if (versionValue !== 1) {
    issues.push(`Manifest version must be 1, received ${describeValue(versionValue)}.`);
  }

  const sectionsValue = root.sections;
  const sections = expectArray(sectionsValue, "Manifest.sections", issues);

  const seenSectionIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenSourcePaths = new Set<string>();
  const seenDiagramIds = new Set<string>();

  const manifestSections: DocsManifestSection[] = sections.map((sectionValue, sectionIndex) => {
    const section = expectRecord(sectionValue, `Manifest.sections[${sectionIndex}]`, issues);

    const id = expectNonEmptyString(section.id, `Manifest.sections[${sectionIndex}].id`, issues);
    if (id.length > 0 && !isValidSemanticPath(id)) {
      issues.push(
        `Manifest.sections[${sectionIndex}].id must use lowercase semantic segments, received "${id}".`,
      );
    }
    if (seenSectionIds.has(id)) {
      issues.push(`Manifest section id "${id}" is duplicated.`);
    } else if (id.length > 0) {
      seenSectionIds.add(id);
    }

    const title = expectNonEmptyString(
      section.title,
      `Manifest.sections[${sectionIndex}].title`,
      issues,
    );
    const description = expectOptionalString(
      section.description,
      `Manifest.sections[${sectionIndex}].description`,
      issues,
    );
    const pagesValue = section.pages;
    const pages = expectArray(pagesValue, `Manifest.sections[${sectionIndex}].pages`, issues);

    const manifestPages: DocsManifestPage[] = pages.map((pageValue, pageIndex) => {
      const pageRecord = expectRecord(
        pageValue,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}]`,
        issues,
      );

      const slug = expectNonEmptyString(
        pageRecord.slug,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}].slug`,
        issues,
      );
      if (slug.length > 0 && !isValidSemanticPath(slug)) {
        issues.push(
          `Manifest.sections[${sectionIndex}].pages[${pageIndex}].slug must use lowercase semantic segments, received "${slug}".`,
        );
      }
      if (seenSlugs.has(slug)) {
        issues.push(`Manifest page slug "${slug}" is duplicated.`);
      } else if (slug.length > 0) {
        seenSlugs.add(slug);
      }

      const titleValue = expectNonEmptyString(
        pageRecord.title,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}].title`,
        issues,
      );
      const sourcePath = normalizeRepoPath(
        pageRecord.sourcePath,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}].sourcePath`,
        issues,
      );
      if (seenSourcePaths.has(sourcePath)) {
        issues.push(`Manifest source path "${sourcePath}" is duplicated.`);
      } else if (sourcePath.length > 0) {
        seenSourcePaths.add(sourcePath);
      }

      const kind = expectSourceKind(
        pageRecord.kind,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}].kind`,
        issues,
      );
      const summary = expectOptionalString(
        pageRecord.summary,
        `Manifest.sections[${sectionIndex}].pages[${pageIndex}].summary`,
        issues,
      );

      const diagramsValue = pageRecord.diagrams;
      let diagrams: DocsManifestDiagram[] | undefined;
      if (diagramsValue !== undefined) {
        const diagramEntries = expectArray(
          diagramsValue,
          `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams`,
          issues,
        );
        diagrams = diagramEntries.map((diagramValue, diagramIndex) => {
          const diagramRecord = expectRecord(
            diagramValue,
            `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams[${diagramIndex}]`,
            issues,
          );

          const idValue = expectNonEmptyString(
            diagramRecord.id,
            `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams[${diagramIndex}].id`,
            issues,
          );
          if (idValue.length > 0 && !isValidDiagramId(idValue)) {
            issues.push(
              `Diagram id "${idValue}" must use lowercase hyphenated words with no slashes.`,
            );
          }
          if (seenDiagramIds.has(idValue)) {
            issues.push(`Diagram id "${idValue}" is duplicated.`);
          } else if (idValue.length > 0) {
            seenDiagramIds.add(idValue);
          }

          return {
            id: idValue,
            title: expectNonEmptyString(
              diagramRecord.title,
              `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams[${diagramIndex}].title`,
              issues,
            ),
            sourcePath: normalizeRepoPath(
              diagramRecord.sourcePath,
              `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams[${diagramIndex}].sourcePath`,
              issues,
            ),
            description: expectOptionalString(
              diagramRecord.description,
              `Manifest.sections[${sectionIndex}].pages[${pageIndex}].diagrams[${diagramIndex}].description`,
              issues,
            ),
          };
        });
      }

      return {
        slug,
        title: titleValue,
        sourcePath,
        kind,
        summary,
        diagrams,
      };
    });

    return {
      id,
      title,
      description,
      pages: manifestPages,
    };
  });

  if (issues.length > 0) {
    throw new DocsContentValidationError("Manifest validation failed.", issues);
  }

  return {
    version: 1,
    sections: manifestSections,
  };
}

export function isEligibleDocsSource(kind: DocsSourceKind, sourcePath: string): boolean {
  if (sourcePath.startsWith("docs/plans/")) {
    return false;
  }

  return SOURCE_RULES[kind].some((pattern) => pattern.test(sourcePath));
}

export function resolveDefaultDocsArtifactPath(rootDir: string): string {
  return path.resolve(rootDir, DEFAULT_DOCS_ARTIFACT_RELATIVE_PATH);
}

export async function readDocsArtifact(artifactPath: string): Promise<DocsArtifact> {
  const rawArtifact = await fs.readFile(artifactPath, "utf8");
  return JSON.parse(rawArtifact) as DocsArtifact;
}

async function compileDocsManifest(
  manifest: DocsManifest,
  options: Omit<DocsBuildOptions, "outputPath"> & { manifestPath: string },
): Promise<DocsArtifact> {
  const issues: string[] = [];
  const compiledPages: CompiledPageDraft[] = [];
  const sections: DocsSection[] = [];

  for (const section of manifest.sections) {
    const navigationPages = [];

    for (const page of section.pages) {
      validateSourceEligibility(page, issues);

      const sourceAbsolutePath = resolveFromRoot(options.rootDir, page.sourcePath);
      const sourceExists = await fileExists(sourceAbsolutePath);
      if (!sourceExists) {
        issues.push(`Source file "${page.sourcePath}" does not exist.`);
        continue;
      }

      const markdown = await fs.readFile(sourceAbsolutePath, "utf8");
      const analysis = analyzeMarkdown(markdown);
      const diagrams = await compileDiagrams(page, options.rootDir, issues);
      validateDiagramEmbeds(page, diagrams, analysis.diagramEmbeds, issues);

      compiledPages.push({
        slug: page.slug,
        title: page.title,
        sourcePath: page.sourcePath,
        kind: page.kind,
        summary: page.summary,
        sectionId: section.id,
        sectionTitle: section.title,
        markdown,
        text: analysis.text,
        headings: analysis.headings,
        diagrams,
        diagramEmbeds: analysis.diagramEmbeds,
        rawLinks: analysis.links,
        searchSections: analysis.sections,
      });

      navigationPages.push({
        slug: page.slug,
        title: page.title,
        sourcePath: page.sourcePath,
        kind: page.kind,
        summary: page.summary,
        diagramIds: diagrams.map((diagram) => diagram.id),
      });
    }

    sections.push({
      id: section.id,
      title: section.title,
      description: section.description,
      pages: navigationPages,
    });
  }

  const pageBySourcePath = new Map(compiledPages.map((page) => [page.sourcePath, page]));
  const pages = compiledPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    sourcePath: page.sourcePath,
    kind: page.kind,
    summary: page.summary,
    sectionId: page.sectionId,
    sectionTitle: page.sectionTitle,
    markdown: page.markdown,
    text: page.text,
    headings: page.headings,
    diagrams: page.diagrams,
    links: validateAndResolveLinks(page, pageBySourcePath, issues),
  }));

  let searchIndex: DocsSearchEntry[];
  try {
    searchIndex = (options.searchIndexBuilder ?? buildDefaultSearchIndex)({
      sections,
      pages,
    });
  } catch (error) {
    issues.push(`Search index generation failed: ${describeError(error)}.`);
    searchIndex = [];
  }

  if (issues.length > 0) {
    throw new DocsContentValidationError("Docs content validation failed.", issues);
  }

  return {
    version: 1,
    manifestPath: toRepoRelativePath(options.rootDir, options.manifestPath),
    build: {
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      commitSha: options.commitSha ?? resolveGitCommit(options.rootDir),
    },
    sections,
    pages,
    searchIndex,
  };
}

async function compileDiagrams(
  page: DocsManifestPage,
  rootDir: string,
  issues: string[],
): Promise<DocsDiagram[]> {
  const compiledDiagrams: DocsDiagram[] = [];

  for (const diagram of page.diagrams ?? []) {
    if (!DIAGRAM_SOURCE_PATTERN.test(diagram.sourcePath)) {
      issues.push(
        `Diagram "${diagram.id}" in "${page.sourcePath}" must live under docs/diagrams and end in .json or .tldr.`,
      );
      continue;
    }

    const absoluteDiagramPath = resolveFromRoot(rootDir, diagram.sourcePath);
    if (!(await fileExists(absoluteDiagramPath))) {
      issues.push(`Diagram snapshot "${diagram.sourcePath}" does not exist.`);
      continue;
    }

    let parsedDiagram: unknown;
    try {
      parsedDiagram = JSON.parse(await fs.readFile(absoluteDiagramPath, "utf8")) as unknown;
    } catch (error) {
      issues.push(
        `Diagram snapshot "${diagram.sourcePath}" is not valid JSON: ${describeError(error)}.`,
      );
      continue;
    }

    if (!isValidDiagramSnapshot(parsedDiagram)) {
      issues.push(
        `Diagram snapshot "${diagram.sourcePath}" is not a valid tldraw-style snapshot object.`,
      );
      continue;
    }

    compiledDiagrams.push({
      id: diagram.id,
      title: diagram.title,
      sourcePath: diagram.sourcePath,
      description: diagram.description,
      snapshot: parsedDiagram,
    });
  }

  return compiledDiagrams;
}

function validateDiagramEmbeds(
  page: DocsManifestPage,
  diagrams: DocsDiagram[],
  diagramEmbeds: MarkdownDiagramEmbedCandidate[],
  issues: string[],
): void {
  const diagramIds = new Set(diagrams.map((diagram) => diagram.id));

  for (const embed of diagramEmbeds) {
    if (!isValidDiagramId(embed.id)) {
      issues.push(
        `Diagram embed "${embed.id}" in "${page.sourcePath}" must use lowercase hyphenated words with no slashes.`,
      );
      continue;
    }

    if (!diagramIds.has(embed.id)) {
      issues.push(
        `Diagram embed "${embed.id}" in "${page.sourcePath}" is not declared in that page's manifest.`,
      );
    }
  }
}

function validateSourceEligibility(page: DocsManifestPage, issues: string[]): void {
  if (page.sourcePath.startsWith("docs/plans/")) {
    issues.push(
      `Manifest source "${page.sourcePath}" is not allowed because docs/plans/** is excluded from docs-content.`,
    );
    return;
  }

  if (!isEligibleDocsSource(page.kind, page.sourcePath)) {
    issues.push(
      `Manifest source "${page.sourcePath}" is not allowed for kind "${page.kind}".`,
    );
  }
}

function validateAndResolveLinks(
  page: CompiledPageDraft,
  pageBySourcePath: Map<string, CompiledPageDraft>,
  issues: string[],
): DocsLink[] {
  const resolvedLinks: DocsLink[] = [];

  for (const link of page.rawLinks) {
    if (isExternalLink(link.href)) {
      resolvedLinks.push({
        text: link.text,
        href: link.href,
        kind: "external",
      });
      continue;
    }

    if (link.href.startsWith("/")) {
      resolvedLinks.push({
        text: link.text,
        href: link.href,
        kind: "external",
      });
      continue;
    }

    const resolvedTarget = resolveInternalLink(page.sourcePath, link.href);
    if (resolvedTarget === null) {
      issues.push(`Link "${link.href}" in "${page.sourcePath}" is not a supported internal link.`);
      continue;
    }

    if (!resolvedTarget.targetPath.endsWith(".md")) {
      issues.push(
        `Link "${link.href}" in "${page.sourcePath}" must point to another markdown page or heading anchor.`,
      );
      continue;
    }

    const targetPage = pageBySourcePath.get(resolvedTarget.targetPath);
    if (targetPage === undefined) {
      issues.push(
        `Link "${link.href}" in "${page.sourcePath}" points to "${resolvedTarget.targetPath}", which is not included in the docs manifest.`,
      );
      continue;
    }

    if (resolvedTarget.anchorId !== null) {
      const headingIds = new Set(targetPage.headings.map((heading) => heading.id));
      if (!headingIds.has(resolvedTarget.anchorId)) {
        issues.push(
          `Link "${link.href}" in "${page.sourcePath}" points to missing heading "${resolvedTarget.anchorId}" in "${targetPage.sourcePath}".`,
        );
        continue;
      }
    }

    resolvedLinks.push({
      text: link.text,
      href: link.href,
      kind: "internal",
      targetSlug: targetPage.slug,
      targetAnchorId: resolvedTarget.anchorId ?? undefined,
      targetSourcePath: targetPage.sourcePath,
    });
  }

  return resolvedLinks;
}

function resolveInternalLink(
  currentSourcePath: string,
  href: string,
): { targetPath: string; anchorId: string | null } | null {
  if (href.length === 0) {
    return null;
  }

  const hashIndex = href.indexOf("#");
  const targetPathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const rawAnchorId = hashIndex >= 0 ? href.slice(hashIndex + 1) : "";
  const anchorId = rawAnchorId.length === 0 ? null : decodeURIComponent(rawAnchorId).toLowerCase();

  if (targetPathPart.length === 0) {
    return {
      targetPath: currentSourcePath,
      anchorId,
    };
  }

  const currentDirectory = path.posix.dirname(currentSourcePath);
  const targetPath = path.posix.normalize(path.posix.join(currentDirectory, targetPathPart));
  if (targetPath.startsWith("../")) {
    return null;
  }

  return {
    targetPath,
    anchorId,
  };
}

function buildDefaultSearchIndex(context: SearchIndexBuildContext): DocsSearchEntry[] {
  const entries: DocsSearchEntry[] = [];
  const pageBySlug = new Map(context.pages.map((page) => [page.slug, page]));

  for (const section of context.sections) {
    for (const navigationPage of section.pages) {
      const page = pageBySlug.get(navigationPage.slug);
      if (page === undefined) {
        continue;
      }

      entries.push({
        id: `page:${page.slug}`,
        pageSlug: page.slug,
        pageTitle: page.title,
        sectionId: section.id,
        sectionTitle: section.title,
        headingId: null,
        headingText: null,
        text: [page.title, page.summary, page.text].filter(Boolean).join("\n\n"),
      });

      const analysis = analyzeMarkdown(page.markdown);
      for (const [sectionIndex, pageSection] of analysis.sections.entries()) {
        const sectionText = [pageSection.headingText, pageSection.text].filter(Boolean).join("\n");
        if (sectionText.trim().length === 0) {
          continue;
        }

        entries.push({
          id: `section:${page.slug}:${sectionIndex}`,
          pageSlug: page.slug,
          pageTitle: page.title,
          sectionId: section.id,
          sectionTitle: section.title,
          headingId: pageSection.headingId,
          headingText: pageSection.headingText,
          text: sectionText,
        });
      }
    }
  }

  return entries;
}

function resolveGitCommit(rootDir: string): string | null {
  try {
    const output = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.trim();
  } catch {
    return null;
  }
}

function isExternalLink(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href);
}

function isValidDiagramSnapshot(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }

  const hasStoreLikeData = isPlainObject(value.store) || isPlainObject(value.document) || isPlainObject(value.records);
  const hasSchemaLikeData = isPlainObject(value.schema) || typeof value.schemaVersion === "number";

  return hasStoreLikeData && hasSchemaLikeData;
}

async function writeDocsArtifact(artifact: DocsArtifact, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveFromRoot(rootDir: string, targetPath: string): string {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(rootDir, targetPath);
}

function toRepoRelativePath(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/gu, "/");
}

function normalizeRepoPath(value: unknown, context: string, issues: string[]): string {
  const sourcePath = expectNonEmptyString(value, context, issues);
  const normalized = path.posix.normalize(sourcePath.replace(/\\/gu, "/").replace(/^\.\//u, ""));

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    issues.push(`${context} must stay inside the repository, received "${sourcePath}".`);
  }

  return normalized;
}

function expectSourceKind(value: unknown, context: string, issues: string[]): DocsSourceKind {
  const kind = expectNonEmptyString(value, context, issues);
  const allowedKinds = new Set<DocsSourceKind>([
    "context",
    "prd",
    "adr",
    "agent-doc",
    "team-convention",
    "codebase-doc",
    "ci-cd-doc",
    "deployment-doc",
    "infrastructure-doc",
  ]);

  if (!allowedKinds.has(kind as DocsSourceKind)) {
    issues.push(`${context} must be a supported docs source kind, received "${kind}".`);
  }

  return kind as DocsSourceKind;
}

function expectOptionalString(value: unknown, context: string, issues: string[]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const stringValue = expectNonEmptyString(value, context, issues);
  return stringValue.length === 0 ? undefined : stringValue;
}

function expectNonEmptyString(value: unknown, context: string, issues: string[]): string {
  if (typeof value !== "string") {
    issues.push(`${context} must be a string, received ${describeValue(value)}.`);
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    issues.push(`${context} must not be empty.`);
  }

  return trimmed;
}

function expectRecord(
  value: unknown,
  context: string,
  issues: string[],
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    issues.push(`${context} must be an object, received ${describeValue(value)}.`);
    return {};
  }

  return value;
}

function expectArray(value: unknown, context: string, issues: string[]): unknown[] {
  if (!Array.isArray(value)) {
    issues.push(`${context} must be an array, received ${describeValue(value)}.`);
    return [];
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (Array.isArray(value)) {
    return "an array";
  }

  return typeof value;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

