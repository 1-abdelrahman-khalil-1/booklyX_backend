import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zIdParamSchema } from "../../lib/validation/primitives.js";
import { AdminValidationError } from "./errors.js";

export const validateAdminInput = createValidationInputValidator(AdminValidationError);

export { zIdParamSchema };

export const listBranchesQuerySchema = z.object({
    status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

export const listServicesQuerySchema = z.object({
    status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

export const periodQuerySchema = z.object({
    period: z.enum(["today", "this_month", "this_year"]).optional(),
});

export const rejectReasonSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(1, {
            message: tr.REJECTION_REASON_REQUIRED,
        }),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  search: z.string().trim().optional(),
  period: z.enum(["today", "this_month", "this_year"]).optional(),
});


