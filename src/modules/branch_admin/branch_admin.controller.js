import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  addServiceCategory,
  createService,
    createStaff,
  deleteService,
  getMyServiceCategories,
  getMyServices,
  resendApplicationCode,
  submitApplication,
  updateService,
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

export const addServiceCategoryHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await addServiceCategory(req.body, req.user.sub);
  successResponse(res, 201, t(tr.CATEGORY_ADDED_SUCCESSFULLY, lang), result);
});

export const getMyServiceCategoriesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyServiceCategories(req.user.sub);
  successResponse(res, 200, t(tr.CATEGORIES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const createServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await createService(req.body, req.user.sub);
  successResponse(res, 201, t(tr.SERVICE_CREATED, lang), result);
});

export const getMyServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyServices(req.user.sub, req.query);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await updateService(req.body, req.user.sub);
  successResponse(res, 200, t(tr.SERVICE_UPDATED, lang), result);
});

export const deleteServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await deleteService({ id: parseInt(req.params.id) }, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});
