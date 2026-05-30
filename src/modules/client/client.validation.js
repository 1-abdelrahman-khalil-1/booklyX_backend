import { z } from "zod";
import { BusinessCategory } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zId, zIsoDate } from "../../lib/validation/primitives.js";
import { ClientValidationError } from "./errors.js";

// Validation Errors
export { ClientValidationError };

// 1. Discovery/Search Validation
export const discoverySearchSchema = z.object({
  category: z.enum(Object.values(BusinessCategory), {
    error: tr.INVALID_ENUM_VALUE,
  }).optional(),
  lat: z.coerce.number({
    message: tr.LATITUDE_REQUIRED,
  }).min(-90).max(90),
  lng: z.coerce.number({
    message: tr.LONGITUDE_REQUIRED,
  }).min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).optional().default(5),
  search: z.string().optional(),
});

export const homeDashboardQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(50).optional().default(20),
});

// 2. Staff Availability Slots Validation
export const availabilitySlotsSchema = z.object({
  date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
  }),
});

// 3. Appointment Booking Reservation Validation
export const reserveAppointmentSchema = z.object({
  serviceId: zId,
  staffId: zId,
  scheduledAt: zIsoDate().refine((val) => new Date(val) > new Date(), {
    message: tr.PAST_BOOKING_ERROR,
  }),
});

// 4. Favourites Filter Validation
export const favouritesQuerySchema = z.object({
  type: z.enum(["branch_admin", "staff"], {
    error: tr.INVALID_ENUM_VALUE,
  }).optional(),
});

// Wrapper helper
export const validateClientInput = createValidationInputValidator(ClientValidationError);
