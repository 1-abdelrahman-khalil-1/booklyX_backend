import { Request, Response } from "express";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { errorResponse, successResponse } from "../../utils/response.js";
import {
    AuthValidationError,
    DuplicateAccountError,
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
    login,
    MaxAttemptsExceededError,
    PlatformAccessDeniedError,
    register,
    requestPasswordReset,
    resetPassword,
    sendPhoneVerification,
    sendVerificationEmail,
    TokenExpiredError,
    UserNotFound,
    verifyEmail,
    verifyPasswordReset,
    verifyPhone,
} from "./auth.service.js";

export async function loginHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const platformHeader = req.headers["platform"];
        const result = await login(req.body, platformHeader);
        successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
    } catch (error) {
        if (error instanceof AuthValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof InvalidCredentialsError)
            return void errorResponse(res, 401, t(error.message, lang));
        if (error instanceof InactiveUserError)
            return void errorResponse(res, 403, t(error.message, lang));
        if (error instanceof PlatformAccessDeniedError)
            return void errorResponse(res, 403, t(error.message, lang));
        console.error("Unexpected error in loginHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const platformHeader = req.headers["platform"];
        const result = await register(req.body, platformHeader);
        successResponse(res, 201, t(tr.REGISTER_SUCCESS, lang), result);
    } catch (error) {
        if (error instanceof AuthValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        if (error instanceof DuplicateAccountError)
            return void errorResponse(res, 409, t(error.message, lang));
        if (error instanceof PlatformAccessDeniedError)
            return void errorResponse(res, 403, t(error.message, lang));
        console.error("Unexpected error in registerHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function sendVerificationEmailHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email } = req.body;
        await sendVerificationEmail(email);
        successResponse(res, 200, t(tr.VERIFICATION_EMAIL_SENT, lang));
    } catch (error) {
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof AuthValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        console.error("Unexpected error in sendVerificationEmailHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function verifyEmailHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email, code } = req.body;
        await verifyEmail(email, code);
        successResponse(res, 200, t(tr.EMAIL_VERIFIED_SUCCESS, lang));
    } catch (error) {
        if (error instanceof MaxAttemptsExceededError)
            return void errorResponse(res, 429, t(error.message, lang));
        if (error instanceof TokenExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof InvalidTokenError)
            return void errorResponse(res, 400, t(tr.INVALID_CODE, lang));
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        console.error("Unexpected error in verifyEmailHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function sendPhoneVerificationHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        if (!req.user) return void errorResponse(res, 401, t(tr.AUTH_REQUIRED, lang));
        await sendPhoneVerification(req.user.sub);
        successResponse(res, 200, t(tr.VERIFICATION_CODE_SENT, lang));
    } catch (error) {
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        if (error instanceof AuthValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        console.error("Unexpected error in sendPhoneVerificationHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function verifyPhoneHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        if (!req.user) return void errorResponse(res, 401, t(tr.AUTH_REQUIRED, lang));
        const { code } = req.body;
        await verifyPhone(req.user.sub, code);
        successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang));
    } catch (error) {
        if (error instanceof MaxAttemptsExceededError)
            return void errorResponse(res, 429, t(error.message, lang));
        if (error instanceof TokenExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof InvalidTokenError)
            return void errorResponse(res, 400, t(tr.INVALID_CODE, lang));
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        console.error("Unexpected error in verifyPhoneHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function requestPasswordResetHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email } = req.body;
        await requestPasswordReset(email);
        successResponse(res, 200, t(tr.PASSWORD_RESET_EMAIL_SENT, lang));
    } catch (error) {
        console.error("Unexpected error in requestPasswordResetHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function verifyPasswordResetHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { email, code } = req.body;
        const result = await verifyPasswordReset(email, code);
        successResponse(res, 200, t(tr.PASSWORD_RESET_OTP_VERIFIED, lang), result);
    } catch (error) {
        if (error instanceof MaxAttemptsExceededError)
            return void errorResponse(res, 429, t(error.message, lang));
        if (error instanceof TokenExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof InvalidTokenError)
            return void errorResponse(res, 400, t(tr.INVALID_CODE, lang));
        if (error instanceof UserNotFound)
            return void errorResponse(res, 404, t(error.message, lang));
        console.error("Unexpected error in verifyPasswordResetHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
    const lang = getLanguage(req);
    try {
        const { resetToken, newPassword } = req.body;
        await resetPassword(resetToken, newPassword);
        successResponse(res, 200, t(tr.PASSWORD_RESET_SUCCESS, lang));
    } catch (error) {
        if (error instanceof InvalidTokenError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof TokenExpiredError)
            return void errorResponse(res, 400, t(error.message, lang));
        if (error instanceof AuthValidationError)
            return void errorResponse(res, 400, t(error.message, lang, error.params));
        console.error("Unexpected error in resetPasswordHandler:", error);
        errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    }
}

