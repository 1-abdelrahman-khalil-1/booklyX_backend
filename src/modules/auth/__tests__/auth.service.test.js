import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Role, UserStatus } from "../../../generated/prisma/client.js";
import prisma from "../../../lib/prisma.js";
import {
    AuthValidationError,
    EmailNotVerifiedError,
    InactiveUserError,
    InvalidCredentialsError,
    login,
    PhoneNotVerifiedError,
    UserNotFound,
} from "../auth.service.js";

// Mock dependencies
jest.mock("../../../lib/prisma.js", () => ({
  user: {
    findUnique: jest.fn(),
  },
  branchAdmin: {
    findFirst: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

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
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login(validLoginData, validPlatform)).rejects.toThrow(
      InactiveUserError,
    );
  });

  it("should throw EmailNotVerifiedError if email is not verified", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: validLoginData.email,
      password: "hashed-password",
      status: UserStatus.ACTIVE,
      role: Role.client,
      emailVerified: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login(validLoginData, validPlatform)).rejects.toThrow(
      EmailNotVerifiedError,
    );
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

    await expect(login(validLoginData, validPlatform)).rejects.toThrow(
      PhoneNotVerifiedError,
    );
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
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock-jwt-token");

    const result = await login(validLoginData, validPlatform);

    expect(result).toHaveProperty("token", "mock-jwt-token");
    expect(result).toHaveProperty("refreshToken");
    expect(result.user).not.toHaveProperty("password");
    expect(result.user.email).toBe(validLoginData.email);
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
