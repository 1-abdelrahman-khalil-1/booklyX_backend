import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getProfile, updateProfile } from "./profile.service.js";
import { updateClientProfileSchema, validateClientInput } from "../client.validation.js";

export const getClientProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;
  const result = await getProfile(userId);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const updateClientProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const userId = req.user.sub;
  const validatedData = validateClientInput(updateClientProfileSchema, req.body);
  const result = await updateProfile(userId, validatedData);
  successResponse(res, 200, t(tr.PROFILE_UPDATED_SUCCESSFULLY, lang), result);
});
