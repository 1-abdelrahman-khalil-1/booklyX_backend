import { z } from "zod";
import { ServiceApprovalStatus } from "../../src/generated/prisma/client.js";
import { validateSeedData } from "../helpers/validation.js";

const serviceSchema = z.object({
  branchId: z.number().int().positive(),
  serviceCategoryId: z.number().int().positive(),
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(500),
  price: z.number().min(0),
  durationMinutes: z.number().int().min(5).max(240),
  imageUrl: z.string().url(),
  status: z.nativeEnum(ServiceApprovalStatus),
  approvedAt: z.date().nullable(),
  rejectionReason: z.string().max(500).nullable(),
});

export function validateServiceSeed(data) {
  return validateSeedData(serviceSchema, data, "ServiceSeed");
}
