import { z } from "zod";
import { Platform, Role, VerificationType } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { createValidationInputValidator } from "../../lib/validation/helpers.js";
import { zEmail, zPassword, zPhone } from "../../lib/validation/primitives.js";
import { AuthValidationError } from "./auth.service.js";
export const loginSchema = z.object({
  email: zEmail(),
  role: z.enum([Role.client, Role.branch_admin, Role.super_admin, Role.staff], {
    error: (issue) => {
      if (issue.input === undefined) return tr.ROLE_REQUIRED;
      return tr.INVALID_ENUM_VALUE;
    },
  }),
  password: z.string({ error: tr.PASSWORD_REQUIRED }),
});

export const registerSchema = z.object({
  name: z.string({ error: tr.NAME_REQUIRED }),
  email: zEmail(),
  password: zPassword(),
  phone: zPhone(),
});

export const platformSchema = z.enum([Platform.APP, Platform.WEB], {
  error: (issue) => {
    if (issue.input === undefined) return tr.PLATFORM_REQUIRED;
    return tr.INVALID_ENUM_VALUE;
  },
});

export const verifyEmailSchema = z.object({
  email: zEmail(),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const verifyPhoneSchema = z.object({
  email: zEmail(),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const requestPasswordResetSchema = z.object({
  email: zEmail(),
});

export const verifyPasswordResetSchema = z.object({
  email: zEmail(),
  code: z.string({ error: tr.OTP_REQUIRED }),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string({ error: tr.TOKEN_REQUIRED }),
  newPassword: zPassword(),
});

export const resendCodeSchema = z
  .object({
    email: zEmail().optional(),
    phone: zPhone(),
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

export const validateAuthInput = createValidationInputValidator(AuthValidationError);
