import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    getBranchAdminProfileHandler,
    updateBookingSettingsHandler,
    updateBranchAdminProfileHandler,
    updateBranchAvailabilityHandler,
    updateNotificationSettingsHandler,
} from "./profile.controller.js";

const profileRouter = Router();
const profileUploadField = imageOnlyUpload.fields([{ name: "logo", maxCount: 1 }]);

profileRouter.get(
  "/profile",
  authenticate,
  authorize(Role.branch_admin),
  getBranchAdminProfileHandler,
);

profileRouter.put(
  "/profile",
  authenticate,
  authorize(Role.branch_admin),
  profileUploadField,
  updateBranchAdminProfileHandler,
);

profileRouter.put(
  "/availability",
  authenticate,
  authorize(Role.branch_admin),
  updateBranchAvailabilityHandler,
);

profileRouter.put(
  "/booking-settings",
  authenticate,
  authorize(Role.branch_admin),
  updateBookingSettingsHandler,
);

profileRouter.put(
  "/notification-settings",
  authenticate,
  authorize(Role.branch_admin),
  updateNotificationSettingsHandler,
);

export default profileRouter;