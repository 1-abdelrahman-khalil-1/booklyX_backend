import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Role } from "../../../generated/prisma/client.js";

const prisma = {};

await jest.unstable_mockModule("../../../lib/prisma.js", () => ({
  default: prisma,
}));

const dashboardService = await import("../dashboard/dashboard.service.js");
const discoveryService = await import("../discovery/discovery.service.js");
const branchesService = await import("../branches/branches.service.js");
const staffService = await import("../staff/staff.service.js");
const appointmentsService = await import("../appointments/appointments.service.js");
const favouritesService = await import("../favourites/favourites.service.js");
const offersService = await import("../offers/offers.service.js");

const clientService = {
  ...dashboardService,
  ...discoveryService,
  ...branchesService,
  ...staffService,
  ...appointmentsService,
  ...favouritesService,
  ...offersService,
};

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
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  prisma.claimedOffer = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
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
  prisma.$executeRaw = jest.fn().mockResolvedValue(1); // default: 1 row affected = success
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

      const result = await clientService.getHomeDashboard({ lat: "30.0444", lng: "31.2357" });

      expect(result).toHaveProperty("offers");
      expect(result).toHaveProperty("categories");
      expect(result).toHaveProperty("nearbyProviders");
      expect(result.nearbyProviders[0]).toHaveProperty("distance", 1.2);
    });

    it("should filter nearby providers by category when category parameter is passed", async () => {
      prisma.offer.findMany.mockResolvedValueOnce([]);
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 3,
          name: "Zen Spa",
          category: "SPA",
          latitude: 30.05,
          longitude: 31.24,
          distance: 1200,
        },
      ]);

      const result = await clientService.getHomeDashboard({ lat: "30.0444", lng: "31.2357", category: "SPA" });

      expect(result.nearbyProviders).toHaveLength(1);
      expect(result.nearbyProviders[0]).toHaveProperty("category", "SPA");
      expect(prisma.$queryRaw).toHaveBeenCalled();
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
      expect(result.appliedOffer).toBeNull();
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
      prisma.claimedOffer.findUnique.mockResolvedValueOnce({ id: 1, clientId: 1, offerId: 7, isUsed: false });
      prisma.appointment.findFirst.mockResolvedValueOnce(null); // No overlap bookings using the offer

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
      const result = await clientService.reserveAppointment(
        { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString(), appliedOfferId: 7 },
        authUser
      );

      const paymentCall = prisma.bookingPayment.create.mock.calls[0][0].data;
      expect(paymentCall.amount).toBe(240);         // 300 - 60
      expect(paymentCall.originalAmount).toBe(300);
      expect(paymentCall.discountAmount).toBe(60);
      expect(paymentCall.appliedOfferId).toBe(7);

      // appliedOffer should be included in the reserve response
      expect(result.appliedOffer).toMatchObject({
        id: 7,
        title: "20% Summer Sale",
        discountType: "PERCENTAGE",
        discountValue: 20,
      });
    });
  });

  // --- Payment Confirmation Engine ---
  describe("confirmAppointmentPayment", () => {
    it("should confirm the appointment and atomically increment offer usedCount via raw SQL", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        status: "PENDING",
        bookingPayment: { id: 22, appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CONFIRMED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "PAID" });
      // $executeRaw returns 1 (offer found and incremented)
      prisma.$executeRaw.mockResolvedValueOnce(1);

      const result = await clientService.confirmAppointmentPayment(99, { success: true }, authUser);

      expect(result.appointment.status).toBe("CONFIRMED");
      expect(result.payment.status).toBe("PAID");
      // Atomic raw SQL increment was called (not offer.update)
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should abort confirmation with 409 when offer is exhausted or expired at payment time", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        status: "PENDING",
        bookingPayment: { id: 22, appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CONFIRMED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "PAID" });
      // $executeRaw returns 0 => offer expired or limit reached
      prisma.$executeRaw.mockResolvedValueOnce(0);

      await expect(
        clientService.confirmAppointmentPayment(99, { success: true }, authUser)
      ).rejects.toThrow();
    });

    it("should confirm the appointment without touching offers when no offer was applied", async () => {
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
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should leave the appointment pending and NOT touch offers if payment failed", async () => {
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
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
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

    it("should refund payment and restore offer slot when offer is active and in-date", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);

      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        scheduledAt,
        branch: { allowCancellationBeforeHours: 24 },
        bookingPayment: { id: 22, status: "PAID", appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CANCELED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "REFUNDED" });
      // Offer is active, within validity, and has usedCount > 0
      prisma.offer.findUnique.mockResolvedValueOnce({
        isActive: true,
        endDate: new Date(Date.now() + 86400000),
        usedCount: 3,
      });
      prisma.offer.update.mockResolvedValueOnce({ id: 7, usedCount: 2 });

      const result = await clientService.cancelAppointment(99, authUser);

      expect(result.appointment.status).toBe("CANCELED");
      expect(result.payment.status).toBe("REFUNDED");
      expect(prisma.offer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 7 },
          data: { usedCount: { decrement: 1 } },
        })
      );
    });

    it("should NOT restore offer slot when offer has already expired", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);

      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        scheduledAt,
        branch: { allowCancellationBeforeHours: 24 },
        bookingPayment: { id: 22, status: "PAID", appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CANCELED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "REFUNDED" });
      // Offer endDate is in the past
      prisma.offer.findUnique.mockResolvedValueOnce({
        isActive: true,
        endDate: new Date(Date.now() - 1000),
        usedCount: 1,
      });

      const result = await clientService.cancelAppointment(99, authUser);

      expect(result.appointment.status).toBe("CANCELED");
      expect(result.payment.status).toBe("REFUNDED");
      // No decrement — offer has expired
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    it("should NOT restore offer slot when offer is manually disabled (isActive=false)", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);

      const scheduledAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 99,
        clientId: 1,
        scheduledAt,
        branch: { allowCancellationBeforeHours: 24 },
        bookingPayment: { id: 22, status: "PAID", appliedOfferId: 7 },
      });

      prisma.appointment.update.mockResolvedValueOnce({ id: 99, status: "CANCELED" });
      prisma.bookingPayment.update.mockResolvedValueOnce({ id: 22, status: "REFUNDED" });
      // Offer is within date but manually disabled
      prisma.offer.findUnique.mockResolvedValueOnce({
        isActive: false,
        endDate: new Date(Date.now() + 86400000),
        usedCount: 1,
      });

      const result = await clientService.cancelAppointment(99, authUser);

      expect(result.appointment.status).toBe("CANCELED");
      expect(result.payment.status).toBe("REFUNDED");
      // No decrement — offer is inactive
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });
  });

  // --- Client Appointments Filtering ---
  describe("getClientAppointments", () => {
    it("should retrieve all client appointments when status filter is not provided", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findMany.mockResolvedValueOnce([{ id: 1, status: "PENDING" }]);

      const result = await clientService.getClientAppointments(authUser);

      expect(result).toHaveLength(1);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: mockClient.id },
        })
      );
    });

    it("should filter by pending status", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findMany.mockResolvedValueOnce([]);

      await clientService.getClientAppointments(authUser, { status: "pending" });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId: mockClient.id,
            status: { notIn: ["CANCELED", "COMPLETED"] },
            bookingPayment: { status: "PENDING" },
          },
        })
      );
    });

    it("should filter by upcoming status", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findMany.mockResolvedValueOnce([]);

      await clientService.getClientAppointments(authUser, { status: "upcoming" });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId: mockClient.id,
            status: { notIn: ["CANCELED", "COMPLETED"] },
            bookingPayment: { status: "PAID" },
            scheduledAt: expect.any(Object),
          },
        })
      );
    });

    it("should filter by closed status", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.appointment.findMany.mockResolvedValueOnce([]);

      await clientService.getClientAppointments(authUser, { status: "closed" });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId: mockClient.id,
            status: { in: ["COMPLETED", "CANCELED"] },
          },
        })
      );
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

  // --- Branch Profile with Staffs ---
  describe("getBranchProfile", () => {
    it("should retrieve approved branch profile along with mapped staffs (excluding reviews and certificates)", async () => {
      const mockBranch = {
        id: 1,
        ownerName: "Owner A",
        email: "owner@a.com",
        phone: "0100",
        businessName: "Salon A",
        category: "SPA",
        status: "APPROVED",
        isSubscriptionActive: true,
        averageRating: 4.5,
        reviewCount: 10,
        city: "Cairo",
        district: "Nasr City",
        address: "Street 1",
        createdAt: new Date(),
        updatedAt: new Date(),
        branchAvailabilities: [],
        services: [],
      };

      const mockStaffs = [
        {
          id: 10,
          branchId: 1,
          profileImageUrl: "https://example.com/staff.jpg",
          age: 30,
          staffRole: "BARBER",
          commissionPercentage: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          averageRating: 4.8,
          reviewCount: 15,
          user: {
            id: 20,
            name: "John Doe",
            email: "john@example.com",
            phone: "01100000000",
            role: "staff",
          },
          professionalProfile: {
            id: 100,
            bio: "Expert Barber",
            yearsOfExperience: 5,
            specialization: "Fade Cut",
          },
          availabilities: [
            {
              id: 200,
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "17:00",
              status: "AVAILABLE",
            },
          ],
          services: [
            {
              service: {
                id: 300,
                name: "Haircut",
                price: 50,
                durationMinutes: 30,
                status: "APPROVED",
                imageUrl: "https://example.com/haircut.jpg",
              },
            },
          ],
        },
      ];

      prisma.branchAdmin.findUnique.mockResolvedValueOnce(mockBranch);
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.favoriteBranch.findUnique.mockResolvedValueOnce(null);
      prisma.review.findMany.mockResolvedValueOnce([]);
      prisma.staff.findMany.mockResolvedValueOnce(mockStaffs);

      const result = await clientService.getBranchProfile(1, authUser);

      expect(result.branch).toBeDefined();
      expect(result.branch.businessName).toBe("Salon A");
      expect(result.branch.staffs).toHaveLength(1);
      expect(result.branch.staffs[0]).toEqual(
        expect.objectContaining({
          id: 10,
          name: "John Doe",
          staffRole: "BARBER",
          professionalProfile: expect.objectContaining({
            specialization: "Fade Cut",
          }),
        })
      );
      // Ensure reviews and certificates are NOT present
      expect(result.branch.staffs[0].reviews).toBeUndefined();
      expect(result.branch.staffs[0].certificates).toBeUndefined();
    });
  });

  // --- Claimed Offers Flow ---
  describe("Claimed Offers Flow", () => {
    const offerId = 50;

    it("should successfully claim an active offer", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce({
        id: offerId,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        usageLimit: 10,
        usedCount: 5,
      });
      prisma.claimedOffer.findUnique.mockResolvedValueOnce(null); // Not claimed yet
      prisma.claimedOffer.create.mockResolvedValueOnce({
        id: 1,
        clientId: mockClient.id,
        offerId,
        isUsed: false,
        claimedAt: new Date(),
        usedAt: null,
        offer: {
          id: offerId,
          title: "Claim Offer Test",
          description: "Desc",
          imageUrl: "img",
          discountType: "PERCENTAGE",
          discountValue: 15,
          startDate: new Date(),
          endDate: new Date(),
        },
      });

      const result = await clientService.claimOffer(authUser.sub, offerId);

      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("offerId", offerId);
      expect(result.offer).toHaveProperty("discountValue", 15);
      expect(prisma.claimedOffer.create).toHaveBeenCalled();
    });

    it("should reject claim if offer does not exist", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce(null);

      await expect(clientService.claimOffer(authUser.sub, offerId)).rejects.toThrow();
    });

    it("should reject claim if offer is inactive", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce({
        id: offerId,
        isActive: false,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        usageLimit: 10,
        usedCount: 5,
      });

      await expect(clientService.claimOffer(authUser.sub, offerId)).rejects.toThrow();
    });

    it("should reject claim if offer is expired", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce({
        id: offerId,
        isActive: true,
        startDate: new Date(Date.now() - 20000),
        endDate: new Date(Date.now() - 10000),
        usageLimit: 10,
        usedCount: 5,
      });

      await expect(clientService.claimOffer(authUser.sub, offerId)).rejects.toThrow();
    });

    it("should reject claim if offer is exhausted", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce({
        id: offerId,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        usageLimit: 10,
        usedCount: 10,
      });

      await expect(clientService.claimOffer(authUser.sub, offerId)).rejects.toThrow();
    });

    it("should reject claim if offer is already claimed", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findUnique.mockResolvedValueOnce({
        id: offerId,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 10000),
        usageLimit: 10,
        usedCount: 5,
      });
      prisma.claimedOffer.findUnique.mockResolvedValueOnce({
        id: 1,
        clientId: mockClient.id,
        offerId,
        isUsed: false,
      });

      await expect(clientService.claimOffer(authUser.sub, offerId)).rejects.toThrow();
    });

    it("should retrieve claimed offers with filters", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      const claimedOfferMock = {
        id: 1,
        isUsed: false,
        claimedAt: new Date(),
        usedAt: null,
        offer: {
          id: offerId,
          title: "Claim Offer Test",
          description: "Desc",
          imageUrl: "img",
          discountType: "PERCENTAGE",
          discountValue: 15,
          startDate: new Date(),
          endDate: new Date(),
          branch: { id: 1, businessName: "Branch A" },
        },
      };
      prisma.claimedOffer.findMany.mockResolvedValueOnce([claimedOfferMock]);

      const result = await clientService.getClaimedOffers(authUser.sub, { status: "unused" });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[0].offer).toHaveProperty("title", "Claim Offer Test");
    });

    it("should successfully retrieve valid offers that are not claimed by the client", async () => {
      prisma.client.findUnique.mockResolvedValueOnce(mockClient);
      prisma.offer.findMany.mockResolvedValueOnce([
        {
          id: 101,
          title: "Offer A",
          description: "Desc A",
          imageUrl: "imgA",
          discountType: "PERCENTAGE",
          discountValue: 10,
          startDate: new Date(),
          endDate: new Date(),
          usageLimit: null,
          usedCount: 0,
          branch: { id: 1, businessName: "Branch A", logoUrl: "logoA" },
          services: [
            {
              service: { id: 15, name: "Haircut", price: 100 }
            }
          ]
        },
        {
          id: 102,
          title: "Offer B",
          description: "Desc B",
          imageUrl: "imgB",
          discountType: "FIXED",
          discountValue: 20,
          startDate: new Date(),
          endDate: new Date(),
          usageLimit: 10,
          usedCount: 10,
          branch: { id: 1, businessName: "Branch A", logoUrl: "logoA" },
          services: []
        }
      ]);

      const result = await clientService.getValidOffers(authUser.sub);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", 101);
      expect(result[0]).toHaveProperty("title", "Offer A");
      expect(result[0].services).toHaveLength(1);
      expect(result[0].services[0]).toHaveProperty("name", "Haircut");
    });
  });

  describe("reserveAppointment with Claimed Offer Validation", () => {
    it("should reject reservation if client has not claimed the offer", async () => {
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
      prisma.appointment.findMany.mockResolvedValueOnce([]); // No overlaps
      
      // ClaimedOffer lookup returns null (unclaimed)
      prisma.claimedOffer.findUnique.mockResolvedValueOnce(null);

      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3);
      await expect(
        clientService.reserveAppointment(
          { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString(), appliedOfferId: 99 },
          authUser
        )
      ).rejects.toThrow();
    });

    it("should reject reservation if client already used the claimed offer", async () => {
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
      prisma.appointment.findMany.mockResolvedValueOnce([]); // No overlaps

      // ClaimedOffer lookup returns isUsed: true
      prisma.claimedOffer.findUnique.mockResolvedValueOnce({ id: 1, clientId: 1, offerId: 99, isUsed: true });

      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3);
      await expect(
        clientService.reserveAppointment(
          { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString(), appliedOfferId: 99 },
          authUser
        )
      ).rejects.toThrow();
    });

    it("should reject reservation if client already has an active reservation using this offer", async () => {
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
      prisma.appointment.findMany.mockResolvedValueOnce([]); // No overlaps

      prisma.claimedOffer.findUnique.mockResolvedValueOnce({ id: 1, clientId: 1, offerId: 7, isUsed: false });
      
      // Mock valid offers to include this offer
      prisma.offer.findMany.mockResolvedValueOnce([
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

      // Mock finding an active booking using the offer
      prisma.appointment.findFirst.mockResolvedValueOnce({ id: 101, status: "PENDING" });

      const targetDate = new Date(Date.now() + 1000 * 60 * 60 * 3);
      await expect(
        clientService.reserveAppointment(
          { serviceId: 15, staffId: 5, scheduledAt: targetDate.toISOString(), appliedOfferId: 7 },
          authUser
        )
      ).rejects.toThrow();
    });
  });

  describe("calculateBestOfferForService & safeIncrementOfferUsedCount", () => {
    it("should return best offer with highest saving", async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: 50,
        price: 200,
        status: "APPROVED",
        branch: { status: "APPROVED", isSubscriptionActive: true },
      });

      prisma.offer.findMany.mockResolvedValueOnce([
        {
          id: 1,
          title: "10%",
          discountType: "PERCENTAGE",
          discountValue: 10,
          startDate: new Date("2026-04-01T00:00:00.000Z"),
          endDate: new Date("2026-04-30T23:59:59.000Z"),
          usageLimit: null,
          usedCount: 0,
        },
        {
          id: 2,
          title: "50 fixed",
          discountType: "FIXED",
          discountValue: 50,
          startDate: new Date("2026-04-01T00:00:00.000Z"),
          endDate: new Date("2026-04-30T23:59:59.000Z"),
          usageLimit: null,
          usedCount: 0,
        },
      ]);

      const result = await clientService.calculateBestOfferForService(50);

      expect(result.basePrice).toBe(200);
      expect(result.savingsAmount).toBe(50);
      expect(result.finalPrice).toBe(150);
      expect(result.appliedOffer.id).toBe(2);
    });

    it("should increment usage count for an offer inside a transaction using raw query", async () => {
      const mockTx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
      };

      await clientService.safeIncrementOfferUsedCount(7, mockTx);

      expect(mockTx.$executeRaw).toHaveBeenCalled();
    });
  });
});
