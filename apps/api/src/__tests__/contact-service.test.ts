import { describe, expect, it, vi } from "vitest";
import {
  CONTACT_RETENTION_DAYS,
  createContactSubmissionService,
  type ContactEmailSender,
  type ContactRateLimiter,
  type ContactRepository,
  type ContactSubmissionRecord,
} from "../services/contact/contact.js";

const NOW = new Date("2026-05-15T12:00:00.000Z");

function createHarness(overrides?: {
  rateLimiter?: ContactRateLimiter;
  sendEmail?: ContactEmailSender["send"];
}) {
  const records: ContactSubmissionRecord[] = [];
  const repository: ContactRepository = {
    insert(values) {
      const record: ContactSubmissionRecord = {
        id: `contact-${records.length + 1}`,
        userId: values.userId ?? null,
        email: values.email ?? null,
        category: values.category,
        message: values.message,
        requestIpHash: values.requestIpHash ?? null,
        userAgent: values.userAgent ?? null,
        emailStatus: values.emailStatus,
        emailError: values.emailError ?? null,
        retentionExpiresAt: values.retentionExpiresAt,
        createdAt: values.createdAt,
      };
      records.push(record);
      return Promise.resolve(record);
    },
    markEmailSent(id) {
      const record = records.find((candidate) => candidate.id === id);
      if (!record) return Promise.resolve(undefined);
      record.emailStatus = "sent";
      record.emailError = null;
      return Promise.resolve(record);
    },
    markEmailFailed(id, error) {
      const record = records.find((candidate) => candidate.id === id);
      if (!record) return Promise.resolve(undefined);
      record.emailStatus = "failed";
      record.emailError = error;
      return Promise.resolve(record);
    },
  };

  const rateLimiter =
    overrides?.rateLimiter ??
    ({
      consume: vi.fn().mockResolvedValue({ allowed: true }),
    } satisfies ContactRateLimiter);

  const send = overrides?.sendEmail ?? vi.fn().mockResolvedValue(undefined);
  const email: ContactEmailSender = { send };

  return {
    records,
    rateLimiter,
    send,
    service: createContactSubmissionService({
      repository,
      rateLimiter,
      email,
      supportEmail: "support@mytuums.com",
    }),
  };
}

describe("contact submission service", () => {
  it("requires an email address from logged-out visitors", async () => {
    const { service } = createHarness();

    await expect(
      service.submit({
        viewer: null,
        email: "",
        category: "general_support",
        message: "I need help with my account.",
        ipAddress: "203.0.113.20",
        userAgent: "Vitest",
        now: NOW,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "missing_email",
        message: "Enter an email address so support can reply.",
      },
    });
  });

  it("stores and emails logged-out submissions with 180 day retention", async () => {
    const { records, send, service } = createHarness();

    const result = await service.submit({
      viewer: null,
      email: "player@example.com",
      category: "bug_report",
      message: "\r\n  Upload button does not respond.\r\n",
      ipAddress: "203.0.113.20",
      userAgent: "Vitest",
      now: NOW,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "contact-1",
        emailStatus: "sent",
      },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: null,
      email: "player@example.com",
      category: "bug_report",
      message: "Upload button does not respond.",
      userAgent: "Vitest",
      emailStatus: "sent",
    });
    expect(records[0]?.requestIpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(records[0]?.retentionExpiresAt).toEqual(
      new Date(NOW.getTime() + CONTACT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "support@mytuums.com",
        replyTo: "player@example.com",
        subject: "[MyTuums contact] Bug report",
      }),
    );
  });

  it("links logged-in submissions by userId and keeps email optional", async () => {
    const { records, send, service } = createHarness();

    const result = await service.submit({
      viewer: {
        userId: "user-1",
        email: "account@example.com",
      },
      category: "privacy_or_data",
      message: "Please send me my data export.",
      ipAddress: "198.51.100.4",
      userAgent: "Vitest",
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(records[0]).toMatchObject({
      userId: "user-1",
      email: null,
      category: "privacy_or_data",
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "support@mytuums.com",
        replyTo: "account@example.com",
      }),
    );
  });

  it("rejects messages over the visible character limit", async () => {
    const { service } = createHarness();

    const result = await service.submit({
      viewer: null,
      email: "player@example.com",
      category: "general_support",
      message: "a".repeat(2001),
      ipAddress: "203.0.113.20",
      userAgent: "Vitest",
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid_message",
        message: "Message must be 2,000 characters or fewer.",
      },
    });
  });

  it("rate limits before storage or email delivery", async () => {
    const { records, send, service } = createHarness({
      rateLimiter: {
        consume: vi.fn().mockResolvedValue({
          allowed: false,
          retryAfterSeconds: 120,
        }),
      },
    });

    const result = await service.submit({
      viewer: null,
      email: "player@example.com",
      category: "general_support",
      message: "Please help.",
      ipAddress: "203.0.113.20",
      userAgent: "Vitest",
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "rate_limited",
        retryAfterSeconds: 120,
      },
    });
    expect(records).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });
});
