import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
    approveApplication,
    approveService,
    getApplicationDetail,
    listApplications,
    listPendingServices,
    rejectApplication,
    rejectService,
} from "./admin.service.js";
import { applicationParamSchema, validateAdminInput } from "./admin.validation.js";

// ─── List Applications Handler ──────────────────────────────────────────────

export const listApplicationsHandler = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const lang = getLanguage(req);
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
  const { id } = validateAdminInput(applicationParamSchema, req.params);
  const includeCodes = req.query.includeCodes === "true";
  const result = await getApplicationDetail(id, includeCodes);
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
  const { id } = validateAdminInput(applicationParamSchema, req.params);
  const result = await approveApplication(id);
  successResponse(res, 200, t(result.message, lang), result.user);
});

// ─── Reject Application Handler ──────────────────────────────────────────────

export const rejectApplicationHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(applicationParamSchema, req.params);
  const { reason } = req.body;
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
  const { id } = validateAdminInput(applicationParamSchema, req.params);
  const result = await approveService(id);
  successResponse(res, 200, t(result.message, lang), result.service);
});

export const rejectServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(applicationParamSchema, req.params);
  const { reason } = req.body;
  const result = await rejectService(id, reason);
  successResponse(res, 200, t(result.message, lang), result.service);
});
