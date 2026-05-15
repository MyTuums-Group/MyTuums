import { createLaunchReadinessService } from "./index.js";
import { launchReadinessRepository } from "./launch-readiness.adapter.js";

export const launchReadinessService = createLaunchReadinessService(
  launchReadinessRepository,
);
