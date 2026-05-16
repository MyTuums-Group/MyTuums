import { defineConfig, devices } from "@playwright/test"

const apiURL = process.env.SMOKE_API_URL ?? "http://127.0.0.1:4000"
const webURL = process.env.SMOKE_WEB_URL ?? "http://127.0.0.1:5175"
const webPort = new URL(webURL).port || "5175"
const isAxeOnlyRun = process.argv.some((arg) => arg.includes("@axe"))
const smokeEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://mytuums:mytuums_dev@localhost:5432/mytuums",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "local-smoke-secret-at-least-32-characters",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? apiURL,
  BETTER_AUTH_TRUSTED_ORIGINS:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? webURL,
  WEB_APP_URL: process.env.WEB_APP_URL ?? webURL,
  DOCS_APP_URL: process.env.DOCS_APP_URL ?? "http://127.0.0.1:5174",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PUBLIC_SIGNUP_ENABLED: process.env.PUBLIC_SIGNUP_ENABLED ?? "true",
  MEDIA_UPLOADS_ENABLED: process.env.MEDIA_UPLOADS_ENABLED ?? "true",
  AZURE_STORAGE_CONNECTION_STRING:
    process.env.AZURE_STORAGE_CONNECTION_STRING ??
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;",
  MEDIA_CONTAINER_NAME: process.env.MEDIA_CONTAINER_NAME ?? "user-media",
  GAME_COVERS_CONTAINER_NAME:
    process.env.GAME_COVERS_CONTAINER_NAME ?? "game-covers",
  API_PORT: process.env.API_PORT ?? (new URL(apiURL).port || "4000"),
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: webURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    ...(isAxeOnlyRun
      ? []
      : [
          {
            name: "api",
            command: "pnpm --filter @workspace/api exec tsx src/index.ts",
            url: `${apiURL}/healthz`,
            env: smokeEnv,
            timeout: 120 * 1000,
            reuseExistingServer: false,
          },
        ]),
    {
      name: "web",
      command: `pnpm exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webURL,
      env: {
        VITE_API_URL: apiURL,
        VITE_PUBLIC_SIGNUP_ENABLED:
          process.env.VITE_PUBLIC_SIGNUP_ENABLED ?? "true",
      },
      timeout: 120 * 1000,
      reuseExistingServer: false,
    },
  ],
})
