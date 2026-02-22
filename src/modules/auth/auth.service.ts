import bcrypt from "bcrypt";
import { randomInt } from "crypto";
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

/**
 * How many minutes a 6-digit verification code stays valid.
 * Reads from the `VERIFICATION_CODE_EXPIRES_MINUTES` env variable,
 * defaults to 10 minutes if not set.
 */
const CODE_EXPIRES_MINUTES = parseInt(
    process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
);

/** Maximum allowed failed verification attempts before the code is locked. */
const MAX_ATTEMPTS = 5;

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
 * ── Zod Schemas ──────────────────────────────────────────────
 *
 * Zod is a TypeScript-first validation library.  You define a "schema"
 * that describes the shape + rules of an object, then call `.parse(data)`.
 *
 * - If the data is valid → returns the typed, validated object.
 * - If invalid → throws `ZodError` with a list of issues.
 *
 * We use `.parse()` inside thin wrapper functions that catch `ZodError`
 * and re-throw our own `AuthValidationError` with the correct i18n key.
 */

const loginSchema = z.object({
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED }),
});

const registerSchema = z.object({
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

const newPasswordSchema = z.string().min(8, tr.PASSWORD_MIN_LENGTH);

/**
 * Parses data with a Zod schema; on failure throws `AuthValidationError`
 * with the first issue's message (which is an i18n key).
 *
 * For the `platformSchema` specifically, we attach dynamic `params`
 * so the controller can interpolate `{{values}}` in the translation.
 */
function parseWithAuthError<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    // If the error is about Platform enum, attach dynamic values
    if (firstIssue.message === tr.PLATFORM_MUST_BE_ONE_OF) {
        throw new AuthValidationError(firstIssue.message, {
            values: Object.values(Platform).join(", "),
        });
    }

    throw new AuthValidationError(firstIssue.message);
}

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

// ─── Verification Code Helpers ────────────────────────────────────────────────

/** Generates a cryptographically secure random 6-digit OTP. */
function generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
}

/**
 * Creates a new VerificationCode record.
 * Deletes any previous unused codes of the same type first (one active at a time).
 * Stores only the bcrypt hash — returns the raw code to send to the user.
 */
async function createVerificationCode(
    userId: number,
    type: VerificationType,
): Promise<string> {
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

/**
 * Validates a submitted OTP and marks it as used.
 * Throws MaxAttemptsExceededError / TokenExpiredError / InvalidTokenError as appropriate.
 * Increments the failed-attempts counter on wrong guesses.
 */
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

export async function login(
    body: unknown,
    platformHeader: unknown,
) {
    const { email, password } = validateLoginInput(body);
    const platform = validatePlatform(platformHeader);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new UserNotFound();
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new InvalidCredentialsError();
    }

    if (user.status !== UserStatus.ACTIVE) {
        throw new InactiveUserError();
    }

    if (!isPlatformAllowedForRole(user.role, platform)) {
        throw new PlatformAccessDeniedError();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not set.");
    }

    const token = jwt.sign(
        {
            sub: user.id,
            role: user.role,
            platform,
        },
        jwtSecret,
        {
            expiresIn: "1d",
        },
    );

    const { password: _password, ...safeUser } = user;

    return { token, user: safeUser };
}

export async function register(
    body: unknown,
    platformHeader: unknown,
) {
    const { email, password, phone } = validateRegisterInput(body);
    const platform = validatePlatform(platformHeader);

    // CLIENT can register on both APP and WEB
    if (!isPlatformAllowedForRole(Role.client, platform)) {
        throw new PlatformAccessDeniedError();
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                phone,
                role: Role.client,
                status: UserStatus.ACTIVE,
            },
        });

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not set.");
        }

        const token = jwt.sign(
            {
                sub: user.id,
                role: user.role,
                platform,
            },
            jwtSecret,
            {
                expiresIn: "1d",
            },
        );

        const { password: _password, ...safeUser } = user;

        return {
            token,
            user: safeUser,
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const target = error.meta?.target as string[] | undefined;
            if (target?.includes("email")) {
                throw new DuplicateAccountError(tr.DUPLICATE_EMAIL);
            }
            if (target?.includes("phone")) {
                throw new DuplicateAccountError(tr.DUPLICATE_PHONE);
            }
            throw new DuplicateAccountError(tr.DUPLICATE_ACCOUNT);
        }
        throw error;
    }
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UserNotFound();
    if (user.emailVerified)
        throw new AuthValidationError(tr.EMAIL_ALREADY_VERIFIED);

    const code = await createVerificationCode(user.id, VerificationType.EMAIL);
    await sendEmailVerification(email, code);
}

export async function verifyEmail(
    email: string,
    code: string,
): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UserNotFound();

    await consumeVerificationCode(user.id, VerificationType.EMAIL, code);

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
    });
}

// ─── Phone Verification ───────────────────────────────────────────────────────

export async function sendPhoneVerification(userId: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UserNotFound();
    if (user.phoneVerified)
        throw new AuthValidationError(tr.PHONE_ALREADY_VERIFIED);

    const code = await createVerificationCode(user.id, VerificationType.PHONE);
    // TODO: Swap for SMS (Twilio, etc.) once integrated
    await sendPhoneVerificationCode(user.email, code);
}

export async function verifyPhone(
    userId: number,
    code: string,
): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UserNotFound();

    await consumeVerificationCode(user.id, VerificationType.PHONE, code);

    await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
    });
}

// ─── Password Reset (3-step OTP flow) ────────────────────────────────────────

/**
 * Step 1 — Request a password reset OTP.
 * Silent on unknown email to prevent user-enumeration.
 */
export async function requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const code = await createVerificationCode(
        user.id,
        VerificationType.PASSWORD_RESET,
    );
    await sendPasswordResetEmail(email, code);
}

/**
 * Step 2 — Verify the password reset OTP.
 * Returns a short-lived reset JWT (15 min) that authorises step 3.
 */
export async function verifyPasswordReset(
    email: string,
    code: string,
): Promise<{ resetToken: string }> {
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
        { sub: user.id, purpose: "PASSWORD_RESET" },
        jwtSecret,
        { expiresIn: "15m" },
    );

    return { resetToken };
}

/**
 * Step 3 — Set new password using the reset JWT from step 2.
 */
export async function resetPassword(
    resetToken: string,
    newPassword: string,
): Promise<void> {
    parseWithAuthError(newPasswordSchema, newPassword);

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is not set.");

    let payload: { sub: number; purpose: string };
    try {
        payload = jwt.verify(resetToken, jwtSecret) as unknown as {
            sub: number;
            purpose: string;
        };
    } catch {
        throw new InvalidTokenError();
    }

    if (payload.purpose !== "PASSWORD_RESET") throw new InvalidTokenError();

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
    });
}
