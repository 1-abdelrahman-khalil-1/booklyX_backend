import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

export class BranchAdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "BranchAdminValidationError";
  }
}

export class BranchNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFoundError";
  }
}

export class SubscriptionAlreadyActiveError extends AppError {
  constructor() {
    super(tr.SUBSCRIPTION_ALREADY_ACTIVE, 409);
    this.name = "SubscriptionAlreadyActiveError";
  }
}

export class SubscriptionActivationForbiddenError extends AppError {
  constructor() {
    super(tr.SUBSCRIPTION_ACTIVATION_FORBIDDEN, 403);
    this.name = "SubscriptionActivationForbiddenError";
  }
}

export class DuplicateBranchAdminUserError extends AppError {
  constructor() {
    super(tr.DUPLICATE_ACCOUNT, 409);
    this.name = "DuplicateBranchAdminUserError";
  }
}

export class BranchNotPendingApprovalError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_UNDER_REVIEW, 409);
    this.name = "BranchNotPendingApprovalError";
  }
}

export class InvalidPlanError extends AppError {
  constructor() {
    super(tr.INVALID_PLAN, 400);
    this.name = "InvalidPlanError";
  }
}

export class InactivePlanError extends AppError {
  constructor() {
    super(tr.INACTIVE_PLAN, 400);
    this.name = "InactivePlanError";
  }
}

export class OTPExpiredError extends AppError {
  constructor() {
    super(tr.OTP_EXPIRED, 400);
    this.name = "OTPExpiredError";
  }
}

export class InvalidOTPError extends AppError {
  constructor() {
    super(tr.OTP_INVALID, 400);
    this.name = "InvalidOTPError";
  }
}

export class MaxAttemptsExceededError extends AppError {
  constructor() {
    super(tr.MAX_ATTEMPTS_EXCEEDED, 429);
    this.name = "MaxAttemptsExceededError";
  }
}

export class ServiceCategoryNotFoundError extends AppError {
  constructor() {
    super(tr.CATEGORY_REQUIRED, 400);
    this.name = "ServiceCategoryNotFoundError";
  }
}

export class StaffNotFoundError extends AppError {
  constructor() {
    super(tr.STAFF_NOT_FOUND, 404);
    this.name = "StaffNotFoundError";
  }
}

export class AppointmentNotFoundError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 404);
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentAccessError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_ACCESS_DENIED, 403);
    this.name = "AppointmentAccessError";
  }
}

export class BranchAvailabilityNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_AVAILABILITY_NOT_FOUND, 404);
    this.name = "BranchAvailabilityNotFoundError";
  }
}

export class ServiceDependencyError extends AppError {
  constructor() {
    super(tr.SERVICE_HAS_DEPENDENCIES, 409);
    this.name = "ServiceDependencyError";
  }
}

export class SubscriptionCancellationError extends AppError {
  constructor() {
    super(tr.INVALID_SUBSCRIPTION_CANCELLATION, 409);
    this.name = "SubscriptionCancellationError";
  }
}

export class BookingPaymentNotFoundError extends AppError {
  constructor() {
    super(tr.PAYMENT_NOT_FOUND, 404);
    this.name = "BookingPaymentNotFoundError";
  }
}

export class BookingPaymentAccessError extends AppError {
  constructor() {
    super(tr.PAYMENT_ACCESS_DENIED, 403);
    this.name = "BookingPaymentAccessError";
  }
}

export class AppointmentCancellationError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_CANCELLATION_NOT_ALLOWED, 409);
    this.name = "AppointmentCancellationError";
  }
}

export class PlanNotFoundError extends AppError {
  constructor() {
    super(tr.PLAN_NOT_FOUND, 404);
    this.name = "PlanNotFoundError";
  }
}

export class PaymentNotPaidError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "PaymentNotPaidError";
  }
}

export class PaymentAlreadyRefundedError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "PaymentAlreadyRefundedError";
  }
}