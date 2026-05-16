import { createHash } from "node:crypto";
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  type ContactCategory,
  graphemeLength,
  normalizeBodyText,
} from "@workspace/types";

export const CONTACT_RETENTION_DAYS = 180;
export const CONTACT_RATE_LIMIT = {
  action: "contact_submit",
  limit: 5,
  windowMs: 60 * 60 * 1000,
} as const;

export const CONTACT_CATEGORIES = [
  "account_access",
  "moderation_or_safety",
  "privacy_or_data",
  "bug_report",
  "general_support",
  "other",
] as const satisfies readonly ContactCategory[];

export type ContactEmailStatus = "pending" | "sent" | "failed";

export type ContactSubmissionRecord = {
  id: string;
  userId: string | null;
  email: string | null;
  category: ContactCategory;
  message: string;
  requestIpHash: string | null;
  userAgent: string | null;
  emailStatus: ContactEmailStatus;
  emailError: string | null;
  retentionExpiresAt: Date;
  createdAt: Date;
};

export type NewContactSubmissionRecord = Omit<ContactSubmissionRecord, "id">;

export type ContactRepository = {
  insert: (
    values: NewContactSubmissionRecord,
  ) => Promise<ContactSubmissionRecord>;
  markEmailSent: (id: string) => Promise<ContactSubmissionRecord | undefined>;
  markEmailFailed: (
    id: string,
    error: string,
  ) => Promise<ContactSubmissionRecord | undefined>;
};

export type ContactRateLimiter = {
  consume: (input: {
    key: string;
    action: string;
    limit: number;
    windowMs: number;
    now: Date;
  }) => Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>;
};

export type ContactEmailInput = {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
};

export type ContactEmailSender = {
  send: (input: ContactEmailInput) => Promise<void>;
};

export type ContactSubmitInput = {
  viewer?: {
    userId: string;
    email?: string | null;
  } | null;
  email?: string | null;
  category: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  now?: Date;
};

export type ContactSubmitError =
  | { kind: "missing_email"; message: string }
  | { kind: "invalid_email"; message: string }
  | { kind: "invalid_category"; message: string }
  | { kind: "invalid_message"; message: string }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "email_failed"; submissionId: string; message: string };

export type ContactSubmitResult =
  | { ok: true; value: ContactSubmissionRecord }
  | { ok: false; error: ContactSubmitError };

export type ContactSubmissionService = {
  submit: (input: ContactSubmitInput) => Promise<ContactSubmitResult>;
};

export function createContactSubmissionService(deps: {
  repository: ContactRepository;
  rateLimiter: ContactRateLimiter;
  email: ContactEmailSender;
  supportEmail: string;
}): ContactSubmissionService {
  return {
    submit: (input) => submitContact(deps, input),
  };
}

async function submitContact(
  deps: {
    repository: ContactRepository;
    rateLimiter: ContactRateLimiter;
    email: ContactEmailSender;
    supportEmail: string;
  },
  input: ContactSubmitInput,
): Promise<ContactSubmitResult> {
  const now = input.now ?? new Date();
  const viewer = input.viewer ?? null;
  const email = normalizeOptional(input.email);
  const accountEmail = normalizeOptional(viewer?.email);

  if (!viewer && !email) {
    return {
      ok: false,
      error: {
        kind: "missing_email",
        message: "Enter an email address so support can reply.",
      },
    };
  }

  if (email && !isValidEmail(email)) {
    return {
      ok: false,
      error: {
        kind: "invalid_email",
        message: "Enter a valid email address.",
      },
    };
  }

  const category = parseCategory(input.category);
  if (!category) {
    return {
      ok: false,
      error: {
        kind: "invalid_category",
        message: "Choose a valid contact category.",
      },
    };
  }

  const message = normalizeMessage(input.message);
  if (!message) {
    return {
      ok: false,
      error: {
        kind: "invalid_message",
        message: "Enter a message for support.",
      },
    };
  }

  if (graphemeLength(message) > CONTACT_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        kind: "invalid_message",
        message: "Message must be 2,000 characters or fewer.",
      },
    };
  }

  const requestIpHash = hashContactIp(input.ipAddress);
  const rateLimit = await deps.rateLimiter.consume({
    key: viewer ? `user:${viewer.userId}` : `ip:${requestIpHash ?? "unknown"}`,
    action: CONTACT_RATE_LIMIT.action,
    limit: CONTACT_RATE_LIMIT.limit,
    windowMs: CONTACT_RATE_LIMIT.windowMs,
    now,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: {
        kind: "rate_limited",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    };
  }

  const inserted = await deps.repository.insert({
    userId: viewer?.userId ?? null,
    email: email ?? null,
    category,
    message,
    requestIpHash,
    userAgent: normalizeUserAgent(input.userAgent),
    emailStatus: "pending",
    emailError: null,
    retentionExpiresAt: computeRetentionExpiry(now),
    createdAt: now,
  });

  const emailInput = createSupportEmail({
    submission: inserted,
    replyTo: email ?? accountEmail ?? undefined,
    accountEmail,
    supportEmail: deps.supportEmail,
  });

  try {
    await deps.email.send(emailInput);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Email failed.";
    const failed =
      (await deps.repository.markEmailFailed(inserted.id, errorMessage)) ??
      inserted;
    return {
      ok: false,
      error: {
        kind: "email_failed",
        submissionId: failed.id,
        message: "The message was stored but could not be emailed to support.",
      },
    };
  }

  const sent = (await deps.repository.markEmailSent(inserted.id)) ?? inserted;
  return { ok: true, value: sent };
}

function parseCategory(value: string): ContactCategory | null {
  return (CONTACT_CATEGORIES as readonly string[]).includes(value)
    ? (value as ContactCategory)
    : null;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeMessage(value: string): string {
  return normalizeBodyText(value);
}

function normalizeUserAgent(value: string | null | undefined): string | null {
  const normalized = normalizeOptional(value);
  return normalized ? normalized.slice(0, 500) : null;
}

function isValidEmail(value: string): boolean {
  return (
    value.length <= CONTACT_EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function hashContactIp(ipAddress: string | null | undefined): string | null {
  const normalized = normalizeOptional(ipAddress);
  if (!normalized) return null;

  return createHash("sha256").update(normalized).digest("hex");
}

function computeRetentionExpiry(now: Date): Date {
  return new Date(now.getTime() + CONTACT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function createSupportEmail(input: {
  submission: ContactSubmissionRecord;
  supportEmail: string;
  replyTo?: string;
  accountEmail: string | null;
}): ContactEmailInput {
  const label = categoryLabel(input.submission.category);
  const lines = [
    `Category: ${label}`,
    `Submission ID: ${input.submission.id}`,
    `User ID: ${input.submission.userId ?? "logged-out"}`,
    `Submitted email: ${input.submission.email ?? "not supplied"}`,
    `Account email: ${input.accountEmail ?? "not supplied"}`,
    `User agent: ${input.submission.userAgent ?? "not supplied"}`,
    "",
    input.submission.message,
  ];

  return {
    to: input.supportEmail,
    replyTo: input.replyTo,
    subject: `[MyTuums contact] ${label}`,
    text: lines.join("\n"),
    html: `<pre>${escapeHtml(lines.join("\n"))}</pre>`,
  };
}

function categoryLabel(category: ContactCategory): string {
  switch (category) {
    case "account_access":
      return "Account access";
    case "moderation_or_safety":
      return "Moderation or safety";
    case "privacy_or_data":
      return "Privacy or data";
    case "bug_report":
      return "Bug report";
    case "general_support":
      return "General support";
    case "other":
      return "Other";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
