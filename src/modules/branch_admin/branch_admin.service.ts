import bcrypt from "bcrypt";
import {
    ApplicationStatus,
    Role,
    UserStatus,
    VerificationType,
} from "../../generated/prisma/client.js";
import { sendEmailVerification, sendPhoneVerificationCode } from "../../lib/email.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
    applySchema,
    createStaffSchema,
    resendCodeSchema,
    validateBranchAdminInput,
    verifyEmailSchema,
    verifyPhoneSchema
} from "./branch_admin.validation.js";

const SALT_ROUNDS = 10;
const CODE_EXPIRES_MINUTES = parseInt(process.env.VERIFICATION_CODE_EXPIRES_MINUTES || "10");
const MAX_ATTEMPTS = 5;

export class BranchAdminValidationError extends AppError {
    constructor(message: string, params?: Record<string, string>) {
        super(message, 400, params);
        this.name = "BranchAdminValidationError";
    }
}

export class ApplicationNotFound extends AppError {
    constructor() {
        super(tr.APPLICATION_NOT_FOUND, 404);
        this.name = "ApplicationNotFound";
    }
}

export class DuplicateApplicationError extends AppError {
    constructor() {
        super(tr.APPLICATION_ALREADY_EXISTS, 409);
        this.name = "DuplicateApplicationError";
    }
}

export class DuplicateBranchAdminUserError extends AppError {
    constructor() {
        super(tr.DUPLICATE_ACCOUNT, 409);
        this.name = "DuplicateBranchAdminUserError";
    }
}

export class ApplicationNotPendingError extends AppError {
    constructor() {
        super(tr.APPLICATION_NOT_PENDING_APPROVAL, 400);
        this.name = "ApplicationNotPendingError";
    }
}

export class OTPExpiredError extends AppError {
    constructor() {
        super(tr.OTP_EXPIRED, 400);
        this.name = "OTPExpiredError";
    }
}

export class InvalidOTPError extends AppError {
    constructor() {
        super(tr.OTP_INVALID, 400);
        this.name = "InvalidOTPError";
    }
}

export class MaxAttemptsExceededError extends AppError {
    constructor() {
        super(tr.MAX_ATTEMPTS_EXCEEDED, 429);
        this.name = "MaxAttemptsExceededError";
    }
}

function generateOtpCode(): string {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Hardcoded OTP not allowed in production.");
    }
    return "333333";
}

async function createApplicationOtp(applicationId: number, type: VerificationType): Promise<string> {
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

async function consumeApplicationOtp(applicationId: number, type: VerificationType, code: string): Promise<void> {
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

export async function submitApplication(body: unknown) {
    const data = validateBranchAdminInput(applySchema, body);

    const [existingUser, existingApplication] = await Promise.all([
        prisma.user.findFirst({ where: { OR: [{ email: data.email }, { phone: data.phone }] } }),
        prisma.branchAdmin.findFirst({ where: { OR: [{ email: data.email }, { phone: data.phone }] } }),
    ]);

    if (existingUser || existingApplication) {
        throw new DuplicateApplicationError();
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const application = await prisma.branchAdmin.create({
        data: {
            ownerName: data.ownerName,
            email: data.email,
            phone: data.phone,
            passwordHash,
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
            userId: null,
            status: ApplicationStatus.PENDING_VERIFICATION,
        },
    });

    const code = await createApplicationOtp(application.id, VerificationType.EMAIL);
    await sendEmailVerification(application.email, code);

    return { message: tr.APPLICATION_SUBMITTED, applicationId: application.id };
}

export async function verifyApplicationEmail(email: string, code: string) {
    const data = validateBranchAdminInput(verifyEmailSchema, { email, code });

    const application = await prisma.branchAdmin.findFirst({ where: { email: data.email } });
    if (!application) throw new ApplicationNotFound();
    if (application.emailVerified) return { message: tr.EMAIL_ALREADY_VERIFIED };

    await consumeApplicationOtp(application.id, VerificationType.EMAIL, data.code);

    await prisma.branchAdmin.update({
        where: { id: application.id },
        data: { emailVerified: true },
    });

    const phoneCode = await createApplicationOtp(application.id, VerificationType.PHONE);
    await sendPhoneVerificationCode(data.email, phoneCode);

    return { message: tr.EMAIL_VERIFIED_SUCCESS };
}

export async function verifyApplicationPhone(email: string, code: string) {
    const data = validateBranchAdminInput(verifyPhoneSchema, { email, code });

    const application = await prisma.branchAdmin.findFirst({ where: { email: data.email } });
    if (!application) throw new ApplicationNotFound();
    if (!application.emailVerified) throw new BranchAdminValidationError(tr.EMAIL_NOT_VERIFIED);
    if (application.phoneVerified) return { message: tr.PHONE_ALREADY_VERIFIED };

    await consumeApplicationOtp(application.id, VerificationType.PHONE, data.code);

    await prisma.branchAdmin.update({
        where: { id: application.id },
        data: { phoneVerified: true, status: ApplicationStatus.PENDING },
    });

    return { message: tr.APPLICATION_UNDER_REVIEW };
}

export async function resendApplicationCode(email: string, type: VerificationType) {
    const data = validateBranchAdminInput(resendCodeSchema, { email, type });

    const application = await prisma.branchAdmin.findFirst({ where: { email: data.email } });
    if (!application) throw new ApplicationNotFound();

    if (data.type === VerificationType.EMAIL && application.emailVerified) {
        throw new BranchAdminValidationError(tr.EMAIL_ALREADY_VERIFIED);
    }

    if (data.type === VerificationType.PHONE && application.phoneVerified) {
        throw new BranchAdminValidationError(tr.PHONE_ALREADY_VERIFIED);
    }

    const newCode = await createApplicationOtp(application.id, data.type);

    if (data.type === VerificationType.EMAIL) {
        await sendEmailVerification(application.email, newCode);
    } else {
        await sendPhoneVerificationCode(application.email, newCode);
    }

    return { message: tr.VERIFICATION_CODE_SENT };
}

export async function createStaff(body: unknown) {
    const data = validateBranchAdminInput(createStaffSchema, body);

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const staff = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: hashedPassword,
            role: Role.staff,
            status: UserStatus.ACTIVE,
        },
    });

    const { password: _password, ...safeStaff } = staff;
    return safeStaff;
}
