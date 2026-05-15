import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),

    // Auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    WEB_APP_URL: z.string().url().default("http://localhost:5173"),
    DOCS_APP_URL: z.string().url().default("http://localhost:5174"),

    // Email (Resend)
    RESEND_API_KEY: z.string().optional(),
    SUPPORT_EMAIL: z.string().email().default("support@mytuums.com"),
    PRIVACY_EMAIL: z.string().email().default("privacy@mytuums.com"),

    // Azure Storage
    AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
    AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
    AZURE_STORAGE_ACCOUNT_KEY: z.string().optional(),

    // Media container names
    MEDIA_CONTAINER_NAME: z.string().default("user-media"),
    GAME_COVERS_CONTAINER_NAME: z.string().default("game-covers"),

    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_RELEASE: z.string().optional(),

    // Node
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Bootstrap
    OWNER_BOOTSTRAP_SECRET: z.string().optional(),
    PUBLIC_SIGNUP_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    MEDIA_UPLOADS_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});
