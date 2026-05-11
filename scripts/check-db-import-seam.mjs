#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoots = ["apps", "packages"];
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const ignoredSegments = new Set(["node_modules", "dist", ".turbo", "coverage"]);
const restrictedImportPattern = /^@workspace\/db(?:\/.*)?$/;

const allowedLocationDescriptions = [
  "packages/db/**",
  "DB migrations, seeds, and Drizzle tooling under packages/db/**",
  "apps/api/src/auth.ts and apps/api/src/auth/**",
  "apps/api/src/authorization/**",
  "apps/api/src/services/**/*.adapter.ts",
  "apps/api/src/services/**/production.ts",
  "apps/api/src/services/**/*.production.ts",
];

const webConfigFiles = [
  "apps/web/vite.config.ts",
  "apps/web/vite.config.mts",
  "apps/web/tsconfig.json",
  "apps/web/tsconfig.app.json",
  "apps/web/tsconfig.node.json",
];

const forbiddenWebConfigTerms = ["@workspace/db", "../../packages/db", "packages/db/src"];

const importViolations = [];
const webConfigViolations = [];

for (const root of sourceRoots) {
  const absoluteRoot = join(repoRoot, root);
  if (!existsSync(absoluteRoot)) continue;

  for (const file of walk(absoluteRoot)) {
    const relativePath = toPosix(relative(repoRoot, file));
    const source = readFileSync(file, "utf8");

    for (const foundImport of findDbImports(source, relativePath)) {
      if (isAllowedDbImportLocation(relativePath)) continue;

      importViolations.push({
        path: relativePath,
        line: lineNumberAt(source, foundImport.index),
        specifier: foundImport.specifier,
      });
    }
  }
}

for (const configPath of webConfigFiles) {
  const absolutePath = join(repoRoot, configPath);
  if (!existsSync(absolutePath)) continue;

  const source = readFileSync(absolutePath, "utf8");
  for (const term of forbiddenWebConfigTerms) {
    const index = source.indexOf(term);
    if (index === -1) continue;

    webConfigViolations.push({
      path: configPath,
      line: lineNumberAt(source, index),
      term,
    });
  }
}

if (importViolations.length > 0 || webConfigViolations.length > 0) {
  console.error("DB import seam violation: raw @workspace/db imports are allowed only in adapters/infrastructure.\n");

  if (importViolations.length > 0) {
    console.error("Disallowed imports:");
    for (const violation of importViolations) {
      console.error(`- ${violation.path}:${violation.line} imports ${violation.specifier}`);
    }
    console.error("");
  }

  if (webConfigViolations.length > 0) {
    console.error("Web config must not alias or reference the DB package:");
    for (const violation of webConfigViolations) {
      console.error(`- ${violation.path}:${violation.line} contains ${violation.term}`);
    }
    console.error("");
  }

  console.error("Allowed locations:");
  for (const description of allowedLocationDescriptions) {
    console.error(`- ${description}`);
  }

  process.exit(1);
}

console.log("DB import seam check passed.");

function* walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(absolutePath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!sourceExtensions.has(extensionOf(entry.name))) continue;

    yield absolutePath;
  }
}

function findDbImports(source, filePath = "source.ts") {
  const imports = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  );

  visit(sourceFile);
  return imports;

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addModuleSpecifier(node.moduleSpecifier);
    }

    if (ts.isImportEqualsDeclaration(node)) {
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference)) {
        addModuleSpecifier(reference.expression);
      }
    }

    if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) {
        addModuleSpecifier(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  }

  function addModuleSpecifier(specifierNode) {
    if (!specifierNode) return;
    if (!ts.isStringLiteral(specifierNode) && !ts.isNoSubstitutionTemplateLiteral(specifierNode)) {
      return;
    }

    const specifier = specifierNode.text;
    if (!restrictedImportPattern.test(specifier)) return;

    imports.push({
      specifier,
      index: specifierNode.getStart(sourceFile),
    });
  }
}

function scriptKindFor(filePath) {
  if (/\.tsx$|\.jsx$/u.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.js$|\.mjs$|\.cjs$/u.test(filePath)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function isAllowedDbImportLocation(relativePath) {
  if (relativePath.startsWith("packages/db/")) return true;
  if (relativePath === "apps/api/src/auth.ts") return true;
  if (relativePath.startsWith("apps/api/src/auth/")) return true;
  if (relativePath.startsWith("apps/api/src/authorization/")) return true;

  if (!relativePath.startsWith("apps/api/src/services/")) return false;

  return (
    /\.adapter\.tsx?$/.test(relativePath) ||
    /\/production\.tsx?$/.test(relativePath) ||
    /\.production\.tsx?$/.test(relativePath)
  );
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function extensionOf(fileName) {
  const match = /\.[^.]+$/.exec(fileName);
  return match?.[0] ?? "";
}

function toPosix(path) {
  return path.split("\\").join("/");
}
