import { env } from "@workspace/config";
import { sendEmail } from "../../email.js";
import {
  createContactSubmissionService,
  type ContactSubmitError,
  type ContactSubmissionService,
} from "./contact.js";
import { contactRepository } from "./contact.adapter.js";
import { contactRateLimiter } from "./rate-limit.adapter.js";

export type { ContactSubmitError, ContactSubmissionService };

export const contactSubmissionService: ContactSubmissionService =
  createContactSubmissionService({
    repository: contactRepository,
    rateLimiter: contactRateLimiter,
    email: { send: sendEmail },
    supportEmail: env.SUPPORT_EMAIL,
  });
