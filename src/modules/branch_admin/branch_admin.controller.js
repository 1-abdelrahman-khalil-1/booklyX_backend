import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
    createStaff,
    resendApplicationCode,
    submitApplication,
    verifyApplicationEmail,
    verifyApplicationPhone,
} from "./branch_admin.service.js";

// ─── Apply Handler ───────────────────────────────────────────────────────────

export const applyHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await submitApplication(req.body);
  successResponse(res, 201, t(result.message, lang));
});

// ─── Verify Email Handler ─────────────────────────────────────────────────────

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = req.body;
  const result = await verifyApplicationEmail(email, code);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Verify Phone Handler ─────────────────────────────────────────────────────

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = req.body;
  const result = await verifyApplicationPhone(email, code);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Resend Code Handler ──────────────────────────────────────────────────────

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, type } = req.body;
  const result = await resendApplicationCode(email, type);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Create Staff Handler ─────────────────────────────────────────────────────

export const createStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await createStaff(req.body, req.user.sub);
  successResponse(res, 201, t(tr.STAFF_CREATED, lang), result);
});
