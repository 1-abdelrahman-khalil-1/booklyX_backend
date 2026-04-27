import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
    ApplicationStatus,
    Prisma,
    Role,
    UserStatus,
    VerificationType
} from "../../generated/prisma/client.js";
import {
    sendEmailVerification,
    sendPasswordResetEmail,
    sendPhoneVerificationCode,
} from "../../lib/email.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { isPlatformAllowedForRole } from "./auth.permissions.js";
// Validation is now handled in auth.controller.js

const SALT_ROUNDS = 10;
const FIXED_OTP_CODE = process.env.FIXED_OTP_CODE || "333333";
const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
const LOGIN_COUNTER_KEY = "login";

const CODE_EXPIRES_MINUTES = parseInt(
  process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
);

const MAX_ATTEMPTS = 5;

// ─── Domain Error Classes ─────────────────────────────────────────────────────

export class AuthValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AuthValidationError";
  }
}

export class UserNotFound extends AppError {
  constructor() {
    super(tr.USER_NOT_FOUND, 404);
    this.name = "UserNotFound";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(tr.INVALID_CREDENTIALS, 401);
    this.name = "InvalidCredentialsError";
  }
}

export class PlatformAccessDeniedError extends AppError {
  constructor() {
    super(tr.PLATFORM_ACCESS_DENIED, 403);
    this.name = "PlatformAccessDeniedError";
  }
}

export class InactiveUserError extends AppError {
  /**
   * @param {unknown} [data]
   */
  constructor(data = null) {
    super(tr.INACTIVE_USER, 403, undefined, data);
    this.name = "InactiveUserError";
  }
}

export class BranchAdminNotApprovedError extends AppError {
  constructor() {
    super(tr.APPLICATION_IS_UNDER_REVIEW, 403);
    this.name = "BranchAdminNotApprovedError";
  }
}

export class DuplicateAccountError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = "DuplicateAccountError";
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super(tr.TOKEN_EXPIRED, 400);
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super(tr.INVALID_TOKEN, 400);
    this.name = "InvalidTokenError";
  }
}

export class MaxAttemptsExceededError extends AppError {
  constructor() {
    super(tr.MAX_ATTEMPTS_EXCEEDED, 429);
    this.name = "MaxAttemptsExceededError";
  }
}

/**
 * Thrown when a user tries to log in without verifying their email first.
 * HTTP 403 — distinct from PhoneNotVerifiedError so the client can route
 * the user to the correct verification screen.
 */
export class EmailNotVerifiedError extends AppError {
  /**
   * @param {unknown} [data]
   */
  constructor(data = null) {
    super(tr.EMAIL_NOT_VERIFIED, 403, undefined, data);
    this.name = "EmailNotVerifiedError";
  }
}

/**
 * Thrown when a user tries to log in without verifying their phone first.
 * HTTP 403 — a different status code from EmailNotVerifiedError lets the
 * client distinguish which step is pending.
 */
export class PhoneNotVerifiedError extends AppError {
  /**
   * @param {unknown} [data]
   */
  constructor(data = null) {
    super(tr.PHONE_NOT_VERIFIED, 403, undefined, data);
    this.name = "PhoneNotVerifiedError";
  }
}

function getVerificationFlags(user) {
  return {
    emailVerified: !!user?.emailVerified,
    phoneVerified: !!user?.phoneVerified,
  };
}

// ─── Parse Helper ─────────────────────────────────────────────────────────────

/**
 * Runs Zod validation on `data` against `schema`.
 * On success returns the typed, cleaned data.
 * On failure re-throws the first validation issue as an `AuthValidationError`
 * (an i18n key), so the controller can translate it per the user's language.
 */

// ─── OTP Helpers ─────────────────────────────────────────────────────────────

function generateOtpCode() {
  // TODO: Replace with secure random OTP generation once verification providers are finalized.
  return FIXED_OTP_CODE;
}

async function createVerificationCode(userId, type) {
  // Delete all previous unused codes of the same type to invalidate them
  await prisma.verificationCode.deleteMany({
    where: { userId, type, used: false },
  });

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);

  await prisma.verificationCode.create({
    data: { userId, type, codeHash, expiresAt },
  });

  return code;
}

async function getNextLoginSequence() {
  const counter = await prisma.systemCounter.upsert({
    where: { key: LOGIN_COUNTER_KEY },
    create: { key: LOGIN_COUNTER_KEY, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });

  return counter.value;
}

async function consumeVerificationCode(userId, type, code) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, type, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) throw new InvalidTokenError();
  if (record.attempts >= MAX_ATTEMPTS) throw new MaxAttemptsExceededError();
  if (new Date() > record.expiresAt) throw new TokenExpiredError();

  const isValid = await bcrypt.compare(code, record.codeHash);

  if (!isValid) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new InvalidTokenError();
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { used: true },
  });
}

// ─── JWT Helper ──────────────────────────────────────────────────────────────

async function issueAuthTokens(userId, role, platform, loginSequence) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

  const accessToken = jwt.sign({ sub: userId, role, platform }, jwtSecret, {
    expiresIn: "1h",
  });
  const prefixedAccessToken = `${loginSequence}|${accessToken}`;

  const refreshTokenString = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshTokenString)
    .digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, loginSequence },
  });
  return { token: prefixedAccessToken, refreshToken: refreshTokenString };
}
// ─── Sanitization Helper ───────────────────────────────────────────────────

function toSafeUser(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;

  if (safeUser.branchAdmin) {
    const { passwordHash: _hash, ...safeBranchAdmin } = safeUser.branchAdmin;
    return { ...safeBranchAdmin, role: user.role };
  }
  return safeUser;
}

async function ensureClientProfile(user) {
  if (!user || user.role !== Role.client) return;

  await prisma.client.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
}

// ─── Auth Services ────────────────────────────────────────────────────────────

export async function login(data, platform) {
  const { email, role, password } = data;

  const user = await prisma.user.findUnique({
    where: { email, role },
    include: { branchAdmin: role === Role.branch_admin ? true : false },
  });

  const branchAdminRecord = !user
    ? await prisma.branchAdmin.findFirst({ where: { email } })
    : null;

  if (!user && !branchAdminRecord) throw new UserNotFound();

  const isPasswordMatch = await bcrypt.compare(
    password,
    user?.password || branchAdminRecord?.passwordHash,
  );
  if (!isPasswordMatch) throw new InvalidCredentialsError();

  if (!user) {
    throw new BranchAdminNotApprovedError();
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new InactiveUserError({
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });
  }

  if (user.role === Role.branch_admin) {
    if (
      !user.branchAdmin ||
      user.branchAdmin.status !== ApplicationStatus.APPROVED
    ) {
      throw new BranchAdminNotApprovedError();
    }
  }

  if (!isPlatformAllowedForRole(user.role, platform))
    throw new PlatformAccessDeniedError();

  // Enforce verification funnel — email first, then phone
  if (!user.emailVerified) {
    throw new EmailNotVerifiedError(getVerificationFlags(user));
  }
  if (!user.phoneVerified) {
    throw new PhoneNotVerifiedError(getVerificationFlags(user));
  }

  await ensureClientProfile(user);

  const loginSequence = await getNextLoginSequence();
  const tokens = await issueAuthTokens(
    user.id,
    user.role,
    platform,
    loginSequence,
  );

  return { ...tokens, user: toSafeUser(user) };
}

/**
 * Register — Step 1 of the sign-up funnel.
 * Creates the account and immediately sends an email verification OTP.
 * Token is NOT issued here — the user must complete both verifications first.
 */

export async function register(data, platform) {
  const { name, email, password, phone } = data;

  // Only CLIENTs can self-register; staff/admins are created by super admins
  if (!isPlatformAllowedForRole(Role.client, platform)) {
    throw new PlatformAccessDeniedError();
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email)
      throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
    if (existingUser.phone === phone)
      throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
    throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: Role.client,
        status: UserStatus.ACTIVE,
        client: {
          create: {},
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = error.meta?.target;

      if (Array.isArray(target) && target.includes("email"))
        throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);

      if (Array.isArray(target) && target.includes("phone"))
        throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
      throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
    }
    throw error;
  }

  // Auto-send email verification OTP right after account creation
  const code = await createVerificationCode(user.id, VerificationType.EMAIL);
  await sendEmailVerification(email, code);
}

/**
 * Verify Email — Step 2 of the sign-up funnel.
 * Marks the email as verified and immediately sends a phone verification OTP.
 */

export async function verifyEmail(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();

  if (user.emailVerified) {
    throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);
  }

  await consumeVerificationCode(user.id, VerificationType.EMAIL, code);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  // Auto-send phone verification OTP right after email is confirmed
  const phoneCode = await createVerificationCode(
    user.id,
    VerificationType.PHONE,
  );
  // TODO: Swap sendPhoneVerificationCode for real SMS (Twilio, etc.) once integrated
  await sendPhoneVerificationCode(user.email, phoneCode);
}

/**
 * Verify Phone — Step 3 (final step) of the sign-up funnel.
 * Marks the phone as verified and issues the auth token.
 * This is the only point in the flow where a token is returned.
 */

export async function verifyPhone(email, code, platform) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();

  // Strict Step Enforcement: Cannot verify phone if email is still pending
  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  if (user.phoneVerified) {
    throw new AuthValidationError(tr.PHONE_ALREADY_VERIFIED);
  }

  if (!isPlatformAllowedForRole(user.role, platform)) {
    throw new PlatformAccessDeniedError();
  }

  await consumeVerificationCode(user.id, VerificationType.PHONE, code);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  // Issue the auth token now that both verifications are complete
  const loginSequence = await getNextLoginSequence();
  const tokens = await issueAuthTokens(
    updatedUser.id,
    updatedUser.role,
    platform,
    loginSequence,
  );

  return { ...tokens, user: toSafeUser(updatedUser) };
}

// ─── Password Reset (3-step OTP flow) ────────────────────────────────────────

/**
 * Step 1 — Request a password reset OTP.
 * Silent on unknown email to prevent user-enumeration attacks.
 */

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silently do nothing — don't reveal if email exists

  const code = await createVerificationCode(
    user.id,
    VerificationType.PASSWORD_RESET,
  );
  await sendPasswordResetEmail(email, code);
}

/**
 * Step 2 — Verify the password reset OTP.
 * Returns a short-lived reset JWT (15 min) that authorises step 3.
 * The JWT carries `purpose: "PASSWORD_RESET"` so it cannot be used as a
 * regular login token even if someone intercepts it.
 */

export async function verifyPasswordReset(email, code) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UserNotFound();

  await consumeVerificationCode(
    user.id,
    VerificationType.PASSWORD_RESET,
    code,
  );

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

  const resetToken = jwt.sign(
    { sub: user.id, purpose: PASSWORD_RESET_PURPOSE },
    jwtSecret,
    { expiresIn: "15m" },
  );

  return { resetToken };
}

/**
 * Step 3 — Set a new password using the reset JWT from step 2.
 * The JWT is verified and its `purpose` claim is checked to ensure it
 * was issued by step 2 and cannot be reused for normal authentication.
 */

export async function resetPassword(resetToken, newPassword) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

  let payload;
  try {
    payload = jwt.verify(resetToken, jwtSecret);
  } catch {
    throw new InvalidTokenError();
  }

  if (payload.purpose !== PASSWORD_RESET_PURPOSE) throw new InvalidTokenError();

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: payload.sub },
    data: { password: hashedPassword },
  });
}

/**
 * Resend Verification Code — triggers a new OTP for EMAIL, PHONE, or PASSWORD_RESET.
 * It invalidates old codes of the same type and sends a fresh one.
 */

export async function resendCode(email, phone, type) {
  let where = {};

  if (email) {
    where.email = email;
  }

  if (phone) {
    where.phone = phone;
  }

  // Find the user by email or phone
  const user = await prisma.user.findFirst({ where });

  if (!user) throw new UserNotFound();

  // Safety checks: don't resend if already verified
  if (type === VerificationType.EMAIL && user.emailVerified) {
    throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);
  }
  if (type === VerificationType.PHONE && user.phoneVerified) {
    throw new AuthValidationError(tr.PHONE_ALREADY_VERIFIED);
  }

  // Create and send new code
  const newCode = await createVerificationCode(user.id, type);

  if (type === VerificationType.EMAIL) {
    await sendEmailVerification(user.email, newCode);
  } else if (type === VerificationType.PHONE) {
    // Still using email until SMS integrated
    await sendPhoneVerificationCode(user.email, newCode);
  } else if (type === VerificationType.PASSWORD_RESET) {
    await sendPasswordResetEmail(user.email, newCode);
  }
}

export async function refresh(refreshToken, platform) {
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new InvalidTokenError();
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      loginSequence: true,
    },
  });

  if (!record) {
    throw new InvalidTokenError();
  }

  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: record.id } });
    throw new TokenExpiredError();
  }

  // Rotate: delete the old token and issue a fresh pair
  await prisma.refreshToken.delete({ where: { id: record.id } });

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new InactiveUserError();
  }

  if (!isPlatformAllowedForRole(user.role, platform)) {
    throw new PlatformAccessDeniedError();
  }

  const tokens = await issueAuthTokens(
    user.id,
    user.role,
    platform,
    record.loginSequence,
  );
  return { ...tokens, role: user.role };
}

export async function logout(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new InvalidTokenError();
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await prisma.refreshToken.deleteMany({
    where: { tokenHash },
  });
}
