import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import prisma from "../../../lib/prisma.js";
import * as staffService from "../staff.service.js";

jest.mock("../../../lib/prisma.js");

// Setup default mock structure for prisma
beforeEach(() => {
  jest.clearAllMocks();
  
  // Create nested mock structure
  prisma.staff = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  };
  
  prisma.appointment = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  
  prisma.staffAvailability = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  
  prisma.staffService = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  
  prisma.service = {
    findUnique: jest.fn(),
  };
});

describe("Staff Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Profile Tests ───────────────────────────────────────────────────
  describe("getStaffProfile", () => {
    it("should return staff profile successfully", async () => {
      const mockStaff = {
        id: 1,
        profileImageUrl: "https://example.com/image.jpg",
        age: 30,
        staffRole: "DOCTOR",
        commissionPercentage: 15,
        averageRating: 4.5,
        reviewCount: 10,
        user: {
          name: "Dr. Ahmed",
          phone: "01234567890",
        },
        branch: {
          businessName: "Healthcare Clinic",
          category: "CLINIC",
        },
        professionalProfile: {
          bio: "Experienced doctor",
          yearsOfExperience: 5,
          specialization: "General Practice",
        },
      };

      prisma.staff.findUnique.mockResolvedValue(mockStaff);

      const result = await staffService.getStaffProfile(1, "en");

      expect(result).toHaveProperty("name", "Dr. Ahmed");
      expect(result).toHaveProperty("phone", "01234567890");
      expect(result).toHaveProperty("staffRole", "DOCTOR");
      expect(result).toHaveProperty("averageRating", 4.5);
      expect(prisma.staff.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: expect.any(Object),
      });
    });

    it("should throw error when staff not found", async () => {
      prisma.staff.findUnique.mockResolvedValue(null);

      await expect(staffService.getStaffProfile(999, "en")).rejects.toThrow();
    });
  });

  // ─── Appointment Tests ──────────────────────────────────────────────
  describe("acceptAppointment", () => {
    it("should accept appointment successfully", async () => {
      const appointmentId = "apt-123";

      // Mock getStaffIdByUserId
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });

      // Mock findUnique for appointment check
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        staffId: 5,
        status: "PENDING",
      });

      // Mock update
      prisma.appointment.update.mockResolvedValueOnce({
        id: appointmentId,
        status: "CONFIRMED",
      });

      const result = await staffService.acceptAppointment(1, appointmentId, "en");

      expect(result.status).toBe("CONFIRMED");
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: "CONFIRMED" },
        select: expect.any(Object),
      });
    });

    it("should reject if appointment not found", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.acceptAppointment(1, "apt-999", "en")).rejects.toThrow();
    });

    it("should reject if staff does not own appointment", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: "apt-123",
        staffId: 10, // Different staff
        status: "PENDING",
      });

      await expect(staffService.acceptAppointment(1, "apt-123", "en")).rejects.toThrow();
    });

    it("should reject if appointment not in PENDING status", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: "apt-123",
        staffId: 5,
        status: "CONFIRMED", // Already confirmed
      });

      await expect(staffService.acceptAppointment(1, "apt-123", "en")).rejects.toThrow();
    });
  });

  describe("completeAppointment", () => {
    it("should complete appointment successfully", async () => {
      const appointmentId = "apt-456";

      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        staffId: 5,
        status: "IN_PROGRESS",
      });
      prisma.appointment.update.mockResolvedValueOnce({
        id: appointmentId,
        status: "COMPLETED",
      });

      const result = await staffService.completeAppointment(1, appointmentId, "Optional notes", "en");

      expect(result.status).toBe("COMPLETED");
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: "COMPLETED" },
        select: expect.any(Object),
      });
    });
  });

  // ─── Availability Tests ─────────────────────────────────────────────
  describe("createStaffAvailability", () => {
    it("should create availability successfully", async () => {
      const availabilityData = {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      };

      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.staffAvailability.findUnique.mockResolvedValueOnce(null); // No conflict
      prisma.staffAvailability.create.mockResolvedValueOnce({
        id: 1,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        status: "AVAILABLE",
      });

      const result = await staffService.createStaffAvailability(1, availabilityData, "en");

      expect(result).toHaveProperty("dayOfWeek", 1);
      expect(result).toHaveProperty("startTime", "09:00");
      expect(prisma.staffAvailability.create).toHaveBeenCalled();
    });

    it("should reject if availability already exists for day", async () => {
      const availabilityData = {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      };

      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.staffAvailability.findUnique.mockResolvedValueOnce({
        id: 1,
        dayOfWeek: 1,
      });

      await expect(staffService.createStaffAvailability(1, availabilityData, "en")).rejects.toThrow();
    });
  });

  describe("deleteStaffAvailability", () => {
    it("should delete availability successfully", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.staffAvailability.findUnique.mockResolvedValueOnce({
        id: 1,
        staffId: 5,
      });
      prisma.staffAvailability.delete.mockResolvedValueOnce({ id: 1 });

      const result = await staffService.deleteStaffAvailability(1, 1, "en");

      expect(result.id).toBe(1);
      expect(prisma.staffAvailability.delete).toHaveBeenCalled();
    });

    it("should reject if staff does not own availability", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.staffAvailability.findUnique.mockResolvedValueOnce({
        id: 1,
        staffId: 10, // Different staff
      });

      await expect(staffService.deleteStaffAvailability(1, 1, "en")).rejects.toThrow();
    });
  });

  // ─── Services Tests ──────────────────────────────────────────────────
  describe("addStaffService", () => {
    it("should add service to staff successfully", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        branchId: 10,
      });
      prisma.service.findUnique.mockResolvedValueOnce({
        id: 20,
        branchId: 10,
        status: "APPROVED",
      });
      prisma.staffService.findUnique.mockResolvedValueOnce(null); // Not already linked
      prisma.staffService.create.mockResolvedValueOnce({
        staffId: 5,
        serviceId: 20,
      });

      const result = await staffService.addStaffService(1, 20, "en");

      expect(result).toHaveProperty("serviceId", 20);
      expect(prisma.staffService.create).toHaveBeenCalled();
    });

    it("should reject if service not from same branch", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        branchId: 10,
      });
      prisma.service.findUnique.mockResolvedValueOnce({
        id: 20,
        branchId: 99, // Different branch
        status: "APPROVED",
      });

      await expect(staffService.addStaffService(1, 20, "en")).rejects.toThrow();
    });

    it("should reject if service not approved", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        branchId: 10,
      });
      prisma.service.findUnique.mockResolvedValueOnce({
        id: 20,
        branchId: 10,
        status: "PENDING_APPROVAL", // Not approved
      });

      await expect(staffService.addStaffService(1, 20, "en")).rejects.toThrow();
    });
  });

  // ─── Income Tests ────────────────────────────────────────────────────
  describe("getIncomeStats", () => {
    it("should calculate income for weekly range", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        commissionPercentage: 20,
        branchId: 10,
      });

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      prisma.appointment.findMany.mockResolvedValueOnce([
        {
          id: "apt-1",
          service: { price: 100 },
          scheduledAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          id: "apt-2",
          service: { price: 200 },
          scheduledAt: now,
        },
      ]);

      const result = await staffService.getIncomeStats(1, "weekly", "en");

      expect(result).toHaveProperty("totalEarnings");
      expect(result.totalEarnings).toBe(60); // (100 * 0.2) + (200 * 0.2) = 60
      expect(result).toHaveProperty("serviceCount", 2);
      expect(result).toHaveProperty("range", "weekly");
    });
  });

  // ─── Schedule Tests ──────────────────────────────────────────────────
  describe("getStaffSchedule", () => {
    it("should retrieve today and upcoming appointments", async () => {
      const dateStr = "2026-04-21";
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });

      prisma.appointment.findMany
        .mockResolvedValueOnce([ // Today's appointments
          {
            id: "apt-1",
            client: { user: { name: "Client 1" } },
            service: { name: "Service 1", durationMinutes: 30 },
            scheduledAt: new Date("2026-04-21T10:00:00"),
            status: "CONFIRMED",
          },
        ])
        .mockResolvedValueOnce([ // Upcoming appointments
          {
            id: "apt-2",
            client: { user: { name: "Client 2" } },
            service: { name: "Service 2", durationMinutes: 60 },
            scheduledAt: new Date("2026-04-25T14:00:00"),
            status: "CONFIRMED",
          },
        ]);

      const result = await staffService.getStaffSchedule(1, dateStr, "en");

      expect(result).toHaveProperty("today");
      expect(result).toHaveProperty("upcoming");
      expect(result.today).toHaveLength(1);
      expect(result.upcoming).toHaveLength(1);
      expect(result.today[0]).toHaveProperty("clientName", "Client 1");
    });
  });

  // ─── Pending Requests Tests ─────────────────────────────────────────
  describe("getPendingRequests", () => {
    it("should retrieve only PENDING appointments", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });

      prisma.appointment.findMany.mockResolvedValueOnce([
        {
          id: "apt-1",
          client: { user: { name: "Client 1" } },
          service: { name: "Service 1", durationMinutes: 30 },
          scheduledAt: new Date("2026-04-21T10:00:00"),
        },
        {
          id: "apt-2",
          client: { user: { name: "Client 2" } },
          service: { name: "Service 2", durationMinutes: 60 },
          scheduledAt: new Date("2026-04-22T14:00:00"),
        },
      ]);

      const result = await staffService.getPendingRequests(1, "en");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("clientName", "Client 1");
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PENDING",
          }),
        })
      );
    });
  });
});
