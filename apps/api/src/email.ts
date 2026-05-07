import { createTransport } from "nodemailer";
import { env } from "@workspace/config";

/**
 * Common email delivery for MyTuums transactional emails.
 *
 * Uses Resend SMTP in production (when RESEND_API_KEY is set),
 * Mailpit SMTP on localhost:1025 in development.
 */

function getTransport() {
  if (env.RESEND_API_KEY) {
    return createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: env.RESEND_API_KEY },
    });
  }
  return createTransport({
    host: "localhost",
    port: 1025,
    secure: false,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: "MyTuums <noreply@mytuums.com>",
    ...opts,
  });
}
