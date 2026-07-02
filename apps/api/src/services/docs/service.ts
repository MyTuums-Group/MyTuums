import { Buffer } from "node:buffer";
import path from "node:path";
import type {
  DocsArtifact,
  DocsArtifactHomeEntry,
  DocsBuildMetadata,
  DocsDiagram,
  DocsPage,
  DocsSearchEntry,
  DocsSection,
} from "@workspace/docs-content";
import type { AccountLifecycleSnapshot } from "../account-status/index.js";

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 25;
const SEARCH_EXCERPT_LENGTH = 180;
const MAX_DOCS_ASSET_BYTES = 5 * 1024 * 1024;
const DOCS_ASSET_CONTENT_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

export interface DocsViewer {
  session:
    | {
        user: {
          id: string;
          emailVerified?: boolean | null;
        };
      }
    | null;
  account: AccountLifecycleSnapshot | null;
}

export interface DocsPageInput {
  sectionSlug: string;
  pageSlug: string;
}

export interface DocsDiagramInput extends DocsPageInput {
  diagramId: string;
}

export interface DocsAssetInput extends DocsPageInput {
  src: string;
}

export interface DocsSearchInput {
  query: string;
  limit?: number;
}

export interface DocsArtifactAdapter {
  readArtifact(): Promise<DocsArtifact>;
  readAsset(sourcePath: string): Promise<Uint8Array | null>;
}

export type DocsPageDiagramMetadata = Omit<DocsDiagram, "snapshot">;

export type DocsPageContent = Omit<DocsPage, "diagrams"> & {
  diagrams: DocsPageDiagramMetadata[];
};

export interface DocsPageResult {
  page: DocsPageContent;
  build: DocsBuildMetadata;
}

export interface DocsDiagramResult {
  diagram: DocsDiagram;
  page: {
    sectionSlug: string;
    sectionTitle: string;
    pageSlug: string;
    pageTitle: string;
  };
  build: DocsBuildMetadata;
}

export interface DocsAssetResult {
  asset: {
    sourcePath: string;
    contentType: string;
    base64: string;
    byteLength: number;
  };
  page: {
    sectionSlug: string;
    sectionTitle: string;
    pageSlug: string;
    pageTitle: string;
  };
  build: DocsBuildMetadata;
}

export interface DocsSearchResult {
  id: string;
  sectionSlug: string;
  sectionTitle: string;
  pageSlug: string;
  pageTitle: string;
  headingId: string | null;
  headingText: string | null;
  excerpt: string;
}

export interface DocsNavigationPayload {
  sections: DocsSection[];
  homeEntry: DocsArtifactHomeEntry;
  contentBuild: DocsBuildMetadata;
}

export interface DocsService {
  getNavigation(viewer: DocsViewer): Promise<DocsNavigationPayload>;
  getPage(viewer: DocsViewer, input: DocsPageInput): Promise<DocsPageResult>;
  getDiagram(viewer: DocsViewer, input: DocsDiagramInput): Promise<DocsDiagramResult>;
  getAsset(viewer: DocsViewer, input: DocsAssetInput): Promise<DocsAssetResult>;
  search(viewer: DocsViewer, input: DocsSearchInput): Promise<DocsSearchResult[]>;
}

export class DocsAccessError extends Error {
  readonly kind:
    | "unauthenticated"
    | "inactive_account"
    | "unverified_account"
    | "forbidden_role";

  constructor(kind: DocsAccessError["kind"]) {
    const message =
      kind === "unauthenticated"
        ? "Authentication required"
        : kind === "inactive_account"
          ? "Active accounts only"
          : kind === "unverified_account"
            ? "Verified email required"
            : "Admin or owner access required";

    super(message);
    this.name = "DocsAccessError";
    this.kind = kind;
  }
}

export class DocsPageNotFoundError extends Error {
  readonly sectionSlug: string;
  readonly pageSlug: string;

  constructor(sectionSlug: string, pageSlug: string) {
    super(`Document not found for ${sectionSlug}/${pageSlug}`);
    this.name = "DocsPageNotFoundError";
    this.sectionSlug = sectionSlug;
    this.pageSlug = pageSlug;
  }
}

export class DocsDiagramNotFoundError extends Error {
  readonly sectionSlug: string;
  readonly pageSlug: string;
  readonly diagramId: string;

  constructor(sectionSlug: string, pageSlug: string, diagramId: string) {
    super(`Diagram not found for ${sectionSlug}/${pageSlug}#${diagramId}`);
    this.name = "DocsDiagramNotFoundError";
    this.sectionSlug = sectionSlug;
    this.pageSlug = pageSlug;
    this.diagramId = diagramId;
  }
}

export class DocsAssetNotFoundError extends Error {
  readonly sectionSlug: string;
  readonly pageSlug: string;
  readonly src: string;

  constructor(sectionSlug: string, pageSlug: string, src: string) {
    super(`Asset not found for ${sectionSlug}/${pageSlug}: ${src}`);
    this.name = "DocsAssetNotFoundError";
    this.sectionSlug = sectionSlug;
    this.pageSlug = pageSlug;
    this.src = src;
  }
}

export function assertCanReadDocs(viewer: DocsViewer): void {
  if (!viewer.session) {
    throw new DocsAccessError("unauthenticated");
  }

  if (!viewer.account || viewer.account.status !== "active") {
    throw new DocsAccessError("inactive_account");
  }

  if (viewer.session.user.emailVerified !== true) {
    throw new DocsAccessError("unverified_account");
  }

  if (viewer.account.role !== "admin" && viewer.account.role !== "owner") {
    throw new DocsAccessError("forbidden_role");
  }
}

export function createDocsService(adapter: DocsArtifactAdapter): DocsService {
  return {
    async getNavigation(viewer) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      return {
        sections: artifact.sections,
        homeEntry: artifact.homeEntry,
        contentBuild: artifact.build,
      };
    },

    async getPage(viewer, input) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      const page = findArtifactPage(artifact, input);

      if (!page) {
        throw new DocsPageNotFoundError(input.sectionSlug, input.pageSlug);
      }

      return {
        page: toPageContent(page),
        build: artifact.build,
      };
    },

    async getDiagram(viewer, input) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      const page = findArtifactPage(artifact, input);

      if (!page) {
        throw new DocsPageNotFoundError(input.sectionSlug, input.pageSlug);
      }

      const diagram = page.diagrams.find((candidate) => candidate.id === input.diagramId);
      if (!diagram) {
        throw new DocsDiagramNotFoundError(input.sectionSlug, input.pageSlug, input.diagramId);
      }

      return {
        diagram,
        page: {
          sectionSlug: page.sectionId,
          sectionTitle: page.sectionTitle,
          pageSlug: page.slug,
          pageTitle: page.title,
        },
        build: artifact.build,
      };
    },

    async getAsset(viewer, input) {
      assertCanReadDocs(viewer);
      const artifact = await adapter.readArtifact();
      const page = findArtifactPage(artifact, input);

      if (!page) {
        throw new DocsPageNotFoundError(input.sectionSlug, input.pageSlug);
      }

      const resolvedAsset = resolveDocsAsset(page.sourcePath, input.src);
      if (resolvedAsset === null) {
        throw new DocsAssetNotFoundError(input.sectionSlug, input.pageSlug, input.src);
      }

      const bytes = await adapter.readAsset(resolvedAsset.sourcePath);
      if (!bytes || bytes.byteLength > MAX_DOCS_ASSET_BYTES) {
        throw new DocsAssetNotFoundError(input.sectionSlug, input.pageSlug, input.src);
      }

      return {
        asset: {
          sourcePath: resolvedAsset.sourcePath,
          contentType: resolvedAsset.contentType,
          base64: Buffer.from(bytes).toString("base64"),
          byteLength: bytes.byteLength,
        },
        page: {
          sectionSlug: page.sectionId,
          sectionTitle: page.sectionTitle,
          pageSlug: page.slug,
          pageTitle: page.title,
        },
        build: artifact.build,
      };
    },

    async search(viewer, input) {
      assertCanReadDocs(viewer);
      return searchDocsIndex((await adapter.readArtifact()).searchIndex, input);
    },
  };
}

function findArtifactPage(artifact: DocsArtifact, input: DocsPageInput): DocsPage | undefined {
  return artifact.pages.find(
    (candidate) => candidate.sectionId === input.sectionSlug && candidate.slug === input.pageSlug,
  );
}

function toPageContent(page: DocsPage): DocsPageContent {
  return {
    ...page,
    diagrams: page.diagrams.map(({ snapshot: _snapshot, ...diagram }) => diagram),
  };
}

export function createInMemoryDocsService(artifact: DocsArtifact): DocsService {
  return createDocsService({
    readArtifact() {
      return Promise.resolve(artifact);
    },
    readAsset() {
      return Promise.resolve(null);
    },
  });
}

function resolveDocsAsset(
  pageSourcePath: string,
  src: string,
): { sourcePath: string; contentType: string } | null {
  const trimmedSrc = src.trim();
  if (trimmedSrc.length === 0 || isExternalLink(trimmedSrc) || trimmedSrc.startsWith("/")) {
    return null;
  }

  const assetPathPart = stripUrlSuffix(trimmedSrc);
  if (
    assetPathPart.length === 0 ||
    assetPathPart.startsWith("#") ||
    assetPathPart.startsWith("diagram:")
  ) {
    return null;
  }

  const extension = path.posix.extname(assetPathPart).toLowerCase();
  const contentType = DOCS_ASSET_CONTENT_TYPES.get(extension);
  if (contentType === undefined) {
    return null;
  }

  const pageDirectory = path.posix.dirname(pageSourcePath);
  const normalizedAssetPath = path.posix.normalize(
    path.posix.join(pageDirectory, assetPathPart.replace(/\\/gu, "/")),
  );

  if (!isPathInsideDirectory(normalizedAssetPath, pageDirectory)) {
    return null;
  }

  return {
    sourcePath: normalizedAssetPath,
    contentType,
  };
}

function stripUrlSuffix(src: string): string {
  const queryIndex = src.indexOf("?");
  const hashIndex = src.indexOf("#");
  const suffixIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const firstSuffixIndex = Math.min(...suffixIndexes);

  return suffixIndexes.length === 0 ? src : src.slice(0, firstSuffixIndex);
}

function isPathInsideDirectory(targetPath: string, directory: string): boolean {
  if (targetPath === "." || targetPath === ".." || targetPath.startsWith("../")) {
    return false;
  }

  if (directory === ".") {
    return !targetPath.startsWith("/");
  }

  return targetPath.startsWith(`${directory}/`);
}

function isExternalLink(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(href);
}

interface RankedDocsSearchResult extends DocsSearchResult {
  score: number;
}

function searchDocsIndex(
  searchIndex: DocsSearchEntry[],
  input: DocsSearchInput,
): DocsSearchResult[] {
  const normalizedQuery = normalizeSearchText(input.query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const terms = [...new Set(normalizedQuery.split(" "))];
  const limit = clampSearchLimit(input.limit);
  const rankedResults: RankedDocsSearchResult[] = [];

  for (const entry of searchIndex) {
    const score = scoreSearchEntry(entry, normalizedQuery, terms);
    if (score === 0) {
      continue;
    }

    rankedResults.push({
      id: entry.id,
      sectionSlug: entry.sectionId,
      sectionTitle: entry.sectionTitle,
      pageSlug: entry.pageSlug,
      pageTitle: entry.pageTitle,
      headingId: entry.headingId,
      headingText: entry.headingText,
      excerpt: createSearchExcerpt(entry.text, terms),
      score,
    });
  }

  return rankedResults
    .sort(compareRankedResults)
    .slice(0, limit)
    .map(({ score: _score, ...result }) => result);
}

function clampSearchLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.trunc(limit)));
}

function scoreSearchEntry(
  entry: DocsSearchEntry,
  normalizedQuery: string,
  terms: string[],
): number {
  const normalizedFields = {
    pageTitle: normalizeSearchText(entry.pageTitle),
    sectionTitle: normalizeSearchText(entry.sectionTitle),
    headingText: normalizeSearchText(entry.headingText ?? ""),
    text: normalizeSearchText(entry.text),
  };

  const searchableText = Object.values(normalizedFields).join(" ");
  if (!terms.every((term) => searchableText.includes(term))) {
    return 0;
  }

  let score = entry.headingId === null ? 4 : 0;

  if (normalizedFields.pageTitle === normalizedQuery) {
    score += 120;
  } else if (normalizedFields.pageTitle.includes(normalizedQuery)) {
    score += 70;
  }

  if (normalizedFields.headingText === normalizedQuery) {
    score += 90;
  } else if (normalizedFields.headingText.includes(normalizedQuery)) {
    score += 50;
  }

  if (normalizedFields.sectionTitle.includes(normalizedQuery)) {
    score += 35;
  }

  if (normalizedFields.text.includes(normalizedQuery)) {
    score += 20;
  }

  for (const term of terms) {
    if (normalizedFields.pageTitle.includes(term)) {
      score += 30;
    }
    if (normalizedFields.headingText.includes(term)) {
      score += 20;
    }
    if (normalizedFields.sectionTitle.includes(term)) {
      score += 12;
    }
    if (normalizedFields.text.includes(term)) {
      score += 4;
    }
  }

  return score;
}

function compareRankedResults(
  left: RankedDocsSearchResult,
  right: RankedDocsSearchResult,
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return (
    left.pageTitle.localeCompare(right.pageTitle) ||
    (left.headingText ?? "").localeCompare(right.headingText ?? "") ||
    left.id.localeCompare(right.id)
  );
}

function createSearchExcerpt(text: string, terms: string[]): string {
  const collapsedText = text.replace(/\s+/gu, " ").trim();
  if (collapsedText.length <= SEARCH_EXCERPT_LENGTH) {
    return collapsedText;
  }

  const lowerText = collapsedText.toLocaleLowerCase();
  const firstMatchIndex = terms.reduce<number | null>((bestIndex, term) => {
    const index = lowerText.indexOf(term);
    if (index < 0) {
      return bestIndex;
    }

    return bestIndex === null ? index : Math.min(bestIndex, index);
  }, null);

  const excerptStart = Math.max(0, (firstMatchIndex ?? 0) - 48);
  const excerpt = collapsedText.slice(excerptStart, excerptStart + SEARCH_EXCERPT_LENGTH);
  return `${excerptStart > 0 ? "..." : ""}${excerpt}${
    excerptStart + SEARCH_EXCERPT_LENGTH < collapsedText.length ? "..." : ""
  }`;
}

function normalizeSearchText(text: string): string {
  return text.toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}
