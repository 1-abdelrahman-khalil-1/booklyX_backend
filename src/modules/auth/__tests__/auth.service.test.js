import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import { BranchStatus, Platform, Role, UserStatus } from "../../../generated/prisma/client.js";
jest.unstable_mockModule("../../../lib/prisma.js", () => ({
  default: {
    systemCounter: {
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    client: {
      upsert: jest.fn(),
    },
    branchAdmin: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: jest.fn(),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
    decode: jest.fn(() => ({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })),
  },
}));

const bcrypt = (await import("bcrypt")).default;
const jwt = (await import("jsonwebtoken")).default;
const prisma = (await import("../../../lib/prisma.js")).default;
const {
  AuthValidationError,
  EmailNotVerifiedError,
  InactiveUserError,
  InvalidCredentialsError,
  PhoneNotVerifiedError,
  UserNotFound,
} = await import("../errors.js");

const { login } = await import("../session/session.service.js");

// Mock process.env
const originalEnv = process.env;

describe("Auth Service - login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validLoginData = {
    email: "test@example.com",
    password: "password123",
    role: Role.client,
  };

  const validPlatform = "APP";

  it("should throw AuthValidationError if platform header is missing", async () => {
    await expect(login(validLoginData, undefined)).rejects.toThrow(
      AuthValidationError,
    );
  });

  it("should throw AuthValidationError if login data is invalid", async () => {
    await expect(
      login({ email: "invalid-email" }, validPlatform),
    ).rejects.toThrow(AuthValidationError);
  });

  it("should throw UserNotFound if user does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.branchAdmin.findFirst.mockResolvedValue(null);
    await expect(login(validLoginData, validPlatform)).rejects.toThrow(
      UserNotFound,
    );
  });

  it("should throw InvalidCredentialsError if password does not match", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(login(validLoginData, validPlatform)).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it("should throw InactiveUserError if user is not active", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.INACTIVE,
      emailVerified: false,
      phoneVerified: true,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login(validLoginData, validPlatform)).rejects.toMatchObject({
      name: "InactiveUserError",
      data: {
        emailVerified: false,
        phoneVerified: true,
      },
    });
  });

  it("should throw EmailNotVerifiedError if email is not verified", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.client,
      emailVerified: false,
      phoneVerified: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login(validLoginData, validPlatform)).rejects.toMatchObject({
      name: "EmailNotVerifiedError",
      data: {
        emailVerified: false,
        phoneVerified: false,
      },
    });
  });

  it("should throw PhoneNotVerifiedError if phone is not verified", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.client,
      emailVerified: true,
      phoneVerified: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login(validLoginData, validPlatform)).rejects.toMatchObject({
      name: "PhoneNotVerifiedError",
      data: {
        emailVerified: true,
        phoneVerified: false,
      },
    });
  });

  it("should return tokens and user on successful login", async () => {
    const mockUser = {
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.client,
      emailVerified: true,
      phoneVerified: true,
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.systemCounter.upsert.mockResolvedValue({ value: 5 });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await login(validLoginData, validPlatform);

    expect(result).toHaveProperty("token", "5|mock-jwt-token");
    expect(result).toHaveProperty("refreshToken");
    expect(result.user).not.toHaveProperty("password");
    expect(result.user.email).toBe(validLoginData.email);
    expect(result.user.profileImageUrl).toBe("");
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        loginSequence: 5,
      },
    });
  });

  it("should return tokens and user with profileImageUrl if client profile has image", async () => {
    const mockUser = {
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.client,
      emailVerified: true,
      phoneVerified: true,
      client: {
        profileImageUrl: "https://example.com/client.png",
      },
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.systemCounter.upsert.mockResolvedValue({ value: 5 });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await login(validLoginData, validPlatform);

    expect(result.user.profileImageUrl).toBe("https://example.com/client.png");
  });

  it("should include requiresSubscription for approved branch_admin accounts without active subscription", async () => {
    const mockUser = {
      id: 2,
      email: "branch@example.com",
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.branch_admin,
      emailVerified: true,
      phoneVerified: true,
      branchAdmin: {
        id: 20,
        status: BranchStatus.APPROVED,
        isSubscriptionActive: false,
        plan: {
          id: 1,
          name: "Starter",
          price: 100,
          maxStaff: 5,
          maxServices: 10,
          loyaltyEnabled: true,
          offersEnabled: true,
        },
      },
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.systemCounter.upsert.mockResolvedValue({ value: 6 });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await login({ ...validLoginData, email: mockUser.email, role: Role.branch_admin }, Platform.WEB);

    expect(result).toHaveProperty("requiresSubscription", true);
    expect(result).toHaveProperty("token", "6|mock-jwt-token");
    expect(result.user.role).toBe(Role.branch_admin);
  });

  it("should not include requiresSubscription for approved branch_admin accounts with active subscription", async () => {
    const mockUser = {
      id: 3,
      email: "branch-active@example.com",
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.branch_admin,
      emailVerified: true,
      phoneVerified: true,
      branchAdmin: {
        id: 30,
        status: BranchStatus.APPROVED,
        isSubscriptionActive: true,
        plan: {
          id: 1,
          name: "Starter",
          price: 100,
          maxStaff: 5,
          maxServices: 10,
          loyaltyEnabled: true,
          offersEnabled: true,
        },
      },
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.systemCounter.upsert.mockResolvedValue({ value: 7 });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await login({ ...validLoginData, email: mockUser.email, role: Role.branch_admin }, Platform.WEB);

    expect(result).not.toHaveProperty("requiresSubscription");
    expect(result).toHaveProperty("token", "7|mock-jwt-token");
    expect(result.user.role).toBe(Role.branch_admin);
  });
});
