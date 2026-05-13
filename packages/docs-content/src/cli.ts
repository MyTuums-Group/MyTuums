import path from "node:path";
import { buildDocsContent } from "./compiler.js";

const repoRoot = path.resolve(process.cwd(), "../..");

await buildDocsContent({
  rootDir: repoRoot,
  outputPath: "packages/docs-content/dist/generated/docs-content.json",
});

