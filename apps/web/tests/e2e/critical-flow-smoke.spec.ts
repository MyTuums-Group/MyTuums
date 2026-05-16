import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test"
import { Buffer } from "node:buffer"
import { env } from "node:process"

const appURL = env.SMOKE_WEB_URL ?? "http://127.0.0.1:5175"
const mailpitURL = env.MAILPIT_URL ?? "http://127.0.0.1:8025"

type SmokeUser = {
  email: string
  password: string
  username: string
  displayName: string
}

test.describe.serial("critical v1 smoke", () => {
  test("redirects logged-out app visitors to login", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Log in to MyTuums" })
    ).toBeVisible()
  })

  test("covers auth, posts, media, notifications, and reporting", async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000)

    const runId = uniqueRunId()
    const alpha = smokeUser(runId, "alpha")
    const beta = smokeUser(runId, "beta")
    const textPost = `smoke ${runId} text-only critical flow`
    const imagePost = `smoke ${runId} image critical flow`

    const alphaPage = await newPage(browser)
    await registerVerifiedOnboardedUser(alphaPage, request, alpha)

    const alphaLoginPage = await newPage(browser)
    await login(alphaLoginPage, alpha)

    await createTextPost(alphaLoginPage, textPost)
    await openPostDetail(alphaLoginPage, textPost)
    await expect(alphaLoginPage.getByText(textPost)).toBeVisible()

    await alphaLoginPage.goto("/")
    await createImagePost(alphaLoginPage, imagePost)
    await expect(
      postCard(alphaLoginPage, imagePost)
        .getByRole("img", { name: "Post image attachment" })
        .first()
    ).toBeVisible()
    await openPostDetail(alphaLoginPage, imagePost)
    await expect(alphaLoginPage.getByText(imagePost)).toBeVisible()
    await expect(
      contentCard(alphaLoginPage, imagePost)
        .getByRole("img", { name: "Post image attachment" })
        .first()
    ).toBeVisible()

    const betaPage = await newPage(browser)
    await registerVerifiedOnboardedUser(betaPage, request, beta)
    await betaPage.goto("/")
    const betaPostCard = postCard(betaPage, textPost)
    await expect(betaPostCard).toBeVisible()
    await betaPostCard.getByRole("button", { name: /0 likes/ }).click()
    await expect(
      betaPostCard.getByRole("button", { name: /1 like/ })
    ).toBeVisible()

    await betaPostCard.getByRole("button", { name: "Report" }).click()
    await betaPage.getByLabel("Notes").fill(`smoke report ${runId}`)
    await betaPage.getByRole("button", { name: "Submit report" }).click()
    await expect(betaPage.getByText("Report submitted.")).toBeVisible()

    const alphaNotificationPage = await newPage(browser)
    await login(alphaNotificationPage, alpha)
    await expect(
      alphaNotificationPage.getByLabel(/Open notifications, \d+ unread/)
    ).toBeVisible()
    await alphaNotificationPage
      .getByLabel(/Open notifications/)
      .first()
      .click()
    await expect(
      alphaNotificationPage.getByText(`${beta.displayName} liked your post`)
    ).toBeVisible()
    await expect(alphaNotificationPage.getByText(textPost)).toBeVisible()

    await alphaPage.context().close()
    await alphaLoginPage.context().close()
    await betaPage.context().close()
    await alphaNotificationPage.context().close()
  })
})

async function newPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: appURL })
  return context.newPage()
}

async function registerVerifiedOnboardedUser(
  page: Page,
  request: APIRequestContext,
  user: SmokeUser
) {
  await page.goto("/register")
  await expect(
    page.getByRole("heading", { name: "Create your account" })
  ).toBeVisible()
  await page.getByLabel("Email").fill(user.email)
  await page.locator("#password").fill(user.password)
  await page.locator("#confirmPassword").fill(user.password)
  await page.getByLabel(/I confirm that I am at least/).check()
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(
    page.getByRole("heading", { name: "Verify your email" })
  ).toBeVisible()

  const verificationLink = await waitForVerificationLink(request, user.email)
  await page.goto(verificationLink)

  await expect(page.getByLabel("Username")).toBeVisible({ timeout: 15_000 })
  await page.getByLabel("Username").fill(user.username)
  await page.getByLabel("Display name (optional)").fill(user.displayName)
  await page.getByLabel("Bio (optional)").fill("Playwright smoke account")
  await page.getByRole("button", { name: "Create profile" }).click()

  await expect(page.getByRole("heading", { name: "Home feed" })).toBeVisible()
}

async function login(page: Page, user: SmokeUser) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Password").fill(user.password)
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page.getByRole("heading", { name: "Home feed" })).toBeVisible()
}

async function createTextPost(page: Page, text: string) {
  await page.goto("/")
  await page.getByPlaceholder("What are you playing right now?").fill(text)
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(postCard(page, text)).toBeVisible()
}

async function createImagePost(page: Page, text: string) {
  await page.goto("/")
  await page.getByPlaceholder("What are you playing right now?").fill(text)
  await page.locator("#post-media-input").setInputFiles({
    name: "smoke.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    ),
  })
  await expect(page.getByText("Ready to attach")).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole("button", { name: "Post", exact: true }).click()
  await expect(postCard(page, text)).toBeVisible()
}

async function openPostDetail(page: Page, text: string) {
  const card = postCard(page, text)
  const href = await card
    .getByRole("link", { name: "Open post" })
    .getAttribute("href")
  expect(href).toMatch(/^\/post\//)
  await page.goto(href!)
  await expect(page).toHaveURL(/\/post\//)
}

function postCard(page: Page, text: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ hasText: text })
    .filter({
      has: page.locator('a[href^="/post/"]:not([href*="optimistic"])'),
    })
    .first()
}

function contentCard(page: Page, text: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: text }).first()
}

async function waitForVerificationLink(
  request: APIRequestContext,
  email: string
) {
  const deadline = Date.now() + 30_000

  while (Date.now() < deadline) {
    const summaries = await listMailpitMessages(request)
    const match = summaries.find(
      (message) =>
        message.Subject?.includes("Verify your MyTuums account") &&
        message.To?.some((recipient) => recipient.Address === email)
    )

    if (match?.ID) {
      const detailResponse = await request.get(
        `${mailpitURL}/api/v1/message/${match.ID}`
      )
      if (detailResponse.ok()) {
        const detail = (await detailResponse.json()) as {
          HTML?: string
          Text?: string
        }
        const link = extractVerificationLink(
          `${detail.HTML ?? ""}\n${detail.Text ?? ""}`
        )
        if (link) return link
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Timed out waiting for verification email to ${email}`)
}

async function listMailpitMessages(request: APIRequestContext) {
  const response = await request.get(`${mailpitURL}/api/v1/messages`)
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { messages?: MailpitMessageSummary[] }
  return body.messages ?? []
}

function extractVerificationLink(content: string): string | null {
  const match = content.match(
    /https?:\/\/[^"'\s<>]+\/api\/auth\/verify-email[^"'\s<>]*/i
  )
  return match?.[0].replaceAll("&amp;", "&") ?? null
}

function smokeUser(runId: string, label: string): SmokeUser {
  return {
    email: `smoke-${runId}-${label}@example.com`,
    password: `Smoke-${runId}-pass`,
    username: `${label}_${runId.replace(/[^a-z0-9_]/g, "_")}`.slice(0, 20),
    displayName: `Smoke ${titleCase(label)} ${runId}`,
  }
}

function uniqueRunId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

type MailpitMessageSummary = {
  ID?: string
  Subject?: string
  To?: Array<{ Address?: string }>
}
