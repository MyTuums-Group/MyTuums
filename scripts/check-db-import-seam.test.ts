import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const fixtureDir = join(repoRoot, "apps/web/src/__db-import-seam-fixtures");

beforeEach(removeFixtures);
afterEach(removeFixtures);

describe("DB import seam checker", () => {
  it("passes the current import graph", () => {
    expect(runCheck()).toContain("DB import seam check passed.");
  });

  it("rejects disallowed DB imports across supported syntax variants", () => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      join(fixtureDir, "bypass.ts"),
      [
        'import { db } from /* comment */ "@workspace/db";',
        'export { db } from "@workspace/db";',
        'import schema = require("@workspace/db/schema");',
        'void import(/* comment */ "@workspace/db/schema");',
        'void import(`@workspace/db`);',
        'const required = require(/* comment */ "@workspace/db");',
        "void db;",
        "void schema;",
        "void required;",
      ].join("\n"),
    );
    writeFileSync(
      join(fixtureDir, "bypass.js"),
      [
        'const db = require("@workspace/db");',
        'void import(`@workspace/db/schema`);',
        "void db;",
      ].join("\n"),
    );

    expect(runCheckExpectingFailure()).toMatchInlineSnapshot(`
      "DB import seam violation: raw @workspace/db imports are allowed only in adapters/infrastructure.

      Disallowed imports:
      - apps/web/src/__db-import-seam-fixtures/bypass.js:1 imports @workspace/db
      - apps/web/src/__db-import-seam-fixtures/bypass.js:2 imports @workspace/db/schema
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:1 imports @workspace/db
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:2 imports @workspace/db
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:3 imports @workspace/db/schema
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:4 imports @workspace/db/schema
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:5 imports @workspace/db
      - apps/web/src/__db-import-seam-fixtures/bypass.ts:6 imports @workspace/db

      Allowed locations:
      - packages/db/**
      - DB migrations, seeds, and Drizzle tooling under packages/db/**
      - apps/api/src/auth.ts and apps/api/src/auth/**
      - apps/api/src/authorization/**
      - apps/api/src/services/**/*.adapter.ts
      - apps/api/src/services/**/production.ts
      - apps/api/src/services/**/*.production.ts"
    `);
  });
});

function runCheck() {
  return execFileSync("node", ["scripts/check-db-import-seam.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runCheckExpectingFailure() {
  try {
    runCheck();
  } catch (error) {
    const childProcessError = error as { stdout?: string; stderr?: string };
    return `${childProcessError.stdout ?? ""}${childProcessError.stderr ?? ""}`.trim();
  }

  throw new Error("Expected DB import seam checker to reject fixture imports.");
}

function removeFixtures() {
  rmSync(fixtureDir, { recursive: true, force: true });
}
