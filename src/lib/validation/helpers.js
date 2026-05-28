import { tr } from "../i18n/index.js";

function isEnumValidationIssue(firstIssue) {
  return firstIssue?.code === "invalid_enum_value" || firstIssue?.code === "invalid_value";
}

function getEnumValues(firstIssue) {
  const enumValues = firstIssue.options ?? firstIssue.values;
  return Array.isArray(enumValues) ? enumValues.join(", ") : "";
}

export function validateSchema(schema, data, ValidationErrorClass, fallbackMessage = "Invalid input") {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const firstIssue = result.error.issues[0];
  if (!firstIssue) {
    throw new ValidationErrorClass(fallbackMessage);
  }

  if (isEnumValidationIssue(firstIssue)) {
    throw new ValidationErrorClass(tr.INVALID_ENUM_VALUE, {
      values: getEnumValues(firstIssue),
    });
  }

  throw new ValidationErrorClass(firstIssue.message);
}

export function createValidationInputValidator(ValidationErrorClass, fallbackMessage = "Invalid input") {
  return (schema, data) => validateSchema(schema, data, ValidationErrorClass, fallbackMessage);
}

export function requireAtLeastOneField(data, ctx, fields, { path = fields[0], message }) {
  if (fields.some((field) => data[field] !== undefined)) {
    return;
  }

  ctx.addIssue({
    code: "custom",
    path: Array.isArray(path) ? path : [path],
    message,
  });
}

export function validateTimeRange(data, ctx, {
  startField = "startTime",
  endField = "endTime",
  path = endField,
  message = tr.STAFF_END_TIME_AFTER_START_TIME,
} = {}) {
  const startValue = data[startField];
  const endValue = data[endField];

  if (startValue === undefined || endValue === undefined) {
    return;
  }

  if (startValue >= endValue) {
    ctx.addIssue({
      code: "custom",
      path: Array.isArray(path) ? path : [path],
      message,
    });
  }
}

export function validatePasswordChange(data, ctx, {
  currentPasswordField = "currentPassword",
  newPasswordField = "newPassword",
  currentPasswordRequiredMessage = tr.CURRENT_PASSWORD_REQUIRED,
  newPasswordRequiredMessage = tr.NEW_PASSWORD_REQUIRED,
  samePasswordMessage = tr.NEW_PASSWORD_MUST_BE_DIFFERENT,
} = {}) {
  const currentPassword = data[currentPasswordField];
  const newPassword = data[newPasswordField];

  if (currentPassword !== undefined && newPassword === undefined) {
    ctx.addIssue({
      code: "custom",
      path: [newPasswordField],
      message: newPasswordRequiredMessage,
    });
  }

  if (currentPassword === undefined && newPassword !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: [currentPasswordField],
      message: currentPasswordRequiredMessage,
    });
  }

  if (currentPassword !== undefined && newPassword !== undefined && currentPassword === newPassword) {
    ctx.addIssue({
      code: "custom",
      path: [newPasswordField],
      message: samePasswordMessage,
    });
  }
}