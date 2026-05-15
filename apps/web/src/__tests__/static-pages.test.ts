import { describe, expect, it } from "vitest";
import { decideRootNavigation, isStaticPagePath } from "../routes/-root-guard";
import {
  FOOTER_STATIC_LINKS,
  STATIC_PAGE_SLUGS,
  getStaticPage,
} from "../routes/-static-pages";

describe("public static pages", () => {
  it("exposes every support and legal page to logged-out visitors", async () => {
    for (const slug of STATIC_PAGE_SLUGS) {
      expect(isStaticPagePath(`/${slug}`)).toBe(true);
      await expect(
        decideRootNavigation({
          pathname: `/${slug}`,
          session: null,
          appUserState: null,
        }),
      ).resolves.toEqual({ kind: "allow" });
    }
  });

  it("has launch-ready legal and support content for every footer link", () => {
    expect(STATIC_PAGE_SLUGS).toEqual([
      "terms",
      "privacy",
      "cookies",
      "legal-notice",
      "accessibility",
      "support",
      "contact",
      "about",
    ]);

    expect(FOOTER_STATIC_LINKS.map((link) => link.href)).toEqual(
      STATIC_PAGE_SLUGS.map((slug) => `/${slug}`),
    );

    for (const slug of STATIC_PAGE_SLUGS) {
      const page = getStaticPage(slug);
      const text = [
        page.title,
        page.summary,
        ...page.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
        ]),
      ].join(" ");

      expect(text).not.toMatch(/lorem|placeholder|todo|coming soon/i);
      expect(text.length).toBeGreaterThan(600);
    }
  });

  it("documents launch-critical legal, privacy, cookies, and support facts", () => {
    expect(pageText("terms")).toMatch(/15/);
    expect(pageText("terms")).toMatch(/public content/i);
    expect(pageText("privacy")).toMatch(/Azure/i);
    expect(pageText("privacy")).toMatch(/Resend/i);
    expect(pageText("privacy")).toMatch(/Sentry/i);
    expect(pageText("privacy")).toMatch(/GitHub/i);
    expect(pageText("cookies")).toMatch(/strictly necessary/i);
    expect(pageText("contact")).toMatch(/180 days/i);
    expect(pageText("support")).toMatch(/support@mytuums\.com/i);
  });
});

function pageText(slug: (typeof STATIC_PAGE_SLUGS)[number]) {
  const page = getStaticPage(slug);
  return [
    page.title,
    page.summary,
    ...page.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ].join(" ");
}
