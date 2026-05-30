import { tr } from "../../lib/i18n/index.js";
import { AppError } from "../../utils/AppError.js";

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

export class AvailabilityNotFoundError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_NOT_FOUND, 404);
    this.name = "AvailabilityNotFoundError";
  }
}

export class AvailabilityAccessError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_NOT_FOUND, 403);
    this.name = "AvailabilityAccessError";
  }
}

export class DuplicateAvailabilityError extends AppError {
  constructor() {
    super(tr.AVAILABILITY_ALREADY_EXISTS, 409);
    this.name = "DuplicateAvailabilityError";
  }
}

export class InvalidAppointmentStatusError extends AppError {
  constructor() {
    super(tr.INVALID_APPOINTMENT_STATUS, 400);
    this.name = "InvalidAppointmentStatusError";
  }
}
