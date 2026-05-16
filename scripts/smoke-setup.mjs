import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const inheritedEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, value]) => value !== undefined && !key.startsWith("=")
  )
)

const smokeEnv = {
  ...inheritedEnv,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://mytuums:mytuums_dev@localhost:5432/mytuums",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "local-smoke-secret-at-least-32-characters",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:4000",
  WEB_APP_URL: process.env.WEB_APP_URL ?? "http://127.0.0.1:5175",
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
}

await run("Apply database migrations", [
  "--filter",
  "@workspace/db",
  "db:migrate",
])

await run("Seed game catalog", [
  "--filter",
  "@workspace/api",
  "exec",
  "tsx",
  "src/services/game/seed-games.ts",
])

function run(label, args) {
  console.log(`\n${label}`)
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      isWindows ? commandLine(args) : "pnpm",
      isWindows ? [] : args,
      {
        cwd: root,
        env: smokeEnv,
        shell: isWindows,
        stdio: "inherit",
      }
    )

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`))
    })
  })
}

function commandLine(args) {
  return ["pnpm", ...args.map(quoteCommandArg)].join(" ")
}

function quoteCommandArg(arg) {
  return /^[\w@/:.-]+$/.test(arg) ? arg : `"${arg.replaceAll('"', '\\"')}"`
}
