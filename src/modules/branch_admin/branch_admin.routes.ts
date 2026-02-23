import { Router } from "express";
import {
    applyHandler,
    resendCodeHandler,
    verifyEmailHandler,
    verifyPhoneHandler,
} from "./branch_admin.controller.js";

const branchAdminRouter = Router();

/**
 * @route   POST /branch-admin/apply
 * @desc    Initial application step for new Branch Admins.
 * @access  Public
 */
branchAdminRouter.post("/apply", applyHandler);

/**
 * @route   POST /branch-admin/verify-email
 * @desc    Verify email using OTP sent during application.
 * @access  Public
 */
branchAdminRouter.post("/verify-email", verifyEmailHandler);

/**
 * @route   POST /branch-admin/verify-phone
 * @desc    Verify phone using OTP sent after email verification.
 * @access  Public
 */
branchAdminRouter.post("/verify-phone", verifyPhoneHandler);

/**
 * @route   POST /branch-admin/resend-code
 * @desc    Resend verification code (EMAIL or PHONE).
 * @access  Public
 */
branchAdminRouter.post("/resend-code", resendCodeHandler);

export default branchAdminRouter;
