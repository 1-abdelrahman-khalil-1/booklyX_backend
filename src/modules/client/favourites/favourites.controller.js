import { getLanguage, t, tr } from "../../../lib/i18n/index.js";
import { zIdParamSchema } from "../../../lib/validation/primitives.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/response.js";
import {
  addFavoriteBranch,
  addFavoriteStaff,
  getClientFavourites,
  removeFavoriteBranch,
  removeFavoriteStaff,
} from "./favourites.service.js";
import { favouritesQuerySchema, validateClientInput } from "../client.validation.js";

export const addFavoriteBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await addFavoriteBranch(id, req.user);
  successResponse(res, 201, t(tr.FAVOURITE_ADDED_SUCCESSFULLY, lang), result);
});

export const removeFavoriteBranchHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await removeFavoriteBranch(id, req.user);
  successResponse(res, 200, t(tr.FAVOURITE_REMOVED_SUCCESSFULLY, lang), result);
});

export const addFavoriteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await addFavoriteStaff(id, req.user);
  successResponse(res, 201, t(tr.FAVOURITE_ADDED_SUCCESSFULLY, lang), result);
});

export const removeFavoriteStaffHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const { id } = validateClientInput(zIdParamSchema, req.params);
  const result = await removeFavoriteStaff(id, req.user);
  successResponse(res, 200, t(tr.FAVOURITE_REMOVED_SUCCESSFULLY, lang), result);
});

export const getClientFavouritesHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateClientInput(favouritesQuerySchema, req.query);
  const result = await getClientFavourites(query, req.user);
  successResponse(res, 200, t(tr.FAVOURITES_RETRIEVED_SUCCESSFULLY, lang), result);
});
