import { z } from "zod";
import { Role } from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const reviewSchema = z.object({
  clientId: z.number().int().positive(),
  reviewerId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  appointmentId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
  reviewerRole: z.literal(Role.client),
  isVisible: z.boolean(),
  createdAt: z.date(),
});

export function validateReviewSeed(data) {
  return validateSeedData(reviewSchema, data, "ReviewSeed");
}
