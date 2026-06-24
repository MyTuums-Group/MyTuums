#!/usr/bin/env tsx

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import process from "node:process";

type Target = {
  name: string;
  openUrl: string;
  probeUrl: string;
};

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : process.cwd();
const repoRoot = resolve(dirname(scriptPath), "..");

const waitTimeoutMs = Number.parseInt(
  process.env.DEV_FULL_WAIT_TIMEOUT_MS ?? "120000",
  10,
);
const pollIntervalMs = Number.parseInt(process.env.DEV_FULL_POLL_MS ?? "1000", 10);
const probeTimeoutMs = Number.parseInt(
  process.env.DEV_FULL_PROBE_TIMEOUT_MS ?? "1000",
  10,
);

const drizzleHost = process.env.DRIZZLE_STUDIO_HOST ?? "127.0.0.1";
const drizzlePort = process.env.DRIZZLE_STUDIO_PORT ?? "4983";

const targets: Target[] = [
  {
    name: "Web app",
    openUrl: process.env.WEB_APP_URL ?? "http://localhost:5173",
    probeUrl:
      process.env.DEV_FULL_WEB_PROBE_URL ??
      process.env.WEB_APP_URL ??
      "http://localhost:5173",
  },
  {
    name: "Docs app",
    openUrl: process.env.DOCS_APP_URL ?? "http://localhost:5174",
    probeUrl:
      process.env.DEV_FULL_DOCS_PROBE_URL ??
      process.env.DOCS_APP_URL ??
      "http://localhost:5174",
  },
  {
    name: "Drizzle Studio",
    openUrl: process.env.DRIZZLE_STUDIO_URL ?? "https://local.drizzle.studio",
    probeUrl:
      process.env.DEV_FULL_DRIZZLE_PROBE_URL ??
      `http://${drizzleHost}:${drizzlePort}`,
  },
  {
    name: "MailPit",
    openUrl: process.env.MAILPIT_URL ?? "http://localhost:8025",
    probeUrl:
      process.env.DEV_FULL_MAILPIT_PROBE_URL ??
      process.env.MAILPIT_URL ??
      "http://localhost:8025",
  },
];

const children = new Set<ChildProcess>();
let stopping = false;

async function main() {
  await runOnce("infra", ["infra"]);

  runPersistent("dev", ["dev"]);
  runPersistent("studio", ["studio"]);

  await waitForTargets(targets);
  openUrls(targets.map((target) => target.openUrl));

  console.log("[dev:full] Ready. Press Ctrl+C to stop dev and studio.");
}

function runOnce(label: string, args: string[]) {
  console.log(`[dev:full] Starting ${label}: pnpm ${args.join(" ")}`);

  return new Promise<void>((resolvePromise, reject) => {
    const child = spawnPnpm(args, { stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(
          `${label} exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
        ),
      );
    });
  });
}

function runPersistent(label: string, args: string[]) {
  console.log(`[dev:full] Starting ${label}: pnpm ${args.join(" ")}`);

  const child = spawnPnpm(args, { stdio: "inherit" });
  children.add(child);

  child.on("error", (error) => {
    if (!stopping) {
      console.error(`[dev:full] ${label} failed to start: ${error.message}`);
      stop(1);
    }
  });

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (!stopping) {
      console.error(
        `[dev:full] ${label} exited with ${
          signal ? `signal ${signal}` : `code ${code}`
        }.`,
      );
      stop(typeof code === "number" ? code : 1);
    }
  });
}

function spawnPnpm(
  args: string[],
  options: { stdio: "inherit" | "ignore" },
) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "pnpm", ...args], {
      cwd: repoRoot,
      stdio: options.stdio,
      windowsHide: true,
    });
  }

  return spawn("pnpm", args, {
    cwd: repoRoot,
    stdio: options.stdio,
  });
}

async function waitForTargets(items: Target[]) {
  console.log("[dev:full] Waiting for local services...");

  const results = await Promise.all(items.map((target) => waitForTarget(target)));

  for (const target of results) {
    console.log(`[dev:full] ${target.name} is ready at ${target.openUrl}`);
  }
}

async function waitForTarget(target: Target) {
  const deadline = Date.now() + waitTimeoutMs;

  while (Date.now() < deadline) {
    if (await isReachable(target.probeUrl)) {
      return target;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`${target.name} did not respond at ${target.probeUrl}`);
}

async function isReachable(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), probeTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });

    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function openUrls(urls: string[]) {
  const browser = process.env.DEV_FULL_BROWSER;

  console.log("[dev:full] Opening browser tabs...");

  if (browser) {
    spawnDetached(browser, ["--new-window", ...urls]);
    return;
  }

  if (process.platform === "win32") {
    for (const url of urls) {
      spawnDetached("cmd.exe", ["/d", "/s", "/c", "start", "", url]);
    }
    return;
  }

  if (process.platform === "darwin") {
    spawnDetached("open", urls);
    return;
  }

  for (const url of urls) {
    spawnDetached("xdg-open", [url]);
  }
}

function spawnDetached(command: string, args: string[]) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("error", (error) => {
    console.warn(`[dev:full] Could not open ${command}: ${error.message}`);
  });

  child.unref();
}

function sleep(ms: number) {
  return new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));
}

function stop(exitCode: number) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    killProcessTree(child);
  }

  setTimeout(() => process.exit(exitCode), 500).unref();
}

function killProcessTree(child: ChildProcess) {
  if (!child.pid || child.killed) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`[dev:full] ${message}`);
  stop(1);
});
