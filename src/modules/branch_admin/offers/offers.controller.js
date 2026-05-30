import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
    createOffer,
    deleteOffer,
    listBranchOffers,
    toggleOffer,
    updateOffer,
} from "./offers.service.js";
import {
    createOfferSchema,
    updateOfferSchema,
    validateOffersInput,
} from "./offers.validation.js";

export const createOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const imageUrl = req.files?.image?.[0]?.path;
  const payload = { ...req.body, ...(imageUrl && { imageUrl }) };
  const data = validateOffersInput(createOfferSchema, payload);
  const result = await createOffer(data, req.user.sub);
  successResponse(res, 201, t(tr.OFFER_CREATED, lang), result);
});

export const updateOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateOffersInput(zIdParamSchema, req.params);
  const imageUrl = req.files?.image?.[0]?.path;
  const payload = { ...req.body, ...(imageUrl && { imageUrl }) };
  const data = validateOffersInput(updateOfferSchema, payload);
  const result = await updateOffer(id, data, req.user.sub);
  successResponse(res, 200, t(tr.OFFER_UPDATED, lang), result);
});

export const toggleOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateOffersInput(zIdParamSchema, req.params);
  const result = await toggleOffer(id, req.user.sub);
  successResponse(res, 200, t(tr.OFFER_TOGGLED, lang), result);
});

export const deleteOfferHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateOffersInput(zIdParamSchema, req.params);
  const result = await deleteOffer(id, req.user.sub);
  successResponse(res, 200, t(tr.OFFER_DELETED, lang), result);
});

export const listBranchOffersHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listBranchOffers(req.user.sub);
  successResponse(res, 200, t(tr.OFFERS_RETRIEVED_SUCCESSFULLY, lang), result);
});
