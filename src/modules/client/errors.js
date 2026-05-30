import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

// --- Domain Errors ---
export class ClientValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "ClientValidationError";
  }
}

export class ClientNotFoundError extends AppError {
  constructor() {
    super(tr.CLIENT_NOT_FOUND, 404);
    this.name = "ClientNotFoundError";
  }
}

export class BranchNotFoundError extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFoundError";
  }
}

export class StaffNotFoundError extends AppError {
  constructor() {
    super(tr.STAFF_NOT_FOUND, 404);
    this.name = "StaffNotFoundError";
  }
}

export class ServiceNotFoundError extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_FOUND, 404);
    this.name = "ServiceNotFoundError";
  }
}

export class ServiceNotBookableError extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_BOOKABLE, 400);
    this.name = "ServiceNotBookableError";
  }
}

export class AppointmentNotFoundError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_NOT_FOUND, 404);
    this.name = "AppointmentNotFoundError";
  }
}

export class DoubleBookingError extends AppError {
  constructor() {
    super(tr.DOUBLE_BOOKING_ERROR, 409);
    this.name = "DoubleBookingError";
  }
}

export class PastBookingError extends AppError {
  constructor() {
    super(tr.PAST_BOOKING_ERROR, 400);
    this.name = "PastBookingError";
  }
}

export class AppointmentCancellationNotAllowedError extends AppError {
  constructor() {
    super(tr.APPOINTMENT_CANCELLATION_NOT_ALLOWED, 400);
    this.name = "AppointmentCancellationNotAllowedError";
  }
}

export class FavouriteAlreadyExistsError extends AppError {
  constructor() {
    super(tr.FAVOURITE_ALREADY_EXISTS, 409);
    this.name = "FavouriteAlreadyExistsError";
  }
}

export class FavouriteNotFoundError extends AppError {
  constructor() {
    super(tr.FAVOURITE_NOT_FOUND, 404);
    this.name = "FavouriteNotFoundError";
  }
}
