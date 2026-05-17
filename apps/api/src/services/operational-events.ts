import type {
  MediaPurpose,
  ModerationActionType,
  ReportReason,
  ReportTargetType,
} from "@workspace/types"

export type OperationalEvent =
  | {
      event: "signup_completed"
      userId: string
      status: "completed"
      authProvider: "email"
    }
  | {
      event: "account_deletion_requested"
      userId: string
      status: "requested"
    }
  | {
      event: "account_deletion_completed"
      userId: string
      status: "completed"
      deletedAt: string
      emailHeldUntil: string
      usernameHeldUntil: string | null
    }
  | {
      event: "post_created"
      postId: string
      publicId: string
      authorId: string
      status: "created"
      gameTagId: string | null
      mediaAttachmentId: string | null
    }
  | {
      event: "post_deleted"
      postId: string
      publicId: string
      authorId: string
      status: "deleted"
      deletedAt: string
    }
  | {
      event: "comment_created"
      commentId: string
      postId: string
      authorId: string
      status: "created"
    }
  | {
      event: "comment_deleted"
      commentId: string
      postId: string
      authorId: string
      status: "deleted"
      deletedAt: string
    }
  | {
      event: "media_upload_completed"
      mediaId: string
      userId: string
      purpose: MediaPurpose
      status: "ready"
      mediaKind: "image" | "video" | null
      byteSize: number
    }
  | {
      event: "media_upload_failed"
      mediaId: string
      userId: string
      purpose: MediaPurpose
      status: "failed"
      reason: "blob_not_found" | "blob_size_mismatch" | "blob_type_mismatch"
      mediaKind: "image" | "video" | null
      byteSize: number
    }
  | {
      event: "media_cleanup_completed"
      status: "completed" | "completed_with_failures"
      scanned: number
      deletedBlobs: number
      removedRows: number
      failedCount: number
    }
  | {
      event: "follow_created"
      followerId: string
      followedId: string
      status: "following"
    }
  | {
      event: "report_submitted"
      reportId: string
      moderationCaseId: string
      reporterId: string
      targetType: ReportTargetType
      targetId: string
      reason: ReportReason
      status: "submitted"
    }
  | {
      event: "moderation_action_taken"
      caseId: string
      actorId: string
      targetType: ReportTargetType
      targetId: string
      action: ModerationActionType
      reason: ReportReason
      status: "taken"
    }

export type OperationalLogRecord = OperationalEvent & {
  schemaVersion: 1
  emittedAt: string
}

export type OperationalEventLogger = {
  emit(event: OperationalEvent): void | Promise<void>
}

export const noopOperationalEventLogger: OperationalEventLogger = {
  emit() {
    // Intentionally empty for pure service tests and local fakes.
  },
}

export const operationalEventLogger: OperationalEventLogger = {
  emit(event) {
    console.log(JSON.stringify(toOperationalLogRecord(event)))
  },
}

export async function emitOperationalEvent(
  logger: OperationalEventLogger,
  event: OperationalEvent
): Promise<void> {
  try {
    await logger.emit(event)
  } catch {
    console.error(
      JSON.stringify({
        event: "operational_event_logging_failed",
        schemaVersion: 1,
        emittedAt: new Date().toISOString(),
        failedEvent: event.event,
        reason: "logger_error",
      })
    )
  }
}

export function toOperationalLogRecord(
  event: OperationalEvent,
  emittedAt: Date = new Date()
): OperationalLogRecord {
  return {
    schemaVersion: 1,
    emittedAt: emittedAt.toISOString(),
    ...event,
  }
}

export function createMemoryOperationalEventLogger(): OperationalEventLogger & {
  events: OperationalEvent[]
} {
  const events: OperationalEvent[] = []
  return {
    events,
    emit(event) {
      events.push({ ...event })
    },
  }
}
