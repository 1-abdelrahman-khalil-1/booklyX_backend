import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

export class AdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AdminValidationError";
  }
}

export class BranchNotFound extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFound";
  }
}

export class BranchIsNotPendingError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "BranchIsNotPendingError";
  }
}

export class ServiceNotFound extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_FOUND, 404);
    this.name = "ServiceNotFound";
  }
}

export class ServiceNotPendingError extends AppError {
  constructor() {
    super(tr.SERVICE_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "ServiceNotPendingError";
  }
}

export class PaymentNotFoundError extends AppError {
  constructor() {
    super(tr.PAYMENT_NOT_FOUND, 404);
    this.name = "PaymentNotFoundError";
  }
}

export class InvalidPaymentStatusForRefundError extends AppError {
  constructor() {
    super(tr.INVALID_PAYMENT_STATUS_FOR_REFUND, 400);
    this.name = "InvalidPaymentStatusForRefundError";
  }
}

export class PaymentAlreadyRefundedError extends AppError {
  constructor() {
    super(tr.PAYMENT_ALREADY_REFUNDED, 409);
    this.name = "PaymentAlreadyRefundedError";
  }
}
