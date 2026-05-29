import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from "@jest/globals";
import {
  AppointmentStatus,
  BranchStatus,
  PaymentStatus,
  ServiceApprovalStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
  getBranchDashboardStats,
  getRevenueChartData,
  getRecentBookings,
  getTopServices,
  getRecentTransactions,
  getBranchFinanceStats,
  listFinancePayments,
  processBookingPaymentRefund,
  exportFinanceReport,
  PaymentAlreadyRefundedError,
  PaymentNotPaidError,
} from "../branch_admin.service.js";

describe("Branch Admin Service - Dashboard & Finance", () => {
  const branchAdminUserId = 1;
  const mockBranchAdmin = {
    id: 10,
    userId: branchAdminUserId,
    status: BranchStatus.APPROVED,
    isSubscriptionActive: true,
    plan: {
      id: 1,
      maxStaff: 5,
      maxServices: 10,
      offersEnabled: true,
      loyaltyEnabled: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getBranchDashboardStats", () => {
    it("should calculate revenue strictly from successful PAID booking payments and exclude others", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.appointment, "count")
        .mockResolvedValueOnce(15) // totalBookings
        .mockResolvedValueOnce(10) // completedBookings
        .mockResolvedValueOnce(2);  // canceledBookings
      jest.spyOn(prisma.bookingPayment, "findMany").mockResolvedValue([
        { amount: 100 },
        { amount: 250 },
      ]);
      jest.spyOn(prisma.appointment, "groupBy").mockResolvedValue([{ clientId: 1 }, { clientId: 2 }]);
      jest.spyOn(prisma.staff, "count").mockResolvedValue(4);
      jest.spyOn(prisma.service, "count").mockResolvedValue(8);

      const stats = await getBranchDashboardStats(branchAdminUserId, "this_month");

      expect(stats.totalBookings).toBe(15);
      expect(stats.completedBookings).toBe(10);
      expect(stats.canceledBookings).toBe(2);
      expect(stats.totalRevenue).toBe(350);
      expect(stats.totalClients).toBe(2);
      expect(stats.totalStaff).toBe(4);
      expect(stats.totalServices).toBe(8);
    });
  });

  describe("getRevenueChartData", () => {
    it("should aggregate PAID payments into chart groups", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.bookingPayment, "findMany").mockResolvedValue([
        { amount: 120.50, paidAt: new Date("2026-05-28T10:00:00.000Z") },
        { amount: 80.00, paidAt: new Date("2026-05-28T14:30:00.000Z") },
        { amount: 50.00, paidAt: new Date("2026-05-29T09:15:00.000Z") },
      ]);

      const chart = await getRevenueChartData(branchAdminUserId, "this_month");

      expect(chart).toEqual([
        { label: "2026-05-28", revenue: 200.50 },
        { label: "2026-05-29", revenue: 50.00 },
      ]);
    });
  });

  describe("getRecentBookings", () => {
    it("should fetch and properly format the most recent 5 branch bookings", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.appointment, "findMany").mockResolvedValue([
        {
          id: 101,
          scheduledAt: new Date("2026-05-28T12:00:00.000Z"),
          status: AppointmentStatus.CONFIRMED,
          client: { user: { name: "Client A", phone: "01099998888" } },
          staff: { user: { name: "Staff X" } },
          service: { name: "Haircut", price: 150, durationMinutes: 30 },
          bookingPayment: { status: PaymentStatus.PAID },
        },
      ]);

      const bookings = await getRecentBookings(branchAdminUserId);

      expect(bookings.length).toBe(1);
      expect(bookings[0]).toEqual({
        id: 101,
        scheduledAt: bookings[0].scheduledAt,
        status: AppointmentStatus.CONFIRMED,
        clientName: "Client A",
        clientPhone: "01099998888",
        staffName: "Staff X",
        serviceName: "Haircut",
        price: 150,
        durationMinutes: 30,
        paymentStatus: PaymentStatus.PAID,
      });
    });
  });

  describe("getTopServices", () => {
    it("should aggregate and rank services correctly by completed booking counts and revenue", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.appointment, "findMany").mockResolvedValue([
        {
          service: { id: 1, name: "Service A", price: 100, imageUrl: "imgA" },
          bookingPayment: { status: PaymentStatus.PAID, amount: 100 },
        },
        {
          service: { id: 1, name: "Service A", price: 100, imageUrl: "imgA" },
          bookingPayment: { status: PaymentStatus.PAID, amount: 100 },
        },
        {
          service: { id: 2, name: "Service B", price: 50, imageUrl: "imgB" },
          bookingPayment: { status: PaymentStatus.FAILED, amount: 50 },
        },
      ]);

      const top = await getTopServices(branchAdminUserId, "this_month");

      expect(top.length).toBe(2);
      expect(top[0].id).toBe(1);
      expect(top[0].bookingCount).toBe(2);
      expect(top[0].revenue).toBe(200);
      expect(top[1].id).toBe(2);
      expect(top[1].bookingCount).toBe(1);
      expect(top[1].revenue).toBe(0); // Failed payment not counted
    });
  });

  describe("getBranchFinanceStats", () => {
    it("should return monthly revenue, total payments, active services, and completed bookings counts", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.bookingPayment, "findMany").mockResolvedValue([
        { amount: 500 },
        { amount: 120 },
      ]);
      jest.spyOn(prisma.bookingPayment, "count").mockResolvedValue(30);
      jest.spyOn(prisma.service, "count").mockResolvedValue(12);
      jest.spyOn(prisma.appointment, "count").mockResolvedValue(45);

      const stats = await getBranchFinanceStats(branchAdminUserId);

      expect(stats.monthlyRevenue).toBe(620);
      expect(stats.totalPayments).toBe(30);
      expect(stats.activeServices).toBe(12);
      expect(stats.completedBookings).toBe(45);
    });
  });

  describe("processBookingPaymentRefund", () => {
    it("should update paid payment to REFUNDED state", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.bookingPayment, "findUnique").mockResolvedValue({
        id: 200,
        branchId: 10,
        status: PaymentStatus.PAID,
      });
      const updateSpy = jest.spyOn(prisma.bookingPayment, "update").mockResolvedValue({
        id: 200,
        status: PaymentStatus.REFUNDED,
      });

      const refund = await processBookingPaymentRefund(branchAdminUserId, 200);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 200 },
        data: { status: PaymentStatus.REFUNDED },
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          updatedAt: true,
        },
      });
      expect(refund.status).toBe(PaymentStatus.REFUNDED);
    });

    it("should throw PaymentAlreadyRefundedError if already refunded", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.bookingPayment, "findUnique").mockResolvedValue({
        id: 200,
        branchId: 10,
        status: PaymentStatus.REFUNDED,
      });

      await expect(processBookingPaymentRefund(branchAdminUserId, 200)).rejects.toThrow(
        PaymentAlreadyRefundedError,
      );
    });

    it("should throw PaymentNotPaidError if not PAID", async () => {
      jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
      jest.spyOn(prisma.bookingPayment, "findUnique").mockResolvedValue({
        id: 200,
        branchId: 10,
        status: PaymentStatus.PENDING,
      });

      await expect(processBookingPaymentRefund(branchAdminUserId, 200)).rejects.toThrow(
        PaymentNotPaidError,
      );
    });
  });
});
