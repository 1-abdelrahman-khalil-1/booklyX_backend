import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getRecentActivities } from "./activities.service.js";

export const getRecentActivitiesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentActivities();
  successResponse(res, 200, t(tr.RECENT_ACTIVITIES_RETRIEVED_SUCCESSFULLY, lang), result);
});
