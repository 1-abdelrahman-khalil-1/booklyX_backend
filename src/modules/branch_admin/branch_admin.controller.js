import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { zIdParamSchema } from "../../lib/validation/primitives.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  activateSubscription,
  addServiceCategory,
  cancelAppointment,
  cancelSubscription,
  changeSubscriptionPlan,
  createService,
  createStaff,
  deleteService,
  deleteStaff,
  getAppointmentDetails,
  getBranchAdminProfile,
  getBranchDashboardStats,
  getBranchPublicProfile,
  getMyServiceCategories,
  getMyServices,
  getMyStaff,
  getMyStaffById,
  getStaffEarnings,
  listAppointments,
  renewSubscription,
  resendBranchCode,
  submitBranch,
  updateBookingSettings,
  updateBranchAdminProfile,
  updateBranchAvailability,
  updateNotificationSettings,
  updateService,
  updateStaff,
  verifyBranchEmail,
  verifyBranchPhone,
  getRevenueChartData,
  getRecentBookings,
  getTopServices,
  getRecentTransactions,
  getBranchFinanceStats,
  listFinancePayments,
  processBookingPaymentRefund,
  exportFinanceReport,
} from "./branch_admin.service.js";
import {
  addServiceCategorySchema,
  applySchema,
  bookingPaymentsQuerySchema,
  branchAppointmentsQuerySchema,
  createServiceSchema,
  createStaffSchema,
  myServicesQuerySchema,
  periodQuerySchema,
  resendCodeSchema,
  updateBookingSettingsSchema,
  updateBranchAdminProfileSchema,
  updateBranchAvailabilitySchema,
  updateNotificationSettingsSchema,
  updateServiceSchema,
  updateStaffSchema,
  validateBranchAdminInput,
  verifyEmailSchema,
  verifyPhoneSchema,
  financePaymentsQuerySchema,
  exportReportQuerySchema,
} from "./branch_admin.validation.js";

function firstUploadedFile(req, fieldName) {
  const fileList = req.files?.[fieldName];
  return Array.isArray(fileList) ? fileList[0] : undefined;
}

function getUploadedFileUrl(file) {
  // We rely on Cloudinary for uploads; multer storage sets `file.path` to the secure URL.
  return file?.path ?? undefined;
}

function buildBranchPayload(req) {
  return {
    ...req.body,
    logoUrl: getUploadedFileUrl(firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
    taxCertificateUrl:
      getUploadedFileUrl(firstUploadedFile(req, "taxCertificate")) ?? req.body.taxCertificateUrl,
    commercialRegisterUrl:
      getUploadedFileUrl(firstUploadedFile(req, "commercialRegister")) ?? req.body.commercialRegisterUrl,
    nationalIdUrl:
      getUploadedFileUrl(firstUploadedFile(req, "nationalId")) ?? req.body.nationalIdUrl,
    facilityLicenseUrl:
      getUploadedFileUrl(firstUploadedFile(req, "facilityLicense")) ?? req.body.facilityLicenseUrl,
  };
}

function buildServicePayload(req) {
  return {
    ...req.body,
    imageUrl: getUploadedFileUrl(firstUploadedFile(req, "image")) ?? req.body.imageUrl,
  };
}

function buildProfilePayload(req) {
  return {
    ...req.body,
    logoUrl: getUploadedFileUrl(firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
  };
}

// ─── Apply Handler ───────

export const applyHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(applySchema, buildBranchPayload(req));
  const result = await submitBranch(data);
  successResponse(res, 201, t(result.message, lang), result.branch);
});

export const activateSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await activateSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result);
});

export const renewSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await renewSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result);
});

export const changeSubscriptionPlanHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await changeSubscriptionPlan(req.user.sub, id);
  successResponse(res, 200, t(result.message, lang), result);
});

export const cancelSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await cancelSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result );
});

// ─── Verify Email Handler ─

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateBranchAdminInput(verifyEmailSchema, req.body);
  const result = await verifyBranchEmail(email, code);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Verify Phone Handler ─

export const verifyPhoneHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, code } = validateBranchAdminInput(verifyPhoneSchema, req.body);
  const result = await verifyBranchPhone(email, code);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Resend Code Handler ──

export const resendCodeHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { email, type } = validateBranchAdminInput(resendCodeSchema, req.body);
  const result = await resendBranchCode(email, type);
  successResponse(res, 200, t(result.message, lang));
});

// ─── Create Staff Handler ─

export const createStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(createStaffSchema, req.body);
  const result = await createStaff(data, req.user.sub);
  successResponse(res, 201, t(tr.STAFF_CREATED, lang), result);
});

export const getMyStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyStaff(req.user.sub);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateStaffSchema, {
    ...req.body,
    // Always trust the path param to avoid accidental/malicious id mismatches.
    id: req.params.id,
  });
  const result = await updateStaff(data, req.user.sub);
  successResponse(res, 200, t(tr.STAFF_UPDATED, lang), result);
});

export const getMyStaffByIdHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await getMyStaffById(id, req.user.sub);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const deleteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await deleteStaff(id, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});

export const addServiceCategoryHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(addServiceCategorySchema, req.body);
  const result = await addServiceCategory(data, req.user.sub);
  successResponse(res, 201, t(tr.CATEGORY_ADDED_SUCCESSFULLY, lang), result);
});

export const getMyServiceCategoriesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyServiceCategories(req.user.sub);
  successResponse(res, 200, t(tr.CATEGORIES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const createServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(createServiceSchema, buildServicePayload(req));
  const result = await createService(data, req.user.sub);
  successResponse(res, 201, t(tr.SERVICE_CREATED, lang), result);
});

export const getMyServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(myServicesQuerySchema, req.query);
  const result = await getMyServices(req.user.sub, query);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateServiceSchema, {
    ...buildServicePayload(req),
    // Always trust the path param to avoid accidental/malicious id mismatches.
    id: req.params.id,
  });
  const result = await updateService(data, req.user.sub);
  successResponse(res, 200, t(tr.SERVICE_UPDATED, lang), result);
});

export const deleteServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await deleteService(id, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});

export const updateBranchAdminProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(
    updateBranchAdminProfileSchema,
    buildProfilePayload(req),
  );
  const result = await updateBranchAdminProfile(data, req.user.sub);
  successResponse(res, 200, t(tr.PROFILE_UPDATED_SUCCESSFULLY, lang), result);
});

export const getBranchAdminProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getBranchAdminProfile(req.user.sub);
  successResponse(res, 200, t(tr.BRANCH_PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getBranchPublicProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const branchId = Number(req.params.id);
  const profile = await getBranchPublicProfile(branchId, req.user);
  successResponse(res, 200, t(tr.BRANCH_PROFILE_RETRIEVED_SUCCESSFULLY, lang), profile);
});

export const updateBranchAvailabilityHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateBranchAvailabilitySchema, req.body);
  const result = await updateBranchAvailability(data, req.user.sub);
  successResponse(res, 200, t(tr.BRANCH_AVAILABILITY_UPDATED_SUCCESSFULLY, lang), result);
});

export const updateBookingSettingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateBookingSettingsSchema, req.body);
  const result = await updateBookingSettings(data, req.user.sub);
  successResponse(res, 200, t(tr.BOOKING_SETTINGS_UPDATED_SUCCESSFULLY, lang), result);
});

export const updateNotificationSettingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateBranchAdminInput(updateNotificationSettingsSchema, req.body);
  const result = await updateNotificationSettings(data, req.user.sub);
  successResponse(res, 200, t(tr.NOTIFICATION_SETTINGS_UPDATED_SUCCESSFULLY, lang), result);
});

export const listAppointmentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(branchAppointmentsQuerySchema, req.query);
  const result = await listAppointments(req.user.sub, query);
  successResponse(res, 200, t(tr.APPOINTMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getAppointmentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await getAppointmentDetails(req.user.sub, id);
  successResponse(res, 200, t(tr.APPOINTMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await cancelAppointment(req.user.sub, id);
  successResponse(res, 200, t(tr.APPOINTMENT_CANCELED, lang), result);
});

export const getBranchDashboardStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getBranchDashboardStats(req.user.sub, period);
  successResponse(
    res,
    200,
    t(tr.BRANCH_ANALYTICS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getStaffEarningsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getStaffEarnings(req.user.sub, period);
  successResponse(
    res,
    200,
    t(tr.STAFF_EARNINGS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getRevenueChartDataHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getRevenueChartData(req.user.sub, period);
  successResponse(
    res,
    200,
    t(tr.BRANCH_ANALYTICS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getRecentBookingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentBookings(req.user.sub);
  successResponse(
    res,
    200,
    t(tr.APPOINTMENTS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getTopServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getTopServices(req.user.sub, period);
  successResponse(
    res,
    200,
    t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getRecentTransactionsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentTransactions(req.user.sub);
  successResponse(
    res,
    200,
    t(tr.BOOKING_PAYMENTS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const getBranchFinanceStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getBranchFinanceStats(req.user.sub);
  successResponse(
    res,
    200,
    t(tr.BRANCH_ANALYTICS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const listFinancePaymentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(financePaymentsQuerySchema, req.query);
  const result = await listFinancePayments(req.user.sub, query);
  successResponse(
    res,
    200,
    t(tr.BOOKING_PAYMENTS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const processBookingPaymentRefundHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await processBookingPaymentRefund(req.user.sub, id);
  successResponse(
    res,
    200,
    t(tr.PAYMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang),
    result,
  );
});

export const exportFinanceReportHandler = asyncHandler(async (req, res) => {
  const query = validateBranchAdminInput(exportReportQuerySchema, req.query);
  const csv = await exportFinanceReport(req.user.sub, query);
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=finance_report_${Date.now()}.csv`);
  res.status(200).send(csv);
});
