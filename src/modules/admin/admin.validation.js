import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zIdParamSchema } from "../../lib/validation/primitives.js";
import { AdminValidationError } from "./admin.service.js";

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

