import { z } from "zod";
import {
    AppointmentStatus,
    AvailabilityStatus,
    BusinessCategory,
    PaymentStatus,
    ServiceApprovalStatus,
    StaffRole,
    VerificationType,
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import {
    createValidationInputValidator,
    requireAtLeastOneField,
    validatePasswordChange,
    validateTimeRange,
} from "../../lib/validation/helpers.js";
import { zEmail, zId, zImageUrl, zIsoDate, zPassword, zPhone } from "../../lib/validation/primitives.js";
import { BranchAdminValidationError } from "./errors.js";

export const applySchema = z.object({
  planId: zId,

  // Identity Layer
  ownerName: z.string({ error: tr.NAME_REQUIRED }),
  email: zEmail(),
  phone: zPhone(),
  password: zPassword(),

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
  logoUrl: zImageUrl().optional(),
  taxCertificateUrl: zImageUrl().optional(),
  commercialRegisterUrl: zImageUrl().optional(),
  nationalIdUrl: zImageUrl().optional(),
  facilityLicenseUrl: zImageUrl().optional(),

  // Location Info
  city: z.string({ error: tr.CITY_REQUIRED }),
  district: z.string({ error: tr.DISTRICT_REQUIRED }),
  address: z.string({ error: tr.ADDRESS_REQUIRED }),
  latitude: z.coerce.number({ error: tr.LATITUDE_REQUIRED }),
  longitude: z.coerce.number({ error: tr.LONGITUDE_REQUIRED }),
});

export const verifyEmailSchema = z.object({
  email: zEmail({ requiredMessage: tr.EMAIL_INVALID, invalidMessage: tr.EMAIL_INVALID }),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const verifyPhoneSchema = z.object({
  email: zEmail({ requiredMessage: tr.EMAIL_INVALID, invalidMessage: tr.EMAIL_INVALID }),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const resendCodeSchema = z.object({
  email: zEmail({ requiredMessage: tr.EMAIL_INVALID, invalidMessage: tr.EMAIL_INVALID }),
  type: z.enum(Object.values(VerificationType)),
});

export const createStaffSchema = z.object({
  name: z.string({ error: tr.NAME_REQUIRED }),
  email: zEmail({ requiredMessage: tr.EMAIL_INVALID, invalidMessage: tr.EMAIL_INVALID }),
  age: z
    .number({ error: tr.AGE_REQUIRED })
    .int({ message: tr.AGE_MUST_BE_INTEGER })
    .min(18, tr.AGE_MINIMUM),
  startDate: zIsoDate({ requiredMessage: tr.START_DATE_REQUIRED }),
  phone: zPhone(),
  password: zPassword(),
  staffRole: z.enum(Object.values(StaffRole), {
    error: tr.INVALID_ENUM_VALUE,
  }),
  profileImageUrl: zImageUrl().optional(),
  commissionPercentage: z.number().min(0, tr.COMMISSION_OUT_OF_RANGE).max(100, tr.COMMISSION_OUT_OF_RANGE),
  serviceIds: z
    .array(zId, {
      error: tr.STAFF_SERVICES_REQUIRED,
    })
    .min(1, tr.STAFF_SERVICES_REQUIRED),
});

export const updateStaffSchema = z
  .object({
    id: zId,
    name: z.string({ error: tr.NAME_REQUIRED }).trim().min(1, tr.NAME_REQUIRED).optional(),
    email: zEmail({ requiredMessage: tr.EMAIL_INVALID, invalidMessage: tr.EMAIL_INVALID }).optional(),
    phone: zPhone().optional(),
    age: z
      .number({ error: tr.AGE_REQUIRED })
      .int({ message: tr.AGE_MUST_BE_INTEGER })
      .min(18, tr.AGE_MINIMUM)
      .optional(),
    startDate: zIsoDate({ requiredMessage: tr.START_DATE_REQUIRED }).optional(),
    staffRole: z
      .enum(Object.values(StaffRole), {
        error: tr.INVALID_ENUM_VALUE,
      })
      .optional(),
    profileImageUrl: zImageUrl().nullable().optional(),
    commissionPercentage: z
      .number()
      .min(0, tr.COMMISSION_OUT_OF_RANGE)
      .max(100, tr.COMMISSION_OUT_OF_RANGE)
      .optional(),
    serviceIds: z
      .array(zId, {
        error: tr.STAFF_SERVICES_REQUIRED,
      })
      .min(1, tr.STAFF_SERVICES_REQUIRED)
      .optional(),
  })
  .superRefine((data, ctx) => {
    requireAtLeastOneField(
      data,
      ctx,
      [
        "name",
        "email",
        "phone",
        "age",
        "startDate",
        "staffRole",
        "profileImageUrl",
        "commissionPercentage",
        "serviceIds",
      ],
      {
        path: ["id"],
        message: tr.STAFF_UPDATE_FIELDS_REQUIRED,
      },
    );
  });

export const addServiceCategorySchema = z.object({
  name: z
    .string({ error: tr.CATEGORY_REQUIRED })
    .trim()
    .min(1, tr.CATEGORY_REQUIRED),
});

export const createServiceSchema = z.object({
  name: z.string({ error: tr.SERVICE_NAME_REQUIRED }).trim().min(1, tr.SERVICE_NAME_REQUIRED),
  categoryId: zId.optional(),
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
  imageUrl: zImageUrl().optional(),
}).superRefine((data, ctx) => {
  requireAtLeastOneField(data, ctx, ["categoryId", "categoryName"], {
    path: ["category"],
    message: tr.CATEGORY_REQUIRED,
  });
});

export const myServicesQuerySchema = z.object({
  status: z.enum(Object.values(ServiceApprovalStatus)).optional(),
});

export const periodQuerySchema = z.object({
  period: z.enum(["today", "this_month", "this_year"]).optional(),
});

export const updateServiceSchema = z.object({
  id: zId,
  name: z.string({ error: tr.SERVICE_NAME_REQUIRED }).trim().min(1, tr.SERVICE_NAME_REQUIRED).optional(),
  categoryId: zId.optional(),
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
  imageUrl: zImageUrl().optional(),
});

export const updateBranchAdminProfileSchema = z
  .object({
    name: z.string({ error: tr.NAME_REQUIRED }).trim().min(1, tr.NAME_REQUIRED).optional(),
    phone: z
      .string({ error: tr.PHONE_REQUIRED })
      .regex(/^\d{11}$/, tr.PHONE_INVALID)
      .optional(),
    logoUrl: zImageUrl().optional(),
    operatingHours: z.string().trim().min(1, tr.OPERATING_HOURS_REQUIRED).optional(),
    address: z.string().trim().min(1, tr.ADDRESS_REQUIRED).optional(),
    currentPassword: z.string().min(1, tr.CURRENT_PASSWORD_REQUIRED).optional(),
    newPassword: zPassword().optional(),
  })
  .superRefine((data, ctx) => {
    validatePasswordChange(data, ctx);

    requireAtLeastOneField(
      data,
      ctx,
      ["name", "phone", "logoUrl", "operatingHours", "address", "currentPassword", "newPassword"],
      {
        path: ["name"],
        message: tr.PROFILE_UPDATE_FIELDS_REQUIRED,
      },
    );
  });

export const updateBranchAvailabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z
      .string({ error: tr.STAFF_START_TIME_REQUIRED })
      .regex(/^\d{2}:\d{2}$/, tr.STAFF_TIME_FORMAT_INVALID),
    endTime: z
      .string({ error: tr.STAFF_END_TIME_REQUIRED })
      .regex(/^\d{2}:\d{2}$/, tr.STAFF_TIME_FORMAT_INVALID),
    status: z.enum(Object.values(AvailabilityStatus), {
      error: tr.INVALID_ENUM_VALUE,
    }).optional(),
  })
  .superRefine((data, ctx) => {
    validateTimeRange(data, ctx, {
      path: ["endTime"],
    });
  });

export const updateBookingSettingsSchema = z.object({
  allowCancellationBeforeHours: z.coerce
    .number()
    .int()
    .min(0, tr.INVALID_ID),
});

export const updateNotificationSettingsSchema = z
  .object({
    bookingNotificationsEnabled: z.boolean().optional(),
    marketingNotificationsEnabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.bookingNotificationsEnabled === undefined &&
      data.marketingNotificationsEnabled === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bookingNotificationsEnabled"],
        message: tr.PROFILE_UPDATE_FIELDS_REQUIRED,
      });
    }
  });

export const branchAppointmentsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  status: z.enum(Object.values(AppointmentStatus), {
    error: tr.INVALID_ENUM_VALUE,
  }).optional(),
  staffId: zId.optional(),
});

export const bookingPaymentsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  status: z.enum(Object.values(PaymentStatus), {
    error: tr.INVALID_ENUM_VALUE,
  }).optional(),
});

export const financePaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  status: z.enum(Object.values(PaymentStatus), {
    error: tr.INVALID_ENUM_VALUE,
  }).optional(),
  date: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const exportReportQuerySchema = z.object({
  period: z.enum(["today", "this_month", "this_year"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  format: z.enum(["csv"]).default("csv"),
});

export const rejectBranchSchema = z.object({
  id: zId,
  reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});

export function validateBranchAdminInput(schema, data) {
  return createValidationInputValidator(BranchAdminValidationError)(schema, data);
}
