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
    PaymentStatus
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    getBranchDashboardStats,
    getRecentBookings,
    getRevenueChartData,
    getTopServices
} from "../analytics/analytics.service.js";
import { PaymentAlreadyRefundedError, PaymentNotPaidError } from "../errors.js";
import { getBranchFinanceStats, processBookingPaymentRefund } from "../finance/finance.service.js";

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
        .mockResolvedValueOnce(10) // previousTotalBookings
        .mockResolvedValueOnce(10) // completedBookings
        .mockResolvedValueOnce(5) // previousCompletedBookings
        .mockResolvedValueOnce(2) // canceledBookings
        .mockResolvedValueOnce(4); // previousCanceledBookings
      jest.spyOn(prisma.bookingPayment, "aggregate")
        .mockResolvedValueOnce({ _sum: { amount: 350 } })
        .mockResolvedValueOnce({ _sum: { amount: 200 } });
      jest.spyOn(prisma.appointment, "groupBy")
        .mockResolvedValueOnce([{ clientId: 1 }, { clientId: 2 }])
        .mockResolvedValueOnce([{ clientId: 1 }]);
      jest.spyOn(prisma.staff, "count")
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2);
      jest.spyOn(prisma.service, "count")
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(4);

      const stats = await getBranchDashboardStats(branchAdminUserId, "this_month");

      expect(stats.totalBookings).toEqual({ value: 15, trend: 50 });
      expect(stats.completedBookings).toEqual({ value: 10, trend: 100 });
      expect(stats.canceledBookings).toEqual({ value: 2, trend: -50 });
      expect(stats.totalRevenue).toEqual({ value: 350, trend: 75 });
      expect(stats.totalClients).toEqual({ value: 2, trend: 100 });
      expect(stats.totalStaff).toEqual({ value: 4, trend: 100 });
      expect(stats.totalServices).toEqual({ value: 8, trend: 100 });
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
      jest.spyOn(prisma.bookingPayment, "aggregate")
        .mockResolvedValueOnce({ _sum: { amount: 620 } })
        .mockResolvedValueOnce({ _sum: { amount: 400 } });
      jest.spyOn(prisma.bookingPayment, "count")
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20);
      jest.spyOn(prisma.service, "count")
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(10);
      jest.spyOn(prisma.appointment, "count")
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(30);

      const stats = await getBranchFinanceStats(branchAdminUserId);

      expect(stats.monthlyRevenue).toEqual({ value: 620, trend: 55 });
      expect(stats.totalPayments).toEqual({ value: 30, trend: 50 });
      expect(stats.activeServices).toEqual({ value: 12, trend: 20 });
      expect(stats.completedBookings).toEqual({ value: 45, trend: 50 });
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
