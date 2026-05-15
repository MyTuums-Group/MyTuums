import { describe, expect, it, vi } from "vitest";
import { createInMemoryStaffService } from "../services/staff/index.js";

function createStaffService() {
  return createInMemoryStaffService({
    users: [
      {
        id: "owner-1",
        email: "owner@example.com",
        emailVerified: true,
        role: "owner",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
      {
        id: "admin-1",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
      {
        id: "mod-1",
        email: "mod@example.com",
        emailVerified: true,
        role: "moderator",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
      {
        id: "user-1",
        email: "user@example.com",
        emailVerified: true,
        role: "user",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
      {
        id: "user-2",
        email: "second-user@example.com",
        emailVerified: true,
        role: "user",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
    ],
    roleChangeAudits: [],
    moderationCases: [
      { id: "case-open", assigneeId: "mod-1", status: "open" },
      { id: "case-reviewing", assigneeId: "mod-1", status: "reviewing" },
      { id: "case-dismissed", assigneeId: "mod-1", status: "dismissed" },
    ],
    invalidatedSessions: [],
  });
}

function createOwnerBootstrapService() {
  return createInMemoryStaffService({
    users: [
      {
        id: "founder-1",
        email: "founder@example.com",
        emailVerified: true,
        role: "user",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
      {
        id: "other-1",
        email: "other@example.com",
        emailVerified: true,
        role: "user",
        accountStatus: "active",
        suspendedUntil: null,
        suspensionPublicReason: null,
      },
    ],
    roleChangeAudits: [],
    moderationCases: [],
    invalidatedSessions: [],
  });
}

describe("Staff service", () => {
  it("changes a role with internal notes, audit, and immediate session invalidation", async () => {
    const service = createStaffService();

    await expect(
      service.changeRole({
        actorId: "owner-1",
        targetUserId: "user-1",
        newRole: "admin",
        internalNotes: "Trusted launch operator.",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        targetUserId: "user-1",
        oldRole: "user",
        newRole: "admin",
      },
    });

    const snapshot = service.snapshot();
    expect(snapshot.users.find((user) => user.id === "user-1")?.role).toBe("admin");
    expect(snapshot.roleChangeAudits[0]).toMatchObject({
      actorId: "owner-1",
      targetUserId: "user-1",
      oldRole: "user",
      newRole: "admin",
      internalNotes: "Trusted launch operator.",
    });
    expect(snapshot.invalidatedSessions).toEqual(["user-1"]);
  });

  it("lets admins promote moderators but not admins", async () => {
    const service = createStaffService();

    await expect(
      service.changeRole({
        actorId: "admin-1",
        targetUserId: "user-1",
        newRole: "moderator",
        internalNotes: "Needs access to report queue.",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { targetUserId: "user-1", oldRole: "user", newRole: "moderator" },
    });

    await expect(
      service.changeRole({
        actorId: "admin-1",
        targetUserId: "user-2",
        newRole: "admin",
        internalNotes: "Trying to grant admin.",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "role_change_not_allowed" },
    });
  });

  it("unassigns a demoted staff member from open and reviewing moderation cases", async () => {
    const service = createStaffService();

    await expect(
      service.changeRole({
        actorId: "owner-1",
        targetUserId: "mod-1",
        newRole: "user",
        internalNotes: "No longer available for moderation.",
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(service.snapshot().moderationCases).toEqual([
      { id: "case-open", assigneeId: null, status: "open" },
      { id: "case-reviewing", assigneeId: null, status: "reviewing" },
      { id: "case-dismissed", assigneeId: "mod-1", status: "dismissed" },
    ]);
  });

  it("suspends allowed targets with preset expiry, session invalidation, and case unassignment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));

    try {
      const service = createStaffService();

      await expect(
        service.suspendUser({
          actorId: "admin-1",
          targetUserId: "mod-1",
          duration: "7d",
          internalNotes: "Repeated safety misses.",
          publicReason: "terms_violation",
        }),
      ).resolves.toEqual({
        ok: true,
        value: {
          targetUserId: "mod-1",
          suspendedUntil: new Date("2026-01-17T12:00:00.000Z"),
          publicReason: "terms_violation",
        },
      });

      const snapshot = service.snapshot();
      expect(snapshot.users.find((user) => user.id === "mod-1")).toMatchObject({
        accountStatus: "suspended",
        suspendedUntil: new Date("2026-01-17T12:00:00.000Z"),
        suspensionPublicReason: "terms_violation",
      });
      expect(snapshot.moderationCases).toEqual([
        { id: "case-open", assigneeId: null, status: "open" },
        { id: "case-reviewing", assigneeId: null, status: "reviewing" },
        { id: "case-dismissed", assigneeId: "mod-1", status: "dismissed" },
      ]);
      expect(snapshot.invalidatedSessions).toEqual(["mod-1"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("confirmed underage moderation applies an indefinite underage suspension", async () => {
    const service = createStaffService();

    await expect(
      service.confirmUnderage({
        actorId: "mod-1",
        targetUserId: "user-1",
        internalNotes: "User confirmed they are under launch age.",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        targetUserId: "user-1",
        suspendedUntil: null,
        publicReason: "underage",
      },
    });

    expect(service.snapshot().users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "user-1",
          accountStatus: "suspended",
          suspendedUntil: null,
          suspensionPublicReason: "underage",
        }),
      ]),
    );
  });

  it("unsuspends allowed targets and invalidates existing sessions", async () => {
    const service = createInMemoryStaffService({
      users: [
        {
          id: "admin-1",
          email: "admin@example.com",
          emailVerified: true,
          role: "admin",
          accountStatus: "active",
          suspendedUntil: null,
          suspensionPublicReason: null,
        },
        {
          id: "user-1",
          email: "user@example.com",
          emailVerified: true,
          role: "user",
          accountStatus: "suspended",
          suspendedUntil: null,
          suspensionPublicReason: "terms_violation",
        },
      ],
      roleChangeAudits: [],
      moderationCases: [],
      invalidatedSessions: [],
    });

    await expect(
      service.unsuspendUser({
        actorId: "admin-1",
        targetUserId: "user-1",
        internalNotes: "Reviewed by support.",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { targetUserId: "user-1" },
    });

    const snapshot = service.snapshot();
    expect(snapshot.users.find((user) => user.id === "user-1")).toMatchObject({
      accountStatus: "active",
      suspendedUntil: null,
      suspensionPublicReason: null,
    });
    expect(snapshot.invalidatedSessions).toEqual(["user-1"]);
  });

  it("bootstraps exactly one verified owner idempotently with the one-time secret", async () => {
    const service = createOwnerBootstrapService();

    await expect(
      service.bootstrapOwner({
        email: "founder@example.com",
        secret: "setup-secret",
        expectedSecret: "setup-secret",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { ownerId: "founder-1", alreadyOwner: false },
    });

    await expect(
      service.bootstrapOwner({
        email: "founder@example.com",
        secret: "setup-secret",
        expectedSecret: "setup-secret",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { ownerId: "founder-1", alreadyOwner: true },
    });

    await expect(
      service.bootstrapOwner({
        email: "other@example.com",
        secret: "setup-secret",
        expectedSecret: "setup-secret",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "owner_already_exists" },
    });

    const snapshot = service.snapshot();
    expect(snapshot.users.find((user) => user.id === "founder-1")?.role).toBe("owner");
    expect(snapshot.users.find((user) => user.id === "other-1")?.role).toBe("user");
    expect(snapshot.invalidatedSessions).toEqual(["founder-1"]);
  });
});
