import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { addServiceCategorySchema, createServiceSchema, myServicesQuerySchema, updateServiceSchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { buildServicePayload } from "../helpers.js";
import { addServiceCategory, createService, deleteService, getMyServiceCategories, getMyServices, updateService } from "./services.service.js";

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
  const data = validateBranchAdminInput(updateServiceSchema, { ...buildServicePayload(req), id: req.params.id });
  const result = await updateService(data, req.user.sub);
  successResponse(res, 200, t(tr.SERVICE_UPDATED, lang), result);
});

export const deleteServiceHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await deleteService(id, req.user.sub);
  successResponse(res, 200, t(result.message, lang));
});