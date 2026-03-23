import {
    ApplicationStatus,
    Role,
    ServiceApprovalStatus,
    UserStatus,
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import {
    approveApplicationSchema,
    approveServiceSchema,
    rejectApplicationSchema,
    rejectServiceSchema,
    validateAdminInput,
} from "./admin.validation.js";

// ─── Domain Error Classes ─────────────────────────────────────────────────────

export class AdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AdminValidationError";
  }
}

export class ApplicationNotFound extends AppError {
  constructor() {
    super(tr.APPLICATION_NOT_FOUND, 404);
    this.name = "ApplicationNotFound";
  }
}

export class ApplicationNotPendingError extends AppError {
  constructor() {
    super(tr.APPLICATION_IS_NOT_PENDING_APPROVAL, 400);
    this.name = "ApplicationIsNotPendingError";
  }
}

export class ServiceNotFound extends AppError {
  constructor() {
    super(tr.SERVICE_NOT_FOUND, 404);
    this.name = "ServiceNotFound";
  }
}

export class ServiceNotPendingError extends AppError {
  constructor() {
    super(tr.SERVICE_IS_NOT_PENDING_APPROVAL, 400);
    this.name = "ServiceNotPendingError";
  }
}

export async function listApplications(status) {
  const applications = await prisma.branchAdmin.findMany({
    where: status ? { status } : { status: ApplicationStatus.PENDING_APPROVAL },
    include: {
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return applications.map((app) => {
    const { passwordHash: _passwordHash, ...safeApp } = app;
    return safeApp;
  });
}

export async function getApplicationDetail(id) {
  const application = await prisma.branchAdmin.findUnique({
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
  const { passwordHash: _passwordHash, ...safeApplication } = application;
  return safeApplication;
}

export async function approveApplication(id) {
  const parsed = validateAdminInput(approveApplicationSchema, { id });
  const application = await prisma.branchAdmin.findUnique({
    where: { id: parsed.id },
  });

  if (!application) throw new ApplicationNotFound();
  if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
    throw new ApplicationNotPendingError();
  }

  return await prisma.$transaction(async (tx) => {
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

    await tx.branchAdmin.update({
      where: { id: application.id },
      data: {
        userId: user.id,
        status: ApplicationStatus.APPROVED,
      },
    });

    // Omit password from returned user
    const { password: _password, ...safeUser } = user;
    return { user: safeUser, message: tr.APPLICATION_APPROVED };
  });
}

export async function rejectApplication(id, reason) {
  const parsed = validateAdminInput(rejectApplicationSchema, { id, reason });
  const application = await prisma.branchAdmin.findUnique({
    where: { id: parsed.id },
  });

  if (!application) throw new ApplicationNotFound();
  if (application.status !== ApplicationStatus.PENDING_APPROVAL) {
    throw new ApplicationNotPendingError();
  }

  await prisma.branchAdmin.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.REJECTED,
      rejectionReason: reason,
    },
  });

  return { message: tr.APPLICATION_REJECTED };
}

export async function listPendingServices() {
  return prisma.service.findMany({
    where: { status: ServiceApprovalStatus.PENDING_APPROVAL },
    include: {
      category: true,
      branch: {
        select: {
          id: true,
          businessName: true,
          ownerName: true,
          userId: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveService(id) {
  const parsed = validateAdminInput(approveServiceSchema, { id });

  const service = await prisma.service.findUnique({
    where: { id: parsed.id },
  });

  if (!service) throw new ServiceNotFound();
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new ServiceNotPendingError();
  }

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: {
      status: ServiceApprovalStatus.APPROVED,
      rejectionReason: null,
    },
    include: {
      category: true,
    },
  });

  return { message: tr.SERVICE_APPROVED, service: updatedService };
}

export async function rejectService(id, reason) {
  const parsed = validateAdminInput(rejectServiceSchema, { id, reason });

  const service = await prisma.service.findUnique({
    where: { id: parsed.id },
  });

  if (!service) throw new ServiceNotFound();
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new ServiceNotPendingError();
  }

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: {
      status: ServiceApprovalStatus.REJECTED,
      rejectionReason: parsed.reason,
    },
    include: {
      category: true,
    },
  });

  return { message: tr.SERVICE_REJECTED, service: updatedService };
}
