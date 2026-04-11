import {
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
} from "../branch_admin.service.js";

// Mock dependencies
jest.mock("../../../lib/prisma.js", () => ({
  branchAdmin: {
    findUnique: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  service: {
    findMany: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));

describe("Branch Admin Service - createStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validStaffData = {
    name: "Test Staff",
    email: "staff@example.com",
    age: 28,
    startDate: "2026-03-01T00:00:00.000Z",
    phone: "0123456789",
    password: "password123",
    staffRole: StaffRole.DOCTOR,
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
    prisma.branchAdmin.findUnique.mockResolvedValue(null);
    await expect(
      createStaff(validStaffData, branchAdminUserId),
    ).rejects.toThrow(ApplicationNotFound);
  });

  it("should throw BranchAdminValidationError if branch admin is not approved", async () => {
    prisma.branchAdmin.findUnique.mockResolvedValue({
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

    prisma.branchAdmin.findUnique.mockResolvedValue(mockBranchAdmin);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.service.findMany.mockResolvedValue([{ id: 100 }, { id: 101 }]);
    bcrypt.hash.mockResolvedValue("hashed-password");
    prisma.user.create.mockResolvedValue(mockCreatedUser);

    const result = await createStaff(validStaffData, branchAdminUserId);

    expect(prisma.user.create).toHaveBeenCalledWith({
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
                    duration: true,
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
