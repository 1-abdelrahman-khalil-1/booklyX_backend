import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { requireActiveBranchSubscription } from "../../../middleware/branchAdminSubscription.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    createStaffHandler,
    deleteStaffHandler,
    getMyStaffByIdHandler,
    getMyStaffHandler,
    restoreStaffHandler,
    updateStaffHandler,
} from "./staff.controller.js";

const staffRouter = Router();
const staffUploadField = imageOnlyUpload.fields([{ name: "profile_image", maxCount: 1 }]);

staffRouter.use(authenticate, authorize(Role.branch_admin), requireActiveBranchSubscription);

staffRouter.get("/", getMyStaffHandler);
staffRouter.post("/", staffUploadField, createStaffHandler);
staffRouter.get("/:id", getMyStaffByIdHandler);
staffRouter.put("/:id", staffUploadField, updateStaffHandler);
staffRouter.delete("/:id", deleteStaffHandler);
staffRouter.patch("/:id/restore", restoreStaffHandler);

export default staffRouter;