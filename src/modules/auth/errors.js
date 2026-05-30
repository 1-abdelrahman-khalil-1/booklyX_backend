import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

export class AuthValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AuthValidationError";
  }
}

export class UserNotFound extends AppError {
  constructor() {
    super(tr.USER_NOT_FOUND, 401);
    this.name = "UserNotFound";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(tr.INVALID_CREDENTIALS, 401);
    this.name = "InvalidCredentialsError";
  }
}

export class PlatformAccessDeniedError extends AppError {
  constructor() {
    super(tr.PLATFORM_ACCESS_DENIED, 403);
    this.name = "PlatformAccessDeniedError";
  }
}

export class InactiveUserError extends AppError {
  constructor(data = null) {
    super(tr.INACTIVE_USER, 403, undefined, data);
    this.name = "InactiveUserError";
  }
}

export class BranchAdminNotApprovedError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_UNDER_REVIEW, 403);
    this.name = "BranchAdminNotApprovedError";
  }
}

export class DuplicateAccountError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = "DuplicateAccountError";
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(tr.TOKEN_EXPIRED, 401);
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super(tr.INVALID_TOKEN, 401);
    this.name = "InvalidTokenError";
  }
}

export class MaxAttemptsExceededError extends AppError {
  constructor() {
    super(tr.MAX_ATTEMPTS_EXCEEDED, 429);
    this.name = "MaxAttemptsExceededError";
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(data = null) {
    super(tr.EMAIL_NOT_VERIFIED, 403, undefined, data);
    this.name = "EmailNotVerifiedError";
  }
}

export class PhoneNotVerifiedError extends AppError {
  constructor(data = null) {
    super(tr.PHONE_NOT_VERIFIED, 403, undefined, data);
    this.name = "PhoneNotVerifiedError";
  }
}

export default {};
