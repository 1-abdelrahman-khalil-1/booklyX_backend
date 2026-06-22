import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import { getValidOffers, claimOffer, getClaimedOffers } from "./offers.service.js";
import { validateClientInput, getClaimedOffersQuerySchema } from "../client.validation.js";

export const getValidOffersHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await getValidOffers(req.user.sub);
  successResponse(res, 200, t(tr.OFFERS_RETRIEVED_SUCCESSFULLY, lang), result);
});

export const claimOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id: offerId } = validateClientInput(zIdParamSchema, req.params);
  const result = await claimOffer(req.user.sub, offerId);
  successResponse(res, 200, t(tr.OFFER_CLAIMED_SUCCESSFULLY, lang), result);
});

export const getClaimedOffersHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(getClaimedOffersQuerySchema, req.query);
  const result = await getClaimedOffers(req.user.sub, query);
  successResponse(res, 200, t(tr.CLAIMED_OFFERS_RETRIEVED_SUCCESSFULLY, lang), result);
});
