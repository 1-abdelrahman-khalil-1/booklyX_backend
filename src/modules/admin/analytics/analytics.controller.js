import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { periodQuerySchema, validateAdminInput } from "../admin.validation.js";
import { getPlatformAnalytics, getAnalyticsOverview, getRevenueChartData } from "./analytics.service.js";

export const getPlatformAnalyticsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { period } = validateAdminInput(periodQuerySchema, req.query);
  const result = await getPlatformAnalytics(period);
  successResponse(res, 200, t(tr.PLATFORM_ANALYTICS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getAnalyticsOverviewHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getAnalyticsOverview();
  successResponse(res, 200, t(tr.ANALYTICS_OVERVIEW_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getRevenueChartHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const limit = req.query.limit ? parseInt(req.query.limit) : 6;
  const result = await getRevenueChartData(limit);
  successResponse(res, 200, t(tr.REVENUE_CHART_RETRIEVED_SUCCESSFULLY, lang), result);
});
