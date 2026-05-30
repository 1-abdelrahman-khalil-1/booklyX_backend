import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getServiceOffers } from "./offers.service.js";
import { validateClientInput } from "../client.validation.js";

export const getServiceOffersHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await getServiceOffers(id);
  successResponse(res, 200, t(tr.SERVICE_OFFERS_RETRIEVED, lang), result);
});
