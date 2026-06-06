import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import { imageOnlyUpload } from "../../../middleware/upload.js";
import {
    createStaffHandler,
    deleteStaffHandler,
    getMyStaffByIdHandler,
    getMyStaffHandler,
    updateStaffHandler,
} from "./staff.controller.js";

const staffRouter = Router();
const staffUploadField = imageOnlyUpload.fields([{ name: "profile_image", maxCount: 1 }]);

staffRouter.get("/", authenticate, authorize(Role.branch_admin), getMyStaffHandler);
staffRouter.post(
  "/",
  authenticate,
  authorize(Role.branch_admin),
  staffUploadField,
  createStaffHandler,
);
staffRouter.get("/:id", authenticate, authorize(Role.branch_admin), getMyStaffByIdHandler);
staffRouter.put(
  "/:id",
  authenticate,
  authorize(Role.branch_admin),
  staffUploadField,
  updateStaffHandler,
);
staffRouter.delete("/:id", authenticate, authorize(Role.branch_admin), deleteStaffHandler);

export default staffRouter;