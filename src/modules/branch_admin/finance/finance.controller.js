import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { exportReportQuerySchema, financePaymentsQuerySchema, validateBranchAdminInput } from "../branch_admin.validation.js";
import { exportFinanceReport, getBranchFinanceStats, listFinancePayments, processBookingPaymentRefund } from "./finance.service.js";

export const getBranchFinanceStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getBranchFinanceStats(req.user.sub);
  successResponse(res, 200, t(tr.FINANCE_STATS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const listFinancePaymentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(financePaymentsQuerySchema, req.query);
  const result = await listFinancePayments(req.user.sub, query);
  successResponse(res, 200, t(tr.PAYMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const processBookingPaymentRefundHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await processBookingPaymentRefund(req.user.sub, id);
  successResponse(res, 200, t(tr.PAYMENT_REFUNDED_SUCCESSFULLY, lang), result);
});

export const exportFinanceReportHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateBranchAdminInput(exportReportQuerySchema, req.query);
  const csv = await exportFinanceReport(req.user.sub, query);
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});