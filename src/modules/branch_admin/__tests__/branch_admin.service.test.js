import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest
} from "@jest/globals";
import bcrypt from "bcrypt";
import {
    ApplicationStatus,
    Role,
    StaffRole,
    UserStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    ApplicationNotFound,
    BranchAdminValidationError,
    createStaff,
    deleteStaff,
    StaffNotFoundError,
    updateBranchAdminProfile,
} from "../branch_admin.service.js";

describe("Branch Admin Service - createStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const validStaffData = {
    name: "Test Staff",
    email: "staff@example.com",
    age: 28,
    startDate: "2026-03-01T00:00:00.000Z",
    phone: "01234567890",
    password: "password123",
    staffRole: StaffRole.DOCTOR,
    profileImageUrl: "https://cdn.booklyx.com/staff/test-staff.png",
    commissionPercentage: 10,
    serviceIds: [100, 101],
  };

  const branchAdminUserId = 1;

  it("should throw BranchAdminValidationError if input data is invalid", async () => {
    await expect(
      createStaff(
        { ...validStaffData, email: "invalid-email" },
        branchAdminUserId,
      ),
    ).rejects.toThrow(BranchAdminValidationError);
  });

  it("should throw ApplicationNotFound if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(
      createStaff(validStaffData, branchAdminUserId),
    ).rejects.toThrow(ApplicationNotFound);
  });

  it("should throw BranchAdminValidationError if branch admin is not approved", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 1,
      userId: branchAdminUserId,
      status: ApplicationStatus.PENDING_APPROVAL,
    });
    await expect(
      createStaff(validStaffData, branchAdminUserId),
    ).rejects.toThrow(BranchAdminValidationError);
  });

  it("should create staff and return safe user object on success", async () => {
    const mockBranchAdmin = {
      id: 1,
      userId: branchAdminUserId,
      status: ApplicationStatus.APPROVED,
    };

    const mockCreatedUser = {
      id: 2,
      name: validStaffData.name,
      email: validStaffData.email,
      phone: validStaffData.phone,
      password: "hashed-password",
      role: Role.staff,
      status: UserStatus.ACTIVE,
      staff: {
        id: 1,
        branchId: mockBranchAdmin.id,
        age: validStaffData.age,
        startDate: validStaffData.startDate,
        staffRole: validStaffData.staffRole,
        commissionPercentage: validStaffData.commissionPercentage,
        services: [
          {
            service: {
              id: 100,
              name: "Haircut",
              price: 50,
              duration: 30,
              status: "APPROVED",
            },
          },
          {
            service: {
              id: 101,
              name: "Shave",
              price: 30,
              duration: 20,
              status: "APPROVED",
            },
          },
        ],
      },
    };

    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(mockBranchAdmin);
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    jest.spyOn(prisma.service, "findMany").mockResolvedValue([{ id: 100 }, { id: 101 }]);
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
    const userCreateSpy = jest.spyOn(prisma.user, "create").mockResolvedValue(mockCreatedUser);

    const result = await createStaff(validStaffData, branchAdminUserId);

    expect(userCreateSpy).toHaveBeenCalledWith({
      data: {
        name: validStaffData.name,
        email: validStaffData.email,
        phone: validStaffData.phone,
        password: "hashed-password",
        role: Role.staff,
        status: UserStatus.ACTIVE,
        staff: {
          create: {
            branchId: mockBranchAdmin.id,
            profileImageUrl: validStaffData.profileImageUrl,
            age: validStaffData.age,
            startDate: new Date(validStaffData.startDate),
            staffRole: validStaffData.staffRole,
            commissionPercentage: validStaffData.commissionPercentage,
            services: {
              create: [
                { service: { connect: { id: 100 } } },
                { service: { connect: { id: 101 } } },
              ],
            },
          },
        },
      },
      include: {
        staff: {
          include: {
            services: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    durationMinutes: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(result).not.toHaveProperty("password");
    expect(result.id).toBe(mockCreatedUser.id);
    expect(result.staff.branchId).toBe(mockBranchAdmin.id);
  });
});

describe("Branch Admin Service - deleteStaff", () => {
  const branchAdminUserId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw ApplicationNotFound if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);

    await expect(deleteStaff({ id: 8 }, branchAdminUserId)).rejects.toThrow(
      ApplicationNotFound,
    );
  });

  it("should throw StaffNotFoundError if staff does not belong to branch admin", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, userId: branchAdminUserId });
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);

    await expect(deleteStaff({ id: 8 }, branchAdminUserId)).rejects.toThrow(
      StaffNotFoundError,
    );
  });

  it("should soft-delete staff successfully", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, userId: branchAdminUserId });
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue({ id: 8 });
    const staffUpdateSpy = jest.spyOn(prisma.staff, "update").mockResolvedValue({ id: 8, userId: 8, isActive: false });
    const userUpdateSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({ id: 8, status: UserStatus.INACTIVE });
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));

    const result = await deleteStaff({ id: 8 }, branchAdminUserId);

    expect(staffUpdateSpy).toHaveBeenCalledWith({
      where: { userId: 8 },
      data: { isActive: false },
    });
    expect(userUpdateSpy).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { status: UserStatus.INACTIVE },
    });
    expect(result).toEqual({ message: "STAFF_DELETED" });
  });
});

describe("Branch Admin Service - updateBranchAdminProfile", () => {
  const branchAdminUserId = 99;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw ApplicationNotFound if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);

    await expect(
      updateBranchAdminProfile({ name: "New Name" }, branchAdminUserId),
    ).rejects.toThrow(ApplicationNotFound);
  });

  it("should update branch admin profile and password", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 5,
      userId: branchAdminUserId,
      phone: "01234567890",
      user: {
        id: 99,
        password: "hashed-old-password",
      },
    });

    jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-new-password");
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    jest.spyOn(prisma.user, "update").mockResolvedValue({ id: 99 });
    jest.spyOn(prisma.branchAdmin, "update").mockResolvedValue({
      id: 5,
      ownerName: "Owner Updated",
      email: "branch@example.com",
      phone: "01111111111",
      businessName: "Clinic",
      category: "CLINIC",
      logoUrl: "https://cdn.example.com/logo.png",
      operatingHours: "9:00 AM - 10:00 PM",
      address: "New Address",
      city: "Cairo",
      district: "Nasr City",
      status: ApplicationStatus.APPROVED,
      updatedAt: new Date(),
    });

    const result = await updateBranchAdminProfile(
      {
        name: "Owner Updated",
        phone: "01111111111",
        logoUrl: "https://cdn.example.com/logo.png",
        operatingHours: "9:00 AM - 10:00 PM",
        address: "New Address",
        currentPassword: "old-password",
        newPassword: "new-password-123",
      },
      branchAdminUserId,
    );

    expect(result.ownerName).toBe("Owner Updated");
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.branchAdmin.update).toHaveBeenCalled();
  });

  it("should throw BranchAdminValidationError on wrong current password", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 5,
      userId: branchAdminUserId,
      phone: "01234567890",
      user: {
        id: 99,
        password: "hashed-old-password",
      },
    });

    jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

    await expect(
      updateBranchAdminProfile(
        {
          currentPassword: "wrong-password",
          newPassword: "new-password-123",
        },
        branchAdminUserId,
      ),
    ).rejects.toThrow(BranchAdminValidationError);
  });
});
