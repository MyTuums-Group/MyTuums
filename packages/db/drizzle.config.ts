import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from the monorepo root regardless of where drizzle-kit is run from.
// drizzle-kit is invoked from packages/db/, but the .env lives at the repo root.
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, "..", "..", ".env");
config({ path: rootEnv });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
