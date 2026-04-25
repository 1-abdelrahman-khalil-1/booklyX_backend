import { getLanguage, t, tr } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import {
  createOffer,
  listBranchOffers,
  toggleOffer,
  updateOffer,
} from "./offers.service.js";
import {
  createOfferSchema,
  offerIdSchema,
  updateOfferSchema,
  validateOffersInput,
} from "./offers.validation.js";

export const createOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateOffersInput(createOfferSchema, req.body);
  const result = await createOffer(data, req.user.sub);
  successResponse(res, 201, t(tr.OFFER_CREATED, lang), result);
});

export const updateOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateOffersInput(offerIdSchema, req.params);
  const data = validateOffersInput(updateOfferSchema, req.body);
  const result = await updateOffer(id, data, req.user.sub);
  successResponse(res, 200, t(tr.OFFER_UPDATED, lang), result);
});

export const toggleOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateOffersInput(offerIdSchema, req.params);
  const result = await toggleOffer(id, req.user.sub);
  successResponse(res, 200, t(tr.OFFER_TOGGLED, lang), result);
});

export const listBranchOffersHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listBranchOffers(req.user.sub);
  successResponse(res, 200, t(tr.OFFERS_RETRIEVED_SUCCESSFULLY, lang), result);
});
