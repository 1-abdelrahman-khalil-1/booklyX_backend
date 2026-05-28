import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zId } from "../../lib/validation/primitives.js";
import { AppError } from "../../utils/AppError.js";

export class ReviewsValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ReviewsValidationError";
  }
}

export const listReviewsQuerySchema = z.object({
  serviceId: zId.optional(),
  staffId: zId.optional(),
  page: z.coerce.number().int().min(1, tr.INVALID_ID).optional().default(1),
  limit: z.coerce.number().int().min(1, tr.INVALID_ID).max(100, tr.INVALID_ID).optional().default(20),
});

export const createReviewSchema = z.object({
  appointmentId: zId,
  rating: z.coerce.number().int().min(1, tr.INVALID_RATING).max(5, tr.INVALID_RATING),
  comment: z.string().optional(),
});

export const validateReviewsInput = createValidationInputValidator(ReviewsValidationError);

export function validateCreateReviewInput(data) {
  return validateReviewsInput(createReviewSchema, data);
}
