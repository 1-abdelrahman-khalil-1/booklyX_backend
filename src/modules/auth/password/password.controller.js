import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { requestPasswordResetSchema, resetPasswordSchema, validateAuthInput, verifyPasswordResetSchema } from "../auth.validation.js";
import { requestPasswordReset, resetPassword, verifyPasswordReset } from "./password.service.js";

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
