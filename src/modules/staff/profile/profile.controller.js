import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getStaffProfile } from "./profile.service.js";

export const getProfileHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const profile = await getStaffProfile(req.user.sub);
  successResponse(res, 200, t(tr.PROFILE_RETRIEVED_SUCCESSFULLY, lang), profile);
});
