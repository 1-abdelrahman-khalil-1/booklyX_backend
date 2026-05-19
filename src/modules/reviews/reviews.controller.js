import { getLanguage, t } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { createReview, listMyReviews, listReviews } from "./reviews.service.js";
import { listReviewsQuerySchema, validateCreateReviewInput, validateReviewsInput } from "./reviews.validation.js";

export const listReviewsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateReviewsInput(listReviewsQuerySchema, req.query);
  const result = await listReviews(query, req.user);
  successResponse(res, 200, t(result.message, lang), {
    reviews: result.reviews,
    pagination: result.pagination,
  });
});

export const listMyReviewsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const query = validateReviewsInput(listReviewsQuerySchema, req.query);
  const result = await listMyReviews(query, req.user);
  successResponse(res, 200, t(result.message, lang), {
    reviews: result.reviews,
    pagination: result.pagination,
  });
});

export const createReviewHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const data = validateCreateReviewInput(req.body);
  const result = await createReview(data, req.user);
  successResponse(res, 201, t(result.message, lang), result.review);
});
