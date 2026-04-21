import { z } from "zod";
import { OfferDiscountType } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { OffersValidationError } from "./offers.service.js";

const isoDateSchema = z
  .string({ error: tr.INVALID_DATE_FORMAT_USE_ISO_STRING })
  .refine((date) => !isNaN(Date.parse(date)), {
    message: tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
  });

export const offerIdSchema = z.object({
  id: z.string({ error: tr.INVALID_ID }).uuid(tr.INVALID_ID),
});

export const createOfferSchema = z
  .object({
    title: z.string({ error: tr.OFFER_TITLE_REQUIRED }).trim().min(1, tr.OFFER_TITLE_REQUIRED),
    description: z.string().trim().min(1, tr.DESCRIPTION_REQUIRED).optional(),
    discountType: z.enum(Object.values(OfferDiscountType), {
      error: tr.INVALID_ENUM_VALUE,
    }),
    discountValue: z.coerce.number({ error: tr.OFFER_DISCOUNT_VALUE_REQUIRED }).positive(tr.OFFER_DISCOUNT_VALUE_REQUIRED),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    usageLimit: z.coerce.number().int().positive().optional(),
    serviceIds: z
      .array(z.coerce.number().int().positive({ message: tr.INVALID_ID }), {
        error: tr.OFFER_SERVICES_REQUIRED,
      })
      .min(1, tr.OFFER_SERVICES_REQUIRED),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: tr.OFFER_END_DATE_AFTER_START_DATE,
      });
    }

    if (data.discountType === OfferDiscountType.PERCENTAGE && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: tr.OFFER_PERCENTAGE_RANGE,
      });
    }
  });

export const updateOfferSchema = z
  .object({
    title: z.string({ error: tr.OFFER_TITLE_REQUIRED }).trim().min(1, tr.OFFER_TITLE_REQUIRED).optional(),
    description: z.string().trim().min(1, tr.DESCRIPTION_REQUIRED).nullable().optional(),
    discountType: z
      .enum(Object.values(OfferDiscountType), {
        error: tr.INVALID_ENUM_VALUE,
      })
      .optional(),
    discountValue: z.coerce.number({ error: tr.OFFER_DISCOUNT_VALUE_REQUIRED }).positive(tr.OFFER_DISCOUNT_VALUE_REQUIRED).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    isActive: z.boolean().optional(),
    usageLimit: z.coerce.number().int().positive().nullable().optional(),
    serviceIds: z
      .array(z.coerce.number().int().positive({ message: tr.INVALID_ID }), {
        error: tr.OFFER_SERVICES_REQUIRED,
      })
      .min(1, tr.OFFER_SERVICES_REQUIRED)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === OfferDiscountType.PERCENTAGE
      && data.discountValue !== undefined
      && data.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: tr.OFFER_PERCENTAGE_RANGE,
      });
    }

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: tr.OFFER_END_DATE_AFTER_START_DATE,
      });
    }

    const hasUpdatableField = [
      data.title,
      data.description,
      data.discountType,
      data.discountValue,
      data.startDate,
      data.endDate,
      data.isActive,
      data.usageLimit,
      data.serviceIds,
    ].some((value) => value !== undefined);

    if (!hasUpdatableField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: tr.OFFER_UPDATE_FIELDS_REQUIRED,
      });
    }
  });

export function validateOffersInput(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];

  if (firstIssue.code === "invalid_enum_value" || firstIssue.code === "invalid_value") {
    const enumValues = firstIssue.options ?? firstIssue.values;
    throw new OffersValidationError(tr.INVALID_ENUM_VALUE, {
      values: Array.isArray(enumValues) ? enumValues.join(", ") : "",
    });
  }

  throw new OffersValidationError(firstIssue.message);
}
