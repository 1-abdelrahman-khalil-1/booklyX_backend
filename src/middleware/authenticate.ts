import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Platform, Role, UserStatus } from "../generated/prisma/client.js";
import { getLanguage, t, tr } from "../lib/i18n/index.js";
import prisma from "../lib/prisma.js";
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
 * validates the user exists and is active, and attaches the decoded
 * payload to `req.user`.
 *
 * If the token is missing, invalid, or user is inactive → 401 Unauthorized.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    // 1️⃣ Validate decoded JWT payload shape
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "number" ||
      !decoded.role ||
      !decoded.platform
    ) {
      errorResponse(res, 401, t(tr.INVALID_OR_EXPIRED_TOKEN, lang));
      return;
    }

    // 2️⃣ Validate platform header properly
    // Ensure the request is coming from the same platform the token was issued for.
    const requestPlatform = req.headers["platform"];

    if (!requestPlatform || typeof requestPlatform !== "string") {
      errorResponse(res, 400, t(tr.PLATFORM_HEADER_REQUIRED, lang));
      return;
    }

    if (decoded.platform !== (requestPlatform as Platform)) {
      errorResponse(res, 403, t(tr.TOKEN_PLATFORM_MISMATCH, lang));
      return;
    }

    // 3️⃣ Verify user still exists and is ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      errorResponse(res, 401, t(tr.AUTH_REQUIRED, lang));
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
