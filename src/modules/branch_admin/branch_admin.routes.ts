import { Router } from "express";
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

branchAdminRouter.post("/create-staff", createStaffHandler);
export default branchAdminRouter;
