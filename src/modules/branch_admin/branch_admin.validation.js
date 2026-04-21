import { z } from "zod";
import {
    BusinessCategory,
    ServiceApprovalStatus,
    StaffRole,
    VerificationType,
} from "../../generated/prisma/client.js";
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
    .regex(/^\d{11}$/, tr.PHONE_INVALID),
  password: z
    .string({ error: tr.PASSWORD_REQUIRED })
    .min(8, tr.PASSWORD_MIN_LENGTH),

  // Business Info
  businessName: z.string({ error: tr.BUSINESS_NAME_REQUIRED }),
  category: z.enum(Object.values(BusinessCategory), {
    error: (issue) => {
      if (issue.input === undefined) return tr.CATEGORY_REQUIRED;
      return tr.INVALID_ENUM_VALUE;
    },
  }),
  description: z.string({ error: tr.DESCRIPTION_REQUIRED }),
  commercialRegisterNumber: z.string({
    error: tr.COMMERCIAL_REGISTER_NUMBER_REQUIRED,
  }),
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
  latitude: z.coerce.number({ error: tr.LATITUDE_REQUIRED }),
  longitude: z.coerce.number({ error: tr.LONGITUDE_REQUIRED }),
});

export const verifyEmailSchema = z.object({
  email: z.email({ error: tr.EMAIL_INVALID }),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const verifyPhoneSchema = z.object({
  email: z.email({ error: tr.EMAIL_INVALID }),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const resendCodeSchema = z.object({
  email: z.email({ error: tr.EMAIL_INVALID }),
  type: z.enum(Object.values(VerificationType)),
});

export const createStaffSchema = z.object({
  name: z.string({ error: tr.NAME_REQUIRED }),
  email: z.email({ error: tr.EMAIL_INVALID }),
  age: z
    .number({ error: tr.AGE_REQUIRED })
    .int({ message: tr.AGE_MUST_BE_INTEGER })
    .min(18, tr.AGE_MINIMUM),
  startDate: z.string({ error: tr.START_DATE_REQUIRED }).refine((date) => !isNaN(Date.parse(date)), {
    message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
  }),
  phone: z
    .string({ error: tr.PHONE_REQUIRED })
    .regex(/^\d{11}$/, tr.PHONE_INVALID),
  password: z
    .string({ error: tr.PASSWORD_REQUIRED })
    .min(8, tr.PASSWORD_MIN_LENGTH),
  staffRole: z.enum(Object.values(StaffRole), {
    error: tr.INVALID_ENUM_VALUE,
  }),
  profileImageUrl: z.string().url().optional(),
  commissionPercentage: z.number().min(0, tr.COMMISSION_OUT_OF_RANGE).max(100, tr.COMMISSION_OUT_OF_RANGE),
  serviceIds: z
    .array(z.number().int().positive({ message: tr.INVALID_ID }), {
      error: tr.STAFF_SERVICES_REQUIRED,
    })
    .min(1, tr.STAFF_SERVICES_REQUIRED),
});

export const updateStaffSchema = z
  .object({
    id: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
    name: z.string({ error: tr.NAME_REQUIRED }).trim().min(1, tr.NAME_REQUIRED).optional(),
    email: z.email({ error: tr.EMAIL_INVALID }).optional(),
    phone: z
      .string({ error: tr.PHONE_REQUIRED })
      .regex(/^\d{11}$/, tr.PHONE_INVALID)
      .optional(),
    age: z
      .number({ error: tr.AGE_REQUIRED })
      .int({ message: tr.AGE_MUST_BE_INTEGER })
      .min(18, tr.AGE_MINIMUM)
      .optional(),
    startDate: z
      .string({ error: tr.START_DATE_REQUIRED })
      .refine((date) => !isNaN(Date.parse(date)), {
        message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
      })
      .optional(),
    staffRole: z
      .enum(Object.values(StaffRole), {
        error: tr.INVALID_ENUM_VALUE,
      })
      .optional(),
    profileImageUrl: z.string().url().nullable().optional(),
    commissionPercentage: z
      .number()
      .min(0, tr.COMMISSION_OUT_OF_RANGE)
      .max(100, tr.COMMISSION_OUT_OF_RANGE)
      .optional(),
    serviceIds: z
      .array(z.number().int().positive({ message: tr.INVALID_ID }), {
        error: tr.STAFF_SERVICES_REQUIRED,
      })
      .min(1, tr.STAFF_SERVICES_REQUIRED)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasUpdatableField = [
      data.name,
      data.email,
      data.phone,
      data.age,
      data.startDate,
      data.staffRole,
      data.profileImageUrl,
      data.commissionPercentage,
      data.serviceIds,
    ].some((value) => value !== undefined);

    if (!hasUpdatableField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message: tr.STAFF_UPDATE_FIELDS_REQUIRED,
      });
    }
  });

export const staffIdSchema = z.object({
  id: z.coerce.number().int().positive({ message: tr.INVALID_ID }),
});

export const addServiceCategorySchema = z.object({
  name: z
    .string({ error: tr.CATEGORY_REQUIRED })
    .trim()
    .min(1, tr.CATEGORY_REQUIRED),
});

export const createServiceSchema = z.object({
  name: z.string({ error: tr.SERVICE_NAME_REQUIRED }).trim().min(1, tr.SERVICE_NAME_REQUIRED),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: z.string().trim().min(1, tr.CATEGORY_REQUIRED).optional(),
  description: z
    .string({ error: tr.DESCRIPTION_REQUIRED })
    .trim()
    .min(1, tr.DESCRIPTION_REQUIRED),
  price: z.coerce.number({ error: tr.SERVICE_PRICE_REQUIRED }).positive(tr.SERVICE_PRICE_REQUIRED),
  durationMinutes: z
    .coerce
    .number({ error: tr.SERVICE_DURATION_REQUIRED })
    .int({ message: tr.SERVICE_DURATION_REQUIRED })
    .positive(tr.SERVICE_DURATION_REQUIRED),
  imageUrl: z.string().url().optional(),
}).superRefine((data, ctx) => {
  if (!data.categoryId && !data.categoryName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["category"],
      message: tr.CATEGORY_REQUIRED,
    });
  }
});

export const myServicesQuerySchema = z.object({
  status: z.enum(Object.values(ServiceApprovalStatus)).optional(),
});

export const updateServiceSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string({ error: tr.SERVICE_NAME_REQUIRED }).trim().min(1, tr.SERVICE_NAME_REQUIRED).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: z.string().trim().min(1, tr.CATEGORY_REQUIRED).optional(),
  description: z
    .string({ error: tr.DESCRIPTION_REQUIRED })
    .trim()
    .min(1, tr.DESCRIPTION_REQUIRED)
    .optional(),
  price: z.coerce.number({ error: tr.SERVICE_PRICE_REQUIRED }).positive().optional(),
  durationMinutes: z
    .coerce
    .number({ error: tr.SERVICE_DURATION_REQUIRED })
    .int({ message: tr.SERVICE_DURATION_REQUIRED })
    .positive(tr.SERVICE_DURATION_REQUIRED)
    .optional(),
  imageUrl: z.string().url().optional(),
});

export const deleteServiceSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateBranchAdminProfileSchema = z
  .object({
    name: z.string({ error: tr.NAME_REQUIRED }).trim().min(1, tr.NAME_REQUIRED).optional(),
    phone: z
      .string({ error: tr.PHONE_REQUIRED })
      .regex(/^\d{11}$/, tr.PHONE_INVALID)
      .optional(),
    logoUrl: z.string().url().optional(),
    operatingHours: z.string().trim().min(1, tr.OPERATING_HOURS_REQUIRED).optional(),
    address: z.string().trim().min(1, tr.ADDRESS_REQUIRED).optional(),
    currentPassword: z.string().min(1, tr.CURRENT_PASSWORD_REQUIRED).optional(),
    newPassword: z.string().min(8, tr.PASSWORD_MIN_LENGTH).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword && !data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: tr.NEW_PASSWORD_REQUIRED,
      });
    }

    if (!data.currentPassword && data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: tr.CURRENT_PASSWORD_REQUIRED,
      });
    }

    if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: tr.NEW_PASSWORD_MUST_BE_DIFFERENT,
      });
    }

    const hasUpdatableField = [
      data.name,
      data.phone,
      data.logoUrl,
      data.operatingHours,
      data.address,
      data.currentPassword,
      data.newPassword,
    ].some((value) => value !== undefined);

    if (!hasUpdatableField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: tr.PROFILE_UPDATE_FIELDS_REQUIRED,
      });
    }
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

  if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
    const enumValues = firstIssue.options ?? firstIssue.values;
    throw new BranchAdminValidationError(tr.INVALID_ENUM_VALUE, {
      values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
    });
  }

  throw new BranchAdminValidationError(firstIssue.message);
}
