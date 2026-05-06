import { betterAuth } from "better-auth";
import { env } from "@workspace/config";

export const auth = betterAuth({
  // Database adapter configured in issue #2 after schema is defined
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Placeholder — will integrate with Resend in issue #3
      console.log(`Verification email for ${user.email}: ${url}`);
      await Promise.resolve();
    },
  },
  socialProviders: {},
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
