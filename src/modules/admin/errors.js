import { AppError } from "../../utils/AppError.js";

export class AdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AdminValidationError";
  }
}
