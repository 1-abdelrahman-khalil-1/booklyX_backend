function toSnakeCaseKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function toSnakeCaseDeep(value) {
  if (Array.isArray(value)) {
    return value.map(toSnakeCaseDeep);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      toSnakeCaseKey(key),
      toSnakeCaseDeep(nestedValue),
    ]),
  );
}

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
    data: toSnakeCaseDeep(data),
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
    data: toSnakeCaseDeep(data),
    params: toSnakeCaseDeep(params),
  });
}
