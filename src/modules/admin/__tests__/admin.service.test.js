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
    UserStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { getRecentActivities } from "../activities/activities.service.js";
import {
    listBranchPayments,
    refundBranchPayment,
} from "../payments/payments.service.js";
import {
    listBranches,
    getBranchDetails,
    approveBranch,
    rejectBranch,
    toggleBlockBranch,
} from "../branches/branches.service.js";
import {
    listServices,
    getServiceDetails,
    approveService,
    rejectService,
} from "../services/services.service.js";
import { getPlatformAnalytics, getAnalyticsOverview, getRevenueChartData } from "../analytics/analytics.service.js";
import { getFinancialSummary } from "../financial/financial.service.js";
import {
    BranchIsNotPendingError,
    BranchNotFound,
    InvalidPaymentStatusForRefundError,
    PaymentAlreadyRefundedError,
    PaymentNotFoundError,
    ServiceNotPendingError,
    ServiceNotFound,
    BranchCannotBeBlockedUnapprovedError,
} from "../errors.js";

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
            is: {
              businessName: {
                contains: "Clinic",
              },
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

describe("Admin Service - listBranches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should list branches matching status or defaulting to PENDING_APPROVAL", async () => {
    const mockBranches = [
      { id: 1, businessName: "Branch A", ownerName: "Owner A", category: "SPA", city: "Cairo", logoUrl: null, status: BranchStatus.PENDING_APPROVAL, rejectionReason: null, createdAt: new Date() },
    ];
    jest.spyOn(prisma.branchAdmin, "findMany").mockResolvedValue(mockBranches);

    const result = await listBranches();
    expect(prisma.branchAdmin.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: BranchStatus.PENDING_APPROVAL },
    }));
    expect(result.branches).toHaveLength(1);
    expect(result.branches[0].businessName).toBe("Branch A");
  });

  it("should list branches matching custom status filter", async () => {
    jest.spyOn(prisma.branchAdmin, "findMany").mockResolvedValue([]);
    await listBranches(BranchStatus.APPROVED);
    expect(prisma.branchAdmin.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: BranchStatus.APPROVED },
    }));
  });

  it("should list branches matching SUSPENDED status filter", async () => {
    jest.spyOn(prisma.branchAdmin, "findMany").mockResolvedValue([]);
    await listBranches("SUSPENDED");
    expect(prisma.branchAdmin.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: BranchStatus.APPROVED,
        user: {
          status: UserStatus.SUSPENDED,
        },
      },
    }));
  });
});

describe("Admin Service - getBranchDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should retrieve branch details successfully", async () => {
    const mockBranch = { id: 1, ownerName: "Owner A", email: "owner@a.com", phone: "0100", businessName: "Branch A", plan: { name: "Starter" }, documents: [], user: { status: "ACTIVE" } };
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranch);
    jest.spyOn(prisma.appointment, "count").mockResolvedValue(5);

    const result = await getBranchDetails(1);
    expect(result.businessName).toBe("Branch A");
    expect(result.bookingsCount).toBe(5);
    expect(result.user.status).toBe("ACTIVE");
  });

  it("should throw BranchNotFound when branch does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(getBranchDetails(999)).rejects.toThrow(BranchNotFound);
  });
});

describe("Admin Service - approveBranch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw BranchNotFound if branch does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(approveBranch(999)).rejects.toThrow(BranchNotFound);
  });

  it("should throw BranchIsNotPendingError if status is not PENDING_APPROVAL", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, status: BranchStatus.APPROVED });
    await expect(approveBranch(1)).rejects.toThrow(BranchIsNotPendingError);
  });

  it("should approve the branch successfully when status is pending", async () => {
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    jest.spyOn(prisma.branchAdmin, "findUnique")
      .mockResolvedValueOnce({ id: 1, status: BranchStatus.PENDING_APPROVAL })
      .mockResolvedValueOnce({
        id: 1,
        userId: null,
        ownerName: "Branch Owner",
        email: "branch@example.com",
        phone: "01000000001",
        passwordHash: "hashed-password",
        emailVerified: true,
        phoneVerified: true,
      });
    const updateSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});
    const userFindFirstSpy = jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    const userCreateSpy = jest.spyOn(prisma.user, "create").mockResolvedValue({ id: 41 });

    const result = await approveBranch(1);

    expect(updateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 1 },
      data: { status: BranchStatus.APPROVED, rejectionReason: null },
    }));
    expect(userFindFirstSpy).toHaveBeenCalledWith({
      where: {
        OR: [{ email: "branch@example.com" }, { phone: "01000000001" }],
      },
      select: { id: true, email: true, phone: true, role: true },
    });
    expect(userCreateSpy).toHaveBeenCalledWith({
      data: {
        name: "Branch Owner",
        email: "branch@example.com",
        password: "hashed-password",
        phone: "01000000001",
        role: "branch_admin",
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      },
      select: { id: true },
    });
    expect(updateSpy).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { userId: 41 },
    });
    expect(result.message).toBeDefined();
  });
});

describe("Admin Service - rejectBranch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw BranchNotFound if branch does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(rejectBranch(999, "Bad info")).rejects.toThrow(BranchNotFound);
  });

  it("should throw BranchIsNotPendingError if status is not PENDING_APPROVAL", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, status: BranchStatus.APPROVED });
    await expect(rejectBranch(1, "Bad info")).rejects.toThrow(BranchIsNotPendingError);
  });

  it("should reject the branch successfully when status is pending", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, status: BranchStatus.PENDING_APPROVAL });
    const updateSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});

    const result = await rejectBranch(1, "Incomplete docs");
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: { status: BranchStatus.REJECTED, rejectionReason: "Incomplete docs" },
    }));
    expect(result.message).toBeDefined();
  });
});

describe("Admin Service - toggleBlockBranch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw BranchNotFound if branch does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(toggleBlockBranch(999)).rejects.toThrow(BranchNotFound);
  });

  it("should throw BranchCannotBeBlockedUnapprovedError if branch is not APPROVED", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, status: BranchStatus.PENDING_APPROVAL });
    await expect(toggleBlockBranch(1)).rejects.toThrow(BranchCannotBeBlockedUnapprovedError);
  });

  it("should block an approved active branch successfully and suspend the user", async () => {
    const mockBranch = { id: 1, status: BranchStatus.APPROVED, isSubscriptionActive: true, userId: 10, subscriptionStartedAt: new Date() };
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranch);
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: 10, status: UserStatus.ACTIVE });
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    const updateBranchSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});
    const updateUserSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({});

    const result = await toggleBlockBranch(1);

    expect(updateBranchSpy).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isSubscriptionActive: false },
    });
    expect(updateUserSpy).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: UserStatus.SUSPENDED },
    });
    expect(result.message).toBe("BRANCH_BLOCKED");
  });

  it("should unblock an approved inactive branch successfully and activate the user", async () => {
    const mockBranch = { id: 1, status: BranchStatus.APPROVED, isSubscriptionActive: false, userId: 10, subscriptionStartedAt: new Date() };
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranch);
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: 10, status: UserStatus.SUSPENDED });
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    const updateBranchSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});
    const updateUserSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({});

    const result = await toggleBlockBranch(1);

    expect(updateBranchSpy).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isSubscriptionActive: true },
    });
    expect(updateUserSpy).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: UserStatus.ACTIVE },
    });
    expect(result.message).toBe("BRANCH_UNBLOCKED");
  });

  it("should block successfully even if userId is null", async () => {
    const mockBranch = { id: 1, status: BranchStatus.APPROVED, isSubscriptionActive: true, userId: null, subscriptionStartedAt: null };
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranch);
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    const updateBranchSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});
    const updateUserSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({});

    const result = await toggleBlockBranch(1);

    expect(updateBranchSpy).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isSubscriptionActive: false },
    });
    expect(updateUserSpy).not.toHaveBeenCalled();
    expect(result.message).toBe("BRANCH_BLOCKED");
  });

  it("should block an approved unsubscribed branch and set user to suspended", async () => {
    const mockBranch = { id: 1, status: BranchStatus.APPROVED, isSubscriptionActive: false, userId: 10, subscriptionStartedAt: null };
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranch);
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: 10, status: UserStatus.ACTIVE });
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    const updateBranchSpy = jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({});
    const updateUserSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({});

    const result = await toggleBlockBranch(1);

    expect(updateBranchSpy).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isSubscriptionActive: false },
    });
    expect(updateUserSpy).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: UserStatus.SUSPENDED },
    });
    expect(result.message).toBe("BRANCH_BLOCKED");
  });
});

describe("Admin Service - listServices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should list services matching status or defaulting to PENDING_APPROVAL", async () => {
    const mockServices = [
      { id: 1, name: "Haircut", price: 100, status: ServiceApprovalStatus.PENDING_APPROVAL, createdAt: new Date() },
    ];
    jest.spyOn(prisma.service, "findMany").mockResolvedValue(mockServices);

    const result = await listServices();
    expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: ServiceApprovalStatus.PENDING_APPROVAL },
    }));
    expect(result).toHaveLength(1);
  });

  it("should list services matching custom status filter", async () => {
    jest.spyOn(prisma.service, "findMany").mockResolvedValue([]);
    await listServices(ServiceApprovalStatus.APPROVED);
    expect(prisma.service.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: ServiceApprovalStatus.APPROVED },
    }));
  });
});

describe("Admin Service - getServiceDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should retrieve service details successfully", async () => {
    const mockService = { id: 1, name: "Haircut", price: 100, branch: { businessName: "Branch A" } };
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue(mockService);

    const result = await getServiceDetails(1);
    expect(result.name).toBe("Haircut");
  });

  it("should throw ServiceNotFound when service does not exist", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue(null);
    await expect(getServiceDetails(999)).rejects.toThrow(ServiceNotFound);
  });
});

describe("Admin Service - approveService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw ServiceNotFound if service does not exist", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue(null);
    await expect(approveService(999)).rejects.toThrow(ServiceNotFound);
  });

  it("should throw ServiceNotPendingError if status is not PENDING_APPROVAL", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({ id: 1, status: ServiceApprovalStatus.APPROVED });
    await expect(approveService(1)).rejects.toThrow(ServiceNotPendingError);
  });

  it("should approve the service successfully when status is pending", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({ id: 1, status: ServiceApprovalStatus.PENDING_APPROVAL });
    const updateSpy = jest.spyOn(prisma.service, "update").mockResolvedValue({ id: 1, name: "Haircut" });

    const result = await approveService(1);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ status: ServiceApprovalStatus.APPROVED }),
    }));
    expect(result.service.name).toBe("Haircut");
  });
});

describe("Admin Service - rejectService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw ServiceNotFound if service does not exist", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue(null);
    await expect(rejectService(999, "Bad service")).rejects.toThrow(ServiceNotFound);
  });

  it("should throw ServiceNotPendingError if status is not PENDING_APPROVAL", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({ id: 1, status: ServiceApprovalStatus.APPROVED });
    await expect(rejectService(1, "Bad service")).rejects.toThrow(ServiceNotPendingError);
  });

  it("should reject the service successfully when status is pending", async () => {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({ id: 1, status: ServiceApprovalStatus.PENDING_APPROVAL });
    const updateSpy = jest.spyOn(prisma.service, "update").mockResolvedValue({ id: 1, name: "Haircut" });

    const result = await rejectService(1, "Not allowed name");
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 },
      data: expect.objectContaining({ status: ServiceApprovalStatus.REJECTED, rejectionReason: "Not allowed name" }),
    }));
    expect(result.service.name).toBe("Haircut");
  });
});

describe("Admin Service - getPlatformAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should calculate active businesses and total subscription revenue", async () => {
    jest.spyOn(prisma.branchAdmin, "count").mockResolvedValue(10);
    jest.spyOn(prisma.subscriptionPayment, "aggregate").mockResolvedValue({ _sum: { amount: 1500 } });

    const result = await getPlatformAnalytics("this_month");
    expect(prisma.branchAdmin.count).toHaveBeenCalled();
    expect(prisma.subscriptionPayment.aggregate).toHaveBeenCalled();
    expect(result.totalActiveBusinesses).toBe(10);
    expect(result.totalSubscriptionRevenue).toBe(1500);
  });
});

describe("Admin Service - getFinancialSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should calculate correct financial metrics and trends", async () => {
    jest.spyOn(prisma.subscriptionPayment, "aggregate")
      .mockResolvedValueOnce({ _sum: { amount: 1200 } })
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 150 }, _count: { id: 3 } })
      .mockResolvedValueOnce({ _sum: { amount: 100 } });

    jest.spyOn(prisma.branchAdmin, "count")
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40);

    jest.spyOn(prisma.subscriptionPayment, "count")
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(20);

    const result = await getFinancialSummary();

    expect(result.monthlyRevenue).toEqual({ value: 1200, trend: 20 });
    expect(result.activeSubscriptions).toEqual({ value: 50, trend: 25 });
    expect(result.refunds).toEqual({ value: 150, count: 3, trend: 50 });
    expect(result.totalPayments).toEqual({ value: 25, trend: 25 });
  });

  it("should handle zero previous month gracefully", async () => {
    jest.spyOn(prisma.subscriptionPayment, "aggregate")
      .mockResolvedValueOnce({ _sum: { amount: 1200 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 }, _count: { id: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } });

    jest.spyOn(prisma.branchAdmin, "count")
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(0);

    jest.spyOn(prisma.subscriptionPayment, "count")
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(0);

    const result = await getFinancialSummary();

    expect(result.monthlyRevenue.trend).toBe(100);
    expect(result.activeSubscriptions.trend).toBe(100);
    expect(result.refunds.trend).toBe(0);
    expect(result.totalPayments.trend).toBe(100);
  });
});

describe("Admin Service - getAnalyticsOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return the correct counts for overview", async () => {
    jest.spyOn(prisma.subscriptionPayment, "aggregate").mockResolvedValueOnce({ _sum: { amount: 2000 } });
    jest.spyOn(prisma.branchAdmin, "count").mockResolvedValueOnce(15);
    jest.spyOn(prisma.user, "count").mockResolvedValueOnce(120);

    const result = await getAnalyticsOverview();

    expect(result).toEqual({
      revenueThisMonth: 2000,
      activeBranches: 15,
      totalUsers: 120,
    });
  });
});

describe("Admin Service - getRevenueChartData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should aggregate data points for last N months", async () => {
    const mockPayments = [
      { amount: 500, paidAt: new Date() },
      { amount: 300, paidAt: new Date() },
    ];
    jest.spyOn(prisma.subscriptionPayment, "findMany").mockResolvedValueOnce(mockPayments);

    const result = await getRevenueChartData(6);

    expect(result).toHaveLength(6);
    const latestMonth = result[5];
    expect(latestMonth.revenue).toBe(800);
  });
});
