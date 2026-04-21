export function successResponse(res, status, message, data) {
  res.status(status).json({
    status,
    error: false,
    message,
    data,
  });
}

export function errorResponse(res, status, message, params = null) {
  res.status(status).json({
    status,
    error: true,
    message,
    params,
  });
}
