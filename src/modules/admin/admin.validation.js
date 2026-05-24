import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { AdminValidationError } from "./admin.service.js";

export function validateAdminInput(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];
    if (!firstIssue) {
        throw new AdminValidationError("Invalid input");
    }

    if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
        const enumValues = firstIssue.options ?? firstIssue.values;
        throw new AdminValidationError(tr.INVALID_ENUM_VALUE, {
            values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
        });
    }

    throw new AdminValidationError(firstIssue.message);
}

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
});

export const paymentIdParamSchema = z.object({
    paymentId: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
});

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

export const includeCodesQuerySchema = z.object({
    includeCodes: z.enum(["true", "false"]).optional(),
});

