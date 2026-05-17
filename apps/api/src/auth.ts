import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { env } from "@workspace/config";
import { sendEmail } from "./email.js";
import { getAllowedCorsOrigins } from "./cors-origins.js";

// ── BetterAuth configuration ─────────────────────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your MyTuums password",
        html: resetPasswordTemplate({ user, url }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const verificationUrl = withWebCallback(url);
      const html = verificationEmailTemplate({ user, url: verificationUrl });
      await sendEmail({
        to: user.email ?? "",
        subject: "Verify your MyTuums account",
        html,
      });
    },
  },

  socialProviders: {},

  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours (rolling)
  },

  // Auth-sensitive POST routes are guarded by the Postgres-backed limiter in
  // auth/handler.ts. Keep BetterAuth's provider-local limiter off so production
  // correctness does not depend on process-local state.
  rateLimit: {
    enabled: false,
  },

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
});

function getTrustedOrigins(): string[] {
  const configuredOrigins = parseOriginList(env.BETTER_AUTH_TRUSTED_ORIGINS);
  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return getAllowedCorsOrigins({
    nodeEnv: env.NODE_ENV,
    webAppUrl: env.NODE_ENV === "production" ? process.env.WEB_APP_URL : env.WEB_APP_URL,
    docsAppUrl: env.NODE_ENV === "production" ? process.env.DOCS_APP_URL : env.DOCS_APP_URL,
  });
}

function parseOriginList(value: string | undefined): string[] {
  return value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? [];
}

// ── Email templates ──────────────────────────────────────────────────

function withWebCallback(url: string): string {
  const verificationUrl = new URL(url);
  verificationUrl.searchParams.set("callbackURL", env.WEB_APP_URL);
  return verificationUrl.toString();
}

function verificationEmailTemplate({
  user,
  url,
}: {
  user: { email?: string | null; name?: string | null };
  url: string;
}): string {
  const email = user.email ?? "";
  const displayName = user.name ?? email;
  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="color: #a855f7; font-size: 28px;">MyTuums</h1>
  <p>Hey ${displayName},</p>
  <p>Thanks for signing up! Click the button below to verify your email address and start using MyTuums.</p>
  <a href="${url}" style="display: inline-block; background: #a855f7; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
    Verify your email
  </a>
  <p style="color: #666; font-size: 14px; margin-top: 24px;">
    If you didn't create this account, you can safely ignore this email.
  </p>
</body>
</html>`;
}

function resetPasswordTemplate({
  user,
  url,
}: {
  user: { email: string; name?: string | null };
  url: string;
}): string {
  const displayName = user.name ?? user.email;
  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="color: #a855f7; font-size: 28px;">MyTuums</h1>
  <p>Hey ${displayName},</p>
  <p>Someone requested a password reset for your account. Click the button below to choose a new password.</p>
  <a href="${url}" style="display: inline-block; background: #a855f7; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
    Reset your password
  </a>
  <p style="color: #666; font-size: 14px; margin-top: 24px;">
    If you didn't request this, you can safely ignore this email. The link expires in 1 hour.
  </p>
</body>
</html>`;
}
