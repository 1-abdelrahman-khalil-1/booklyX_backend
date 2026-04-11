import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { AdminValidationError } from "./admin.service.js";

export function validateAdminInput(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
        const enumValues = firstIssue.options ?? firstIssue.values;
        throw new AdminValidationError(tr.INVALID_ENUM_VALUE, {
            values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
        });
    }

    throw new AdminValidationError(firstIssue.message);
}

export const approveApplicationSchema = z.object({
    id: z.number(),
});

export const applicationParamSchema = z.object({
    id: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
});

export const rejectApplicationSchema = z.object({
    id: z.number(),
    reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});

export const approveServiceSchema = z.object({
    id: z.number(),
});

export const rejectServiceSchema = z.object({
    id: z.number(),
    reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});