import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routeTree = readFileSync("apps/web/src/routeTree.gen.ts", "utf8");

describe("profile route shape", () => {
  it("uses compact /@{username} style profile URLs", () => {
    expect(routeTree).toContain("/@{$username}");
    expect(routeTree).not.toContain("/@/$username");
  });
});
