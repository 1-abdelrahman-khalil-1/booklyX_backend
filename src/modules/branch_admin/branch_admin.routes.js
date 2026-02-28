import { Router } from "express";
import { Role } from "../../generated/prisma/client.js";
import { authenticate, authorize } from "../../middleware/authenticate.js";
import {
    applyHandler,
    createStaffHandler,
    resendCodeHandler,
    verifyEmailHandler,
    verifyPhoneHandler,
} from "./branch_admin.controller.js";

const branchAdminRouter = Router();

branchAdminRouter.post("/apply", applyHandler);

branchAdminRouter.post("/verify-email", verifyEmailHandler);

branchAdminRouter.post("/verify-phone", verifyPhoneHandler);

branchAdminRouter.post("/resend-code", resendCodeHandler);

branchAdminRouter.post(
  "/create-staff",
  authenticate,
  authorize(Role.branch_admin),
  createStaffHandler,
);
export default branchAdminRouter;
