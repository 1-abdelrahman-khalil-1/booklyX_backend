import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { listPlans } from "./plans.service.js";

export const listPlansHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listPlans();
  successResponse(res, 200, t(tr.PLANS_RETRIEVED_SUCCESSFULLY, lang), result);
});
