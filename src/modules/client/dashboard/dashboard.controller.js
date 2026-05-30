import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getHomeDashboard } from "./dashboard.service.js";
import { homeDashboardQuerySchema, validateClientInput } from "../client.validation.js";

export const getHomeDashboardHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(homeDashboardQuerySchema, req.query);
  const result = await getHomeDashboard(query, req.user);
  successResponse(res, 200, t(tr.DASHBOARD_RETRIEVED_SUCCESSFULLY, lang), result);
});
