import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { incomeQuerySchema, validateStaffInput } from "../staff.validation.js";
import { getIncomeStats } from "./income.service.js";

export const getIncomeStatsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { range } = validateStaffInput(incomeQuerySchema, req.query);
  const stats = await getIncomeStats(req.user.sub, range);
  successResponse(res, 200, t(tr.INCOME_RETRIEVED_SUCCESSFULLY, lang), stats);
});
