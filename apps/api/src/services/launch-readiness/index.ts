import type { AccountStatus, UserRole } from "@workspace/types";

export type LaunchReadinessUser = {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
};

export type LaunchReadinessReason =
  | "owner_required"
  | "single_owner_required"
  | "additional_staff_required";

export type LaunchReadiness = {
  publicSignupEnabled: boolean;
  mediaUploadsEnabled: boolean;
  reasons: LaunchReadinessReason[];
};

export type LaunchReadinessRepository = {
  listUsersForLaunchReadiness(): Promise<LaunchReadinessUser[]>;
};

export type LaunchReadinessService = {
  getReadiness(): Promise<LaunchReadiness>;
};

export function createLaunchReadinessService(
  repository: LaunchReadinessRepository,
): LaunchReadinessService {
  return {
    async getReadiness() {
      return computeLaunchReadiness(await repository.listUsersForLaunchReadiness());
    },
  };
}

export function createInMemoryLaunchReadinessService(state: {
  users: LaunchReadinessUser[];
}): LaunchReadinessService & { addUser(user: LaunchReadinessUser): void } {
  return {
    ...createLaunchReadinessService({
      listUsersForLaunchReadiness() {
        return Promise.resolve(state.users.map((user) => ({ ...user })));
      },
    }),
    addUser(user) {
      state.users.push(user);
    },
  };
}

export function computeLaunchReadiness(
  users: LaunchReadinessUser[],
): LaunchReadiness {
  const activeOwners = users.filter(
    (user) => user.accountStatus === "active" && user.role === "owner",
  );
  const reasons: LaunchReadinessReason[] = [];

  if (activeOwners.length === 0) {
    reasons.push("owner_required");
  } else if (activeOwners.length > 1) {
    reasons.push("single_owner_required");
  }

  const hasAdditionalStaff = users.some(
    (user) =>
      user.accountStatus === "active" &&
      (user.role === "moderator" || user.role === "admin"),
  );
  if (!hasAdditionalStaff) {
    reasons.push("additional_staff_required");
  }

  const enabled = reasons.length === 0;
  return {
    publicSignupEnabled: enabled,
    mediaUploadsEnabled: enabled,
    reasons,
  };
}
