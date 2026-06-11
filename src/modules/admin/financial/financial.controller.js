import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getFinancialSummary } from "./financial.service.js";

export const getFinancialSummaryHandler = asyncHandler(async (req, res) => {
  const result = await getFinancialSummary();
  successResponse(res, 200, "Financial summary retrieved successfully.", result);
});
