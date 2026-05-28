import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import { AppError } from "../../../utils/AppError.js";
import { tr } from "../../i18n/index.js";
import {
    createValidationInputValidator,
    requireAtLeastOneField,
    validatePasswordChange,
    validateSchema,
    validateTimeRange,
} from "../helpers.js";
import {
    createIdParamSchema,
    zEmail,
    zId,
    zIdParamSchema,
    zImageUrl,
    zIsoDate,
    zPassword,
    zPhone,
} from "../primitives.js";
import { expectValidationError } from "../test-helpers.js";

class ValidationTestError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ValidationTestError";
  }
}

describe("validation primitives", () => {
  it("coerces ids", () => {
    expect(zId.parse("12")).toBe(12);
  });

  it("validates shared id parameter schemas", () => {
    expect(zIdParamSchema.parse({ id: "4" })).toEqual({ id: 4 });
    expect(createIdParamSchema("paymentId").parse({ paymentId: "7" })).toEqual({ paymentId: 7 });
  });

  it("validates emails, phone numbers, passwords, dates, and urls", () => {
    expect(zEmail().parse("person@example.com")).toBe("person@example.com");
    expect(zPhone().parse("01012345678")).toBe("01012345678");
    expect(zPassword().parse("password123")).toBe("password123");
    expect(zIsoDate().parse("2026-05-27T00:00:00.000Z")).toBe("2026-05-27T00:00:00.000Z");
    expect(zImageUrl().parse("https://cdn.example.com/file.png")).toBe("https://cdn.example.com/file.png");
  });
});

describe("validation helpers", () => {
  it("normalizes enum validation errors", () => {
    const schema = z.object({
      status: z.enum(["A", "B"]),
    });

    return expectValidationError(
      () => validateSchema(schema, { status: "C" }, ValidationTestError),
      ValidationTestError,
      { message: tr.INVALID_ENUM_VALUE },
    );
  });

  it("requires at least one field", () => {
    const schema = z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
    }).superRefine((data, ctx) => {
      requireAtLeastOneField(data, ctx, ["name", "phone"], {
        path: ["name"],
        message: tr.PROFILE_UPDATE_FIELDS_REQUIRED,
      });
    });

    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(tr.PROFILE_UPDATE_FIELDS_REQUIRED);
  });

  it("validates time range and password changes", () => {
    const timeSchema = z.object({
      startTime: z.string(),
      endTime: z.string(),
    }).superRefine((data, ctx) => {
      validateTimeRange(data, ctx);
    });

    const passwordSchema = z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().optional(),
    }).superRefine((data, ctx) => {
      validatePasswordChange(data, ctx);
    });

    expect(timeSchema.safeParse({ startTime: "18:00", endTime: "09:00" }).success).toBe(false);
    expect(passwordSchema.safeParse({ currentPassword: "abc" }).success).toBe(false);
  });

  it("creates reusable validator factories", () => {
    const validateTestInput = createValidationInputValidator(ValidationTestError);
    const schema = z.object({
      id: zId,
    });

    expect(validateTestInput(schema, { id: "4" })).toEqual({ id: 4 });
    return expectValidationError(
      () => validateTestInput(schema, { id: 0 }),
      ValidationTestError,
    );
  });
});