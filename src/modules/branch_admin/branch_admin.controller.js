import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
    activateSubscription,
    addServiceCategory,
    cancelAppointment,
    cancelSubscription,
    createService,
    createStaff,
    deleteService,
    deleteStaff,
    getAppointmentDetails,
    getBookingPaymentDetails,
    getBranchAdminProfile,
    getBranchDashboardStats,
    getBranchPublicProfile,
    getMyServiceCategories,
    getMyServices,
    getMyStaff,
    getMyStaffById,
    getStaffEarnings,
    listAppointments,
    listBookingPayments,
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
} from "./branch_admin.service.js";
import {
    addServiceCategorySchema,
    applySchema,
    appointmentIdSchema,
    bookingPaymentsQuerySchema,
    branchAppointmentsQuerySchema,
    createServiceSchema,
    createStaffSchema,
    myServicesQuerySchema,
    paymentIdSchema,
    periodQuerySchema,
    resendCodeSchema,
    staffIdSchema,
    updateBookingSettingsSchema,
    updateBranchAdminProfileSchema,
    updateBranchAvailabilitySchema,
    updateNotificationSettingsSchema,
    updateServiceSchema,
    updateStaffSchema,
    validateBranchAdminInput,
    verifyEmailSchema,
    verifyPhoneSchema,
} from "./branch_admin.validation.js";

function firstUploadedFile(req, fieldName) {
  const fileList = req.files?.[fieldName];
  return Array.isArray(fileList) ? fileList[0] : undefined;
}

/**
 * Get authenticated download URL for sensitive documents.
 * These require login to access.
 */
function getDocumentDownloadUrl(req, file) {
  if (!file) return undefined;
  return file.path ?? `${req.protocol}://${req.get("host")}/files/download/${file.filename}`;
}

/**
 * Get public URL for service images.
 * Service images can be accessed without authentication.
 */
function getPublicImageUrl(req, file) {
  if (!file) return undefined;
  return file.path ?? `${req.protocol}://${req.get("host")}/files/public/${file.filename}`;
}

function buildBranchPayload(req) {
  return {
    ...req.body,
    logoUrl:
      getDocumentDownloadUrl(req, firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
    taxCertificateUrl:
      getDocumentDownloadUrl(req, firstUploadedFile(req, "taxCertificate")) ?? req.body.taxCertificateUrl,
    commercialRegisterUrl:
      getDocumentDownloadUrl(req, firstUploadedFile(req, "commercialRegister")) ?? req.body.commercialRegisterUrl,
    nationalIdUrl:
      getDocumentDownloadUrl(req, firstUploadedFile(req, "nationalId")) ?? req.body.nationalIdUrl,
    facilityLicenseUrl:
      getDocumentDownloadUrl(req, firstUploadedFile(req, "facilityLicense")) ?? req.body.facilityLicenseUrl,
  };
}

function buildServicePayload(req) {
  return {
    ...req.body,
    imageUrl:
      getPublicImageUrl(req, firstUploadedFile(req, "image")) ?? req.body.imageUrl,
  };
}

function buildProfilePayload(req) {
  return {
    ...req.body,
    logoUrl: getPublicImageUrl(req, firstUploadedFile(req, "logo")) ?? req.body.logoUrl,
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
  successResponse(res, 200, t(result.message, lang), {
    payment: result.payment,
    currentSubscription: result.currentSubscription,
  });
});

export const renewSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await renewSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), {
    payment: result.payment,
    currentSubscription: result.currentSubscription,
  });
});

export const cancelSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await cancelSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), {
    currentSubscription: result.currentSubscription,
  });
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
  const { id } = validateBranchAdminInput(staffIdSchema, req.params);
  const result = await getMyStaffById(id, req.user.sub);
  successResponse(res, 200, t(tr.STAFF_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const deleteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(staffIdSchema, req.params);
  const result = await deleteStaff({ id }, req.user.sub);
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
  const { id } = validateBranchAdminInput(staffIdSchema, req.params);
  const result = await deleteService({ id }, req.user.sub);
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
  const { id } = validateBranchAdminInput(appointmentIdSchema, req.params);
  const result = await getAppointmentDetails(req.user.sub, id);
  successResponse(res, 200, t(tr.APPOINTMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const cancelAppointmentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(appointmentIdSchema, req.params);
  const result = await cancelAppointment(req.user.sub, id);
  successResponse(res, 200, t(tr.APPOINTMENT_CANCELED, lang), result);
});

export const listBookingPaymentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(bookingPaymentsQuerySchema, req.query);
  const result = await listBookingPayments(req.user.sub, query);
  successResponse(res, 200, t(tr.BOOKING_PAYMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getBookingPaymentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(paymentIdSchema, req.params);
  const result = await getBookingPaymentDetails(req.user.sub, id);
  successResponse(res, 200, t(tr.BOOKING_PAYMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
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
