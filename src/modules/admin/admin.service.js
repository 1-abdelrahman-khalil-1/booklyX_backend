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
    select: {
      id: true,
      ownerName: true,
      email: true,
      phone: true,
      businessName: true,
      category: true,
      city: true,
      district: true,
      address: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      rejectionReason: true,
      createdAt: true,
      documents: {
        select: {
          id: true,
          type: true,
          fileUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return applications;
}

export async function getApplicationDetail(id, includeCodes = false) {
  const application = await prisma.branchAdmin.findUnique({
    where: { id },
    select: {
      id: true,
      ownerName: true,
      email: true,
      phone: true,
      businessName: true,
      category: true,
      description: true,
      commercialRegisterNumber: true,
      taxId: true,
      logoUrl: true,
      taxCertificateUrl: true,
      commercialRegisterUrl: true,
      nationalIdUrl: true,
      facilityLicenseUrl: true,
      city: true,
      district: true,
      address: true,
      latitude: true,
      longitude: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      rejectionReason: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      documents: {
        select: {
          id: true,
          type: true,
          fileUrl: true,
          createdAt: true,
        },
      },
      verificationCodes: includeCodes
        ? {
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              expiresAt: true,
              used: true,
              attempts: true,
              createdAt: true,
            },
          }
        : false,
    },
  });

  if (!application) throw new ApplicationNotFound();
  return application;
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
      rejectionReason: parsed.reason,
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
      approvedAt: new Date(),
    },
    select: {
      id: true,
      branchId: true,
      serviceCategoryId: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      duration: true,
      imageUrl: true,
      status: true,
      approvedAt: true,
      updatedAt: true,
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
      approvedAt: null,
    },
    select: {
      id: true,
      branchId: true,
      serviceCategoryId: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
      duration: true,
      imageUrl: true,
      status: true,
      rejectionReason: true,
      updatedAt: true,
      category: true,
    },
  });

  return { message: tr.SERVICE_REJECTED, service: updatedService };
}
