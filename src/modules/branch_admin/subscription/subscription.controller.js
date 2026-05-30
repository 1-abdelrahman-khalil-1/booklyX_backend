import { getLanguage, t } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { validateBranchAdminInput } from "../branch_admin.validation.js";
import { activateSubscription, cancelSubscription, changeSubscriptionPlan, renewSubscription } from "./subscription.service.js";

export const activateSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await activateSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result);
});

export const renewSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await renewSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result);
});

export const changeSubscriptionPlanHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateBranchAdminInput(zIdParamSchema, req.params);
  const result = await changeSubscriptionPlan(req.user.sub, id);
  successResponse(res, 200, t(result.message, lang), result);
});

export const cancelSubscriptionHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await cancelSubscription(req.user.sub);
  successResponse(res, 200, t(result.message, lang), result);
});