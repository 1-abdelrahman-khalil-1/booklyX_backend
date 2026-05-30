import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getBranchProfile, getBranchServices } from "./branches.service.js";
import { validateClientInput } from "../client.validation.js";

export const getBranchProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getBranchProfile(id);
  successResponse(res, 200, t(tr.BRANCH_PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getBranchServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getBranchServices(id);
  successResponse(res, 200, t(tr.BRANCH_SERVICES_RETRIEVED, lang), result);
});
