import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationAdapter, ViewerContext } from "@workspace/types";
import { getByUsername } from "../services/profile/profile.js";
import * as profileAdapter from "../services/profile/profile.adapter.js";
import type { ProfileRow } from "../services/profile/profile.adapter.js";

vi.mock("../services/profile/profile.adapter.js", () => ({
  findByUsername: vi.fn(),
  existsByUserId: vi.fn(),
  insert: vi.fn(),
}));

const publicViewer: ViewerContext | null = null;
const loggedInViewer: ViewerContext = {
  isAuthenticated: true,
  userId: "viewer-1",
  role: "user",
  accountStatus: "active",
  blockedUserIds: [],
  blockedByUserIds: [],
};

const profileRow: ProfileRow = {
  id: "profile-1",
  userId: "profile-owner-1",
  username: "alice",
  displayName: "Alice",
  bio: "Plays co-op games.",
  avatarMediaId: null,
  bannerMediaId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function authorizationAdapter(canView: boolean): {
  adapter: AuthorizationAdapter;
  canView: ReturnType<typeof vi.fn>;
} {
  const canViewMock = vi.fn(() => canView);

  return {
    adapter: {
      getViewerContext: vi.fn(),
      canView: canViewMock,
      filterVisible: vi.fn(),
    },
    canView: canViewMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Profile access module", () => {
  it("returns not_found when no Profile exists for the Username", async () => {
    vi.mocked(profileAdapter.findByUsername).mockResolvedValue(undefined);

    const result = await getByUsername(
      "missing",
      publicViewer,
      authorizationAdapter(true).adapter,
    );

    expect(result).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(profileAdapter.findByUsername).toHaveBeenCalledWith("missing");
  });

  it("allows visible logged-out public Profile access without consulting Authorization", async () => {
    vi.mocked(profileAdapter.findByUsername).mockResolvedValue(profileRow);
    const authorization = authorizationAdapter(false);

    const result = await getByUsername("alice", publicViewer, authorization.adapter);

    expect(result).toEqual({
      ok: true,
      value: {
        username: "alice",
        displayName: "Alice",
        bio: "Plays co-op games.",
        createdAt: profileRow.createdAt,
      },
    });
    expect(authorization.canView).not.toHaveBeenCalled();
  });

  it("allows visible logged-in Profile access through the Authorization seam", async () => {
    vi.mocked(profileAdapter.findByUsername).mockResolvedValue(profileRow);
    const authorization = authorizationAdapter(true);

    const result = await getByUsername("alice", loggedInViewer, authorization.adapter);

    expect(result.ok).toBe(true);
    expect(authorization.canView).toHaveBeenCalledWith(loggedInViewer, {
      type: "profile",
      userId: "profile-owner-1",
    });
  });

  it("returns not_visible when Authorization denies logged-in Profile access", async () => {
    vi.mocked(profileAdapter.findByUsername).mockResolvedValue(profileRow);
    const authorization = authorizationAdapter(false);

    const result = await getByUsername("alice", loggedInViewer, authorization.adapter);

    expect(result).toEqual({ ok: false, error: { kind: "not_visible" } });
    expect(authorization.canView).toHaveBeenCalledWith(loggedInViewer, {
      type: "profile",
      userId: "profile-owner-1",
    });
  });
});
