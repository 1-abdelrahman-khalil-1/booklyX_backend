import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  approveApplication,
  approveService,
  getApplicationDetail,
  getUserProfile,
  listApplications,
  listPendingServices,
  rejectApplication,
  rejectService,
} from "./admin.service.js";
import {
  idParamSchema,
  includeCodesQuerySchema,
  listApplicationsQuerySchema,
  rejectReasonSchema,
  validateAdminInput,
} from "./admin.validation.js";

// ─── List Applications Handler ──────────────────────────────────────────────

export const listApplicationsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { status } = validateAdminInput(listApplicationsQuerySchema, req.query);
  const result = await listApplications(status);
  successResponse(
    res,
    200,
    t(tr.APPLICATION_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

// ─── Get Application Detail Handler ──────────────────────────────────────────

export const getApplicationDetailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const { includeCodes } = validateAdminInput(includeCodesQuerySchema, req.query);
  const includeCodesBool = includeCodes === "true";
  const result = await getApplicationDetail(id, includeCodesBool);
  successResponse(
    res,
    200,
    t(tr.APPLICATION_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

// ─── Approve Application Handler ─────────────────────────────────────────────

export const approveApplicationHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const result = await approveApplication(id);
  successResponse(res, 200, t(result.message, lang), result.user);
});

// ─── Reject Application Handler ──────────────────────────────────────────────

export const rejectApplicationHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const { reason } = validateAdminInput(rejectReasonSchema, req.body);
  const result = await rejectApplication(id, reason);
  successResponse(res, 200, t(result.message, lang));
});

export const listPendingServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listPendingServices();
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const approveServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const result = await approveService(id);
  successResponse(res, 200, t(result.message, lang), result.service);
});

export const rejectServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const { reason } = validateAdminInput(rejectReasonSchema, req.body);
  const result = await rejectService(id, reason);
  successResponse(res, 200, t(result.message, lang), result.service);
});

export const getUserProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(idParamSchema, req.params);
  const result = await getUserProfile(id);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});
