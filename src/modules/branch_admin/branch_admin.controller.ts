import { Request, Response } from "express";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import {
    ApplicationNotFound,
    applyAsBranchAdmin,
    BranchAdminValidationError,
    DuplicateApplicationError,
    InvalidOTPError,
    MaxAttemptsExceededError,
    OTPExpiredError,
    resendApplicationCode,
    verifyApplicationEmail,
    verifyApplicationPhone,
} from "./branch_admin.service.js";

// ─── Apply Handler ───────────────────────────────────────────────────────────

export async function applyHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const result = await applyAsBranchAdmin(req.body);
        successResponse(res, 201, t(result.message, lang));
    } catch (error) {
        if (error instanceof BranchAdminValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof DuplicateApplicationError)
            return void errorResponse(res, 409, t(error.message, lang));
        console.error("Unexpected error in applyHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Verify Email Handler ─────────────────────────────────────────────────────

export async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email, code } = req.body;
        const result = await verifyApplicationEmail(email, code);
        successResponse(res, 200, t(result.message, lang));
    } catch (error) {
        if (error instanceof BranchAdminValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof InvalidOTPError)
            return void errorResponse(res, 400, t(tr.INVALID_CODE, lang));
        if (error instanceof OTPExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof MaxAttemptsExceededError)
            return void errorResponse(res, 429, t(error.message, lang));
        console.error("Unexpected error in verifyEmailHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Verify Phone Handler ─────────────────────────────────────────────────────

export async function verifyPhoneHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email, code } = req.body;
        const result = await verifyApplicationPhone(email, code);
        successResponse(res, 200, t(result.message, lang));
    } catch (error) {
        if (error instanceof BranchAdminValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof InvalidOTPError)
            return void errorResponse(res, 400, t(tr.INVALID_CODE, lang));
        if (error instanceof OTPExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof MaxAttemptsExceededError)
            return void errorResponse(res, 429, t(error.message, lang));
        console.error("Unexpected error in verifyPhoneHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

// ─── Resend Code Handler ──────────────────────────────────────────────────────

export async function resendCodeHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email, type } = req.body;
        const result = await resendApplicationCode(email, type);
        successResponse(res, 200, t(result.message, lang));
    } catch (error) {
        if (error instanceof BranchAdminValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof ApplicationNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        console.error("Unexpected error in resendCodeHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}
