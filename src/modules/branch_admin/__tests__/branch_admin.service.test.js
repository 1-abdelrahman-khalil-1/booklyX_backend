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
    create: jest.fn(),
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
    phone: "0123456789",
    password: "password123",
    staffRole: StaffRole.DOCTOR,
    commissionPercentage: 10,
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
        staffRole: validStaffData.staffRole,
        commissionPercentage: validStaffData.commissionPercentage,
      },
    };

    prisma.branchAdmin.findUnique.mockResolvedValue(mockBranchAdmin);
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
            staffRole: validStaffData.staffRole,
            commissionPercentage: validStaffData.commissionPercentage,
          },
        },
      },
      include: { staff: true },
    });

    expect(result).not.toHaveProperty("password");
    expect(result.id).toBe(mockCreatedUser.id);
    expect(result.staff.branchId).toBe(mockBranchAdmin.id);
  });
});
