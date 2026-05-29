import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from "@jest/globals";
import {
  BranchStatus,
  PaymentStatus,
  ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
  listBranchPayments,
  refundBranchPayment,
  getRecentActivities,
  PaymentNotFoundError,
  PaymentAlreadyRefundedError,
  InvalidPaymentStatusForRefundError,
} from "../admin.service.js";

describe("Admin Service - listBranchPayments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should fetch subscription payments with default pagination", async () => {
    const mockPayments = [
      {
        id: 1,
        amount: 199,
        status: PaymentStatus.PAID,
        paidAt: new Date("2026-05-28T10:00:00.000Z"),
        branch: { id: 10, businessName: "Test Branch" },
        plan: { id: 1, name: "Starter" },
      },
    ];

    jest.spyOn(prisma.subscriptionPayment, "findMany").mockResolvedValue(mockPayments);
    jest.spyOn(prisma.subscriptionPayment, "count").mockResolvedValue(1);

    const result = await listBranchPayments();

    expect(prisma.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { paidAt: "desc" },
      })
    );

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].paymentId).toBe(1);
    expect(result.payments[0].businessName).toBe("Test Branch");
    expect(result.meta.totalRecords).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it("should search and filter by status and custom pagination", async () => {
    jest.spyOn(prisma.subscriptionPayment, "findMany").mockResolvedValue([]);
    jest.spyOn(prisma.subscriptionPayment, "count").mockResolvedValue(0);

    await listBranchPayments({
      page: 2,
      limit: 5,
      status: PaymentStatus.REFUNDED,
      search: "Clinic",
    });

    expect(prisma.subscriptionPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          branch: {
            businessName: {
              contains: "Clinic",
            },
          },
        }),
      })
    );
  });
});

describe("Admin Service - refundBranchPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw PaymentNotFoundError when payment doesn't exist", async () => {
    jest.spyOn(prisma.subscriptionPayment, "findUnique").mockResolvedValue(null);

    await expect(refundBranchPayment(999)).rejects.toThrow(PaymentNotFoundError);
  });

  it("should throw PaymentAlreadyRefundedError when payment is already refunded", async () => {
    jest.spyOn(prisma.subscriptionPayment, "findUnique").mockResolvedValue({
      id: 1,
      status: PaymentStatus.REFUNDED,
      amount: 199,
      branchId: 10,
    });

    await expect(refundBranchPayment(1)).rejects.toThrow(PaymentAlreadyRefundedError);
  });

  it("should throw InvalidPaymentStatusForRefundError when payment status is not PAID", async () => {
    jest.spyOn(prisma.subscriptionPayment, "findUnique").mockResolvedValue({
      id: 1,
      status: PaymentStatus.PENDING,
      amount: 199,
      branchId: 10,
    });

    await expect(refundBranchPayment(1)).rejects.toThrow(InvalidPaymentStatusForRefundError);
  });

  it("should process refund and deactivate subscription in transaction successfully", async () => {
    const mockPayment = {
      id: 1,
      status: PaymentStatus.PAID,
      amount: 199,
      branchId: 10,
    };

    jest.spyOn(prisma.subscriptionPayment, "findUnique").mockResolvedValue(mockPayment);
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    const updatePaymentSpy = jest.spyOn(prisma.subscriptionPayment, "update").mockResolvedValue({});
    const updateBranchSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});

    const result = await refundBranchPayment(1);

    expect(updatePaymentSpy).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: PaymentStatus.REFUNDED },
    });

    expect(updateBranchSpy).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isSubscriptionActive: false },
    });

    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(result.paymentId).toBe(1);
    expect(result.amount).toBe(199);
    expect(result.refundId).toBeDefined();
  });
});

describe("Admin Service - getRecentActivities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return chronological merged and sorted recent activities", async () => {
    const mockBranches = [
      {
        id: 1,
        businessName: "Clinic A",
        status: BranchStatus.APPROVED,
        createdAt: new Date("2026-05-28T09:00:00.000Z"),
        updatedAt: new Date("2026-05-28T10:00:00.000Z"),
      },
    ];

    const mockServices = [
      {
        id: 2,
        name: "Service B",
        status: ServiceApprovalStatus.APPROVED,
        approvedAt: new Date("2026-05-28T11:00:00.000Z"),
        updatedAt: new Date("2026-05-28T11:00:00.000Z"),
        branch: { businessName: "Clinic A" },
      },
    ];

    const mockPayments = [
      {
        id: 3,
        amount: 49,
        status: PaymentStatus.REFUNDED,
        paidAt: new Date("2026-05-28T12:00:00.000Z"),
        branch: { businessName: "Clinic A" },
      },
    ];

    jest.spyOn(prisma.branchAdmin, "findMany").mockResolvedValue(mockBranches);
    jest.spyOn(prisma.service, "findMany").mockResolvedValue(mockServices);
    jest.spyOn(prisma.subscriptionPayment, "findMany").mockResolvedValue(mockPayments);

    const result = await getRecentActivities();

    expect(result).toHaveLength(4);
    // Sort order should be newest first:
    // 1. subscription_canceled / refund (12:00)
    // 2. service approved (11:00)
    // 3. branch approved (10:00)
    // 4. new branch application (09:00)
    expect(result[0].type).toBe("subscription_canceled");
    expect(result[1].type).toBe("service_approved");
    expect(result[2].type).toBe("branch_approved");
    expect(result[3].type).toBe("new_branch_application");
  });
});
