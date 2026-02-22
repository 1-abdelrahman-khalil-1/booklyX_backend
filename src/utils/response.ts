import { Response } from "express";

/**
 * Unified API response contract.
 *
 * Every response — success or error — follows this shape:
 * ```json
 * {
 *   "status":  200,
 *   "error":   false,
 *   "message": "Login successful.",
 *   "data":    { ... }
 * }
 * ```
 *
 * Use `successResponse` for 2xx responses with optional data.
 * Use `errorResponse` for 4xx/5xx responses.
 */

/**
 * Send a standardised success response.
 *
 * @param res     Express Response object
 * @param status  HTTP status code (e.g. 200, 201)
 * @param message Translated success message
 * @param data    Response payload — omit or pass `null` when there is no data
 */
export function successResponse(
  res: Response,
  status: number,
  message: string,
  data: unknown = null,
): void {
  res.status(status).json({
    status,
    error: false,
    message,
    data,
  });
}

/**
 * Send a standardised error response.
 *
 * @param res     Express Response object
 * @param status  HTTP status code (e.g. 400, 401, 404, 500)
 * @param message Translated error message
 */
export function errorResponse(
  res: Response,
  status: number,
  message: string,
): void {
  res.status(status).json({
    status,
    error: true,
    message,
    data: null,
  });
}
