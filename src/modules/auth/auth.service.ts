import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
    Platform,
    Prisma,
    Role,
    UserStatus,
    VerificationType,
} from "../../generated/prisma/client.js";
import {
    sendEmailVerification,
    sendPasswordResetEmail,
    sendPhoneVerificationCode,
} from "../../lib/email.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { isPlatformAllowedForRole } from "./auth.permissions.js";

const SALT_ROUNDS = 10;

const CODE_EXPIRES_MINUTES = parseInt(
    process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
);

const MAX_ATTEMPTS = 5;

// ─── Domain Error Classes ─────────────────────────────────────────────────────

export class AuthValidationError extends Error {
    public params?: Record<string, string>;
    constructor(message: string, params?: Record<string, string>) {
        super(message);
        this.params = params;
        this.name = "AuthValidationError";
    }
}

export class UserNotFound extends Error {
    constructor() {
        super(tr.USER_NOT_FOUND);
        this.name = "UserNotFound";
    }
}

export class InvalidCredentialsError extends Error {
    constructor() {
        super(tr.INVALID_CREDENTIALS);
        this.name = "InvalidCredentialsError";
    }
}

export class PlatformAccessDeniedError extends Error {
    constructor() {
        super(tr.PLATFORM_ACCESS_DENIED);
        this.name = "PlatformAccessDeniedError";
    }
}

export class InactiveUserError extends Error {
    constructor() {
        super(tr.INACTIVE_USER);
        this.name = "InactiveUserError";
    }
}

export class DuplicateAccountError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DuplicateAccountError";
    }
}

export class TokenExpiredError extends Error {
    constructor() {
        super(tr.TOKEN_EXPIRED);
        this.name = "TokenExpiredError";
    }
}

export class InvalidTokenError extends Error {
    constructor() {
        super(tr.INVALID_TOKEN);
        this.name = "InvalidTokenError";
    }
}

export class MaxAttemptsExceededError extends Error {
    constructor() {
        super(tr.MAX_ATTEMPTS_EXCEEDED);
        this.name = "MaxAttemptsExceededError";
    }
}

/**
 * Thrown when a user tries to log in without verifying their email first.
 * HTTP 403 — distinct from PhoneNotVerifiedError so the client can route
 * the user to the correct verification screen.
 */
export class EmailNotVerifiedError extends Error {
    constructor() {
        super(tr.EMAIL_NOT_VERIFIED);
        this.name = "EmailNotVerifiedError";
    }
}

/**
 * Thrown when a user tries to log in without verifying their phone first.
 * HTTP 403 — a different status code from EmailNotVerifiedError lets the
 * client distinguish which step is pending.
 */
export class PhoneNotVerifiedError extends Error {
    constructor() {
        super(tr.PHONE_NOT_VERIFIED);
        this.name = "PhoneNotVerifiedError";
    }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    password: z.string({ error: tr.PASSWORD_REQUIRED }),
});

const registerSchema = z.object({
    name: z.string({ error: tr.NAME_REQUIRED }),
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),
    phone: z
        .string({ error: tr.PHONE_REQUIRED })
        .regex(/^\d{10}$/, tr.PHONE_INVALID),
});

const platformSchema = z.enum(Platform, {
    error: tr.PLATFORM_MUST_BE_ONE_OF,
});

const verifyEmailSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

const verifyPhoneSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

const requestPasswordResetSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
});

const verifyPasswordResetSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

const resetPasswordSchema = z.object({
    resetToken: z.string({ error: tr.TOKEN_REQUIRED }),
    newPassword: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),
});

const resendCodeSchema = z
    .object({
        email: z
            .email({
                error: (issue) => {
                    if (issue.input === undefined) return tr.EMAIL_REQUIRED;
                    return tr.EMAIL_INVALID;
                },
            })
            .optional(),
        phone: z
            .string({ error: tr.PHONE_REQUIRED })
            .regex(/^\d{10}$/, tr.PHONE_INVALID)
            .optional(),
        type: z.enum([
            VerificationType.EMAIL,
            VerificationType.PHONE,
            VerificationType.PASSWORD_RESET,
        ]),
    })
    .refine(
        (data) => {
            if (
                data.type === VerificationType.EMAIL ||
                data.type === VerificationType.PASSWORD_RESET ||
                data.type === VerificationType.PHONE
            ) {
                return !!data.email;
            }
            return true;
        },
        {
            message: tr.EMAIL_REQUIRED,
        },
    );

// ─── Parse Helper ─────────────────────────────────────────────────────────────

/**
 * Runs Zod validation on `data` against `schema`.
 * On success returns the typed, cleaned data.
 * On failure re-throws the first validation issue as an `AuthValidationError`
 * (an i18n key), so the controller can translate it per the user's language.
 */
function parseWithAuthError<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    // Attach dynamic enum values for the platform error
    if (firstIssue.message === tr.PLATFORM_MUST_BE_ONE_OF) {
        throw new AuthValidationError(firstIssue.message, {
            values: Object.values(Platform).join(", "),
        });
    }

    throw new AuthValidationError(firstIssue.message);
}

// ─── Thin Validate Wrappers ───────────────────────────────────────────────────

function validateLoginInput(data: unknown) {
    return parseWithAuthError(loginSchema, data);
}

function validatePlatform(platform: unknown): Platform {
    if (!platform || typeof platform !== "string") {
        throw new AuthValidationError(tr.PLATFORM_HEADER_REQUIRED);
    }
    return parseWithAuthError(platformSchema, platform);
}

function validateRegisterInput(data: unknown) {
    return parseWithAuthError(registerSchema, data);
}

function validateVerifyEmailInput(data: unknown) {
    return parseWithAuthError(verifyEmailSchema, data);
}

function validateVerifyPhoneInput(data: unknown) {
    return parseWithAuthError(verifyPhoneSchema, data);
}

function validateRequestPasswordResetInput(data: unknown) {
    return parseWithAuthError(requestPasswordResetSchema, data);
}

function validateVerifyPasswordResetInput(data: unknown) {
    return parseWithAuthError(verifyPasswordResetSchema, data);
}

function validateResetPasswordInput(data: unknown) {
    return parseWithAuthError(resetPasswordSchema, data);
}

function validateResendCodeInput(data: unknown) {
    return parseWithAuthError(resendCodeSchema, data);
}

// ─── OTP Helpers ─────────────────────────────────────────────────────────────

function generateOtpCode(): string {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Hardcoded OTP not allowed in production.");
    }
    return "333333";
}

async function createVerificationCode(
    userId: number,
    type: VerificationType,
): Promise<string> {
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

async function consumeVerificationCode(
    userId: number,
    type: VerificationType,
    code: string,
): Promise<void> {
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

function issueAuthToken(userId: number, role: Role, platform: Platform): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not set.");
    return jwt.sign({ sub: userId, role, platform }, jwtSecret, { expiresIn: "1d" });
}

// ─── Auth Services ────────────────────────────────────────────────────────────

/**
 * Login — validates credentials then enforces the verification funnel:
 *   • Email not verified  → EmailNotVerifiedError  (HTTP 403)
 *   • Phone not verified  → PhoneNotVerifiedError  (HTTP 403, different status on client)
 * Using two distinct error classes lets the controller map them to separate
 * HTTP status codes so the mobile/web app can route to the right screen.
 */
export async function login(body: unknown, platformHeader: unknown) {
    const { email, password } = validateLoginInput(body);
    const platform = validatePlatform(platformHeader);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UserNotFound();

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) throw new InvalidCredentialsError();

    if (user.status !== UserStatus.ACTIVE) throw new InactiveUserError();
    if (!isPlatformAllowedForRole(user.role, platform)) throw new PlatformAccessDeniedError();

    // Enforce verification funnel — email first, then phone
    if (!user.emailVerified) throw new EmailNotVerifiedError();
    if (!user.phoneVerified) throw new PhoneNotVerifiedError();

    const token = issueAuthToken(user.id, user.role, platform);
    const { password: _password, ...safeUser } = user;

    return { token, user: safeUser };
}

/**
 * Register — Step 1 of the sign-up funnel.
 * Creates the account and immediately sends an email verification OTP.
 * Token is NOT issued here — the user must complete both verifications first.
 */
export async function register(body: unknown, platformHeader: unknown) {
    const {name, email, password, phone } = validateRegisterInput(body);
    const platform = validatePlatform(platformHeader);

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
        if (existingUser.email === email) throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
        if (existingUser.phone === phone) throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
        throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    let user: Awaited<ReturnType<typeof prisma.user.create>>;
    try {
        user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                role: Role.client,
                status: UserStatus.ACTIVE,
            },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const target = error.meta?.target as string[] | undefined;
            if (target?.includes("email")) throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
            if (target?.includes("phone")) throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
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
export async function verifyEmail(email: string, code: string): Promise<void> {
    const data = validateVerifyEmailInput({ email, code });
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UserNotFound();

    if (user.emailVerified) {
        throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);
    }

    await consumeVerificationCode(user.id, VerificationType.EMAIL, data.code);

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
    });

    // Auto-send phone verification OTP right after email is confirmed
    const phoneCode = await createVerificationCode(user.id, VerificationType.PHONE);
    // TODO: Swap sendPhoneVerificationCode for real SMS (Twilio, etc.) once integrated
    await sendPhoneVerificationCode(user.email, phoneCode);
}

/**
 * Verify Phone — Step 3 (final step) of the sign-up funnel.
 * Marks the phone as verified and issues the auth token.
 * This is the only point in the flow where a token is returned.
 */
export async function verifyPhone(
    email: string,
    code: string,
    platformHeader: unknown,
): Promise<{ token: string; user: object }> {
    const data = validateVerifyPhoneInput({ email, code });
    const platform = validatePlatform(platformHeader);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
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

    await consumeVerificationCode(user.id, VerificationType.PHONE, data.code);

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
    });

    // Issue the auth token now that both verifications are complete
    const token = issueAuthToken(updatedUser.id, updatedUser.role, platform);
    const { password: _password, ...safeUser } = updatedUser;

    return { token, user: safeUser };
}

// ─── Password Reset (3-step OTP flow) ────────────────────────────────────────

/**
 * Step 1 — Request a password reset OTP.
 * Silent on unknown email to prevent user-enumeration attacks.
 */
export async function requestPasswordReset(email: string): Promise<void> {
    const data = validateRequestPasswordResetInput({ email });
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return; // Silently do nothing — don't reveal if email exists

    const code = await createVerificationCode(user.id, VerificationType.PASSWORD_RESET);
    await sendPasswordResetEmail(data.email, code);
}

/**
 * Step 2 — Verify the password reset OTP.
 * Returns a short-lived reset JWT (15 min) that authorises step 3.
 * The JWT carries `purpose: "PASSWORD_RESET"` so it cannot be used as a
 * regular login token even if someone intercepts it.
 */
export async function verifyPasswordReset(
    email: string,
    code: string,
): Promise<{ resetToken: string }> {
    const data = validateVerifyPasswordResetInput({ email, code });
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UserNotFound();

    await consumeVerificationCode(user.id, VerificationType.PASSWORD_RESET, data.code);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

    const resetToken = jwt.sign(
        { sub: user.id, purpose: "PASSWORD_RESET" },
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
export async function resetPassword(
    resetToken: string,
    newPassword: string,
): Promise<void> {
    const data = validateResetPasswordInput({ resetToken, newPassword });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

    let payload: { sub: number; purpose: string };
    try {
        payload = jwt.verify(data.resetToken, jwtSecret) as unknown as {
            sub: number;
            purpose: string;
        };
    } catch {
        throw new InvalidTokenError();
    }

    if (payload.purpose !== "PASSWORD_RESET") throw new InvalidTokenError();

    const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
    });
}

/**
 * Resend Verification Code — triggers a new OTP for EMAIL, PHONE, or PASSWORD_RESET.
 * It invalidates old codes of the same type and sends a fresh one.
 */
export async function resendCode(
    email: string | undefined,
    phone: string | undefined,
    type: VerificationType,
): Promise<void> {
    const data = validateResendCodeInput({ email, phone, type });

    let where: Prisma.UserWhereInput = {};

    if (data.email) {
        where.email = data.email;
    }

    if (data.phone) {
        where.phone = data.phone;
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


