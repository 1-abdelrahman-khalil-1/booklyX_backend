import bcrypt from "bcrypt";
import { z } from "zod";
import {
    ApplicationStatus,
    BusinessCategory,
    VerificationType
} from "../../generated/prisma/client.js";
import {
    sendEmailVerification,
    sendPhoneVerificationCode,
} from "../../lib/email.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";

const SALT_ROUNDS = 10;
const CODE_EXPIRES_MINUTES = parseInt(
    process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10",
);
const MAX_ATTEMPTS = 5;

// ─── Domain Error Classes ─────────────────────────────────────────────────────

export class BranchAdminValidationError extends Error {
    public params?: Record<string, string>;
    constructor(message: string, params?: Record<string, string>) {
        super(message);
        this.params = params;
        this.name = "BranchAdminValidationError";
    }
}

export class ApplicationNotFound extends Error {
    constructor() {
        super(tr.APPLICATION_NOT_FOUND);
        this.name = "ApplicationNotFound";
    }
}

export class DuplicateApplicationError extends Error {
    constructor() {
        super(tr.APPLICATION_ALREADY_EXISTS);
        this.name = "DuplicateApplicationError";
    }
}

export class OTPExpiredError extends Error {
    constructor() {
        super(tr.OTP_EXPIRED);
        this.name = "OTPExpiredError";
    }
}

export class InvalidOTPError extends Error {
    constructor() {
        super(tr.OTP_INVALID);
        this.name = "InvalidOTPError";
    }
}

export class MaxAttemptsExceededError extends Error {
    constructor() {
        super(tr.MAX_ATTEMPTS_EXCEEDED);
        this.name = "MaxAttemptsExceededError";
    }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const applySchema = z.object({
    // Identity Layer
    ownerName: z.string({ error: tr.NAME_REQUIRED }),
    email: z.email({
        error: (issue) => {
            if (issue.input === undefined) return tr.EMAIL_REQUIRED;
            return tr.EMAIL_INVALID;
        },
    }),
    phone: z
        .string({ error: tr.PHONE_REQUIRED })
        .regex(/^\d{10}$/, tr.PHONE_INVALID),
    password: z
        .string({ error: tr.PASSWORD_REQUIRED })
        .min(8, tr.PASSWORD_MIN_LENGTH),

    // Business Info
    businessName: z.string({ error: tr.BUSINESS_NAME_REQUIRED }),
    category: z.enum(
        [BusinessCategory.SPA, BusinessCategory.CLINIC, BusinessCategory.BARBER],
        {
            error: tr.CATEGORY_MUST_BE_ONE_OF,
        },
    ),
    description: z.string({ error: tr.DESCRIPTION_REQUIRED }),
    commercialRegisterNumber: z.string({ error: tr.COMMERCIAL_REGISTER_NUMBER_REQUIRED }),
    taxId: z.string({ error: tr.TAX_ID_REQUIRED }),
    logoUrl: z.url().optional(),
    taxCertificateUrl: z.url().optional(),
    commercialRegisterUrl: z.url().optional(),
    nationalIdUrl: z.url().optional(),
    facilityLicenseUrl: z.url().optional(),

    // Location Info
    city: z.string({ error: tr.CITY_REQUIRED }),
    district: z.string({ error: tr.DISTRICT_REQUIRED }),
    address: z.string({ error: tr.ADDRESS_REQUIRED }),
    latitude: z.number({ error: tr.LATITUDE_REQUIRED }),
    longitude: z.number({ error: tr.LONGITUDE_REQUIRED }),
});

const verifyEmailSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

const verifyPhoneSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    code: z.string({ error: tr.OTP_REQUIRED }),
});

const resendCodeSchema = z.object({
    email: z.email({ error: tr.EMAIL_INVALID }),
    type: z.enum([VerificationType.EMAIL, VerificationType.PHONE]),
});

// ─── Parse Helper ─────────────────────────────────────────────────────────────

function parseWithBranchAdminError<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const firstIssue = result.error.issues[0];

    if (firstIssue.message === tr.CATEGORY_MUST_BE_ONE_OF) {
        throw new BranchAdminValidationError(firstIssue.message, {
            values: Object.values(BusinessCategory).join(", "),
        });
    }

    throw new BranchAdminValidationError(firstIssue.message);
}

// ─── OTP Helpers ─────────────────────────────────────────────────────────────

function generateOtpCode(): string {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Hardcoded OTP not allowed in production.");
    }
    return "333333";
}

async function createApplicationVerificationCode(
    applicationId: number,
    type: VerificationType,
): Promise<string> {
    // Delete all previous unused codes of the same type to invalidate them
    await prisma.applicationVerificationCode.deleteMany({
        where: { applicationId, type, used: false },
    });

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);

    await prisma.applicationVerificationCode.create({
        data: { applicationId, type, codeHash, expiresAt },
    });

    return code;
}

async function consumeApplicationVerificationCode(
    applicationId: number,
    type: VerificationType,
    code: string,
): Promise<void> {
    const record = await prisma.applicationVerificationCode.findFirst({
        where: { applicationId, type, used: false },
        orderBy: { createdAt: "desc" },
    });

    if (!record) throw new InvalidOTPError();
    if (record.attempts >= MAX_ATTEMPTS) throw new MaxAttemptsExceededError();
    if (new Date() > record.expiresAt) throw new OTPExpiredError();

    const isValid = await bcrypt.compare(code, record.codeHash);

    if (!isValid) {
        await prisma.applicationVerificationCode.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
        });
        throw new InvalidOTPError();
    }

    await prisma.applicationVerificationCode.update({
        where: { id: record.id },
        data: { used: true },
    });
}

// ─── Branch Admin Onboarding Services ─────────────────────────────────────────

/**
 * applyAsBranchAdmin — Step 1: Submit business application.
 * Creates the application and sends an email verification OTP.
 */
export async function applyAsBranchAdmin(body: unknown) {
    const data = parseWithBranchAdminError(applySchema, body);

    // Check uniqueness against both User and BusinessApplication tables
    const [existingUser, existingApp] = await Promise.all([
        prisma.user.findFirst({
            where: { OR: [{ email: data.email }, { phone: data.phone }] },
        }),
        prisma.businessApplication.findFirst({
            where: { OR: [{ email: data.email }, { phone: data.phone }] },
        }),
    ]);

    if (existingUser || existingApp) {
        throw new DuplicateApplicationError();
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const application = await prisma.businessApplication.create({
        data: {
            ownerName: data.ownerName,
            email: data.email,
            phone: data.phone,
            passwordHash: hashedPassword,
            businessName: data.businessName,
            category: data.category,
            description: data.description,
            commercialRegisterNumber: data.commercialRegisterNumber,
            taxId: data.taxId,
            logoUrl: data.logoUrl,
            taxCertificateUrl: data.taxCertificateUrl,
            commercialRegisterUrl: data.commercialRegisterUrl,
            nationalIdUrl: data.nationalIdUrl,
            facilityLicenseUrl: data.facilityLicenseUrl,
            city: data.city,
            district: data.district,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            status: ApplicationStatus.PENDING_VERIFICATION,
        },
    });

    const code = await createApplicationVerificationCode(
        application.id,
        VerificationType.EMAIL,
    );
    await sendEmailVerification(data.email, code);

    return { message: tr.APPLICATION_SUBMITTED };
}

/**
 * verifyApplicationEmail — Step 2: Verify application email OTP.
 * Sends phone OTP upon success.
 */
export async function verifyApplicationEmail(email: string, code: string) {
    const data = parseWithBranchAdminError(verifyEmailSchema, { email, code });

    const application = await prisma.businessApplication.findUnique({
        where: { email: data.email },
    });

    if (!application) throw new ApplicationNotFound();
    if (application.emailVerified) return { message: tr.EMAIL_ALREADY_VERIFIED };

    await consumeApplicationVerificationCode(
        application.id,
        VerificationType.EMAIL,
        data.code,
    );

    await prisma.businessApplication.update({
        where: { id: application.id },
        data: { emailVerified: true },
    });

    const phoneCode = await createApplicationVerificationCode(
        application.id,
        VerificationType.PHONE,
    );
    // Using email for phone verification temporarily until SMS integrated
    await sendPhoneVerificationCode(data.email, phoneCode);

    return { message: tr.EMAIL_VERIFIED_SUCCESS };
}

/**
 * verifyApplicationPhone — Step 3: Verify application phone OTP.
 * Application moves to PENDING_APPROVAL. No token issued.
 */
export async function verifyApplicationPhone(email: string, code: string) {
    const data = parseWithBranchAdminError(verifyPhoneSchema, { email, code });

    const application = await prisma.businessApplication.findUnique({
        where: { email: data.email },
    });

    if (!application) throw new ApplicationNotFound();
    if (!application.emailVerified) throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
    if (application.phoneVerified) return { message: tr.PHONE_ALREADY_VERIFIED };

    await consumeApplicationVerificationCode(
        application.id,
        VerificationType.PHONE,
        data.code,
    );

    await prisma.businessApplication.update({
        where: { id: application.id },
        data: {
            phoneVerified: true,
            status: ApplicationStatus.PENDING_APPROVAL,
        },
    });

    return { message: tr.APPLICATION_UNDER_REVIEW };
}

/**
 * resendApplicationCode — Trigger a new OTP for application.
 */
export async function resendApplicationCode(email: string, type: VerificationType) {
    const data = parseWithBranchAdminError(resendCodeSchema, { email, type });

    const application = await prisma.businessApplication.findUnique({
        where: { email: data.email },
    });

    if (!application) throw new ApplicationNotFound();

    if (data.type === VerificationType.EMAIL && application.emailVerified) {
        throw new BranchAdminValidationError(tr.EMAIL_ALREADY_VERIFIED);
    }

    if (data.type === VerificationType.PHONE && application.phoneVerified) {
        throw new BranchAdminValidationError(tr.PHONE_ALREADY_VERIFIED);
    }

    const newCode = await createApplicationVerificationCode(application.id, data.type);

    if (data.type === VerificationType.EMAIL) {
        await sendEmailVerification(application.email, newCode);
    } else {
        await sendPhoneVerificationCode(application.email, newCode);
    }

    return { message: tr.VERIFICATION_CODE_SENT };
}
