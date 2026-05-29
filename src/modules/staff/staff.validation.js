import { z } from "zod";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zImageUrl } from "../../lib/validation/primitives.js";
import { AppError } from "../../utils/AppError.js";
import { IncomeRangeValues } from "../../utils/enums.js";

class StaffValidationError extends AppError {
  constructor(message, statusCode = 400, params = {}) {
    super(message, statusCode, params);
    this.name = "StaffValidationError";
  }
}

// ─── Schedule Query ──
export const scheduleQuerySchema = z.object({
  date: z.coerce.date({
    error: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
  }),
});

// ─── Availability Schemas ───────────────────────────────────────────────
const availabilitySchemaBase = z.object({
  dayOfWeek: z
    .number({ message: tr.STAFF_DAY_OF_WEEK_REQUIRED })
    .int()
    .min(0, { message: tr.INVALID_ID })
    .max(6, { message: tr.INVALID_ID }),
  startTime: z
    .string({ message: tr.STAFF_START_TIME_REQUIRED })
    .regex(/^\d{2}:\d{2}$/, tr.STAFF_TIME_FORMAT_INVALID),
  endTime: z
    .string({ message: tr.STAFF_END_TIME_REQUIRED })
    .regex(/^\d{2}:\d{2}$/, tr.STAFF_TIME_FORMAT_INVALID),
});

export const createAvailabilitySchema = availabilitySchemaBase
  .superRefine((data, ctx) => {
    if (data.startTime >= data.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: tr.STAFF_END_TIME_AFTER_START_TIME,
      });
    }
  });

export const updateAvailabilitySchema = availabilitySchemaBase
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.startTime !== undefined &&
      data.endTime !== undefined &&
      data.startTime >= data.endTime
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: tr.STAFF_END_TIME_AFTER_START_TIME,
      });
    }
  });

// ─── Income Query ───
export const incomeQuerySchema = z.object({
  range: z.enum(IncomeRangeValues, {
    error: tr.STAFF_INCOME_RANGE_REQUIRED,
  }),
});

// ─── Appointment Actions ────────────────────────────────────────────────
export const appointmentActionSchema = z.object({
  notes: z.string().optional().nullable(),
  attachments: z
    .array(zImageUrl({ message: tr.INVALID_URL }), {
      error: "Attachments must be an array of URLs",
    })
    .optional()
    .nullable(),
});

export const appointmentsQuerySchema = z.object({
  status: z
    .enum(
      [
        "pending",
        "open",
        "closed",
        "PENDING",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELED",
      ],
      {
        error: tr.INVALID_STATUS_FILTER,
      }
    )
    .optional(),
});

// ─── Available Slots Query ──────────────────────────────────────────────
export const availableSlotsQuerySchema = z.object({
  date: z
    .string()
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
    })
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
    }),
  serviceId: z.coerce
    .number()
    .int()
    .positive({ message: tr.INVALID_ID }),
});

export const validateStaffInput = createValidationInputValidator(StaffValidationError);
