/**
 * @param {any} res
 * @param {number} status
 * @param {string} message
 * @param {unknown} [data]
 */
export function successResponse(res, status, message, data = null) {
  res.status(status).json({
    status,
    error: false,
    message,
    data,
  });
}

/**
 * @param {any} res
 * @param {number} status
 * @param {string} message
 * @param {Record<string, string | number | boolean> | null} [params]
 * @param {unknown} [data]
 */
export function errorResponse(res, status, message, params = null, data = null) {
  res.status(status).json({
    status,
    error: true,
    message,
    data,
    params,
  });
}
