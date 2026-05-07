import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { env } from "@workspace/config";

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
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (env.RESEND_API_KEY) {
        // Production: Resend
        const { Resend } = await import("resend");
        const resend = new Resend(env.RESEND_API_KEY);
        await resend.emails.send({
          from: "MyTuums <noreply@mytuums.com>",
          to: user.email,
          subject: "Verify your MyTuums account",
          html: verificationEmailTemplate({ user, url }),
        });
      } else {
        // Development: console output (captured by Mailpit if configured)
        // Mailpit captures SMTP on localhost:1025, but for now we log
        // the link so developers can verify manually.
        console.log("─".repeat(60));
        console.log(`  Verification email for: ${user.email}`);
        console.log(`  Verification URL: ${url}`);
        console.log("─".repeat(60));
      }
    },
  },

  socialProviders: {},

  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Refresh session every 24 hours (rolling)
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});

/** Simple HTML template for the verification email */
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
