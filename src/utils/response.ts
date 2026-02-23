import { Response } from "express";

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
