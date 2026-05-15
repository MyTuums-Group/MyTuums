import { describe, expect, it } from "vitest";
import { createInMemoryLaunchReadinessService } from "../services/launch-readiness/index.js";

describe("Launch readiness service", () => {
  it("keeps public signup and media uploads disabled until owner plus one staff exist", async () => {
    const service = createInMemoryLaunchReadinessService({
      users: [
        { id: "owner-1", role: "owner", accountStatus: "active" },
        { id: "user-1", role: "user", accountStatus: "active" },
      ],
    });

    await expect(service.getReadiness()).resolves.toEqual({
      publicSignupEnabled: false,
      mediaUploadsEnabled: false,
      reasons: ["additional_staff_required"],
    });

    service.addUser({ id: "mod-1", role: "moderator", accountStatus: "active" });

    await expect(service.getReadiness()).resolves.toEqual({
      publicSignupEnabled: true,
      mediaUploadsEnabled: true,
      reasons: [],
    });
  });

  it("requires one active owner and treats duplicate owners as not launch-ready", async () => {
    await expect(
      createInMemoryLaunchReadinessService({
        users: [{ id: "admin-1", role: "admin", accountStatus: "active" }],
      }).getReadiness(),
    ).resolves.toMatchObject({
      publicSignupEnabled: false,
      reasons: ["owner_required"],
    });

    await expect(
      createInMemoryLaunchReadinessService({
        users: [
          { id: "owner-1", role: "owner", accountStatus: "active" },
          { id: "owner-2", role: "owner", accountStatus: "active" },
          { id: "mod-1", role: "moderator", accountStatus: "active" },
        ],
      }).getReadiness(),
    ).resolves.toMatchObject({
      publicSignupEnabled: false,
      reasons: ["single_owner_required"],
    });
  });
});
