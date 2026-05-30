import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { createIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { listPaymentsQuerySchema, validateAdminInput } from "../admin.validation.js";
import { getBranchPaymentDetails, listBranchPayments, refundBranchPayment } from "./payments.service.js";

export const listBranchPaymentsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const validatedQuery = validateAdminInput(listPaymentsQuerySchema, req.query);
  const result = await listBranchPayments(validatedQuery);
  successResponse(res, 200, t(tr.BRANCH_PAYMENTS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const getBranchPaymentDetailsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { paymentId } = validateAdminInput(createIdParamSchema("paymentId"), req.params);
  const result = await getBranchPaymentDetails(paymentId);
  successResponse(res, 200, t(tr.PAYMENT_DETAILS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const refundBranchPaymentHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { paymentId } = validateAdminInput(createIdParamSchema("paymentId"), req.params);
  const result = await refundBranchPayment(paymentId);
  successResponse(res, 200, t(tr.PAYMENT_REFUNDED_SUCCESSFULLY, lang), result);
});
