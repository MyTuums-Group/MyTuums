export type DocsSourceKind =
  | "context"
  | "prd"
  | "adr"
  | "agent-doc"
  | "team-convention"
  | "codebase-doc"
  | "ci-cd-doc"
  | "deployment-doc"
  | "infrastructure-doc";

export interface DocsManifestDiagram {
  id: string;
  title: string;
  sourcePath: string;
  description?: string;
}

export interface DocsManifestPage {
  slug: string;
  title: string;
  sourcePath: string;
  kind: DocsSourceKind;
  summary?: string;
  diagrams?: DocsManifestDiagram[];
}

export interface DocsManifestSection {
  id: string;
  title: string;
  description?: string;
  pages: DocsManifestPage[];
}

export interface DocsManifest {
  version: 1;
  sections: DocsManifestSection[];
}

export interface DocsHeading {
  id: string;
  text: string;
  level: number;
}

export interface DocsLink {
  text: string;
  href: string;
  kind: "internal" | "external";
  targetSlug?: string;
  targetAnchorId?: string;
  targetSourcePath?: string;
}

export interface DocsDiagram {
  id: string;
  title: string;
  sourcePath: string;
  description?: string;
  snapshot: Record<string, unknown>;
}

export interface DocsNavigationPage {
  slug: string;
  title: string;
  sourcePath: string;
  kind: DocsSourceKind;
  summary?: string;
  diagramIds: string[];
}

export interface DocsSection {
  id: string;
  title: string;
  description?: string;
  pages: DocsNavigationPage[];
}

export interface DocsPage {
  slug: string;
  title: string;
  sourcePath: string;
  kind: DocsSourceKind;
  summary?: string;
  sectionId: string;
  sectionTitle: string;
  markdown: string;
  text: string;
  headings: DocsHeading[];
  links: DocsLink[];
  diagrams: DocsDiagram[];
}

export interface DocsSearchEntry {
  id: string;
  pageSlug: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  headingId: string | null;
  headingText: string | null;
  text: string;
}

export interface DocsBuildMetadata {
  generatedAt: string;
  commitSha: string | null;
}

export interface DocsArtifact {
  version: 1;
  manifestPath: string;
  build: DocsBuildMetadata;
  sections: DocsSection[];
  pages: DocsPage[];
  searchIndex: DocsSearchEntry[];
}

export interface SearchIndexBuildContext {
  sections: DocsSection[];
  pages: DocsPage[];
}

export type SearchIndexBuilder = (context: SearchIndexBuildContext) => DocsSearchEntry[];

export interface DocsBuildOptions {
  rootDir: string;
  manifestPath?: string;
  outputPath?: string;
  generatedAt?: string;
  commitSha?: string | null;
  searchIndexBuilder?: SearchIndexBuilder;
}

export interface DocsBuildResult {
  manifestPath: string;
  outputPath?: string;
  artifact: DocsArtifact;
}

