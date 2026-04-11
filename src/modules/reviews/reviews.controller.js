import { getLanguage, t } from "../../lib/i18n/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/response.js";
import { listMyReviews, listReviews } from "./reviews.service.js";

export const listReviewsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listReviews(req.query, req.user);
  successResponse(res, 200, t(result.message, lang), {
    reviews: result.reviews,
    pagination: result.pagination,
  });
});

export const listMyReviewsHandler = asyncHandler(async (req, res) => {
  const lang = getLanguage(req);
  const result = await listMyReviews(req.query, req.user);
  successResponse(res, 200, t(result.message, lang), {
    reviews: result.reviews,
    pagination: result.pagination,
  });
});
