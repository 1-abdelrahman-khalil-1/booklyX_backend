import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { registerSchema, resendCodeSchema, validateAuthInput, verifyEmailSchema } from "../auth.validation.js";
import { register, resendCode, verifyEmail } from "./registration.service.js";

export const registerHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const platformHeader = req.headers["platform"];
  const data = validateAuthInput(registerSchema, req.body);
  const platform = validateAuthInput(undefined, platformHeader);
  await register(data, platform);
  successResponse(res, 201, t(tr.REGISTER_SUCCESS, lang));
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateAuthInput(verifyEmailSchema, req.body);
  await verifyEmail(email, code);
  successResponse(res, 200, t(tr.EMAIL_VERIFIED_SUCCESS, lang));
});

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, phone, type } = validateAuthInput(resendCodeSchema, req.body);
  await resendCode(email, phone, type);
  successResponse(res, 200, t(tr.VERIFICATION_CODE_SENT, lang));
});
