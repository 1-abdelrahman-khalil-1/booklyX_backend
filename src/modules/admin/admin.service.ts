import { z } from "zod";
import { ApplicationStatus, Role, UserStatus } from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";

// ─── Domain Error Classes ─────────────────────────────────────────────────────

export class AdminValidationError extends Error {
    public params?: Record<string, string>;
    constructor(message: string, params?: Record<string, string>) {
        super(message);
        this.params = params;
        this.name = "AdminValidationError";
    }
}

export class ApplicationNotFound extends Error {
    constructor() {
        super(tr.APPLICATION_NOT_FOUND);
        this.name = "ApplicationNotFound";
    }
}

export class ApplicationNotPendingError extends Error {
    constructor() {
        super(tr.APPLICATION_NOT_PENDING_APPROVAL);
        this.name = "ApplicationNotPendingError";
    }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const approveApplicationSchema = z.object({
    id: z.number(),
});

const rejectApplicationSchema = z.object({
    id: z.number(),
    reason: z.string({ error: tr.REJECTION_REASON_REQUIRED }),
});

// ─── Admin Services ──────────────────────────────────────────────────────────

/**
 * listApplications — List business applications with optional status filter.
 */
export async function listApplications(status?: ApplicationStatus) {
    return await prisma.businessApplication.findMany({
        where: status ? { status } : { status: ApplicationStatus.PENDING_APPROVAL },
        include: {
            documents: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * getApplicationDetail — Get full detail of a business application.
 */
export async function getApplicationDetail(id: number) {
    const application = await prisma.businessApplication.findUnique({
        where: { id },
        include: {
            documents: true,
            verificationCodes: {
                take: 5,
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!application) throw new ApplicationNotFound();
    return application;
}

/**
 * approveApplication — approve application and create User record.
 */
export async function approveApplication(id: number) {
    const application = await prisma.businessApplication.findUnique({
        where: { id },
    });

    if (!application) throw new ApplicationNotFound();
    if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
        throw new ApplicationNotPendingError();
    }

    // Transaction: Create User + Update Application Status
    return await prisma.$transaction(async (tx) => {
        // 1. Create the User row
        const user = await tx.user.create({
            data: {
                name: application.ownerName,
                email: application.email,
                phone: application.phone,
                password: application.passwordHash,
                role: Role.branch_admin,
                status: UserStatus.ACTIVE,
                emailVerified: true,
                phoneVerified: true,
            },
        });

        // 2. Mark application as APPROVED
        await tx.businessApplication.update({
            where: { id: application.id },
            data: { status: ApplicationStatus.APPROVED },
        });

        // Omit password from returned user
        const { password: _password, ...safeUser } = user;
        return { user: safeUser, message: tr.APPLICATION_APPROVED };
    });
}

/**
 * rejectApplication — mark application as rejected.
 */
export async function rejectApplication(id: number, reason: string) {
    const application = await prisma.businessApplication.findUnique({
        where: { id },
    });

    if (!application) throw new ApplicationNotFound();
    if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
        throw new ApplicationNotPendingError();
    }

    await prisma.businessApplication.update({
        where: { id: application.id },
        data: {
            status: ApplicationStatus.REJECTED,
            rejectionReason: reason,
        },
    });

    return { message: tr.APPLICATION_REJECTED };
}
