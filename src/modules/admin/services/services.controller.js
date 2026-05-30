import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { listServicesQuerySchema, rejectReasonSchema, validateAdminInput } from "../admin.validation.js";
import { approveService, getServiceDetails, listServices, rejectService } from "./services.service.js";

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
