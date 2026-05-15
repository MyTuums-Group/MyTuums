import { describe, expect, it } from "vitest";
import { createInMemoryModerationService } from "../services/moderation/moderation.core.js";

const baseDate = new Date("2026-01-01T00:00:00.000Z");

function createService(
  overrides: {
    postUpdatedAt?: Date;
    postCommentCount?: number;
    comments?: Array<{
      id: string;
      postId: string;
      authorId: string;
      text: string;
      deletedAt: Date | null;
      removedAt: Date | null;
      removalPublicReason: string | null;
      updatedAt: Date;
    }>;
  } = {},
) {
  return createInMemoryModerationService({
    users: [
      { id: "alice", role: "user", accountStatus: "active" },
      { id: "bob", role: "user", accountStatus: "active" },
      { id: "carol", role: "user", accountStatus: "active" },
      { id: "mod", role: "moderator", accountStatus: "active" },
      { id: "admin", role: "admin", accountStatus: "active" },
      { id: "post-author", role: "user", accountStatus: "active" },
    ],
    profiles: [
      {
        id: "profile-author",
        userId: "post-author",
        username: "author",
      },
    ],
    posts: [
      {
        id: "post-1",
        publicId: "pub_00000001",
        authorId: "post-author",
        text: "Visible post",
        commentCount: overrides.postCommentCount ?? 0,
        deletedAt: null,
        removedAt: null,
        removalPublicReason: null,
        updatedAt: overrides.postUpdatedAt ?? baseDate,
      },
    ],
    comments: overrides.comments ?? [],
    blocks: [],
    reports: [],
    cases: [],
    actions: [],
    notifications: [],
    now: () => baseDate,
  });
}

describe("moderation service", () => {
  it("creates one open case per reported target and prevents duplicate active reports", async () => {
    const service = createService();

    const firstReport = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "spam",
      notes: "This looks automated.",
    });

    expect(firstReport).toMatchObject({
      ok: true,
      value: {
        reporterId: "alice",
        targetType: "post",
        targetId: "post-1",
        reason: "spam",
        notes: "This looks automated.",
      },
    });

    if (!firstReport.ok) {
      throw new Error("Expected the first report to succeed.");
    }

    expect(service.snapshot().cases).toMatchObject([
      {
        id: firstReport.value.moderationCaseId,
        targetType: "post",
        targetId: "post-1",
        status: "open",
        priority: "normal",
      },
    ]);

    await expect(
      service.submitReport({
        reporterId: "alice",
        target: { type: "post", publicId: "pub_00000001" },
        reason: "spam",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "duplicate_report" },
    });

    const secondReport = await service.submitReport({
      reporterId: "bob",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "harassment",
    });

    expect(secondReport).toMatchObject({
      ok: true,
      value: {
        reporterId: "bob",
        moderationCaseId: firstReport.value.moderationCaseId,
      },
    });
    expect(service.snapshot().cases).toHaveLength(1);
    expect(service.snapshot().reports).toHaveLength(2);
  });

  it("derives urgent priority from urgent reasons or report volume within 24 hours", async () => {
    const service = createService();

    const urgentReason = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "privacy",
    });

    expect(urgentReason).toMatchObject({ ok: true });
    expect(service.snapshot().cases[0]).toMatchObject({
      priority: "urgent",
    });

    const volumeService = createService();
    for (const reporterId of ["alice", "bob", "carol"]) {
      const result = await volumeService.submitReport({
        reporterId,
        target: { type: "post", publicId: "pub_00000001" },
        reason: "spam",
      });
      expect(result).toMatchObject({ ok: true });
    }

    expect(volumeService.snapshot().cases[0]).toMatchObject({
      priority: "urgent",
    });
  });

  it("lets staff claim, reassign, and unassign cases", async () => {
    const service = createService();
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "spam",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(
      service.claimCase({
        actorId: "alice",
        caseId: report.value.moderationCaseId,
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "forbidden" },
    });

    await expect(
      service.claimCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        status: "reviewing",
        assigneeId: "mod",
      },
    });

    await expect(
      service.assignCase({
        actorId: "admin",
        caseId: report.value.moderationCaseId,
        assigneeId: "admin",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        status: "reviewing",
        assigneeId: "admin",
      },
    });

    await expect(
      service.unassignCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        status: "open",
        assigneeId: null,
      },
    });
  });

  it("requires internal notes when staff dismisses a case and appends an audit action", async () => {
    const service = createService();
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "spam",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(
      service.dismissCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        reason: "spam",
        internalNotes: "   ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "internal_notes_required" },
    });

    await expect(
      service.dismissCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        reason: "spam",
        internalNotes: "No policy violation after review.",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        status: "dismissed",
        resolvedAt: baseDate,
      },
    });

    expect(service.snapshot().actions).toMatchObject([
      {
        caseId: report.value.moderationCaseId,
        actorId: "mod",
        action: "dismiss_case",
        reason: "spam",
        publicReason: null,
        internalNotes: "No policy violation after review.",
      },
    ]);
  });

  it("removes post content with audit history and one author notification", async () => {
    const service = createService();
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "harassment",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(
      service.actionCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        action: "remove_post",
        reason: "harassment",
        publicReason: "harassment",
        internalNotes: "Direct targeted abuse.",
        expectedTargetUpdatedAt: baseDate,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        status: "actioned",
        resolvedAt: baseDate,
      },
    });

    expect(service.snapshot().posts[0]).toMatchObject({
      removedAt: baseDate,
      removalPublicReason: "harassment",
      updatedAt: baseDate,
    });
    expect(service.snapshot().actions).toMatchObject([
      {
        caseId: report.value.moderationCaseId,
        actorId: "mod",
        action: "remove_post",
        reason: "harassment",
        publicReason: "harassment",
        internalNotes: "Direct targeted abuse.",
      },
    ]);
    expect(service.snapshot().notifications).toEqual([
      {
        recipientId: "post-author",
        type: "content_removed",
        actorId: "mod",
        data: {
          targetType: "post",
          targetId: "post-1",
          publicReason: "harassment",
        },
        isRead: false,
      },
    ]);

    await service.actionCase({
      actorId: "mod",
      caseId: report.value.moderationCaseId,
      action: "remove_post",
      reason: "harassment",
      publicReason: "harassment",
      internalNotes: "Retry after timeout.",
      expectedTargetUpdatedAt: baseDate,
    });

    expect(service.snapshot().actions).toHaveLength(1);
    expect(service.snapshot().notifications).toHaveLength(1);
  });

  it("blocks stale content actions unless staff chooses a conflict override", async () => {
    const changedAt = new Date("2026-01-01T00:05:00.000Z");
    const service = createService({ postUpdatedAt: changedAt });
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "harassment",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(
      service.actionCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        action: "remove_post",
        reason: "harassment",
        publicReason: "harassment",
        internalNotes: "Loaded before the post changed.",
        expectedTargetUpdatedAt: baseDate,
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "target_conflict" },
    });
    expect(service.snapshot().posts[0]?.removedAt).toBeNull();
    expect(service.snapshot().actions).toHaveLength(0);

    await expect(
      service.actionCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        action: "remove_post",
        reason: "harassment",
        publicReason: "harassment",
        internalNotes: "Reviewed the changed content and chose override.",
        expectedTargetUpdatedAt: baseDate,
        conflictOverride: true,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { status: "actioned" },
    });
    expect(service.snapshot().actions).toMatchObject([
      {
        action: "remove_post",
        conflictOverride: true,
      },
    ]);
  });

  it("restores removed post content without deleting historical removal notifications", async () => {
    const service = createService();
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "harassment",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await service.actionCase({
      actorId: "mod",
      caseId: report.value.moderationCaseId,
      action: "remove_post",
      reason: "harassment",
      publicReason: "harassment",
      internalNotes: "Remove before restore test.",
      expectedTargetUpdatedAt: baseDate,
    });

    await expect(
      service.actionCase({
        actorId: "admin",
        caseId: report.value.moderationCaseId,
        action: "restore_post",
        reason: "other",
        internalNotes: "Removal was mistaken.",
        expectedTargetUpdatedAt: baseDate,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { status: "actioned" },
    });

    expect(service.snapshot().posts[0]).toMatchObject({
      removedAt: null,
      removalPublicReason: null,
    });
    expect(service.snapshot().actions.map((action) => action.action)).toEqual([
      "remove_post",
      "restore_post",
    ]);
    expect(service.snapshot().notifications).toHaveLength(1);
  });

  it("removes and restores comments while keeping post comment counts consistent", async () => {
    const service = createService({
      postCommentCount: 1,
      comments: [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "bob",
          text: "Comment under review",
          deletedAt: null,
          removedAt: null,
          removalPublicReason: null,
          updatedAt: baseDate,
        },
      ],
    });
    const report = await service.submitReport({
      reporterId: "alice",
      target: { type: "comment", commentId: "comment-1" },
      reason: "spam",
    });

    if (!report.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(
      service.actionCase({
        actorId: "mod",
        caseId: report.value.moderationCaseId,
        action: "remove_comment",
        reason: "spam",
        publicReason: "spam",
        internalNotes: "Spam link hidden.",
        expectedTargetUpdatedAt: baseDate,
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(service.snapshot().comments[0]).toMatchObject({
      removedAt: baseDate,
      removalPublicReason: "spam",
    });
    expect(service.snapshot().posts[0]?.commentCount).toBe(0);

    await expect(
      service.actionCase({
        actorId: "admin",
        caseId: report.value.moderationCaseId,
        action: "restore_comment",
        reason: "other",
        internalNotes: "Comment was acceptable.",
        expectedTargetUpdatedAt: baseDate,
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(service.snapshot().comments[0]).toMatchObject({
      removedAt: null,
      removalPublicReason: null,
    });
    expect(service.snapshot().posts[0]?.commentCount).toBe(1);
    expect(service.snapshot().notifications).toHaveLength(1);
  });

  it("lists urgent cases first and exposes private report details only to staff", async () => {
    const service = createService();
    const normalReport = await service.submitReport({
      reporterId: "alice",
      target: { type: "post", publicId: "pub_00000001" },
      reason: "spam",
      notes: "Looks like a bot.",
    });
    const urgentReport = await service.submitReport({
      reporterId: "bob",
      target: { type: "profile", username: "author" },
      reason: "privacy",
      notes: "Contains private information.",
    });

    if (!normalReport.ok || !urgentReport.ok) {
      throw new Error("Expected report creation to succeed.");
    }

    await expect(service.listCases({ actorId: "alice" })).resolves.toEqual({
      ok: false,
      error: { kind: "forbidden" },
    });

    await expect(service.listCases({ actorId: "mod" })).resolves.toMatchObject({
      ok: true,
      value: [
        {
          id: urgentReport.value.moderationCaseId,
          priority: "urgent",
          reportCount: 1,
        },
        {
          id: normalReport.value.moderationCaseId,
          priority: "normal",
          reportCount: 1,
        },
      ],
    });

    await expect(
      service.getCase({
        actorId: "mod",
        caseId: normalReport.value.moderationCaseId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: normalReport.value.moderationCaseId,
        reports: [
          {
            reporterId: "alice",
            notes: "Looks like a bot.",
          },
        ],
        actions: [],
      },
    });
  });
});
