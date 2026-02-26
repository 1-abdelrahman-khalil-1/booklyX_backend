import z from "zod";
import { tr } from "../../lib/i18n/index.js";
import { AdminValidationError } from "./admin.service.js";

export function validateAdminInput<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];
    throw new AdminValidationError(firstIssue.message);
}

export const approveApplicationSchema = z.object({
    id: z.number(),
});

export const rejectApplicationSchema = z.object({
    id: z.number(),
    reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});