import { createStaffService } from "./index.js";
import { staffRepository } from "./staff.adapter.js";

export const staffService = createStaffService(staffRepository);
