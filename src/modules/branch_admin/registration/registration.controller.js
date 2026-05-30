import { getLanguage, t } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { applySchema, resendCodeSchema, validateBranchAdminInput, verifyEmailSchema, verifyPhoneSchema } from "../branch_admin.validation.js";
import { buildBranchPayload } from "../helpers.js";
import { resendBranchCode, submitBranch, verifyBranchEmail, verifyBranchPhone } from "./registration.service.js";

export const applyHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(applySchema, buildBranchPayload(req));
  const result = await submitBranch(data);
  successResponse(res, 201, t(result.message, lang), result.branch);
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateBranchAdminInput(verifyEmailSchema, req.body);
  const result = await verifyBranchEmail(email, code);
  successResponse(res, 200, t(result.message, lang));
});

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateBranchAdminInput(verifyPhoneSchema, req.body);
  const result = await verifyBranchPhone(email, code);
  successResponse(res, 200, t(result.message, lang));
});

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, type } = validateBranchAdminInput(resendCodeSchema, req.body);
  const result = await resendBranchCode(email, type);
  successResponse(res, 200, t(result.message, lang));
});