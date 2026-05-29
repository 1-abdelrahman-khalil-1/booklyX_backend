import {
  BranchStatus,
  PaymentStatus,
  ServiceApprovalStatus
} from "../../generated/prisma/client.js";
import { tr } from "../../lib/i18n/index.js";
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

export class InvalidPaymentStatusForRefundError extends AppError {
  constructor() {
    super(tr.INVALID_PAYMENT_STATUS_FOR_REFUND, 400);
    this.name = "InvalidPaymentStatusForRefundError";
  }
}

export class PaymentAlreadyRefundedError extends AppError {
  constructor() {
    super(tr.PAYMENT_ALREADY_REFUNDED, 409);
    this.name = "PaymentAlreadyRefundedError";
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

/**
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {any} [params.status]
 * @param {string} [params.search]
 * @param {string} [params.period]
 */
export async function listBranchPayments({ page = 1, limit = 10, status, search, period } = {}) {
  const dateWhere = period ? toRangeWhere(period, "paidAt") : {};
  const skip = (page - 1) * limit;

  /** @type {any} */
  const where = {
    ...dateWhere,
  };


  if (status) {
    where.status = status;
  }

  if (search) {
    where.branch = {
      businessName: {
        contains: search,
      },
    };
  }

  const [payments, totalCount] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      where,
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
      skip,
      take: limit,
    }),
    prisma.subscriptionPayment.count({ where }),
  ]);

  const mappedPayments = payments.map((payment) => ({
    paymentId: payment.id,
    branchId: payment.branch.id,
    businessName: payment.branch.businessName,
    planName: payment.plan.name,
    amount: payment.amount,
    paymentStatus: payment.status,
    paidAt: payment.paidAt,
  }));

  return {
    payments: mappedPayments,
    meta: {
      totalRecords: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
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


export async function refundBranchPayment(paymentId) {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amount: true,
      status: true,
      branchId: true,
    },
  });

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    throw new PaymentAlreadyRefundedError();
  }

  if (payment.status !== PaymentStatus.PAID) {
    throw new InvalidPaymentStatusForRefundError();
  }

  // Execute mock gateway call (isolated & reusable)
  const mockGatewayRefundId = `ref_${Math.random().toString(36).substring(2, 11)}`;

  // Run database update in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update Payment status to REFUNDED
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });

    // 2. Immediately deactivate branch subscription visibility
    await tx.branchAdmin.update({
      where: { id: payment.branchId },
      data: {
        isSubscriptionActive: false,
      },
    });
  });

  return {
    paymentId: payment.id,
    amount: payment.amount,
    status: PaymentStatus.REFUNDED,
    refundId: mockGatewayRefundId,
  };
}

export async function getRecentActivities() {
  const [branches, services, payments] = await Promise.all([
    prisma.branchAdmin.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.service.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        approvedAt: true,
        updatedAt: true,
        branch: {
          select: {
            businessName: true,
          },
        },
      },
    }),
    prisma.subscriptionPayment.findMany({
      take: 10,
      where: {
        status: {
          in: [PaymentStatus.PAID, PaymentStatus.REFUNDED],
        },
      },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        paidAt: true,
        branch: {
          select: {
            businessName: true,
          },
        },
      },
    }),
  ]);

  const activities = [];

  // 1. Process branches
  branches.forEach((b) => {
    // If it's newly created, log new branch application
    activities.push({
      id: `branch_apply_${b.id}`,
      type: "new_branch_application",
      messageKey: "ACTIVITY_NEW_BRANCH_APPLICATION",
      entityName: b.businessName,
      timestamp: b.createdAt,
    });

    if (b.status === BranchStatus.APPROVED) {
      activities.push({
        id: `branch_approve_${b.id}`,
        type: "branch_approved",
        messageKey: "ACTIVITY_BRANCH_APPROVED",
        entityName: b.businessName,
        timestamp: b.updatedAt,
      });
    } else if (b.status === BranchStatus.REJECTED) {
      activities.push({
        id: `branch_reject_${b.id}`,
        type: "branch_rejected",
        messageKey: "ACTIVITY_BRANCH_REJECTED",
        entityName: b.businessName,
        timestamp: b.updatedAt,
      });
    }
  });

  // 2. Process services
  services.forEach((s) => {
    if (s.status === ServiceApprovalStatus.APPROVED) {
      activities.push({
        id: `service_approve_${s.id}`,
        type: "service_approved",
        messageKey: "ACTIVITY_SERVICE_APPROVED",
        entityName: s.name,
        timestamp: s.approvedAt || s.updatedAt,
      });
    } else if (s.status === ServiceApprovalStatus.REJECTED) {
      activities.push({
        id: `service_reject_${s.id}`,
        type: "service_rejected",
        messageKey: "ACTIVITY_SERVICE_REJECTED",
        entityName: s.name,
        timestamp: s.updatedAt,
      });
    } else {
      activities.push({
        id: `service_pending_${s.id}`,
        type: "service_pending",
        messageKey: "ACTIVITY_SERVICE_PENDING",
        entityName: s.name,
        timestamp: s.updatedAt,
      });
    }
  });

  // 3. Process payments
  payments.forEach((p) => {
    if (p.status === PaymentStatus.REFUNDED) {
      activities.push({
        id: `subscription_canceled_${p.id}`,
        type: "subscription_canceled",
        messageKey: "ACTIVITY_SUBSCRIPTION_CANCELED_REFUNDED",
        entityName: p.branch.businessName,
        timestamp: p.paidAt,
      });
    } else if (p.status === PaymentStatus.PAID) {
      activities.push({
        id: `subscription_renewed_${p.id}`,
        type: "subscription_renewed",
        messageKey: "ACTIVITY_SUBSCRIPTION_RENEWED",
        entityName: p.branch.businessName,
        timestamp: p.paidAt,
      });
    }
  });

  // Sort chronologically newest first and take top 10
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}



