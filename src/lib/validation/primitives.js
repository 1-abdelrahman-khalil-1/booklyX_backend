import { z } from "zod";
import { tr } from "../i18n/index.js";

export const zId = z.coerce.number().int().positive({ message: tr.INVALID_ID });

export const zIdParamSchema = z.object({
  id: zId,
});

export function createIdParamSchema(paramName = "id") {
  return z.object({
    [paramName]: zId,
  });
}

export function zEmail({ requiredMessage = tr.EMAIL_REQUIRED, invalidMessage = tr.EMAIL_INVALID } = {}) {
  return z.email({
    error: (issue) => {
      if (issue.input === undefined) {
        return requiredMessage;
      }

      return invalidMessage;
    },
  });
}

export function zPhone({ requiredMessage = tr.PHONE_REQUIRED, invalidMessage = tr.PHONE_INVALID } = {}) {
  return z
    .string({ error: requiredMessage })
    .regex(/^\d{11}$/, invalidMessage);
}

export function zPassword({
  requiredMessage = tr.PASSWORD_REQUIRED,
  minLengthMessage = tr.PASSWORD_MIN_LENGTH,
  minLength = 8,
} = {}) {
  return z.string({ error: requiredMessage }).min(minLength, minLengthMessage);
}

export function zIsoDate({
  requiredMessage = tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
  invalidMessage = tr.INVALID_DATE_FORMAT_USE_ISO_STRING,
} = {}) {
  return z
    .string({ error: requiredMessage })
    .refine((date) => !Number.isNaN(Date.parse(date)), {
      message: invalidMessage,
    });
}

export function zImageUrl({ message = tr.INVALID_URL } = {}) {
  if (message) {
    return z.string().url({ error: message });
  }

  return z.string().url();
}