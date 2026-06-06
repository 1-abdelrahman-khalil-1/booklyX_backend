import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const prisma = {};

await jest.unstable_mockModule("../../../../lib/prisma.js", () => ({
  default: prisma,
}));

const { getProfile, updateProfile } = await import("../profile.service.js");

beforeEach(() => {
  jest.clearAllMocks();

  prisma.user = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  prisma.client = {
    update: jest.fn(),
  };

  prisma.$transaction = jest.fn((cb) => {
    if (typeof cb === "function") {
      return cb(prisma);
    }
    return Promise.all(cb);
  });
});

describe("Client Profile Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should fetch profile and return mapped data", async () => {
      const mockUser = {
        id: 2,
        name: "Abdo Khalil",
        email: "abdo@example.com",
        phone: "01000000001",
        role: "client",
        status: "ACTIVE",
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date("2026-04-09T10:15:00.000Z"),
        updatedAt: new Date("2026-05-01T10:15:00.000Z"),
        client: {
          id: 1,
          profileImageUrl: "https://cdn.example.com/client.png",
          createdAt: new Date("2026-04-09T10:15:00.000Z"),
          updatedAt: new Date("2026-05-01T10:15:00.000Z"),
        },
      };

      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await getProfile(2);

      expect(result).toMatchObject({
        id: 2,
        name: "Abdo Khalil",
        client: {
          profileImageUrl: "https://cdn.example.com/client.png",
        },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        include: { client: true },
      });
    });

    it("should throw ClientNotFoundError if user is not client", async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 2,
        role: "staff",
      });

      await expect(getProfile(2)).rejects.toThrow();
    });
  });

  describe("updateProfile", () => {
    it("should update user name and client image url and return mapped data", async () => {
      const mockUser = {
        id: 2,
        name: "Abdo Khalil",
        email: "abdo@example.com",
        phone: "01000000001",
        role: "client",
        status: "ACTIVE",
        client: {
          id: 1,
          profileImageUrl: "https://cdn.example.com/client.png",
        },
      };

      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({
          ...mockUser,
          name: "Updated Name",
          client: {
            ...mockUser.client,
            profileImageUrl: "https://cdn.example.com/new.png",
          },
        });

      prisma.user.update.mockResolvedValueOnce({});
      prisma.client.update.mockResolvedValueOnce({});

      const result = await updateProfile(2, {
        name: "Updated Name",
        profileImageUrl: "https://cdn.example.com/new.png",
      });

      expect(result).toMatchObject({
        name: "Updated Name",
        client: {
          profileImageUrl: "https://cdn.example.com/new.png",
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { name: "Updated Name" },
      });
      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { profileImageUrl: "https://cdn.example.com/new.png" },
      });
    });
  });
});
