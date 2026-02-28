import { Platform } from "../../generated/prisma/client.js";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  login,
  refresh,
  register,
  requestPasswordReset,
  resendCode,
  resetPassword,
  verifyEmail,
  verifyPasswordReset,
  verifyPhone,
} from "./auth.service.js";
// ─── Login ────────────────────────────────────────────────────────────────────

export const loginHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const result = await login(req.body, platformHeader);

  // if platform is web set refresh token in cookies
  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    // Remove refreshToken from body response for web
    delete result.refreshToken;
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});


export const registerHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  await register(req.body, platformHeader);
  successResponse(res, 201, t(tr.REGISTER_SUCCESS, lang));
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = req.body;
  await verifyEmail(email, code);
  successResponse(res, 200, t(tr.EMAIL_VERIFIED_SUCCESS, lang));
});

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = req.body;
  const platformHeader = req.headers["platform"];
  const result = await verifyPhone(email, code, platformHeader);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    delete result.refreshToken;
  }

  successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), result);
});

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordResetHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email } = req.body;
  await requestPasswordReset(email);
  successResponse(res, 200, t(tr.PASSWORD_RESET_EMAIL_SENT, lang));
});

export const verifyPasswordResetHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = req.body;
  const result = await verifyPasswordReset(email, code);
  successResponse(res, 200, t(tr.PASSWORD_RESET_OTP_VERIFIED, lang), result);
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { resetToken, newPassword } = req.body;
  await resetPassword(resetToken, newPassword);
  successResponse(res, 200, t(tr.PASSWORD_RESET_SUCCESS, lang));
});

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, phone, type } = req.body;
  await resendCode(email, phone, type);
  successResponse(res, 200, t(tr.VERIFICATION_CODE_SENT, lang));
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];

  // Priority: read from cookie on WEB, fallback to body
  const refreshToken =
    platformHeader === Platform.WEB
      ? req.cookies.refreshToken
      : req.body.refreshToken;

  const result = await refresh(refreshToken, platformHeader);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    delete result.refreshToken;
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});
