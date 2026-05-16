import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const publicPages = [
  { path: "/terms", heading: "Terms of Service" },
  { path: "/privacy", heading: "Privacy Policy" },
  { path: "/cookies", heading: "Cookie Policy" },
  { path: "/legal-notice", heading: "Legal Notice" },
  { path: "/accessibility", heading: "Accessibility Statement" },
  { path: "/support", heading: "Support" },
  { path: "/contact", heading: "Contact MyTuums" },
  { path: "/about", heading: "About MyTuums" },
]

test.describe("public static smoke", () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.path} renders for logged-out visitors`, async ({
      page,
    }) => {
      await page.goto(publicPage.path)
      await expect(
        page.getByRole("heading", { name: publicPage.heading, level: 1 })
      ).toBeVisible()
      await expect(page.getByRole("link", { name: "Terms" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Contact" })).toBeVisible()
    })
  }

  test("@axe contact form has no automated accessibility violations", async ({
    page,
  }) => {
    await page.goto("/contact")
    await expect(
      page.getByRole("heading", { name: "Contact MyTuums", level: 1 })
    ).toBeVisible()
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
