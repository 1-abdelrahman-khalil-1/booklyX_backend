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
  BranchStatus,
  Role,
  StaffRole,
  UserStatus,
} from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import { expectValidationError } from "../../../lib/validation/test-helpers.js";
import {
  activateSubscription,
  BranchAdminValidationError,
  BranchNotFoundError,
  createStaff,
  deleteStaff,
  InactivePlanError,
  InvalidPlanError,
  StaffNotFoundError,
  submitBranch,
  SubscriptionActivationForbiddenError,
  SubscriptionAlreadyActiveError,
  updateBranchAdminProfile,
} from "../branch_admin.service.js";
import {
  applySchema,
  validateBranchAdminInput,
} from "../branch_admin.validation.js";

const validBranchSubmissionData = {
  planId: 1,
  ownerName: "Mahmoud Ibrahim",
  email: "mahmoud.branch@example.com",
  phone: "01012345678",
  password: "password123",
  businessName: "Hassan Beauty Salon",
  category: "SPA",
  description: "Premium beauty and skincare services.",
  commercialRegisterNumber: "CR-2026-010",
  taxId: "TAX-2026-010",
  city: "Cairo",
  district: "Nasr City",
  address: "12 Makram Ebeid Street",
  latitude: 30.0626,
  longitude: 31.3368,
};

describe("Branch Admin Service - submitBranch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw BranchAdminValidationError when planId is missing or invalid", async () => {
    await expectValidationError(
      () =>
        validateBranchAdminInput(applySchema, {
          ...validBranchSubmissionData,
          planId: undefined,
        }),
      BranchAdminValidationError,
    );

    await expectValidationError(
      () =>
        validateBranchAdminInput(applySchema, {
          ...validBranchSubmissionData,
          planId: "abc",
        }),
      BranchAdminValidationError,
    );
  });

  it("should throw InvalidPlanError when selected plan does not exist", async () => {
    jest.spyOn(prisma.plan, "findUnique").mockResolvedValue(null);

    await expect(submitBranch(validBranchSubmissionData)).rejects.toThrow(
      InvalidPlanError,
    );
  });

  it("should throw InactivePlanError when selected plan is inactive", async () => {
    jest.spyOn(prisma.plan, "findUnique").mockResolvedValue({
      id: validBranchSubmissionData.planId,
      isActive: false,
    });

    await expect(submitBranch(validBranchSubmissionData)).rejects.toThrow(
      InactivePlanError,
    );
  });

  it("should create branch submission with planId without activating subscription or returning plan relation", async () => {
    const {
      password: _password,
      ...branchFields
    } = validBranchSubmissionData;
    const createdBranch = {
      id: 10,
      ...branchFields,
      passwordHash: "hashed-password",
      userId: null,
      status: BranchStatus.PENDING_VERIFICATION,
      emailVerified: false,
      phoneVerified: false,
      isSubscriptionActive: false,
      subscriptionStartedAt: null,
    };

    jest.spyOn(prisma.plan, "findUnique").mockResolvedValue({
      id: validBranchSubmissionData.planId,
      isActive: true,
    });
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password");
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    jest.spyOn(prisma.branchAdmin, "findMany").mockResolvedValue([]);
    const createSpy = jest.spyOn(prisma.branchAdmin, "create").mockResolvedValue(createdBranch);
    jest.spyOn(prisma.branchVerificationCode, "deleteMany").mockResolvedValue({ count: 0 });
    jest.spyOn(prisma.branchVerificationCode, "create").mockResolvedValue({ id: 1 });

    const result = await submitBranch(validBranchSubmissionData);

    const createData = createSpy.mock.calls[0][0].data;
    expect(createData.planId).toBe(validBranchSubmissionData.planId);
    expect(createData).not.toHaveProperty("isSubscriptionActive");
    expect(createData).not.toHaveProperty("subscriptionStartedAt");
    expect(result.branch.planId).toBe(validBranchSubmissionData.planId);
    expect(result.branch).not.toHaveProperty("passwordHash");
    expect(result.branch).not.toHaveProperty("plan");
    expect(result.branch.isSubscriptionActive).toBe(false);
    expect(result.branch.subscriptionStartedAt).toBeNull();
  });
});

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

  it("should throw BranchNotFoundError if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);
    await expect(
      createStaff(validStaffData, branchAdminUserId),
    ).rejects.toThrow(BranchNotFoundError);
  });

  it("should throw BranchAdminValidationError if branch admin is not approved", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 1,
      userId: branchAdminUserId,
      status: BranchStatus.PENDING_APPROVAL,
    });
    await expect(
      createStaff(validStaffData, branchAdminUserId),
    ).rejects.toThrow(BranchAdminValidationError);
  });

  it("should create staff and return safe user object on success", async () => {
    const mockBranchAdmin = {
      id: 1,
      userId: branchAdminUserId,
      status: BranchStatus.APPROVED,
      isSubscriptionActive: true,
      plan: {
        id: 1,
        maxStaff: 10,
        maxServices: 20,
        offersEnabled: true,
        loyaltyEnabled: true,
      },
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
    prisma.staff.count = jest.fn().mockResolvedValue(0);
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
            availabilities: {
              create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                dayOfWeek,
                startTime: "09:00",
                endTime: "17:00",
                status: "AVAILABLE",
              })),
            },
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

describe("Branch Admin Service - activateSubscription", () => {
  const branchAdminUserId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw BranchNotFoundError when branch admin is missing", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);

    await expect(activateSubscription(branchAdminUserId)).rejects.toThrow(
      BranchNotFoundError,
    );
  });

  it("should throw SubscriptionActivationForbiddenError when branch is not approved", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 1,
      status: BranchStatus.PENDING_APPROVAL,
      isSubscriptionActive: false,
      planId: 1,
      plan: { id: 1, name: "Starter", price: 199, maxStaff: 3, maxServices: 10, loyaltyEnabled: false, offersEnabled: false },
    });

    await expect(activateSubscription(branchAdminUserId)).rejects.toThrow(
      SubscriptionActivationForbiddenError,
    );
  });

  it("should throw SubscriptionAlreadyActiveError when already active", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({
      id: 1,
      status: BranchStatus.APPROVED,
      isSubscriptionActive: true,
      planId: 1,
      plan: { id: 1, name: "Starter", price: 199, maxStaff: 3, maxServices: 10, loyaltyEnabled: false, offersEnabled: false },
    });

    await expect(activateSubscription(branchAdminUserId)).rejects.toThrow(
      SubscriptionAlreadyActiveError,
    );
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

  it("should throw BranchNotFoundError if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);

    await expect(deleteStaff(8, branchAdminUserId)).rejects.toThrow(
      BranchNotFoundError,
    );
  });

  it("should throw StaffNotFoundError if staff does not belong to branch admin", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, userId: branchAdminUserId });
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue(null);

    await expect(deleteStaff(8, branchAdminUserId)).rejects.toThrow(
      StaffNotFoundError,
    );
  });

  it("should soft-delete staff successfully", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue({ id: 1, userId: branchAdminUserId });
    jest.spyOn(prisma.user, "findFirst").mockResolvedValue({ id: 8 });
    const staffUpdateSpy = jest.spyOn(prisma.staff, "update").mockResolvedValue({ id: 8, userId: 8, isActive: false });
    const userUpdateSpy = jest.spyOn(prisma.user, "update").mockResolvedValue({ id: 8, status: UserStatus.INACTIVE });
    jest.spyOn(prisma, "$transaction").mockImplementation(async (callback) => callback(prisma));

    const result = await deleteStaff(8, branchAdminUserId);

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

  it("should throw BranchNotFoundError if branch admin does not exist", async () => {
    jest.spyOn(prisma.branchAdmin, "findUnique").mockResolvedValue(null);

    await expect(
      updateBranchAdminProfile({ name: "New Name" }, branchAdminUserId),
    ).rejects.toThrow(BranchNotFoundError);
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
      status: BranchStatus.APPROVED,
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
