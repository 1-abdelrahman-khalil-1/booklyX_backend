import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { createIdParamSchema, zIdParamSchema } from "../../lib/validation/primitives.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  approveBranch,
  approveService,
  getBranchDetails,
  getBranchPaymentDetails,
  getPlatformAnalytics,
  getRecentActivities,
  getServiceDetails,
  listBranchPayments,
  listBranches,
  listServices,
  refundBranchPayment,
  rejectBranch,
  rejectService
} from "./admin.service.js";
import {
  listBranchesQuerySchema,
  listPaymentsQuerySchema,
  listServicesQuerySchema,
  periodQuerySchema,
  rejectReasonSchema,
  validateAdminInput
} from "./admin.validation.js";


// ─── List Branches Handler ─────────────────────────────────────────────────

export const listBranchesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { status } = validateAdminInput(listBranchesQuerySchema, req.query);
  const result = await listBranches(status);
  successResponse(
    res,
    200,
    t(tr.BRANCH_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

// ─── Get Branch Detail Handler ──────────────────────────────────────────────

export const getBranchDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await getBranchDetails(id);
  successResponse(
    res,
    200,
    t(tr.BRANCH_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

// ─── Approve Branch Handler ─────────────────────────────────────────────────

export const approveBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await approveBranch(id);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Reject Branch Handler ──────────────────────────────────────────────────

export const rejectBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const { reason } = validateAdminInput(rejectReasonSchema, req.body);
  const result = await rejectBranch(id, reason);
  successResponse(res, 200, t(result.message, lang));
});

export const listServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { status } = validateAdminInput(listServicesQuerySchema, req.query);
  const result = await listServices(status);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getServiceDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await getServiceDetails(id);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const approveServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const result = await approveService(id);
  successResponse(res, 200, t(result.message, lang), result.service);
});

export const rejectServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateAdminInput(zIdParamSchema, req.params);
  const { reason } = validateAdminInput(rejectReasonSchema, req.body);
  const result = await rejectService(id, reason);
  successResponse(res, 200, t(result.message, lang), result.service);
});

export const getPlatformAnalyticsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateAdminInput(periodQuerySchema, req.query);
  const result = await getPlatformAnalytics(period);
  successResponse(
    res,
    200,
    t(tr.PLATFORM_ANALYTICS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const listBranchPaymentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const validatedQuery = validateAdminInput(listPaymentsQuerySchema, req.query);
  const result = await listBranchPayments(validatedQuery);
  successResponse(
    res,
    200,
    t(tr.BRANCH_PAYMENTS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getBranchPaymentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { paymentId } = validateAdminInput(createIdParamSchema("paymentId"), req.params);
  const result = await getBranchPaymentDetails(paymentId);
  successResponse(
    res,
    200,
    t(tr.PAYMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const refundBranchPaymentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { paymentId } = validateAdminInput(createIdParamSchema("paymentId"), req.params);
  const result = await refundBranchPayment(paymentId);
  successResponse(
    res,
    200,
    t(tr.PAYMENT_REFUNDED_SUCCESSFULLY, lang),
    result,
  );
});

export const getRecentActivitiesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentActivities();
  successResponse(
    res,
    200,
    t(tr.RECENT_ACTIVITIES_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});


