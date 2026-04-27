import { Platform } from "../../generated/prisma/client.js";
import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  login,
  logout,
  refresh,
  register,
  requestPasswordReset,
  resendCode,
  resetPassword,
  verifyEmail,
  verifyPasswordReset,
  verifyPhone,
} from "./auth.service.js";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  platformSchema,
  resendCodeSchema,
  resetPasswordSchema,
  validateAuthInput,
  verifyEmailSchema,
  verifyPasswordResetSchema,
  verifyPhoneSchema,
} from "./auth.validation.js";

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const data = validateAuthInput(loginSchema, req.body);
  const platform = validateAuthInput(platformSchema, platformHeader);
  const result = await login(data, platform);

  // if platform is web set refresh token in cookies
  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), responseBody);
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});


export const registerHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const data = validateAuthInput(registerSchema, req.body);
  const platform = validateAuthInput(platformSchema, platformHeader);
  await register(data, platform);
  successResponse(res, 201, t(tr.REGISTER_SUCCESS, lang));
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateAuthInput(verifyEmailSchema, req.body);
  await verifyEmail(email, code);
  successResponse(res, 200, t(tr.EMAIL_VERIFIED_SUCCESS, lang));
});

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateAuthInput(verifyPhoneSchema, req.body);
  const platformHeader = req.headers["platform"];
  const platform = validateAuthInput(platformSchema, platformHeader);
  const result = await verifyPhone(email, code, platform);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), responseBody);
  }

  successResponse(res, 200, t(tr.PHONE_VERIFIED_SUCCESS, lang), result);
});

// ─── Password Reset ───────────────────────────────────────────────────────────

export const requestPasswordResetHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email } = validateAuthInput(requestPasswordResetSchema, req.body);
  await requestPasswordReset(email);
  successResponse(res, 200, t(tr.PASSWORD_RESET_EMAIL_SENT, lang));
});

export const verifyPasswordResetHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateAuthInput(verifyPasswordResetSchema, req.body);
  const result = await verifyPasswordReset(email, code);
  successResponse(res, 200, t(tr.PASSWORD_RESET_OTP_VERIFIED, lang), result);
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { resetToken, newPassword } = validateAuthInput(resetPasswordSchema, req.body);
  await resetPassword(resetToken, newPassword);
  successResponse(res, 200, t(tr.PASSWORD_RESET_SUCCESS, lang));
});

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, phone, type } = validateAuthInput(resendCodeSchema, req.body);
  await resendCode(email, phone, type);
  successResponse(res, 200, t(tr.VERIFICATION_CODE_SENT, lang));
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const platform = validateAuthInput(platformSchema, platformHeader);

  // Priority: read from cookie on WEB, fallback to body
  const refreshToken =
    platformHeader === Platform.WEB
      ? req.cookies.refreshToken
      : req.body.refreshToken;

  const result = await refresh(refreshToken, platform);

  if (platformHeader === Platform.WEB) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { refreshToken: _refreshToken, ...responseBody } = result;
    return void successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), responseBody);
  }

  successResponse(res, 200, t(tr.LOGIN_SUCCESS, lang), result);
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  validateAuthInput(platformSchema, platformHeader);

  const refreshToken =
    platformHeader === Platform.WEB
      ? req.cookies.refreshToken
      : req.body.refreshToken;

  await logout(refreshToken);

  if (platformHeader === Platform.WEB) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  successResponse(res, 200, t("Logged out successfully.", lang));
});
