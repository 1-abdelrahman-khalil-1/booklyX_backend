import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from "@jest/globals";
import { UserStatus } from "../../generated/prisma/client.js";
jest.unstable_mockModule("../../lib/prisma.js", () => ({
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn(),
  },
}));

const prisma = (await import("../../lib/prisma.js")).default;
const jwt = (await import("jsonwebtoken")).default;
const { authenticate } = await import("../authenticate.js");

describe("authenticate middleware", () => {
  const next = jest.fn();
  const res = {};

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("accepts prefixed tokens where prefix is login sequence", async () => {
    jwt.verify.mockReturnValue({ sub: 5, role: "client", platform: "APP" });
    prisma.user.findUnique.mockResolvedValue({
      id: 5,
      status: UserStatus.ACTIVE,
    });

    const req = {
      headers: {
        authorization: "Bearer 12|mock-jwt-token",
        platform: "APP",
      },
    };

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("mock-jwt-token", "test-secret");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(req.user).toEqual({ sub: 5, role: "client", platform: "APP" });
    expect(next).toHaveBeenCalled();
  });

  it("still accepts legacy raw jwt tokens", async () => {
    jwt.verify.mockReturnValue({ sub: 5, role: "client", platform: "APP" });
    prisma.user.findUnique.mockResolvedValue({
      id: 5,
      status: UserStatus.ACTIVE,
    });

    const req = {
      headers: {
        authorization: "Bearer mock-jwt-token",
        platform: "APP",
      },
    };

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("mock-jwt-token", "test-secret");
    expect(next).toHaveBeenCalled();
  });
});