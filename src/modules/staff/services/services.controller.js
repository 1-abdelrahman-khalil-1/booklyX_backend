import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { createIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { validateStaffInput } from "../staff.validation.js";
import { addStaffService, listStaffServices } from "./services.service.js";

export const listServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const services = await listStaffServices(req.user.sub);
  successResponse(res, 200, t(tr.SERVICES_RETRIEVED_SUCCESSFULLY, lang), services);
});

export const addServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { serviceId } = validateStaffInput(createIdParamSchema("serviceId"), req.body);
  const result = await addStaffService(req.user.sub, serviceId);
  successResponse(res, 201, t(tr.SERVICE_ADDED, lang), result);
});
