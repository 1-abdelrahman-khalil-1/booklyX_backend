import { Request, Response } from "express";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
    login,
    register,
    requestPasswordReset,
    resendCode,
    resetPassword,
    verifyEmail,
    verifyPasswordReset,
    verifyPhone
} from "./auth.service.js";

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const platformHeader = req.headers["platform"];
    const result = await login(req.body, platformHeader);
    successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Register response: 201 with no token.
 * The user must complete email + phone verification before they can log in.
 * An email OTP is automatically sent by the service.
 */
export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const platformHeader = req.headers["platform"];
    await register(req.body, platformHeader);
    successResponse(res, 201, t(tr.REGISTER_SUCCESS, lang));
});

// ─── Email Verification ───────────────────────────────────────────────────────

/**
 * Verify Email response: 200 with no token.
 * The service automatically sends a phone OTP after successful verification.
 */
export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { email, code } = req.body;
    await verifyEmail(email, code);
    successResponse(res, 200, t(tr.EMAIL_VERIFIED_SUCCESS, lang));
});

// ─── Phone Verification ───────────────────────────────────────────────────────

/**
 * Verify Phone response: 200 with token + user.
 * This is the final step — after this the user is fully registered and logged in.
 */
export const verifyPhoneHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { email, code } = req.body;
    const platformHeader = req.headers["platform"];
    const result = await verifyPhone(email, code, platformHeader);
    successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), result);
});

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { email } = req.body;
    await requestPasswordReset(email);
    successResponse(res, 200, t(tr.PASSWORD_RESET_EMAIL_SENT, lang));
});

export const verifyPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { email, code } = req.body;
    const result = await verifyPasswordReset(email, code);
    successResponse(res, 200, t(tr.PASSWORD_RESET_OTP_VERIFIED, lang), result);
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { resetToken, newPassword } = req.body;
    await resetPassword(resetToken, newPassword);
    successResponse(res, 200, t(tr.PASSWORD_RESET_SUCCESS, lang));
});

export const resendCodeHandler = asyncHandler(async (req: Request, res: Response) => {
    const lang = getLanguage(req);
    const { email, phone, type } = req.body;
    await resendCode(email, phone, type);
    successResponse(res, 200, t(tr.VERIFICATION_CODE_SENT, lang));
});
