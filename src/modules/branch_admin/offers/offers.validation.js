import { z } from "zod";
import { OfferDiscountType } from "../../../generated/prisma/client.js";
import { tr } from "../../../lib/i18n/index.js";
import { createValidationInputValidator, requireAtLeastOneField } from "../../../lib/validation/helpers.js";
import { zId, zIsoDate } from "../../../lib/validation/primitives.js";
import { OffersValidationError } from "./offers.service.js";

export const createOfferSchema = z
  .object({
    title: z.string({ error: tr.OFFER_TITLE_REQUIRED }).trim().min(1, tr.OFFER_TITLE_REQUIRED),
    description: z.string().trim().min(1, tr.DESCRIPTION_REQUIRED).optional(),
    discountType: z.enum(Object.values(OfferDiscountType), {
      error: tr.INVALID_ENUM_VALUE,
    }),
    discountValue: z.coerce.number({ error: tr.OFFER_DISCOUNT_VALUE_REQUIRED }).positive(tr.OFFER_DISCOUNT_VALUE_REQUIRED),
    startDate: zIsoDate(),
    endDate: zIsoDate(),
    imageUrl: z.string().url().nullable().optional(),
    usageLimit: z.coerce.number().int().positive().optional(),
    serviceIds: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          return val.split(",").map((s) => Number(s.trim()));
        }
        if (Array.isArray(val)) {
          return val.map((s) => Number(s));
        }
        return val;
      },
      z.array(zId, {
        error: tr.OFFER_SERVICES_REQUIRED,
      }).min(1, tr.OFFER_SERVICES_REQUIRED)
    ),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: tr.OFFER_END_DATE_AFTER_START_DATE,
      });
    }

    if (data.discountType === OfferDiscountType.PERCENTAGE && data.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
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
    startDate: zIsoDate().optional(),
    endDate: zIsoDate().optional(),
    imageUrl: z.string().url().nullable().optional(),
    isActive: z.preprocess((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return val;
    }, z.boolean().optional()),
    usageLimit: z.coerce.number().int().positive().nullable().optional(),
    serviceIds: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          return val.split(",").map((s) => Number(s.trim()));
        }
        if (Array.isArray(val)) {
          return val.map((s) => Number(s));
        }
        return val;
      },
      z.array(zId, {
        error: tr.OFFER_SERVICES_REQUIRED,
      }).min(1, tr.OFFER_SERVICES_REQUIRED).optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountType === OfferDiscountType.PERCENTAGE
      && data.discountValue !== undefined
      && data.discountValue > 100
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: tr.OFFER_PERCENTAGE_RANGE,
      });
    }

    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: tr.OFFER_END_DATE_AFTER_START_DATE,
      });
    }

    requireAtLeastOneField(
      data,
      ctx,
      [
        "title",
        "description",
        "discountType",
        "discountValue",
        "startDate",
        "endDate",
        "imageUrl",
        "isActive",
        "usageLimit",
        "serviceIds",
      ],
      {
        path: ["title"],
        message: tr.OFFER_UPDATE_FIELDS_REQUIRED,
      },
    );
  });

export const validateOffersInput = createValidationInputValidator(OffersValidationError);
