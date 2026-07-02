import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { readDocsArtifact, resolveDefaultDocsArtifactPath } from "@workspace/docs-content";
import { createDocsService, type DocsArtifactAdapter } from "./service.js";

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const artifactPath = resolveDefaultDocsArtifactPath(repoRoot);

export const docsArtifactAdapter: DocsArtifactAdapter = {
  readArtifact() {
    return readDocsArtifact(artifactPath);
  },
  async readAsset(sourcePath) {
    try {
      return await fs.readFile(new URL(`../../../../../${sourcePath}`, import.meta.url));
    } catch {
      return null;
    }
  },
};

export const docsService = createDocsService(docsArtifactAdapter);
