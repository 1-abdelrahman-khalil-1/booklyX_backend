import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

export class ReviewsValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ReviewsValidationError";
  }
}

export const listReviewsQuerySchema = z.object({
  serviceId: z.coerce.number().int().positive({ message: tr.INVALID_ID }).optional(),
  staffId: z.coerce.number().int().positive({ message: tr.INVALID_ID }).optional(),
  page: z.coerce.number().int().min(1, tr.INVALID_ID).optional().default(1),
  limit: z.coerce.number().int().min(1, tr.INVALID_ID).max(100, tr.INVALID_ID).optional().default(20),
});

export const createReviewSchema = z.object({
  appointmentId: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
  rating: z.coerce.number().int().min(1, tr.INVALID_RATING).max(5, tr.INVALID_RATING),
  comment: z.string().optional(),
});

export function validateReviewsInput(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  if (!firstIssue) {
    throw new ReviewsValidationError("Invalid input");
  }

  if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
    const enumValues = firstIssue.options ?? firstIssue.values;
    throw new ReviewsValidationError(tr.INVALID_ENUM_VALUE, {
      values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
    });
  }

  throw new ReviewsValidationError(firstIssue.message);
}

export function validateCreateReviewInput(data) {
  const result = createReviewSchema.safeParse(data);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  if (!firstIssue) {
    throw new ReviewsValidationError("Invalid input");
  }

  throw new ReviewsValidationError(firstIssue.message);
}
