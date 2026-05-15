import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const contactRouteSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../routes/contact.tsx"),
  "utf8",
);

describe("contact route form", () => {
  it("submits the public contact categories through the contact mutation", () => {
    expect(contactRouteSource).toContain("trpc.contact.submit.useMutation");
    expect(contactRouteSource).toContain('name="category"');
    expect(contactRouteSource).toContain("account_access");
    expect(contactRouteSource).toContain("moderation_or_safety");
    expect(contactRouteSource).toContain("privacy_or_data");
    expect(contactRouteSource).toContain("bug_report");
    expect(contactRouteSource).toContain("general_support");
    expect(contactRouteSource).toContain("other");
  });

  it("keeps logged-out email and message constraints visible in the form", () => {
    expect(contactRouteSource).toContain('name="email"');
    expect(contactRouteSource).toContain("CONTACT_EMAIL_MAX_LENGTH");
    expect(contactRouteSource).toContain('name="message"');
    expect(contactRouteSource).toContain("CONTACT_MESSAGE_MAX_LENGTH");
    expect(contactRouteSource).toContain("isEmailRequired");
  });
});
