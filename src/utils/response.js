export function successResponse(
  res,
  status,
  message,
  data = null
) {
  res.status(status).json({
    status,
    error: false,
    message,
    data,
  });
}

export function errorResponse(
  res,
  status,
  message
) {
  res.status(status).json({
    status,
    error: true,
    message,
    data: null,
  });
}
