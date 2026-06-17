import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const prisma = {};

await jest.unstable_mockModule("../../../lib/prisma.js", () => ({
  default: prisma,
}));

const profileService = await import("../profile/profile.service.js");
const scheduleService = await import("../schedule/schedule.service.js");
const appointmentsService = await import("../appointments/appointments.service.js");
const incomeService = await import("../income/income.service.js");
const servicesService = await import("../services/services.service.js");
const availabilityService = await import("../availability/availability.service.js");

const staffService = {
  ...profileService,
  ...scheduleService,
  ...appointmentsService,
  ...incomeService,
  ...servicesService,
  ...availabilityService,
};

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

  prisma.user = {
    findUnique: jest.fn(),
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

  prisma.serviceExecution = {
    create: jest.fn(),
  };
  prisma.$transaction = jest.fn((cb) => cb(prisma));
});

describe("Staff Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Profile Tests ───────────────────────────────────────────────────
  describe("getStaffProfile", () => {
    it("should return staff profile successfully", async () => {
      const mockUser = {
        id: 1,
        name: "Dr. Ahmed",
        email: "ahmed@example.com",
        phone: "01234567890",
        role: "staff",
        status: "ACTIVE",
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
        staff: {
          id: 1,
          profileImageUrl: "https://example.com/image.jpg",
          age: 30,
          staffRole: "DOCTOR",
          commissionPercentage: 15,
          isActive: true,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date("2026-04-01T10:00:00.000Z"),
          updatedAt: new Date("2026-05-01T10:00:00.000Z"),
          branch: {
            id: 1,
            businessName: "Healthcare Clinic",
            category: "CLINIC",
          },
          professionalProfile: {
            id: 1,
            bio: "Experienced doctor",
            yearsOfExperience: 5,
            specialization: "General Practice",
            createdAt: new Date("2026-04-02T10:00:00.000Z"),
            updatedAt: new Date("2026-05-02T10:00:00.000Z"),
          },
          certificates: [],
          availabilities: [],
          services: [],
          reviews: [],
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await staffService.getStaffProfile(1, "en");

      // service returns flat user properties and nested staff property
      expect(result).toHaveProperty("name", "Dr. Ahmed");
      expect(result).toHaveProperty("phone", "01234567890");
      expect(result.staff).toHaveProperty("staffRole", "DOCTOR");
      expect(result.staff).toHaveProperty("averageRating", 4.5);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it("should throw error when staff not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(staffService.getStaffProfile(999, "en")).rejects.toThrow();
    });
  });


  describe("completeAppointment", () => {
    it("should complete appointment successfully", async () => {
      const appointmentId = 2;

      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, staffRole: "DOCTOR" });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        staffId: 5,
        status: "IN_PROGRESS",
      });
      prisma.serviceExecution.create.mockResolvedValueOnce({
        notes: "Optional notes",
        attachments: ["file1.jpg"],
      });
      prisma.appointment.update.mockResolvedValueOnce({
        id: appointmentId,
        status: "COMPLETED",
      });

      const result = await staffService.completeAppointment(1, appointmentId, {
        notes: "Optional notes",
        attachments: ["file1.jpg"],
      });

      expect(result.status).toBe("COMPLETED");
      expect(prisma.serviceExecution.create).toHaveBeenCalled();
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: "COMPLETED" },
        select: expect.any(Object),
      });
    });
  });

  // ─── Availability Tests ─────────────────────────────────────────────
  describe("startAppointment", () => {
    it("should start a confirmed appointment successfully", async () => {
      const appointmentId = 1;

      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: appointmentId,
        staffId: 5,
        status: "CONFIRMED",
      });
      prisma.appointment.update.mockResolvedValueOnce({
        id: appointmentId,
        status: "IN_PROGRESS",
      });

      const result = await staffService.startAppointment(1, appointmentId);

      expect(result.status).toBe("IN_PROGRESS");
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: appointmentId },
        data: { status: "IN_PROGRESS" },
        select: expect.any(Object),
      });
    });

    it("should reject if appointment is not confirmed", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 1,
        staffId: 5,
        status: "PENDING",
      });

      await expect(staffService.startAppointment(1, 1)).rejects.toThrow();
    });
  });

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

  // ─── Income Tests 
  describe("getIncomeStats", () => {
    it("should calculate income for weekly range", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        commissionPercentage: 20,
        branchId: 10,
      });

      const now = new Date();
      const mockAppointments = [
        {
          id: 1,
          service: { price: 100, name: "Hair Cut", durationMinutes: 30 },
          scheduledAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          client: { user: { name: "Ahmed Mohamed" } },
        },
        {
          id: 2,
          service: { price: 200, name: "Hair Cut", durationMinutes: 60 },
          scheduledAt: now,
          client: { user: { name: "Ahmed Mohamed" } },
        },
      ];

      prisma.appointment.findMany
        .mockResolvedValueOnce(mockAppointments) // for allAppointments
        .mockResolvedValueOnce(mockAppointments); // for recentCompletedAppointments

      const result = await staffService.getIncomeStats(1, "weekly", "en");

      expect(result).toHaveProperty("totalEarnings");
      expect(result.totalEarnings).toBe(60); // (100 * 0.2) + (200 * 0.2) = 60
      expect(result).toHaveProperty("serviceCount", 2);
      expect(result).toHaveProperty("totalHours", 1.5); // (30 + 60) / 60 = 1.5 hours
      expect(result).toHaveProperty("range", "weekly");
      expect(result).toHaveProperty("growth");
      expect(result.growth).toHaveProperty("percentageChange");
      expect(result.growth).toHaveProperty("isIncrease");
      expect(result).toHaveProperty("dailyStats");
      expect(result.dailyStats.length).toBe(7);
      expect(result).toHaveProperty("recentServices");
      expect(result.recentServices[0]).toHaveProperty("appointmentId", 1);
      expect(result.recentServices[0]).toHaveProperty("clientName", "Ahmed Mohamed");
      expect(result.recentServices[0]).toHaveProperty("commission", 20);
      expect(result).not.toHaveProperty("incomeHistory");
    });

    it("should calculate income for monthly range", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({
        id: 5,
        commissionPercentage: 20,
        branchId: 10,
      });

      const now = new Date();
      const mockAppointments = [
        {
          id: 1,
          service: { price: 150, name: "Shave", durationMinutes: 45 },
          scheduledAt: now,
          client: { user: { name: "Ali Reda" } },
        },
      ];

      prisma.appointment.findMany
        .mockResolvedValueOnce(mockAppointments) // for allAppointments
        .mockResolvedValueOnce(mockAppointments); // for recentCompletedAppointments

      const result = await staffService.getIncomeStats(1, "monthly", "en");

      expect(result).toHaveProperty("totalEarnings");
      expect(result.totalEarnings).toBe(30); // 150 * 0.2
      expect(result).toHaveProperty("serviceCount", 1);
      expect(result).toHaveProperty("totalHours", 0.8); // 45 / 60 = 0.75 -> 0.8
      expect(result).toHaveProperty("range", "monthly");
      expect(result).toHaveProperty("growth");
      expect(result.growth).toHaveProperty("percentageChange", 100);
      expect(result.growth).toHaveProperty("isIncrease", true);
      expect(result).toHaveProperty("weeklyStats");
      expect(result.weeklyStats.length).toBeGreaterThanOrEqual(4);
      expect(result).toHaveProperty("recentServices");
      expect(result.recentServices[0]).toHaveProperty("serviceName", "Shave");
      expect(result).not.toHaveProperty("incomeHistory");
    });
  });

  describe("getIncomeHistory", () => {
    it("should fetch staff completed appointments history", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, commissionPercentage: 20 });

      const now = new Date();
      prisma.appointment.findMany.mockResolvedValueOnce([
        {
          scheduledAt: now,
          service: { name: "Hair Cut", price: 100 },
          client: { user: { name: "Ahmed Mohamed" } },
        },
      ]);

      const result = await staffService.getIncomeHistory(1);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        clientName: "Ahmed Mohamed",
        serviceName: "Hair Cut",
        price: 20, // 100 * 0.20
        time: now,
      });
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
            id: 1,
            client: { user: { name: "Client 1" } },
            service: { name: "Service 1", durationMinutes: 30 },
            scheduledAt: new Date("2026-04-21T10:00:00"),
            status: "CONFIRMED",
          },
        ])
        .mockResolvedValueOnce([ // Upcoming appointments
          {
            id: 2,
            client: { user: { name: "Client 2" } },
            service: { name: "Service 2", durationMinutes: 60 },
            scheduledAt: new Date("2026-04-25T14:00:00"),
            status: "CONFIRMED",
          },
        ]);

      const result = await staffService.getStaffSchedule(1, dateStr, "en");

      // service returns appointments array
      expect(result).toHaveProperty("appointments");
      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0]).toHaveProperty("client.user.name", "Client 1");
    });
  });

  // ─── Pending Requests Tests ─────────────────────────────────────────
  describe("getAppointments", () => {
    it("should retrieve only PENDING appointments", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, commissionPercentage: 20 });

      prisma.appointment.findMany.mockResolvedValueOnce([
        {
          id: 1,
          client: { user: { name: "Client 1" } },
          service: { name: "Service 1", price: 100, durationMinutes: 30 },
          scheduledAt: new Date("2026-04-21T10:00:00"),
        },
        {
          id: 2,
          client: { user: { name: "Client 2" } },
          service: { name: "Service 2", price: 200, durationMinutes: 60 },
          scheduledAt: new Date("2026-04-22T14:00:00"),
        },
      ]);

      const result = await staffService.getAppointments(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("client.user.name", "Client 1");
      expect(result[0]).toHaveProperty("service.price", 20); // 100 * 0.20
      expect(result[1]).toHaveProperty("service.price", 40); // 200 * 0.20
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "CONFIRMED",
          }),
        })
      );
    });

    it("should use the provided appointment status filter", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, commissionPercentage: 20 });
      prisma.appointment.findMany.mockResolvedValueOnce([]);

      await staffService.getAppointments(1, "open");

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "IN_PROGRESS",
          }),
        })
      );
    });
  });

  // ─── Appointment Details Tests ───
  describe("getAppointmentDetails", () => {
    it("should retrieve appointment details successfully if owned by the staff", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5, commissionPercentage: 20 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 1,
        staffId: 5,
        status: "CONFIRMED",
        client: {
          user: {
            id: 10,
            name: "Test Client",
            phone: "123456789",
          },
        },
        service: {
          id: 20,
          name: "Test Service",
          description: "Desc",
          price: 50,
          durationMinutes: 30,
        },
        scheduledAt: new Date(),
      });

      const result = await staffService.getAppointmentDetails(1, 1);

      expect(result).toHaveProperty("id", 1);
      expect(result.service).toHaveProperty("price", 10); // 50 * 0.2
      expect(result).not.toHaveProperty("staffId");
      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.any(Object),
      });
    });

    it("should throw error if appointment is not owned by the staff", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce({
        id: 1,
        staffId: 99, // Owned by another staff
        status: "CONFIRMED",
      });

      await expect(staffService.getAppointmentDetails(1, 1)).rejects.toThrow();
    });

    it("should throw error if appointment is not found", async () => {
      prisma.staff.findUnique.mockResolvedValueOnce({ id: 5 });
      prisma.appointment.findUnique.mockResolvedValueOnce(null);

      await expect(staffService.getAppointmentDetails(1, 1)).rejects.toThrow();
    });
  });
});
