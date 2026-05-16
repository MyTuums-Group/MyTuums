import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const routeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../routes/register.tsx"),
  "utf8",
);

describe("register route account identity fields", () => {
  it("does not ask for a display name during registration", () => {
    expect(routeSource).not.toContain("Display name");
    expect(routeSource).not.toContain('name="name"');
    expect(routeSource).not.toContain('id="name"');
  });

  it("does not reserve the Better Auth name field for profile display names", () => {
    expect(routeSource).toContain("name: email");
    expect(routeSource).not.toContain('name: form.get("name")');
  });
});

describe("register route password confirmation", () => {
  it("asks for a matching password confirmation before account creation", () => {
    expect(routeSource).toContain('name="password"');
    expect(routeSource).toContain('name="confirmPassword"');
    expect(routeSource).toContain("validateRegistrationPasswordConfirmation");
  });
});
