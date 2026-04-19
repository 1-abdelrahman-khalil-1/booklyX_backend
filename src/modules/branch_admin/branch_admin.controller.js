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
  verifyApplicationEmail,
  verifyApplicationPhone,
} from "./branch_admin.service.js";

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
  return `${req.protocol}://${req.get("host")}/files/download/${file.filename}`;
}

/**
 * Get public URL for service images.
 * Service images can be accessed without authentication.
 */
function getPublicImageUrl(req, file) {
  if (!file) return undefined;
  return `${req.protocol}://${req.get("host")}/files/public/${file.filename}`;
}

function buildApplicationPayload(req) {
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

// ─── Apply Handler ───────────────────────────────────────────────────────────

export const applyHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await submitApplication(buildApplicationPayload(req));
  successResponse(res, 201, t(result.message, lang), result.application);
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
  const result = await createService(buildServicePayload(req), req.user.sub);
  successResponse(res, 201, t(tr.SERVICE_CREATED, lang), result);
});

export const getMyServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getMyServices(req.user.sub, req.query);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await updateService(
    {
      ...buildServicePayload(req),
      id: req.body.id ?? req.params.id,
    },
    req.user.sub,
  );
  successResponse(res, 200, t(tr.SERVICE_UPDATED, lang), result);
});

export const deleteServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await deleteService({ id: parseInt(req.params.id, 10) }, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});
