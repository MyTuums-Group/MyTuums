import path from "node:path";
import { buildDocsContent } from "./compiler.js";

const repoRoot = path.resolve(process.cwd(), "../..");

await buildDocsContent({
  rootDir: repoRoot,
  outputPath: "packages/docs-content/dist/generated/docs-content.json",
  environment: readEnv("DOCS_ENVIRONMENT") ?? readEnv("VITE_DOCS_ENVIRONMENT") ?? process.env.NODE_ENV,
  generatedAt: readEnv("DOCS_BUILD_TIME") ?? readEnv("VITE_DOCS_BUILD_TIME"),
  commitSha: readEnv("DOCS_BUILD_SHA") ?? readEnv("GITHUB_SHA") ?? readEnv("VITE_DOCS_BUILD_SHA"),
});

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

