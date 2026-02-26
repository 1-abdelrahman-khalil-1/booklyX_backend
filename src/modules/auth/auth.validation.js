import { z } from "zod";
import { Platform, VerificationType } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { AuthValidationError } from "./auth.service.js";

export const loginSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    password: z.string({ error: tr.PASSWORD_REQUIRED }),
});

export const registerSchema = z.object({
    name: z.string({ error: tr.NAME_REQUIRED }),
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),
    phone: z
        .string({ error: tr.PHONE_REQUIRED })
        .regex(/^\d{10}$/, tr.PHONE_INVALID),
});

export const platformSchema = z.enum([Platform.APP, Platform.WEB], {
    errorMap: () => ({ message: tr.PLATFORM_MUST_BE_ONE_OF }),
});

export const verifyEmailSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

export const verifyPhoneSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

export const requestPasswordResetSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
});

export const verifyPasswordResetSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

export const resetPasswordSchema = z.object({
    resetToken: z.string({ error: tr.TOKEN_REQUIRED }),
    newPassword: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),
});

export const resendCodeSchema = z
    .object({
        email: z
            .email({
                error: (issue) => {
                    if (issue.input === undefined) return tr.EMAIL_REQUIRED;
                    return tr.EMAIL_INVALID;
                },
            })
            .optional(),
        phone: z
            .string({ error: tr.PHONE_REQUIRED })
            .regex(/^\d{10}$/, tr.PHONE_INVALID)
            .optional(),
        type: z.enum([
            VerificationType.EMAIL,
            VerificationType.PHONE,
            VerificationType.PASSWORD_RESET,
        ]),
    })
    .refine(
        (data) => {
            if (
                data.type === VerificationType.EMAIL ||
                data.type === VerificationType.PASSWORD_RESET ||
                data.type === VerificationType.PHONE
            ) {
                return !!data.email;
            }
            return true;
        },
        {
            message: tr.EMAIL_REQUIRED,
        },
    );

export function validateAuthInput(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    // Attach dynamic enum values for the platform error
    if (firstIssue.message === tr.PLATFORM_MUST_BE_ONE_OF) {
        throw new AuthValidationError(firstIssue.message, {
            values: Object.values(Platform).join(", "),
        });
    }

    throw new AuthValidationError(firstIssue.message);
}
