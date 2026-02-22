import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Platform, Role } from "../generated/prisma/client.js";
import { getLanguage, t, tr } from "../lib/i18n/index.js";
import { errorResponse } from "../utils/response.js";

/**
 * Shape of the JWT payload our login endpoint signs.
 * After `authenticate` runs successfully, `req.user` holds this object.
 */
export interface JwtPayload {
  sub: number; // userId
  role: Role;
  platform: Platform;
}

/**
 * authenticate — Express middleware
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * and attaches the decoded payload to `req.user`.
 *
 * If the token is missing or invalid → 401 Unauthorized.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const lang = getLanguage(req);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    errorResponse(res, 401, t(tr.AUTH_TOKEN_REQUIRED, lang));
    return;
  }

  const token = authHeader.split(" ")[1];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set.");
    errorResponse(res, 500, t(tr.INTERNAL_SERVER_ERROR, lang));
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown as JwtPayload;

    // Ensure the request is coming from the same platform the token was issued for.
    // The client must send an `platform` header (e.g. "APP" or "WEB") on every request.
    const requestPlatform = req.headers["platform"];
    if (decoded.platform !== requestPlatform) {
      errorResponse(res, 403, t(tr.TOKEN_PLATFORM_MISMATCH, lang));
      return;
    }

    req.user = decoded;
    next();
  } catch {
    errorResponse(res, 401, t(tr.INVALID_OR_EXPIRED_TOKEN, lang));
  }
}

/**
 * authorize — Express middleware factory
 *
 * Takes one or more `Role` values and returns a middleware that checks
 * whether `req.user.role` is in the allowed list.
 *
 * Must be used AFTER `authenticate` (so `req.user` exists).
 *
 * If the role is not allowed → 403 Forbidden.
 *
 * Usage:
 *   router.get("/admin", authenticate, authorize(Role.super_admin), handler);
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const lang = getLanguage(req);

    if (!req.user) {
      errorResponse(res, 401, t(tr.AUTH_REQUIRED, lang));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      errorResponse(res, 403, t(tr.FORBIDDEN, lang));
      return;
    }

    next();
  };
}
