import { z } from "zod";
import { BusinessCategory, VerificationType } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { BranchAdminValidationError } from "./branch_admin.service.js";

export const applySchema = z.object({
    // Identity Layer
    ownerName: z.string({ error: tr.NAME_REQUIRED }),
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    phone: z
        .string({ error: tr.PHONE_REQUIRED })
        .regex(/^\d{10}$/, tr.PHONE_INVALID),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),

    // Business Info
    businessName: z.string({ error: tr.BUSINESS_NAME_REQUIRED }),
    category: z.enum(Object.values(BusinessCategory), {
        errorMap: () => ({ message: tr.CATEGORY_MUST_BE_ONE_OF }),
    }),
    description: z.string({ error: tr.DESCRIPTION_REQUIRED }),
    commercialRegisterNumber: z.string({ error: tr.COMMERCIAL_REGISTER_NUMBER_REQUIRED }),
    taxId: z.string({ error: tr.TAX_ID_REQUIRED }),
    logoUrl: z.string().url().optional(),
    taxCertificateUrl: z.string().url().optional(),
    commercialRegisterUrl: z.string().url().optional(),
    nationalIdUrl: z.string().url().optional(),
    facilityLicenseUrl: z.string().url().optional(),

    // Location Info
    city: z.string({ error: tr.CITY_REQUIRED }),
    district: z.string({ error: tr.DISTRICT_REQUIRED }),
    address: z.string({ error: tr.ADDRESS_REQUIRED }),
    latitude: z.number({ error: tr.LATITUDE_REQUIRED }),
    longitude: z.number({ error: tr.LONGITUDE_REQUIRED }),
});

export const verifyEmailSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

export const verifyPhoneSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

export const createStaffSchema = z.object({
    name: z.string({ error: tr.NAME_REQUIRED }),
    email: z.email({ error: tr.EMAIL_INVALID }),
    phone: z
        .string({ error: tr.PHONE_REQUIRED })
        .regex(/^\d{10}$/, tr.PHONE_INVALID),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),
});

export const resendCodeSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    type: z.enum(Object.values(VerificationType)),
});

export const verifyApplicationSchema = z.object({
    id: z.number(),
});

export const approveApplicationSchema = z.object({
    id: z.number(),
});

export const rejectApplicationSchema = z.object({
    id: z.number(),
    reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});

export function validateBranchAdminInput(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    if (firstIssue.message === tr.CATEGORY_MUST_BE_ONE_OF) {
        throw new BranchAdminValidationError(firstIssue.message, {
            values: Object.values(BusinessCategory).join(", "),
        });
    }

    throw new BranchAdminValidationError(firstIssue.message);
}


export function validateCreateStaffSchema(data) {
    return validateBranchAdminInput(createStaffSchema, data);
}