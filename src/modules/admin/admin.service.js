import {
  BranchStatus,
  PaymentStatus,
  ServiceApprovalStatus
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
import { mapAdminUserProfile } from "../../lib/mappers/profile.mapper.js";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { toRangeWhere } from "../../utils/period.js";

export class AdminValidationError extends AppError {
  constructor(message, params) {
    super(message, 400, params);
    this.name = "AdminValidationError";
  }
}

export class BranchNotFound extends AppError {
  constructor() {
    super(tr.BRANCH_NOT_FOUND, 404);
    this.name = "BranchNotFound";
  }
}

export class BranchIsNotPendingError extends AppError {
  constructor() {
    super(tr.BRANCH_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "BranchIsNotPendingError";
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
    super(tr.SERVICE_IS_NOT_PENDING_APPROVAL, 409);
    this.name = "ServiceNotPendingError";
  }
}

export class PaymentNotFoundError extends AppError {
  constructor() {
    super(tr.PAYMENT_NOT_FOUND, 404);
    this.name = "PaymentNotFoundError";
  }
}

export async function listBranches(status) {
  return prisma.branchAdmin.findMany({
    where: status ? { status } : { status: BranchStatus.PENDING_APPROVAL },
    select: {
      id: true,
      businessName: true,
      ownerName: true,
      category: true,
      city: true,
      logoUrl: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBranchDetails(id) {
  const branch = await prisma.branchAdmin.findUnique({
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
      operatingHours: true,
      latitude: true,
      longitude: true,
      status: true,
      isSubscriptionActive: true,
      subscriptionStartedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          maxStaff: true,
          maxServices: true,
          loyaltyEnabled: true,
          offersEnabled: true,
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          fileUrl: true,
          createdAt: true,
        },
      },
    },
  });

  if (!branch) throw new BranchNotFound();
  return branch;
}

export async function approveBranch(id) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id },
  });

  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.PENDING_APPROVAL) {
    throw new BranchIsNotPendingError();
  }

  await prisma.branchAdmin.update({
    where: { id: branch.id },
    data: {
      status: BranchStatus.APPROVED,
      rejectionReason: null,
    },
  });
  return { message: tr.BRANCH_APPROVED };
}

export async function rejectBranch(id, reason) {
  const branch = await prisma.branchAdmin.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!branch) throw new BranchNotFound();
  if (branch.status !== BranchStatus.PENDING_APPROVAL) {
    throw new BranchIsNotPendingError();
  }

  await prisma.branchAdmin.update({
    where: { id: branch.id },
    data: {
      status: BranchStatus.REJECTED,
      rejectionReason: reason,
    },
  });

  return { message: tr.BRANCH_REJECTED };
}

export async function listServices(status) {
  return prisma.service.findMany({
    where: status ? { status } : { status: ServiceApprovalStatus.PENDING_APPROVAL },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      price: true,
      durationMinutes: true,
      status: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      branch: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getServiceDetails(id) {
  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      branchId: true,
      name: true,
      imageUrl: true,
      description: true,
      price: true,
      durationMinutes: true,
      status: true,
      rejectionReason: true,
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      branch: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
          status: true,
          isSubscriptionActive: true,
        },
      },
    },
  });

  if (!service) throw new ServiceNotFound();
  return service;
}

export async function approveService(id) {
  const service = await prisma.service.findUnique({
    where: { id },
    select: { id: true, status: true },
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
      imageUrl: true,
      status: true,
      approvedAt: true,
      updatedAt: true,
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return { message: tr.SERVICE_APPROVED, service: updatedService };
}

export async function rejectService(id, reason) {
  const service = await prisma.service.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!service) throw new ServiceNotFound();
  if (service.status !== ServiceApprovalStatus.PENDING_APPROVAL) {
    throw new ServiceNotPendingError();
  }

  const updatedService = await prisma.service.update({
    where: { id: service.id },
    data: {
      status: ServiceApprovalStatus.REJECTED,
      rejectionReason: reason,
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
      imageUrl: true,
      status: true,
      rejectionReason: true,
      updatedAt: true,
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return { message: tr.SERVICE_REJECTED, service: updatedService };
}

export async function getPlatformAnalytics(period = "this_month") {
  const dateWhere = toRangeWhere(period, "paidAt");

  const [totalActiveBusinesses, totalRevenue] = await Promise.all([
    prisma.branchAdmin.count({
      where: {
        status: BranchStatus.APPROVED,
        isSubscriptionActive: true,
      },
    }),
    prisma.subscriptionPayment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        ...dateWhere,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalActiveBusinesses,
    totalSubscriptionRevenue: Number(totalRevenue._sum.amount ?? 0),
  };
}

export async function listBranchPayments(period = "this_month") {
  const dateWhere = toRangeWhere(period, "paidAt");

  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      ...dateWhere,
    },
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      branch: {
        select: {
          id: true,
          businessName: true,
        },
      },
      plan: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  return payments.map((payment) => ({
    paymentId: payment.id,
    branchId: payment.branch.id,
    businessName: payment.branch.businessName,
    planName: payment.plan.name,
    amount: payment.amount,
    paymentStatus: payment.status,
    paidAt: payment.paidAt,
  }));
}

export async function getBranchPaymentDetails(paymentId) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
      branch: {
        select: {
          id: true,
          businessName: true,
          ownerName: true,
          category: true,
          city: true,
          district: true,
          address: true,
          logoUrl: true,
          status: true,
          isSubscriptionActive: true,
          subscriptionStartedAt: true,
        },
      },
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          maxStaff: true,
          maxServices: true,
          loyaltyEnabled: true,
          offersEnabled: true,
        },
      },
    },
  });

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  return {
    paymentId: payment.id,
    branch: payment.branch,
    plan: payment.plan,
    amount: payment.amount,
    paymentStatus: payment.status,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt,
    subscriptionStartedAt: payment.branch.subscriptionStartedAt,
  };
}

export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
      updatedAt: true,
      branchAdmin: {
        select: {
          id: true,
          businessName: true,
          status: true,
          isSubscriptionActive: true,
          subscriptionStartedAt: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              maxStaff: true,
              maxServices: true,
              loyaltyEnabled: true,
              offersEnabled: true,
            },
          },
        },
      },
      staff: {
        select: {
          id: true,
          branchId: true,
          profileImageUrl: true,
          age: true,
          staffRole: true,
          commissionPercentage: true,
          professionalProfile: {
            select: {
              id: true,
              bio: true,
              yearsOfExperience: true,
              licenseNumber: true,
              specialization: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          averageRating: true,
          reviewCount: true,
        },
      },
    },
  });

  if (!user) throw new AppError(tr.USER_NOT_FOUND, 404);

  return mapAdminUserProfile(user);
}

