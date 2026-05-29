import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import prisma from "../../../lib/prisma.js";
import { Role } from "../../../generated/prisma/client.js";
import * as clientService from "../client.service.js";

jest.mock("../../../lib/prisma.js");

beforeEach(() => {
  jest.clearAllMocks();

  prisma.client = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };

  prisma.branchAdmin = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  prisma.staff = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  prisma.service = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  prisma.offer = {
    findMany: jest.fn(),
    update: jest.fn(),
  };

  prisma.appointment = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  prisma.bookingPayment = {
    create: jest.fn(),
    update: jest.fn(),
  };

  prisma.staffAvailability = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };

  prisma.favoriteBranch = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  };

  prisma.favoriteStaff = {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  };

  prisma.review = {
    findMany: jest.fn(),
  };

  prisma.$queryRaw = jest.fn();
  prisma.$transaction = jest.fn((cb) => {
    if (typeof cb === "function") {
      return cb(prisma);
    }
    return Promise.all(cb);
  });
});

describe("Client Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const authUser = { sub: 10, role: Role.client };
  const mockClient = { id: 1, userId: 10 };

  // --- Home Dashboard Feeds ---
  describe("getHomeDashboard", () => {
    it("should retrieve home feeds including active offers, categories, and nearby providers", async () => {
      prisma.offer.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: "Flash Offer",
          branch: { businessName: "Vivid Nails" },
        },
      ]);

      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 2,
          name: "Vivid Nails",
          category: "SPA",
          latitude: 30.05,
          longitude: 31.24,
          distance: 1200,
        },
      ]);

      const result = await clientService.getHomeDashboard({ lat: "30.0444", lng: "31.2357" }, authUser);

      expect(result).toHaveProperty("offers");
      expect(result).toHaveProperty("categories");
      expect(result).toHaveProperty("nearbyProviders");
      expect(result.nearbyProviders[0]).toHaveProperty("distance", 1.2);
    });
  });

  // --- Discovery Map Search ---
  describe("searchBranches", () => {
    it("should list branches ordered by distance and rating within a specific radius", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 3,
          name: "Zen Spa",
          category: "SPA",
          latitude: 30.06,
          longitude: 31.25,
          rating: 4.8,
          totalReviews: 120,
          distance: 2500,
        },
      ]);

      const result = await clientService.searchBranches({ lat: "30.04", lng: "31.23", category: "SPA" });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("name", "Zen Spa");
      expect(result[0].location).toEqual({ lat: 30.06, lng: 31.25 });
    });
  });

  // --- Booking Wizard Available Days & Slots ---
  describe("getStaffAvailableDays", () => {
    it("should calculate available calendar days for the next 30 days based on staff availability", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, isActive: true });
      prisma.staffAvailability.findMany.mockResolvedValueOnce([
        { dayOfWeek: 1 }, // Mondays
        { dayOfWeek: 3 }, // Wednesdays
      ]);

      const result = await clientService.getStaffAvailableDays(5, 20);

      expect(result.availableDays.length).toBeGreaterThan(0);
      expect(result).toHaveProperty("staffId", 5);
    });
  });

  // --- Booking Prevention, Overlaps, and Past Bookings ---
  describe("reserveAppointment", () => {
    beforeEach(() => {
      // Default: no active offers for the service (empty list => no discount)
      prisma.offer.findMany.mockResolvedValue([]);
    });

    it("should reject reservation if it lies in the past", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.service.findUnique.mockResolvedValueOnce({
        id: 15,
        price: 300,
        durationMinutes: 45,
        status: "APPROVED",
        branchId: 8,
        branch: { status: "APPROVED", isSubscriptionActive: true },
      });
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, isActive: true, branchId: 8 });

      // Pass date in the past
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

      await expect(
        clientService.reserveAppointment({ serviceId: 15, staffId: 5, scheduledAt: pastDate }, authUser)
      ).rejects.toThrow();
    });

    it("should reject reservation if staff has an overlapping booking", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.service.findUnique.mockResolvedValueOnce({
        id: 15,
        price: 300,
        durationMinutes: 45,
        status: "APPROVED",
        branchId: 8,
        branch: { status: "APPROVED", isSubscriptionActive: true },
      });
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, isActive: true, branchId: 8 });

      // Simulate overlap (existing booking starts at same target time)
      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3); // 3 hours in the future
      prisma.appointment.findMany.mockResolvedValueOnce([
        {
          scheduledAt: targetDate,
          service: { durationMinutes: 45 },
        },
      ]);

      await expect(
        clientService.reserveAppointment({ serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString() }, authUser)
      ).rejects.toThrow();
    });

    it("should successfully create appointment with PENDING status and no offer", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      // service.findUnique called twice: once in reserveAppointment, once in calculateBestOfferForService
      const mockService = {
        id: 15,
        price: 300,
        durationMinutes: 45,
        status: "APPROVED",
        branchId: 8,
        branch: { status: "APPROVED", isSubscriptionActive: true },
      };
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, isActive: true, branchId: 8 });
      prisma.appointment.findMany.mockResolvedValueOnce([]); // No overlaps

      prisma.appointment.create.mockResolvedValueOnce({ id: 99, status: "PENDING" });
      prisma.bookingPayment.create.mockResolvedValueOnce({ id: 22, status: "PENDING", amount: 300 });

      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3);

      const result = await clientService.reserveAppointment(
        { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString() },
        authUser
      );

      expect(result.appointment).toHaveProperty("status", "PENDING");
      expect(prisma.appointment.create).toHaveBeenCalled();

      const paymentCall = prisma.bookingPayment.create.mock.calls[0][0].data;
      expect(paymentCall.amount).toBe(300);         // no discount => full price
      expect(paymentCall.originalAmount).toBe(300);
      expect(paymentCall.discountAmount).toBe(0);
      expect(paymentCall.appliedOfferId).toBeNull();
    });

    it("should apply a PERCENTAGE offer and store the correct pricing snapshot", async () => {
      // Offer: 20% off service price of 300 => saves 60, final = 240
      prisma.offer.findMany.mockResolvedValue([
        {
          id: 7,
          title: "20% Summer Sale",
          discountType: "PERCENTAGE",
          discountValue: 20,
          startDate: new Date(Date.now() - 1000),
          endDate: new Date(Date.now() + 86400000),
          usageLimit: null,
          usedCount: 0,
        },
      ]);

      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      const mockService = {
        id: 15,
        price: 300,
        durationMinutes: 45,
        status: "APPROVED",
        branchId: 8,
        branch: { status: "APPROVED", isSubscriptionActive: true },
      };
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, isActive: true, branchId: 8 });
      prisma.appointment.findMany.mockResolvedValueOnce([]);
      prisma.appointment.create.mockResolvedValueOnce({ id: 99, status: "PENDING" });
      prisma.bookingPayment.create.mockResolvedValueOnce({ id: 22, status: "PENDING", amount: 240 });

      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3);
      await clientService.reserveAppointment(
        { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString() },
        authUser
      );

      const paymentCall = prisma.bookingPayment.create.mock.calls[0][0].data;
      expect(paymentCall.amount).toBe(240);         // 300 - 60
      expect(paymentCall.originalAmount).toBe(300);
      expect(paymentCall.discountAmount).toBe(60);
      expect(paymentCall.appliedOfferId).toBe(7);
    });
  });

  // --- Payment Confirmation Engine ---
  describe("confirmAppointmentPayment", () => {
    it("should confirm the appointment and increment offer usedCount if offer was applied", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        status: "PENDING",
        bookingPayment: { id: 22, appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CONFIRMED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "PAID" });
      prisma.offer.update.mockResolvedValueOnce({ id: 7, usedCount: 1 });

      const result = await clientService.confirmAppointmentPayment(99, { success: true }, authUser);

      expect(result.appointment.status).toBe("CONFIRMED");
      expect(result.payment.status).toBe("PAID");
      expect(prisma.offer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { usedCount: { increment: 1 } },
        })
      );
    });

    it("should confirm the appointment without offer increment when no offer was applied", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        status: "PENDING",
        bookingPayment: { id: 22, appliedOfferId: null },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CONFIRMED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "PAID" });

      const result = await clientService.confirmAppointmentPayment(99, { success: true }, authUser);

      expect(result.appointment.status).toBe("CONFIRMED");
      expect(result.payment.status).toBe("PAID");
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should leave the appointment pending and NOT increment offer usedCount if payment failed", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        status: "PENDING",
        bookingPayment: { id: 22, appliedOfferId: 7 },
      });

      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "FAILED" });

      const result = await clientService.confirmAppointmentPayment(99, { success: false }, authUser);

      expect(result.appointment.status).toBe("PENDING");
      expect(result.payment.status).toBe("FAILED");
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });
  });

  // --- Cancellation Policy Rules ---
  describe("cancelAppointment", () => {
    it("should block cancellation if inside the branch-configured window", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);

      // Scheduled 2 hours from now, but cancellation is allowed up to 24 hours before
      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        scheduledAt,
        branch: { allowCancellationBeforeHours: 24 },
        bookingPayment: { status: "PAID" },
      });

      await expect(clientService.cancelAppointment(99, authUser)).rejects.toThrow();
    });

    it("should refund payment if cancelled outside the allowed window", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);

      // Scheduled 48 hours from now (outside 24 hours window)
      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        scheduledAt,
        branch: { allowCancellationBeforeHours: 24 },
        bookingPayment: { status: "PAID" },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CANCELED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "REFUNDED" });

      const result = await clientService.cancelAppointment(99, authUser);

      expect(result.appointment.status).toBe("CANCELED");
      expect(result.payment.status).toBe("REFUNDED");
    });
  });

  // --- Favorites Management ---
  describe("addFavoriteBranch", () => {
    it("should successfully add an approved branch to favorites", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.branchAdmin.findUnique.mockResolvedValueOnce({ id: 4, status: "APPROVED" });
      prisma.favoriteBranch.findUnique.mockResolvedValueOnce(null); // Not already added

      prisma.favoriteBranch.create.mockResolvedValueOnce({ clientId: 1, branchId: 4 });

      const result = await clientService.addFavoriteBranch(4, authUser);

      expect(result).toHaveProperty("branchId", 4);
    });
  });
});
