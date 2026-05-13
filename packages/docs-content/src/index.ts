export {
  buildDocsContent,
  DEFAULT_DOCS_ARTIFACT_RELATIVE_PATH,
  DEFAULT_DOCS_MANIFEST_PATH,
  DocsContentValidationError,
  isEligibleDocsSource,
  loadDocsManifest,
  readDocsArtifact,
  resolveDefaultDocsArtifactPath,
  validateDocsManifest,
} from "./compiler.js";

export { isValidSemanticPath, slugifyHeading } from "./slug.js";

export type {
  DocsArtifact,
  DocsBuildMetadata,
  DocsBuildOptions,
  DocsBuildResult,
  DocsDiagram,
  DocsHeading,
  DocsLink,
  DocsManifest,
  DocsManifestDiagram,
  DocsManifestPage,
  DocsManifestSection,
  DocsNavigationPage,
  DocsPage,
  DocsSearchEntry,
  DocsSection,
  DocsSourceKind,
  SearchIndexBuildContext,
  SearchIndexBuilder,
} from "./types.js";

