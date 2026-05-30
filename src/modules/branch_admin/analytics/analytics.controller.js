import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { periodQuerySchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { getBranchDashboardStats, getRecentBookings, getRecentTransactions, getRevenueChartData, getStaffEarnings, getTopServices } from "./analytics.service.js";

export const getBranchDashboardStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getBranchDashboardStats(req.user.sub, query.period);
  successResponse(res, 200, t(tr.DASHBOARD_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getRecentBookingsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentBookings(req.user.sub);
  successResponse(res, 200, t(tr.RECENT_BOOKINGS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getRecentTransactionsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getRecentTransactions(req.user.sub);
  successResponse(res, 200, t(tr.RECENT_TRANSACTIONS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getRevenueChartDataHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getRevenueChartData(req.user.sub, query.period);
  successResponse(res, 200, t(tr.REVENUE_CHART_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getStaffEarningsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getStaffEarnings(req.user.sub, query.period);
  successResponse(res, 200, t(tr.STAFF_EARNINGS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getTopServicesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(periodQuerySchema, req.query);
  const result = await getTopServices(req.user.sub, query.period);
  successResponse(res, 200, t(tr.TOP_SERVICES_RETRIEVED_SUCCESSFULLY, lang), result);
});